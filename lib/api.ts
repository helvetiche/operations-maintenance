import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import {
  checkIPAccess,
  checkRequestSize,
  detectSuspiciousActivity,
  sanitizeInput,
  generateRequestId,
  getClientIP,
} from "./security";

// Request body size limit (1MB default)
const MAX_BODY_SIZE = parseInt(process.env.MAX_REQUEST_BODY_SIZE || "1048576", 10); // 1MB

// Get SECRET_KEY from environment variables
const getSecretKey = (): string => {
  const secretKey = process.env.SECRET_KEY;
  if (!secretKey) {
    throw new Error("SECRET_KEY environment variable is not set");
  }
  return secretKey;
};

// Get configuration from environment variables with defaults
const getConfig = () => {
  return {
    // Rate limiting defaults
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10), // 15 minutes default
    
    // CSRF token expiration (in milliseconds)
    csrfTokenExpirationMs: parseInt(process.env.CSRF_TOKEN_EXPIRATION_MS || "86400000", 10), // 24 hours default
    
    // Cookie settings
    cookieDomain: process.env.COOKIE_DOMAIN || undefined,
    cookieSameSite: (process.env.COOKIE_SAME_SITE as "strict" | "lax" | "none") || "strict",
    cookieSecure: process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production",
    
    // CORS defaults
    corsAllowedOrigins: process.env.CORS_ALLOWED_ORIGINS 
      ? process.env.CORS_ALLOWED_ORIGINS.split(",").map(o => o.trim())
      : undefined,
    corsAllowedMethods: process.env.CORS_ALLOWED_METHODS 
      ? process.env.CORS_ALLOWED_METHODS.split(",").map(m => m.trim())
      : undefined,
    corsAllowedHeaders: process.env.CORS_ALLOWED_HEADERS
      ? process.env.CORS_ALLOWED_HEADERS.split(",").map(h => h.trim())
      : undefined,
    corsCredentials: process.env.CORS_CREDENTIALS === "true",
    
    // Security headers
    cspPolicy: process.env.CSP_POLICY || "default-src 'self'",
    hstsMaxAge: parseInt(process.env.HSTS_MAX_AGE || "31536000", 10), // 1 year default
    
    // Domain for various purposes
    appDomain: process.env.APP_DOMAIN || process.env.NEXT_PUBLIC_APP_DOMAIN || undefined,
  };
};

// Rate limiting store (in-memory, consider Redis for production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// CSRF token store (in-memory, consider Redis for production)
const csrfTokens = new Map<string, { expiresAt: number }>();

interface RateLimitOptions {
  maxRequests?: number;
  windowMs?: number;
}

interface ApiHandlerOptions {
  schema?: z.ZodSchema;
  rateLimit?: RateLimitOptions | false;
  requireCsrf?: boolean;
  allowedMethods?: string[];
  cors?: {
    origin?: string | string[];
    methods?: string[];
    allowedHeaders?: string[];
    credentials?: boolean;
  };
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const getDefaultRateLimit = (): Required<RateLimitOptions> => {
  const config = getConfig();
  return {
    maxRequests: config.rateLimitMaxRequests,
    windowMs: config.rateLimitWindowMs,
  };
};

const generateCsrfToken = (): string => {
  // Generate a random token
  const randomToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Sign the token with SECRET_KEY using HMAC
  const secretKey = getSecretKey();
  const hmac = createHmac("sha256", secretKey);
  hmac.update(randomToken);
  const signature = hmac.digest("hex");

  // Return token:signature format
  return `${randomToken}:${signature}`;
};

const verifyCsrfToken = (token: string): boolean => {
  try {
    const [randomToken, signature] = token.split(":");
    if (!randomToken || !signature) {
      return false;
    }

    // Recreate the signature using SECRET_KEY
    const secretKey = getSecretKey();
    const hmac = createHmac("sha256", secretKey);
    hmac.update(randomToken);
    const expectedSignature = hmac.digest("hex");

    // Use timing-safe comparison to prevent timing attacks
    if (signature.length !== expectedSignature.length) {
      return false;
    }

    return timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch {
    return false;
  }
};

const getClientId = (request: NextRequest): string => {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  return `${ip}-${userAgent}`;
};

const checkRateLimit = (
  clientId: string,
  options?: RateLimitOptions
): { allowed: boolean; remaining: number; resetTime: number } => {
  const now = Date.now();
  const defaultLimit = getDefaultRateLimit();
  const mergedOptions = options || {};
  const maxRequests = (mergedOptions.maxRequests ?? defaultLimit.maxRequests) as number;
  const windowMs = (mergedOptions.windowMs ?? defaultLimit.windowMs) as number;

  const record = rateLimitStore.get(clientId);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(clientId, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs,
    };
  }

  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  record.count += 1;
  rateLimitStore.set(clientId, record);

  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetTime: record.resetTime,
  };
};

const validateCsrf = async (
  request: NextRequest
): Promise<{ valid: boolean; error?: string }> => {
  const cookieStore = await cookies();
  const csrfCookie = cookieStore.get("csrf-token");

  if (!csrfCookie) {
    return { valid: false, error: "CSRF token not found in cookies" };
  }

  const csrfHeader = request.headers.get("x-csrf-token");

  if (!csrfHeader) {
    return { valid: false, error: "CSRF token not found in headers" };
  }

  // Verify tokens match
  if (csrfCookie.value !== csrfHeader) {
    return { valid: false, error: "CSRF token mismatch" };
  }

  // Verify token signature using SECRET_KEY
  if (!verifyCsrfToken(csrfHeader)) {
    return { valid: false, error: "Invalid CSRF token signature" };
  }

  // Check if token exists in store and hasn't expired
  const storedTokenData = csrfTokens.get(csrfHeader);
  
  // In development, if signature is valid and tokens match, allow it even if not in store
  // (this handles hot-reload scenarios where the in-memory store is cleared)
  const isDevelopment = process.env.NODE_ENV === "development";
  
  if (!storedTokenData) {
    if (isDevelopment) {
      // In development, accept valid tokens even if not in store
      // Re-add to store with default expiration for future requests
      const config = getConfig();
      csrfTokens.set(csrfHeader, {
        expiresAt: Date.now() + config.csrfTokenExpirationMs,
      });
      return { valid: true };
    }
    return { valid: false, error: "CSRF token not found in session" };
  }

  // Check expiration (24 hours)
  if (Date.now() > storedTokenData.expiresAt) {
    csrfTokens.delete(csrfHeader);
    // In development, allow expired tokens if signature is still valid (for debugging)
    if (isDevelopment) {
      // Re-add with new expiration
      const config = getConfig();
      csrfTokens.set(csrfHeader, {
        expiresAt: Date.now() + config.csrfTokenExpirationMs,
      });
      return { valid: true };
    }
    return { valid: false, error: "CSRF token has expired" };
  }

  return { valid: true };
};

const setSecurityHeaders = (response: NextResponse, corsOptions?: ApiHandlerOptions["cors"]): NextResponse => {
  const config = getConfig();
  
  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()"
  );
  response.headers.set(
    "Strict-Transport-Security",
    `max-age=${config.hstsMaxAge}; includeSubDomains; preload`
  );
  response.headers.set("Content-Security-Policy", config.cspPolicy);
  
  // Additional security headers
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("X-Download-Options", "noopen");
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  
  // Content-Type header (only if not already set)
  if (!response.headers.get("Content-Type")) {
    response.headers.set("Content-Type", "application/json");
  }

  // CORS headers - use env defaults if not specified in options
  const corsConfig = corsOptions || (config.corsAllowedOrigins ? {
    origin: config.corsAllowedOrigins,
    methods: config.corsAllowedMethods,
    allowedHeaders: config.corsAllowedHeaders,
    credentials: config.corsCredentials,
  } : undefined);

  if (corsConfig) {
    const origin = corsConfig.origin;
    if (origin) {
      const allowedOrigins = Array.isArray(origin) ? origin : [origin];
      response.headers.set("Access-Control-Allow-Origin", allowedOrigins[0]);
      if (allowedOrigins.length > 1) {
        response.headers.set("Vary", "Origin");
      }
    }
    
    if (corsConfig.methods) {
      response.headers.set("Access-Control-Allow-Methods", corsConfig.methods.join(", "));
    }
    
    if (corsConfig.allowedHeaders) {
      response.headers.set("Access-Control-Allow-Headers", corsConfig.allowedHeaders.join(", "));
    }
    
    if (corsConfig.credentials) {
      response.headers.set("Access-Control-Allow-Credentials", "true");
    }
  }

  return response;
};

export const createApiHandler = <T = unknown>(
  handler: (request: NextRequest, validatedData?: T) => Promise<ApiResponse | NextResponse>,
  options: ApiHandlerOptions = {}
) => {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Generate request ID for tracking
    const requestId = generateRequestId();
    
    try {
      // Handle OPTIONS request for CORS preflight
      if (request.method === "OPTIONS" && options.cors) {
        const response = new NextResponse(null, { status: 204 });
        return setSecurityHeaders(response, options.cors);
      }

      // Check allowed methods
      const allowedMethods = options.allowedMethods || ["GET", "POST", "PUT", "DELETE", "PATCH"];
      if (!allowedMethods.includes(request.method)) {
        const response = NextResponse.json(
          { success: false, error: "Method not allowed" },
          { status: 405 }
        );
        response.headers.set("X-Request-ID", requestId);
        return setSecurityHeaders(response, options.cors);
      }

      // Rate limiting is handled by proxy.ts for all API routes
      // api.ts rate limiting is for per-route custom limits (optional)
      // If rateLimit is explicitly set to false, skip it (already done in proxy)
      // If rateLimit options are provided, apply per-route limits
      const rateLimitValue = options.rateLimit;
      if (rateLimitValue !== false && rateLimitValue !== undefined) {
        // Per-route rate limiting (more restrictive than proxy)
        const clientId = getClientId(request);
        const rateLimitOptions: RateLimitOptions = rateLimitValue;
        const rateLimitResult = checkRateLimit(clientId, rateLimitOptions);

        if (!rateLimitResult.allowed) {
          const response = NextResponse.json(
            {
              success: false,
              error: "Too many requests",
              message: "Rate limit exceeded. Please try again later.",
            },
            { status: 429 }
          );
          response.headers.set("X-RateLimit-Limit", String(rateLimitOptions.maxRequests || 100));
          response.headers.set("X-RateLimit-Remaining", String(rateLimitResult.remaining));
          response.headers.set(
            "X-RateLimit-Reset",
            new Date(rateLimitResult.resetTime).toISOString()
          );
          response.headers.set("Retry-After", String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)));
          return setSecurityHeaders(response, options.cors);
        }
      }

      const response = await handleRequest(request, options, handler, requestId);
      
      // Add rate limit headers if per-route rate limiting was applied
      if (rateLimitValue !== false && rateLimitValue !== undefined) {
        const clientId = getClientId(request);
        const rateLimitOptions: RateLimitOptions = rateLimitValue;
        const record = rateLimitStore.get(clientId);
        if (record) {
          response.headers.set("X-RateLimit-Limit", String(rateLimitOptions.maxRequests || 100));
          response.headers.set(
            "X-RateLimit-Remaining",
            String(Math.max(0, (rateLimitOptions.maxRequests || 100) - record.count))
          );
          response.headers.set(
            "X-RateLimit-Reset",
            new Date(record.resetTime).toISOString()
          );
        }
      }
      
      return setSecurityHeaders(response, options.cors);
    } catch (error) {
      // Handle authentication errors with 401 status
      if (error instanceof Error && error.name === "AuthenticationError") {
        const response = NextResponse.json(
          {
            success: false,
            error: "Not authenticated",
            message: error.message || "Authentication required",
          },
          { status: 401 }
        );
        response.headers.set("X-Request-ID", requestId);
        return setSecurityHeaders(response, options.cors);
      }

      // Log other errors in development only
      if (process.env.NODE_ENV === "development") {
        console.error("API Handler Error:", error);
      }

      const response = NextResponse.json(
        {
          success: false,
          error: "Internal server error",
          message: process.env.NODE_ENV === "development" 
            ? (error instanceof Error ? error.message : "An unexpected error occurred")
            : "An unexpected error occurred",
        },
        { status: 500 }
      );
      response.headers.set("X-Request-ID", requestId);
      return setSecurityHeaders(response, options.cors);
    }
  };
};

const handleRequest = async <T = unknown>(
  request: NextRequest,
  options: ApiHandlerOptions,
  handler: (request: NextRequest, validatedData?: T) => Promise<ApiResponse | NextResponse>,
  requestId: string
): Promise<NextResponse> => {
  // IP access check
  const ipAccess = checkIPAccess(request);
  if (!ipAccess.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: "Access denied",
        message: "Request blocked",
      },
      { status: 403 }
    );
  }

  // Check request size
  const sizeCheck = await checkRequestSize(request);
  if (!sizeCheck.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: "Request too large",
        message: `Request body exceeds maximum size limit`,
      },
      { status: 413 }
    );
  }

  // CSRF validation for state-changing methods
  if (options.requireCsrf !== false && ["POST", "PUT", "DELETE", "PATCH"].includes(request.method)) {
    const csrfResult = await validateCsrf(request);
    if (!csrfResult.valid) {
      // Track suspicious activity for CSRF failures
      const clientId = getClientIP(request);
      detectSuspiciousActivity(clientId, true);
      
      // Log the specific CSRF error in development
      if (process.env.NODE_ENV === "development") {
        console.error("CSRF validation failed:", csrfResult.error);
      }
      
      return NextResponse.json(
        {
          success: false,
          error: "CSRF validation failed",
          message: csrfResult.error || "Invalid request token",
        },
        { status: 403 }
      );
    }
  }

  // Zod schema validation (only for methods that typically have bodies)
  let validatedData: T | undefined;
  if (options.schema) {
    const bodyMethods = ["POST", "PUT", "PATCH"];
    if (bodyMethods.includes(request.method)) {
      // Validate Content-Type for body methods
      const contentType = request.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid content type",
            message: "Content-Type must be application/json",
          },
          { status: 400 }
        );
      }

      try {
        // Read body with size limit
        const bodyText = await request.text();
        if (bodyText.length > MAX_BODY_SIZE) {
          const response = NextResponse.json(
            {
              success: false,
              error: "Request too large",
              message: `Request body exceeds maximum size limit`,
            },
            { status: 413 }
          );
          response.headers.set("X-Request-ID", requestId);
          return response;
        }

        const body = JSON.parse(bodyText);
        // Sanitize input before validation
        const sanitizedBody = sanitizeInput(body);
        validatedData = options.schema.parse(sanitizedBody) as T;
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            {
              success: false,
              error: "Validation error",
              message: error.issues.map((e: z.ZodIssue) => `${e.path.join(".")}: ${e.message}`).join(", "),
            },
            { status: 400 }
          );
        }
        if (error instanceof Error && error.message === "Invalid JSON in request body") {
          return NextResponse.json(
            {
              success: false,
              error: "Invalid request body",
              message: "Request body must be valid JSON",
            },
            { status: 400 }
          );
        }
        throw error;
      }
    } else {
      // For GET/DELETE, validate query parameters if schema is provided
      const { searchParams } = new URL(request.url);
      const queryObject = Object.fromEntries(searchParams.entries());
      try {
        validatedData = options.schema.parse(queryObject) as T;
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            {
              success: false,
              error: "Validation error",
              message: error.issues.map((e: z.ZodIssue) => `${e.path.join(".")}: ${e.message}`).join(", "),
            },
            { status: 400 }
          );
        }
        throw error;
      }
    }
  }

  // Execute handler
  const result = await handler(request, validatedData);
  
  // If handler already returned a NextResponse, add request ID and return it directly
  if (result instanceof NextResponse) {
    if (!result.headers.get("X-Request-ID")) {
      result.headers.set("X-Request-ID", requestId);
    }
    return result;
  }
  
  // Otherwise, wrap the ApiResponse in NextResponse
  const status = result.success ? 200 : 400;
  const response = NextResponse.json(result, { status });
  response.headers.set("X-Request-ID", requestId);
  return response;
};

// Helper function to generate and set CSRF token (use in GET endpoint or middleware)
export const generateCsrfTokenResponse = async (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  request: NextRequest
): Promise<NextResponse> => {
  const config = getConfig();
  const token = generateCsrfToken();
  const expiresAt = Date.now() + config.csrfTokenExpirationMs;

  // Store token with expiration
  csrfTokens.set(token, { expiresAt });

  const response = NextResponse.json({ success: true, data: { csrfToken: token } });
  
  // Set CSRF token in cookie
  const cookieOptions: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "strict" | "lax" | "none";
    maxAge: number;
    path: string;
    domain?: string;
  } = {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    maxAge: Math.floor(config.csrfTokenExpirationMs / 1000), // Convert to seconds
    path: "/",
  };

  if (config.cookieDomain) {
    cookieOptions.domain = config.cookieDomain;
  }

  response.cookies.set("csrf-token", token, cookieOptions);

  return setSecurityHeaders(response);
};

// Cleanup expired tokens and rate limit entries (run periodically)
export const cleanupExpiredEntries = (): void => {
  const now = Date.now();
  
  // Cleanup expired CSRF tokens
  for (const [token, data] of csrfTokens.entries()) {
    if (now > data.expiresAt) {
      csrfTokens.delete(token);
    }
  }
  
  // Cleanup expired rate limit entries
  for (const [clientId, record] of rateLimitStore.entries()) {
    if (now > record.resetTime && record.count === 0) {
      rateLimitStore.delete(clientId);
    }
  }
};

// Run cleanup every hour
if (typeof setInterval !== "undefined") {
  setInterval(cleanupExpiredEntries, 60 * 60 * 1000);
}

// Helper function to create success response
export const createSuccessResponse = <T>(data: T, message?: string): ApiResponse<T> => {
  return {
    success: true,
    data,
    message,
  };
};

// Helper function to create error response
export const createErrorResponse = (error: string, message?: string): ApiResponse => {
  return {
    success: false,
    error,
    message,
  };
};

import { NextRequest, NextResponse } from "next/server";
import {
  checkIPAccess,
  detectSuspiciousActivity,
  generateRequestId,
  getClientIP,
} from "./lib/security";

// Matcher configuration - defines which routes this proxy should handle
export const config = {
  matcher: [
    // Match all API routes except static files
    "/api/:path*",
    // Exclude Next.js internal routes and static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)",
  ],
};

// Get configuration from environment variables
const getConfig = () => {
  return {
    corsAllowedOrigins: process.env.CORS_ALLOWED_ORIGINS
      ? process.env.CORS_ALLOWED_ORIGINS.split(",").map((o) => o.trim())
      : undefined,
    corsAllowedMethods: process.env.CORS_ALLOWED_METHODS
      ? process.env.CORS_ALLOWED_METHODS.split(",").map((m) => m.trim())
      : ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    corsAllowedHeaders: process.env.CORS_ALLOWED_HEADERS
      ? process.env.CORS_ALLOWED_HEADERS.split(",").map((h) => h.trim())
      : ["Content-Type", "X-CSRF-Token", "Authorization"],
    corsCredentials: process.env.CORS_CREDENTIALS === "true",
    appDomain: process.env.APP_DOMAIN || process.env.NEXT_PUBLIC_APP_DOMAIN || undefined,
  };
};

// Get client identifier for rate limiting
const getClientId = (request: NextRequest): string => {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  return `${ip}-${userAgent}`;
};

// Simple rate limiting store (shared with api.ts logic)
// In production, consider using Redis or Vercel KV
const rateLimitStore = new Map<
  string,
  { count: number; resetTime: number }
>();

const checkRateLimit = (
  clientId: string,
  maxRequests: number = 100,
  windowMs: number = 900000
): { allowed: boolean; remaining: number; resetTime: number } => {
  const now = Date.now();
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

// Set security headers
const setSecurityHeaders = (
  response: NextResponse,
  config: ReturnType<typeof getConfig>,
  request?: NextRequest
): NextResponse => {
  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set(
    "Referrer-Policy",
    "strict-origin-when-cross-origin"
  );
  response.headers.set(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()"
  );

  const hstsMaxAge =
    parseInt(process.env.HSTS_MAX_AGE || "31536000", 10) || 31536000;
  response.headers.set(
    "Strict-Transport-Security",
    `max-age=${hstsMaxAge}; includeSubDomains`
  );

  const cspPolicy =
    process.env.CSP_POLICY || "default-src 'self'";
  response.headers.set("Content-Security-Policy", cspPolicy);
  
  // Don't set Content-Type in proxy - let route handlers set it
  // Only set it if not already set
  if (!response.headers.get("Content-Type")) {
    response.headers.set("Content-Type", "application/json");
  }

  // CORS headers
  if (config.corsAllowedOrigins && config.corsAllowedOrigins.length > 0) {
    const origin = request?.headers.get("origin");
    const allowedOrigin = config.corsAllowedOrigins.find(
      (allowed) => allowed === origin || allowed === "*"
    );

    if (allowedOrigin) {
      response.headers.set(
        "Access-Control-Allow-Origin",
        allowedOrigin === "*" ? "*" : allowedOrigin
      );
    } else if (config.corsAllowedOrigins.length === 1) {
      // Single origin, use it
      response.headers.set(
        "Access-Control-Allow-Origin",
        config.corsAllowedOrigins[0]
      );
    }

    if (config.corsAllowedOrigins.length > 1) {
      response.headers.set("Vary", "Origin");
    }

    if (config.corsAllowedMethods) {
      response.headers.set(
        "Access-Control-Allow-Methods",
        config.corsAllowedMethods.join(", ")
      );
    }

    if (config.corsAllowedHeaders) {
      response.headers.set(
        "Access-Control-Allow-Headers",
        config.corsAllowedHeaders.join(", ")
      );
    }

    if (config.corsCredentials) {
      response.headers.set("Access-Control-Allow-Credentials", "true");
    }

    // Expose headers that might be needed by the client
    response.headers.set(
      "Access-Control-Expose-Headers",
      "X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset"
    );
  }

  return response;
};

// Main proxy handler
export default function proxy(request: NextRequest): NextResponse | null {
  const config = getConfig();
  const url = new URL(request.url);
  const requestId = generateRequestId();

  // IP access check
  const ipAccess = checkIPAccess(request);
  if (!ipAccess.allowed) {
    const response = NextResponse.json(
      {
        success: false,
        error: "Access denied",
        message: "Request blocked",
      },
      { status: 403 }
    );
    response.headers.set("X-Request-ID", requestId);
    return setSecurityHeaders(response, config, request);
  }

  // Check for suspicious activity
  const clientId = getClientIP(request);
  const suspicious = detectSuspiciousActivity(clientId, false);
  if (suspicious.shouldBlock) {
    const response = NextResponse.json(
      {
        success: false,
        error: "Access denied",
        message: "Too many failed attempts. Please try again later.",
      },
      { status: 403 }
    );
    response.headers.set("X-Request-ID", requestId);
    return setSecurityHeaders(response, config, request);
  }

  // Handle CORS preflight requests
  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    response.headers.set("X-Request-ID", requestId);
    return setSecurityHeaders(response, config, request);
  }

  // Only process API routes in proxy
  if (!url.pathname.startsWith("/api/")) {
    return null; // Let Next.js handle non-API routes
  }

  // Skip CSRF endpoint from rate limiting (it's needed to get tokens)
  const isCsrfEndpoint = url.pathname === "/api/csrf";

  // Apply rate limiting for API routes (except CSRF endpoint)
  if (!isCsrfEndpoint) {
    const clientId = getClientId(request);
    const maxRequests = parseInt(
      process.env.RATE_LIMIT_MAX_REQUESTS || "100",
      10
    );
    const windowMs = parseInt(
      process.env.RATE_LIMIT_WINDOW_MS || "900000",
      10
    );

    const rateLimitResult = checkRateLimit(clientId, maxRequests, windowMs);

    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        {
          success: false,
          error: "Too many requests",
          message: "Rate limit exceeded. Please try again later.",
        },
        { status: 429 }
      );

      response.headers.set("X-RateLimit-Limit", String(maxRequests));
      response.headers.set("X-RateLimit-Remaining", String(rateLimitResult.remaining));
      response.headers.set(
        "X-RateLimit-Reset",
        new Date(rateLimitResult.resetTime).toISOString()
      );
      response.headers.set(
        "Retry-After",
        String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000))
      );

      return setSecurityHeaders(response, config, request);
    }
  }

  // Create a response that will be modified by the route handler
  // We're just adding headers here, the actual request continues
  const response = NextResponse.next();
  
  // Add request ID header
  response.headers.set("X-Request-ID", requestId);

  // Add rate limit headers to successful requests
  if (!isCsrfEndpoint) {
    const rateLimitClientId = getClientId(request);
    const maxRequests = parseInt(
      process.env.RATE_LIMIT_MAX_REQUESTS || "100",
      10
    );
    parseInt(
      process.env.RATE_LIMIT_WINDOW_MS || "900000",
      10
    );

    // Get current rate limit status
    const record = rateLimitStore.get(rateLimitClientId);
    if (record) {
      response.headers.set("X-RateLimit-Limit", String(maxRequests));
      response.headers.set(
        "X-RateLimit-Remaining",
        String(Math.max(0, maxRequests - record.count))
      );
      response.headers.set(
        "X-RateLimit-Reset",
        new Date(record.resetTime).toISOString()
      );
    }
  }

  // Set security headers
  return setSecurityHeaders(response, config, request);
}

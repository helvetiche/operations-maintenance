import { NextRequest } from "next/server";

// Request body size limit (1MB default)
const MAX_BODY_SIZE = parseInt(process.env.MAX_REQUEST_BODY_SIZE || "1048576", 10); // 1MB

// Suspicious activity detection
const suspiciousActivityStore = new Map<
  string,
  { count: number; lastAttempt: number; blocked: boolean }
>();

// IP blacklist (can be populated from environment or database)
const getBlacklistedIPs = (): string[] => {
  return process.env.BLACKLISTED_IPS
    ? process.env.BLACKLISTED_IPS.split(",").map((ip) => ip.trim())
    : [];
};

// IP whitelist (optional, for trusted IPs)
const getWhitelistedIPs = (): string[] => {
  return process.env.WHITELISTED_IPS
    ? process.env.WHITELISTED_IPS.split(",").map((ip) => ip.trim())
    : [];
};

export const getClientIP = (request: NextRequest): string => {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  const ip = forwarded
    ? forwarded.split(",")[0].trim()
    : realIP
    ? realIP.trim()
    : "unknown";
  return ip;
};

export const checkIPAccess = (request: NextRequest): {
  allowed: boolean;
  reason?: string;
} => {
  const ip = getClientIP(request);
  const whitelist = getWhitelistedIPs();
  const blacklist = getBlacklistedIPs();

  // If whitelist exists and IP is not in it, deny
  if (whitelist.length > 0 && !whitelist.includes(ip)) {
    return { allowed: false, reason: "IP not whitelisted" };
  }

  // If IP is blacklisted, deny
  if (blacklist.includes(ip)) {
    return { allowed: false, reason: "IP blacklisted" };
  }

  return { allowed: true };
};

export const checkRequestSize = async (
  request: NextRequest
): Promise<{ allowed: boolean; size?: number }> => {
  const contentLength = request.headers.get("content-length");
  
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (size > MAX_BODY_SIZE) {
      return { allowed: false, size };
    }
  }

  // For streaming requests, we can't check size upfront
  // But we can limit it during parsing
  return { allowed: true };
};

export const detectSuspiciousActivity = (
  clientId: string,
  isAuthFailure: boolean = false
): { suspicious: boolean; shouldBlock: boolean } => {
  const now = Date.now();
  const record = suspiciousActivityStore.get(clientId);

  if (!record) {
    if (isAuthFailure) {
      suspiciousActivityStore.set(clientId, {
        count: 1,
        lastAttempt: now,
        blocked: false,
      });
    }
    return { suspicious: false, shouldBlock: false };
  }

  // Check if blocked
  if (record.blocked) {
    // Unblock after 1 hour
    if (now - record.lastAttempt > 60 * 60 * 1000) {
      suspiciousActivityStore.delete(clientId);
      return { suspicious: false, shouldBlock: false };
    }
    return { suspicious: true, shouldBlock: true };
  }

  // Track failed auth attempts
  if (isAuthFailure) {
    record.count += 1;
    record.lastAttempt = now;

    // Block after 5 failed attempts within 15 minutes
    if (record.count >= 5 && now - record.lastAttempt < 15 * 60 * 1000) {
      record.blocked = true;
      suspiciousActivityStore.set(clientId, record);
      return { suspicious: true, shouldBlock: true };
    }

    suspiciousActivityStore.set(clientId, record);
    return { suspicious: record.count >= 3, shouldBlock: false };
  }

  // Reset count on successful activity
  if (now - record.lastAttempt > 15 * 60 * 1000) {
    suspiciousActivityStore.delete(clientId);
  }

  return { suspicious: false, shouldBlock: false };
};

export const sanitizeInput = (input: unknown): unknown => {
  if (typeof input === "string") {
    // Remove potential XSS patterns
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/javascript:/gi, "")
      .replace(/on\w+\s*=/gi, "")
      .trim();
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }

  if (input && typeof input === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }

  return input;
};

export const generateRequestId = (): string => {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

export const validateEnvironmentVariables = (): void => {
  const required = [
    "SECRET_KEY",
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PRIVATE_FIREBASE_PRIVATE_KEY",
  ];

  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  // Validate SECRET_KEY length (should be at least 32 characters)
  if (process.env.SECRET_KEY && process.env.SECRET_KEY.length < 32) {
    throw new Error("SECRET_KEY must be at least 32 characters long");
  }
};

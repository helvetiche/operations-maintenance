import { createApiHandler, createSuccessResponse } from "@/lib/api";
import { getAdminAuth } from "@/lib/firebase-admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import "@/lib/init-security";
import { detectSuspiciousActivity, getClientIP } from "@/lib/security";

const verifyPasswordSchema = z.object({
  idToken: z.string().min(1, "ID token is required"),
});

export const POST = createApiHandler(
  async (request: NextRequest, validatedData) => {
    try {
      const { idToken } = validatedData as z.infer<typeof verifyPasswordSchema>;

      const adminAuth = getAdminAuth();

      // Verify the ID token
      const decodedToken = await adminAuth.verifyIdToken(idToken);

      // Check if the user is disabled
      if (decodedToken.disabled) {
        const clientId = getClientIP(request);
        detectSuspiciousActivity(clientId, true);
        
        return NextResponse.json(
          {
            success: false,
            error: "Account disabled",
            message: "This account has been disabled",
          },
          { status: 403 }
        );
      }

      // Set session expiration to 5 days
      const expiresInMs = 60 * 60 * 24 * 5 * 1000; // 5 days in milliseconds

      // Create a custom session cookie
      const sessionCookie = await adminAuth.createSessionCookie(idToken, {
        expiresIn: expiresInMs,
      });

      // Get user details
      const user = await adminAuth.getUser(decodedToken.uid);

      // Set the session cookie
      const response = NextResponse.json(
        createSuccessResponse({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          emailVerified: user.emailVerified,
        })
      );

      // Set secure cookie
      const isProduction = process.env.NODE_ENV === "production";
      response.cookies.set("session", sessionCookie, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: expiresInMs / 1000, // Convert to seconds for cookie maxAge
        path: "/",
      });

      return response;
    } catch {
      // Track failed authentication attempts for security
      const clientId = getClientIP(request);
      detectSuspiciousActivity(clientId, true);
      
      return NextResponse.json(
        {
          success: false,
          error: "Authentication failed",
          message: "Invalid credentials. Please try again.",
        },
        { status: 401 }
      );
    }
  },
  {
    schema: verifyPasswordSchema,
    allowedMethods: ["POST"],
    requireCsrf: false, // Login flow doesn't need CSRF
    rateLimit: {
      maxRequests: 10,
      windowMs: 60 * 1000, // 1 minute
    },
  }
);
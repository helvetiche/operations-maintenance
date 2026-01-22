import { createApiHandler, createSuccessResponse, createErrorResponse } from "@/lib/api";
import { getAdminAuth } from "@/lib/firebase-admin";
import { NextRequest } from "next/server";
import { z } from "zod";
import "@/lib/init-security";

const sendLinkSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const POST = createApiHandler(
  async (request: NextRequest, validatedData) => {
    try {
      const { email } = validatedData as z.infer<typeof sendLinkSchema>;

      const adminAuth = getAdminAuth();

      // Check if user exists in Firebase (no registration, users must be pre-configured)
      try {
        const user = await adminAuth.getUserByEmail(email);
        
        // User exists, check if disabled
        if (user.disabled) {
          return createErrorResponse("Account disabled", "This account has been disabled");
        }

        // User exists and is enabled - send link via client SDK
        // The actual email sending will be done client-side using Firebase SDK
        // This endpoint just validates the user exists
        
        return createSuccessResponse({
          message: "Sign-in link has been sent to your email.",
        });
      } catch (error) {
        // Check if error is due to user not found
        const firebaseError = error as { code?: string };
        if (firebaseError?.code === "auth/user-not-found") {
          return createErrorResponse(
            "User not found",
            "No account exists with this email address."
          );
        }

        // Handle other Firebase errors
        if (firebaseError?.code) {
          return createErrorResponse(
            "Authentication error",
            "Unable to verify user account. Please try again."
          );
        }

        // Re-throw unexpected errors
        throw error;
      }
    } catch {
      return createErrorResponse(
        "Failed to process request",
        "Unable to send sign-in link. Please try again."
      );
    }
  },
  {
    schema: sendLinkSchema,
    allowedMethods: ["POST"],
    requireCsrf: false, // Public endpoint for sending links
    rateLimit: {
      maxRequests: 5, // Limit to prevent abuse
      windowMs: 60 * 1000, // 1 minute
    },
  }
);

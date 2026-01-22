import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getAdminAuth } from "./firebase-admin";

export interface AuthenticatedUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

export interface AuthResult {
  authenticated: boolean;
  user?: AuthenticatedUser;
  error?: string;
}

/**
 * Verify authentication from session cookie
 * Use this in API routes and server components
 */
export const verifyAuth = async (): Promise<AuthResult> => {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie) {
      return {
        authenticated: false,
        error: "No session found",
      };
    }

    const adminAuth = getAdminAuth();

    // Verify the session cookie
    const decodedClaims = await adminAuth.verifySessionCookie(
      sessionCookie.value,
      true // Check if revoked
    );

    // Get user details
    const user = await adminAuth.getUser(decodedClaims.uid);

    return {
      authenticated: true,
      user: {
        uid: user.uid,
        email: user.email ?? null,
        displayName: user.displayName ?? null,
        photoURL: user.photoURL ?? null,
        emailVerified: user.emailVerified,
      },
    };
  } catch (error) {
    return {
      authenticated: false,
      error: error instanceof Error ? error.message : "Invalid session",
    };
  }
};

/**
 * Authentication error class for proper error handling
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

/**
 * Require authentication - throws AuthenticationError if not authenticated
 * Use this in protected API routes
 */
export const requireAuth = async (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  request: NextRequest
): Promise<AuthenticatedUser> => {
  const authResult = await verifyAuth();

  if (!authResult.authenticated || !authResult.user) {
    throw new AuthenticationError(authResult.error || "Authentication required");
  }

  return authResult.user;
};

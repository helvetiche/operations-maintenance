import { createApiHandler, createSuccessResponse } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { NextRequest } from "next/server";

export const GET = createApiHandler(
  async (request: NextRequest) => {
    // Require authentication - throws if not authenticated
    const user = await requireAuth(request);

    return createSuccessResponse({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
    });
  },
  {
    allowedMethods: ["GET"],
    rateLimit: {
      maxRequests: 50,
      windowMs: 60 * 1000, // 1 minute
    },
  }
);

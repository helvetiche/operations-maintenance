import { createApiHandler, createSuccessResponse } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const POST = createApiHandler(
  async (request: NextRequest) => {
    // Require authentication to logout (must be logged in to logout)
    await requireAuth(request);

    const response = NextResponse.json(createSuccessResponse({ message: "Logged out successfully" }));

    // Clear the session cookie
    response.cookies.set("session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return response;
  },
  {
    allowedMethods: ["POST"],
    requireCsrf: true,
    rateLimit: {
      maxRequests: 20,
      windowMs: 60 * 1000, // 1 minute
    },
  }
);

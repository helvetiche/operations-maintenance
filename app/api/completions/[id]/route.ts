import { NextRequest } from "next/server";
import { getFirestoreAdmin } from "@/lib/firestore-admin";
import { requireAuth } from "@/lib/auth";
import { createApiHandler, createSuccessResponse, createErrorResponse } from "@/lib/api";

// DELETE - Remove completion (uncheck task) - no ownership check, data is shared
export const DELETE = createApiHandler(
  async (request: NextRequest) => {
    await requireAuth(request); // Still require authentication
    const db = getFirestoreAdmin();

    // Extract ID from URL path
    const url = new URL(request.url);
    const pathSegments = url.pathname.split("/");
    const id = pathSegments[pathSegments.length - 1];

    if (!id) {
      return createErrorResponse("Bad request", "Completion ID is required");
    }

    const docRef = db.collection("completions").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return createErrorResponse("Not found", "Completion not found");
    }

    const data = doc.data();
    
    // Verify the associated schedule exists (no ownership check - data is shared)
    const scheduleDoc = await db.collection("schedules").doc(data?.scheduleId).get();
    if (!scheduleDoc.exists) {
      return createErrorResponse("Not found", "Associated schedule not found");
    }

    await docRef.delete();

    return createSuccessResponse({ id });
  },
  {
    requireCsrf: true,
    rateLimit: { maxRequests: 30, windowMs: 60000 }, // 30 requests per minute
  }
);

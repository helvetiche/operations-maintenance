import { NextRequest } from "next/server";
import { syncCalendarCache } from "@/lib/schedule-cache";
import { requireAuth } from "@/lib/auth";
import { createApiHandler, createSuccessResponse, createErrorResponse } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * POST /api/calendar/sync-cache
 * Sync calendar cache to optimize reads
 * 
 * Note: CSRF is disabled for this endpoint because it's an internal cache sync operation
 * that doesn't modify user data. It's called from the client to refresh the cache.
 */
export const POST = createApiHandler(
  async (request: NextRequest) => {
    // Verify authentication
    await requireAuth(request);

    // Sync calendar cache
    const result = await syncCalendarCache();

    if (!result.success) {
      return createErrorResponse(
        "Failed to sync calendar cache",
        result.error || "Unable to synchronize calendar cache"
      );
    }

    return createSuccessResponse({
      scheduleCount: result.count,
      message: `Calendar cache synced: ${result.count} schedules`,
    });
  },
  {
    requireCsrf: false, // Disabled: internal cache sync, not user data modification
    rateLimit: { maxRequests: 10, windowMs: 60000 }, // 10 requests per minute
  }
);

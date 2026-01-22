import { NextRequest } from "next/server";
import { syncScheduleCache } from "@/lib/schedule-cache";
import { requireAuth } from "@/lib/auth";
import { createApiHandler, createSuccessResponse, createErrorResponse } from "@/lib/api";

/**
 * POST /api/schedules/sync-cache
 * Rebuild the schedule cache for optimized cron job performance
 * 
 * Note: CSRF is disabled for this endpoint because it's an internal cache sync operation
 * that doesn't modify user data. It's called from the client to refresh the cache.
 */
export const POST = createApiHandler(
  async (request: NextRequest) => {
    // Verify user is authenticated
    await requireAuth(request);

    // Sync the cache
    const result = await syncScheduleCache();

    if (!result.success) {
      return createErrorResponse(
        "Failed to sync cache",
        result.error || "Unable to synchronize schedule cache"
      );
    }

    return createSuccessResponse({
      reminderCount: result.count,
      syncedAt: new Date().toISOString(),
    });
  },
  {
    requireCsrf: false, // Disabled: internal cache sync, not user data modification
    rateLimit: { maxRequests: 10, windowMs: 60000 }, // 10 requests per minute
  }
);

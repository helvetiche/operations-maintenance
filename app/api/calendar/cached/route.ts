import { NextRequest } from "next/server";
import { getCachedCalendarSchedules, getCalendarCacheStatus } from "@/lib/schedule-cache";
import { requireAuth } from "@/lib/auth";
import { createApiHandler, createSuccessResponse } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * GET /api/calendar/cached
 * Get cached calendar schedules
 */
export const GET = createApiHandler(
  async (request: NextRequest) => {
    // Verify authentication
    await requireAuth(request);

    // Get cache status first
    const cacheStatus = await getCalendarCacheStatus();

    // If cache doesn't exist, return empty array with flag
    if (!cacheStatus.exists) {
      return createSuccessResponse({
        schedules: [],
        cacheExists: false,
        message: "Calendar cache not found. Please sync cache.",
      });
    }

    // Get cached schedules
    const schedules = await getCachedCalendarSchedules();

    return createSuccessResponse({
      schedules,
      cacheExists: true,
      lastSynced: cacheStatus.lastSynced,
      scheduleCount: cacheStatus.scheduleCount,
    });
  },
  {
    requireCsrf: false, // GET requests don't need CSRF
    rateLimit: { maxRequests: 100, windowMs: 60000 }, // 100 requests per minute
  }
);

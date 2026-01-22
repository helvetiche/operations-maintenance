import { NextRequest } from "next/server";
import { syncEmployeeCache } from "@/lib/schedule-cache";
import { requireAuth } from "@/lib/auth";
import { createApiHandler, createSuccessResponse, createErrorResponse } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * POST /api/employees/sync-cache
 * Sync employee cache to optimize reads
 * 
 * Note: CSRF is disabled for this endpoint because it's an internal cache sync operation
 * that doesn't modify user data. It's called from the client to refresh the cache.
 */
export const POST = createApiHandler(
  async (request: NextRequest) => {
    // Verify authentication
    await requireAuth(request);

    // Sync employee cache
    const result = await syncEmployeeCache();

    if (!result.success) {
      return createErrorResponse(
        "Failed to sync employee cache",
        result.error || "Unable to synchronize employee cache"
      );
    }

    return createSuccessResponse({
      employeeCount: result.count,
      message: `Employee cache synced: ${result.count} employees`,
    });
  },
  {
    requireCsrf: false, // Disabled: internal cache sync, not user data modification
    rateLimit: { maxRequests: 10, windowMs: 60000 }, // 10 requests per minute
  }
);

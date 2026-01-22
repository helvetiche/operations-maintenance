import { NextRequest } from "next/server";
import { getCachedEmployees, getEmployeeCacheStatus } from "@/lib/schedule-cache";
import { requireAuth } from "@/lib/auth";
import { createApiHandler, createSuccessResponse } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * GET /api/employees/cached
 * Get cached employees with their tasks
 */
export const GET = createApiHandler(
  async (request: NextRequest) => {
    // Verify authentication
    await requireAuth(request);

    // Get cache status first
    const cacheStatus = await getEmployeeCacheStatus();

    // If cache doesn't exist, return empty array with flag
    if (!cacheStatus.exists) {
      return createSuccessResponse({
        employees: [],
        cacheExists: false,
        message: "Employee cache not found. Please sync cache.",
      });
    }

    // Get cached employees
    const employees = await getCachedEmployees();

    return createSuccessResponse({
      employees,
      cacheExists: true,
      lastSynced: cacheStatus.lastSynced,
      totalEmployees: cacheStatus.totalEmployees,
    });
  },
  {
    requireCsrf: false, // GET requests don't need CSRF
    rateLimit: { maxRequests: 100, windowMs: 60000 }, // 100 requests per minute
  }
);

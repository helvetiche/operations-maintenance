import { createApiHandler, createSuccessResponse, createErrorResponse } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { getFirestoreAdmin } from "@/lib/firestore-admin";
import { NextRequest } from "next/server";
import { z } from "zod";
import "@/lib/init-security";
import { Schedule, ScheduleDeadline, ReminderDate } from "@/types";

const scheduleDeadlineSchema: z.ZodType<ScheduleDeadline> = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("daily"),
    time: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  }),
  z.object({
    type: z.literal("weekly"),
    dayOfWeek: z.number().int().min(0).max(6),
    time: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  }),
  z.object({
    type: z.literal("monthly"),
    dayOfMonth: z.number().int().min(1).max(31),
    time: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  }),
  z.object({
    type: z.literal("monthly-specific"),
    month: z.number().int().min(1).max(12),
    day: z.number().int().min(1).max(31),
    time: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  }),
  z.object({
    type: z.literal("interval"),
    days: z.number().int().positive(),
    time: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  }),
  z.object({
    type: z.literal("hourly"),
    hours: z.number().int().min(1).max(23).optional(),
  }),
  z.object({
    type: z.literal("per-minute"),
    minutes: z.number().int().min(1).max(59).optional(),
  }),
  z.object({
    type: z.literal("custom"),
    cronExpression: z.string().min(1),
  }),
]);

const reminderDateSchema: z.ZodType<ReminderDate> = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("relative"),
    daysBefore: z.number().int().min(0), // Allow 0 for same-day reminders
    time: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  }),
  z.object({
    type: z.literal("absolute"),
    dateTime: z.string().datetime(),
  }),
]);

const createScheduleSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000),
  deadline: scheduleDeadlineSchema,
  reminderDate: reminderDateSchema,
  personAssigned: z.string().min(1).max(200),
  personEmail: z.string().email(),
  status: z.enum(["active", "inactive"]).default("active"),
  hideFromCalendar: z.boolean().default(false),
});

// GET: List all schedules (shared across all users) with pagination
const handleGet = async (request: NextRequest) => {
  try {
    await requireAuth(request); // Still require authentication
    const db = getFirestoreAdmin();
    
    // Get pagination params from query string
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "6", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const offset = (page - 1) * limit;
    
    // Query all schedules (no userId filter - data is shared)
    const schedulesSnapshot = await db
      .collection("schedules")
      .get();
    
    const totalCount = schedulesSnapshot.size;
    
    // Sort manually in memory by createdAt descending
    const sortedDocs = schedulesSnapshot.docs.sort((a, b) => {
      const aData = a.data();
      const bData = b.data();
      
      // Handle Firestore Timestamp objects and JavaScript Date objects
      let aTime = 0;
      if (aData.createdAt) {
        if (typeof aData.createdAt.toDate === 'function') {
          // Firestore Timestamp
          aTime = aData.createdAt.toDate().getTime();
        } else if (aData.createdAt instanceof Date) {
          // JavaScript Date
          aTime = aData.createdAt.getTime();
        } else if (typeof aData.createdAt === 'number') {
          // Unix timestamp
          aTime = aData.createdAt;
        }
      }
      
      let bTime = 0;
      if (bData.createdAt) {
        if (typeof bData.createdAt.toDate === 'function') {
          // Firestore Timestamp
          bTime = bData.createdAt.toDate().getTime();
        } else if (bData.createdAt instanceof Date) {
          // JavaScript Date
          bTime = bData.createdAt.getTime();
        } else if (typeof bData.createdAt === 'number') {
          // Unix timestamp
          bTime = bData.createdAt;
        }
      }
      
      return bTime - aTime; // Descending (newest first)
    });
    
    // Apply pagination manually
    const docs = sortedDocs.slice(offset, offset + limit);

    const schedules: Schedule[] = docs.map((doc) => {
      const data = doc.data();
      
      // Handle different createdAt formats
      let createdAtStr = data.createdAt;
      if (data.createdAt && typeof data.createdAt.toDate === 'function') {
        createdAtStr = data.createdAt.toDate().toISOString();
      } else if (data.createdAt instanceof Date) {
        createdAtStr = data.createdAt.toISOString();
      }
      
      let updatedAtStr = data.updatedAt;
      if (data.updatedAt && typeof data.updatedAt.toDate === 'function') {
        updatedAtStr = data.updatedAt.toDate().toISOString();
      } else if (data.updatedAt instanceof Date) {
        updatedAtStr = data.updatedAt.toISOString();
      }
      
      return {
        id: doc.id,
        userId: data.userId,
        title: data.title,
        description: data.description,
        deadline: data.deadline,
        reminderDate: data.reminderDate,
        personAssigned: data.personAssigned,
        personEmail: data.personEmail,
        status: data.status || "active",
        hideFromCalendar: data.hideFromCalendar || false,
        createdAt: createdAtStr,
        updatedAt: updatedAtStr,
      };
    });

    const totalPages = Math.ceil(totalCount / limit);

    return createSuccessResponse({ 
      schedules,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthenticationError") {
      throw error; // Let createApiHandler handle auth errors
    }
    
    // Log error in development
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching schedules:", error);
    }
    
    return createErrorResponse(
      "Failed to fetch schedules",
      "Unable to retrieve schedules. Please try again."
    );
  }
};

// POST: Create new schedule
const handlePost = async (request: NextRequest, validatedData: unknown) => {
  try {
    const user = await requireAuth(request);
    const data = validatedData as z.infer<typeof createScheduleSchema>;
    const db = getFirestoreAdmin();

    const now = new Date();
    const scheduleData = {
      userId: user.uid,
      title: data.title,
      description: data.description,
      deadline: data.deadline,
      reminderDate: data.reminderDate,
      personAssigned: data.personAssigned,
      personEmail: data.personEmail,
      status: data.status || "active",
      hideFromCalendar: data.hideFromCalendar || false,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await db.collection("schedules").add(scheduleData);

    const schedule: Schedule = {
      id: docRef.id,
      ...scheduleData,
      createdAt: scheduleData.createdAt.toISOString(),
      updatedAt: scheduleData.updatedAt.toISOString(),
    };

    return createSuccessResponse({ schedule });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthenticationError") {
      throw error; // Let createApiHandler handle auth errors
    }
    return createErrorResponse(
      "Failed to create schedule",
      "Unable to create schedule. Please try again."
    );
  }
};

export const GET = createApiHandler(handleGet, {
  allowedMethods: ["GET"],
  requireCsrf: false, // GET requests don't need CSRF
});

export const POST = createApiHandler(handlePost, {
  schema: createScheduleSchema,
  allowedMethods: ["POST"],
  requireCsrf: true,
  rateLimit: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
  },
});

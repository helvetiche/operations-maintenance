import { createApiHandler, createSuccessResponse, createErrorResponse } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { getFirestoreAdmin } from "@/lib/firestore-admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import "@/lib/init-security";
import { Schedule, ScheduleDeadline, ReminderDate } from "@/types";
import { clearTodaysSentReminder } from "@/lib/reminder-tracker";

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

const updateScheduleSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  deadline: scheduleDeadlineSchema.optional(),
  reminderDate: reminderDateSchema.optional(),
  personAssigned: z.string().min(1).max(200).optional(),
  personEmail: z.string().email().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  hideFromCalendar: z.boolean().optional(),
});

// GET: Get single schedule (no ownership check - data is shared)
const handleGet = async (request: NextRequest) => {
  try {
    await requireAuth(request); // Still require authentication
    const db = getFirestoreAdmin();
    const url = new URL(request.url);
    const scheduleId = url.pathname.split("/").pop() || "";

    const docRef = db.collection("schedules").doc(scheduleId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        createErrorResponse("Schedule not found", "The requested schedule does not exist."),
        { status: 404 }
      );
    }

    const data = doc.data()!;

    const schedule: Schedule = {
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
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
    };

    return createSuccessResponse({ schedule });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthenticationError") {
      throw error;
    }
    return createErrorResponse(
      "Failed to fetch schedule",
      "Unable to retrieve schedule. Please try again."
    );
  }
};

// PUT: Update schedule (no ownership check - data is shared)
const handlePut = async (
  request: NextRequest,
  validatedData: unknown
) => {
  try {
    await requireAuth(request); // Still require authentication
    const data = validatedData as z.infer<typeof updateScheduleSchema>;
    const db = getFirestoreAdmin();
    const url = new URL(request.url);
    const scheduleId = url.pathname.split("/").pop() || "";

    const docRef = db.collection("schedules").doc(scheduleId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        createErrorResponse("Schedule not found", "The requested schedule does not exist."),
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {
      ...data,
      updatedAt: new Date(),
    };

    await docRef.update(updateData);

    // Clear today's sent reminder marker so the schedule can send again if edited
    // This allows users to edit a schedule and have it re-send the reminder today
    await clearTodaysSentReminder(scheduleId);

    const updatedDoc = await docRef.get();
    const updatedData = updatedDoc.data()!;

    const schedule: Schedule = {
      id: updatedDoc.id,
      userId: updatedData.userId,
      title: updatedData.title,
      description: updatedData.description,
      deadline: updatedData.deadline,
      reminderDate: updatedData.reminderDate,
      personAssigned: updatedData.personAssigned,
      personEmail: updatedData.personEmail,
      status: updatedData.status || "active",
      hideFromCalendar: updatedData.hideFromCalendar || false,
      createdAt: updatedData.createdAt?.toDate?.()?.toISOString() || updatedData.createdAt,
      updatedAt: updatedData.updatedAt?.toDate?.()?.toISOString() || updatedData.updatedAt,
    };

    return createSuccessResponse({ schedule });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthenticationError") {
      throw error;
    }
    return createErrorResponse(
      "Failed to update schedule",
      "Unable to update schedule. Please try again."
    );
  }
};

// DELETE: Delete schedule (no ownership check - data is shared)
const handleDelete = async (request: NextRequest) => {
  try {
    await requireAuth(request); // Still require authentication
    const db = getFirestoreAdmin();
    const url = new URL(request.url);
    const scheduleId = url.pathname.split("/").pop() || "";

    const docRef = db.collection("schedules").doc(scheduleId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        createErrorResponse("Schedule not found", "The requested schedule does not exist."),
        { status: 404 }
      );
    }

    await docRef.delete();

    return createSuccessResponse({ message: "Schedule deleted successfully" });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthenticationError") {
      throw error;
    }
    return createErrorResponse(
      "Failed to delete schedule",
      "Unable to delete schedule. Please try again."
    );
  }
};

export const GET = createApiHandler(handleGet, {
  allowedMethods: ["GET"],
  requireCsrf: false,
});

export const PUT = createApiHandler(handlePut, {
  schema: updateScheduleSchema,
  allowedMethods: ["PUT"],
  requireCsrf: true,
  rateLimit: {
    maxRequests: 20,
    windowMs: 60 * 1000,
  },
});

export const DELETE = createApiHandler(handleDelete, {
  allowedMethods: ["DELETE"],
  requireCsrf: true,
  rateLimit: {
    maxRequests: 10,
    windowMs: 60 * 1000,
  },
});

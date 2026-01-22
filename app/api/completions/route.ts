import { NextRequest } from "next/server";
import { z } from "zod";
import * as FirebaseFirestore from "firebase-admin/firestore";
import { getFirestoreAdmin } from "@/lib/firestore-admin";
import { requireAuth } from "@/lib/auth";
import { createApiHandler, createSuccessResponse, createErrorResponse } from "@/lib/api";
import { TaskCompletion, ScheduleDeadlineType } from "@/types";

// Validation schemas
const getCompletionsSchema = z.object({
  scheduleId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
}).strict();

const deadlineTypeEnum = z.enum([
  "daily",
  "weekly",
  "monthly",
  "monthly-specific",
  "interval",
  "hourly",
  "per-minute",
  "custom",
]);

const createCompletionSchema = z.object({
  scheduleId: z.string().min(1, "Schedule ID is required"),
  periodStart: z.string().min(1, "Period start is required"),
  periodEnd: z.string().min(1, "Period end is required"),
  deadlineType: deadlineTypeEnum,
  notes: z.string().optional(),
}).strict();

// GET - Fetch completions with optional filters (shared across all users)
export const GET = createApiHandler(
  async (request: NextRequest, validatedData?: z.infer<typeof getCompletionsSchema>) => {
    await requireAuth(request); // Still require authentication
    const db = getFirestoreAdmin();

    const { scheduleId, startDate, endDate } = validatedData || {};

    // No userId filter - data is shared
    let query = db.collection("completions") as FirebaseFirestore.Query<FirebaseFirestore.DocumentData>;

    if (scheduleId) {
      query = query.where("scheduleId", "==", scheduleId);
    }

    if (startDate) {
      query = query.where("completedAt", ">=", startDate);
    }

    if (endDate) {
      query = query.where("completedAt", "<=", endDate);
    }

    const snapshot = await query.orderBy("completedAt", "desc").get();
    
    const completions: TaskCompletion[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as TaskCompletion[];

    return createSuccessResponse(completions);
  },
  {
    schema: getCompletionsSchema,
    rateLimit: { maxRequests: 50, windowMs: 60000 }, // 50 requests per minute
  }
);

// POST - Mark task as complete
export const POST = createApiHandler(
  async (request: NextRequest, validatedData?: z.infer<typeof createCompletionSchema>) => {
    const user = await requireAuth(request);
    const db = getFirestoreAdmin();

    if (!validatedData) {
      return createErrorResponse("Invalid request", "Request body is required");
    }

    const { scheduleId, periodStart, periodEnd, deadlineType, notes } = validatedData;

    // Verify schedule exists (no ownership check - data is shared)
    const scheduleDoc = await db.collection("schedules").doc(scheduleId).get();
    
    if (!scheduleDoc.exists) {
      return createErrorResponse("Not found", "Schedule not found");
    }

    const scheduleData = scheduleDoc.data();

    // Check if already completed for this period (no userId filter - data is shared)
    const existingCompletion = await db
      .collection("completions")
      .where("scheduleId", "==", scheduleId)
      .where("periodStart", "==", periodStart)
      .where("periodEnd", "==", periodEnd)
      .get();

    if (!existingCompletion.empty) {
      return createErrorResponse("Conflict", "Task already completed for this period");
    }

    const assignedEmail = scheduleData?.personEmail || user.email || "Unknown";
    const assignedName = scheduleData?.personAssigned || "Unknown";

    const completion: Omit<TaskCompletion, "id"> = {
      scheduleId,
      userId: user.uid,
      completedAt: new Date().toISOString(),
      completedBy: assignedEmail,
      completedByName: assignedName,
      periodStart,
      periodEnd,
      deadlineType: deadlineType as ScheduleDeadlineType,
      ...(notes && { notes }),
    };

    const docRef = await db.collection("completions").add(completion);

    return createSuccessResponse({ id: docRef.id, ...completion });
  },
  {
    schema: createCompletionSchema,
    requireCsrf: true,
    rateLimit: { maxRequests: 30, windowMs: 60000 }, // 30 requests per minute
  }
);

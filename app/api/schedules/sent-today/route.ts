import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getFirestoreAdmin } from "@/lib/firestore-admin";
import "@/lib/init-security";

/**
 * Get today's sent reminders for all schedules (shared across all users)
 * Returns a map of scheduleId -> sentAt timestamp
 * 
 * OPTIMIZED: Uses getAll() for batch document retrieval
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth(request); // Still require authentication
    const db = getFirestoreAdmin();

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split("T")[0];

    // Get all schedule IDs (no userId filter - data is shared)
    const schedulesSnapshot = await db
      .collection("schedules")
      .select() // Only get document IDs
      .get();

    const scheduleIds = schedulesSnapshot.docs.map((doc) => doc.id);

    if (scheduleIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: { sentToday: {} },
      });
    }

    // Build document references for today's reminders
    const todayDocRefs = scheduleIds.map(id => 
      db.collection("sentReminders").doc(`${id}_${today}`)
    );

    // Batch get all documents at once (much faster than individual queries)
    const reminderDocs = await db.getAll(...todayDocRefs);

    // Build result map
    const sentToday: Record<string, string> = {};
    reminderDocs.forEach((doc) => {
      if (doc.exists) {
        const data = doc.data();
        if (data) {
          const scheduleId = data.scheduleId;
          const sentAt = data?.sentAt?.toDate?.() || new Date(data?.sentAt);
          sentToday[scheduleId] = sentAt.toISOString();
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: { sentToday },
    });
  } catch (error) {
    console.error("Error fetching sent reminders:", error);
    
    if (error instanceof Error && error.name === "AuthenticationError") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch sent reminders",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

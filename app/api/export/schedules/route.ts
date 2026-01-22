import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSchedules } from "@/lib/firestore-admin";
import { exportSchedulesToExcel } from "@/lib/excel-export";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request); // Still require authentication

    // Get all schedules (shared across all users)
    const schedules = await getSchedules();

    // Generate Excel file
    const buffer = await exportSchedulesToExcel(schedules);

    // Return the file
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="schedules-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Error exporting schedules:", error);
    return NextResponse.json(
      { success: false, error: "Failed to export schedules" },
      { status: 500 }
    );
  }
}

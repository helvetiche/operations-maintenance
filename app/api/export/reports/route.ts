import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getCompletions, getSchedules } from "@/lib/firestore-admin";
import { exportReportsToExcel } from "@/lib/excel-export";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request); // Still require authentication

    // Get query parameters for month and year
    const searchParams = request.nextUrl.searchParams;
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth()));
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

    // Validate month and year
    if (isNaN(month) || month < 0 || month > 11 || isNaN(year)) {
      return NextResponse.json(
        { success: false, error: "Invalid month or year" },
        { status: 400 }
      );
    }

    // Get all completions (shared across all users)
    const allCompletions = await getCompletions();
    
    // Filter completions for the selected month and year
    const filteredCompletions = allCompletions.filter((completion) => {
      const date = new Date(completion.completedAt);
      return date.getMonth() === month && date.getFullYear() === year;
    });

    // Get schedules for task titles (shared across all users)
    const schedules = await getSchedules();

    // Generate Excel file
    const buffer = await exportReportsToExcel(filteredCompletions, schedules, month, year);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const filename = `reports-${monthNames[month]}-${year}-${new Date().toISOString().split('T')[0]}.xlsx`;

    // Return the file
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting reports:", error);
    return NextResponse.json(
      { success: false, error: "Failed to export reports" },
      { status: 500 }
    );
  }
}

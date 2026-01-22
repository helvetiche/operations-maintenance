import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getEmployees, getSchedules } from "@/lib/firestore-admin";
import { exportEmployeesToExcel } from "@/lib/excel-export";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request); // Still require authentication

    // Get all employees (shared across all users)
    const employees = await getEmployees();
    
    // Get schedules to calculate assignment counts (shared across all users)
    const schedules = await getSchedules();
    const assignmentCounts: Record<string, number> = {};
    
    schedules.forEach((schedule) => {
      if (schedule.status === "active") {
        const employeeId = schedule.personAssigned;
        assignmentCounts[employeeId] = (assignmentCounts[employeeId] || 0) + 1;
      }
    });

    // Generate Excel file
    const buffer = await exportEmployeesToExcel(employees, assignmentCounts);

    // Return the file
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="employees-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Error exporting employees:", error);
    return NextResponse.json(
      { success: false, error: "Failed to export employees" },
      { status: 500 }
    );
  }
}

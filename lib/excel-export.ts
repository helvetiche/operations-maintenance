import ExcelJS from "exceljs";
import { Schedule, Employee, TaskCompletion } from "@/types";
import { calculateNextDeadline } from "./deadline-calculator";

// Helper to convert 24-hour time to 12-hour format with AM/PM
const formatTimeTo12Hour = (time24: string): string => {
  if (!time24 || time24 === "N/A") return "N/A";
  
  const [hours, minutes] = time24.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes)) return time24;
  
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
};

// Helper to format deadline type
const formatDeadlineType = (deadline: Schedule["deadline"]): string => {
  switch (deadline.type) {
    case "daily":
      return `Daily at ${formatTimeTo12Hour(deadline.time || "N/A")}`;
    case "weekly":
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      return `Weekly on ${days[deadline.dayOfWeek || 0]} at ${formatTimeTo12Hour(deadline.time || "N/A")}`;
    case "monthly":
      return `Monthly on day ${deadline.dayOfMonth || 1} at ${formatTimeTo12Hour(deadline.time || "N/A")}`;
    case "monthly-specific":
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `Yearly on ${months[(deadline.month || 1) - 1]} ${deadline.day} at ${formatTimeTo12Hour(deadline.time || "N/A")}`;
    case "interval":
      return `Every ${deadline.days} days at ${formatTimeTo12Hour(deadline.time || "N/A")}`;
    case "hourly":
      return `Every ${deadline.hours} hour(s)`;
    case "per-minute":
      return `Every ${deadline.minutes} minute(s)`;
    case "custom":
      return `Custom: ${deadline.cronExpression || "N/A"}`;
    default:
      return "Unknown";
  }
};

// Helper to format reminder date
const formatReminderDate = (reminder: Schedule["reminderDate"]): string => {
  if (reminder.type === "relative") {
    return `${reminder.daysBefore} days before at ${formatTimeTo12Hour(reminder.time || "N/A")}`;
  } else {
    return reminder.dateTime || "N/A";
  }
};

export async function exportSchedulesToExcel(schedules: Schedule[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Schedules");

  // Set column widths
  worksheet.columns = [
    { header: "Title", key: "title", width: 30 },
    { header: "Description", key: "description", width: 40 },
    { header: "Assigned To", key: "personAssigned", width: 25 },
    { header: "Email", key: "personEmail", width: 30 },
    { header: "Deadline Type", key: "deadlineType", width: 35 },
    { header: "Next Deadline", key: "nextDeadline", width: 20 },
    { header: "Reminder", key: "reminder", width: 30 },
    { header: "Status", key: "status", width: 12 },
    { header: "Created At", key: "createdAt", width: 20 },
  ];

  // Style header row (only columns 1-9)
  const headerRow = worksheet.getRow(1);
  headerRow.height = 25;
  for (let col = 1; col <= 9; col++) {
    const cell = headerRow.getCell(col);
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF053E30" }, // custom emerald
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  }

  // Add data rows
  const now = new Date();
  schedules.forEach((schedule) => {
    const nextDeadline = calculateNextDeadline(schedule.deadline, now, schedule.createdAt);
    
    worksheet.addRow({
      title: schedule.title,
      description: schedule.description,
      personAssigned: schedule.personAssigned,
      personEmail: schedule.personEmail,
      deadlineType: formatDeadlineType(schedule.deadline),
      nextDeadline: nextDeadline.toLocaleDateString(),
      reminder: formatReminderDate(schedule.reminderDate),
      status: schedule.status.toUpperCase(),
      createdAt: new Date(schedule.createdAt).toLocaleDateString(),
    });
  });

  // Style data rows
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.height = 20;
      
      // Style only columns 1-9
      for (let col = 1; col <= 9; col++) {
        const cell = row.getCell(col);
        cell.alignment = { vertical: "middle", wrapText: true };
        
        // Alternate row colors
        if (rowNumber % 2 === 0) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF9FAFB" }, // gray-50
          };
        }
        
        // Add borders
        cell.border = {
          top: { style: "thin", color: { argb: "FFD1D5DB" } },
          left: { style: "thin", color: { argb: "FFD1D5DB" } },
          bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
          right: { style: "thin", color: { argb: "FFD1D5DB" } },
        };
      }
      
      // Status column color coding (column 8)
      const statusCell = row.getCell(8);
      if (statusCell.value === "ACTIVE") {
        statusCell.font = { color: { argb: "FF053E30" }, bold: true };
      } else {
        statusCell.font = { color: { argb: "FF6B7280" }, bold: true };
      }
    }
  });

  // Add borders to header row cells (only columns 1-9)
  for (let col = 1; col <= 9; col++) {
    headerRow.getCell(col).border = {
      top: { style: "thin", color: { argb: "FFD1D5DB" } },
      left: { style: "thin", color: { argb: "FFD1D5DB" } },
      bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
      right: { style: "thin", color: { argb: "FFD1D5DB" } },
    };
  }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function exportEmployeesToExcel(
  employees: Employee[],
  assignmentCounts?: Record<string, number>
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Employees");

  // Set column widths
  worksheet.columns = [
    { header: "Name", key: "name", width: 30 },
    { header: "Email", key: "email", width: 35 },
    { header: "Position", key: "position", width: 30 },
    { header: "Active Assignments", key: "assignments", width: 20 },
    { header: "Created At", key: "createdAt", width: 20 },
  ];

  // Style header row (only columns 1-5)
  const headerRow = worksheet.getRow(1);
  headerRow.height = 25;
  for (let col = 1; col <= 5; col++) {
    const cell = headerRow.getCell(col);
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF053E30" }, // custom emerald
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  }

  // Add data rows
  employees.forEach((employee) => {
    worksheet.addRow({
      name: employee.name,
      email: employee.email || "N/A",
      position: employee.position,
      assignments: assignmentCounts?.[employee.id] || 0,
      createdAt: new Date(employee.createdAt).toLocaleDateString(),
    });
  });

  // Style data rows
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.height = 20;
      
      // Style only columns 1-5
      for (let col = 1; col <= 5; col++) {
        const cell = row.getCell(col);
        cell.alignment = { vertical: "middle" };
        
        // Alternate row colors
        if (rowNumber % 2 === 0) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF9FAFB" }, // gray-50
          };
        }
        
        // Add borders
        cell.border = {
          top: { style: "thin", color: { argb: "FFD1D5DB" } },
          left: { style: "thin", color: { argb: "FFD1D5DB" } },
          bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
          right: { style: "thin", color: { argb: "FFD1D5DB" } },
        };
      }
      
      // Highlight high assignment counts (column 4)
      const assignmentCell = row.getCell(4);
      const count = assignmentCell.value as number;
      if (count > 5) {
        assignmentCell.font = { color: { argb: "FFDC2626" }, bold: true };
      } else if (count > 2) {
        assignmentCell.font = { color: { argb: "FFEA580C" }, bold: true };
      }
    }
  });

  // Add borders to header row cells (only columns 1-5)
  for (let col = 1; col <= 5; col++) {
    headerRow.getCell(col).border = {
      top: { style: "thin", color: { argb: "FFD1D5DB" } },
      left: { style: "thin", color: { argb: "FFD1D5DB" } },
      bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
      right: { style: "thin", color: { argb: "FFD1D5DB" } },
    };
  }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function exportReportsToExcel(
  completions: TaskCompletion[],
  schedules: Schedule[],
  month: number,
  year: number
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  // Create worksheet for the selected month
  const monthSheet = workbook.addWorksheet(`${monthNames[month]} ${year}`);
  
  // Set column widths
  monthSheet.columns = [
    { key: "number", width: 8 },
    { key: "accomplishment", width: 40 },
    { key: "time", width: 15 },
    { key: "completedBy", width: 30 },
    { key: "status", width: 15 },
  ];
  
  // Group completions by day
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const completionsByDay: Record<number, TaskCompletion[]> = {};
  
  completions.forEach((completion) => {
    const date = new Date(completion.completedAt);
    const day = date.getDate();
    if (!completionsByDay[day]) {
      completionsByDay[day] = [];
    }
    completionsByDay[day].push(completion);
  });
  
  let currentRow = 1;
  
  // Iterate through each day of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayCompletions = completionsByDay[day] || [];
    
    // Skip days with no completions
    if (dayCompletions.length === 0) continue;
    
    // Add day title row - only merge columns A to E
    const dayTitle = `${monthNames[month]} ${day}, ${year} Accomplishments`;
    monthSheet.mergeCells(currentRow, 1, currentRow, 5);
    const titleCell = monthSheet.getCell(currentRow, 1);
    titleCell.value = dayTitle;
    titleCell.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF053E30" }, // custom emerald
    };
    titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    titleCell.border = {
      top: { style: "medium", color: { argb: "FF053E30" } },
      left: { style: "medium", color: { argb: "FF053E30" } },
      bottom: { style: "medium", color: { argb: "FF053E30" } },
      right: { style: "medium", color: { argb: "FF053E30" } },
    };
    monthSheet.getRow(currentRow).height = 30;
    currentRow++;
    
    // Add header row for this day's accomplishments
    const headerRow = monthSheet.getRow(currentRow);
    headerRow.values = ["#", "Accomplishment", "Time", "Completed By", "Status"];
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 25;
    
    // Style and add borders to header cells (only columns 1-5)
    for (let col = 1; col <= 5; col++) {
      const cell = headerRow.getCell(col);
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0A6B52" }, // lighter custom emerald
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FF0A6B52" } },
        left: { style: "thin", color: { argb: "FFD1D5DB" } },
        bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
        right: { style: "thin", color: { argb: "FFD1D5DB" } },
      };
    }
    currentRow++;
    
    // Sort completions by time (most recent first)
    const sortedCompletions = dayCompletions.sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );
    
    // Add accomplishment rows
    sortedCompletions.forEach((completion, index) => {
      const schedule = schedules.find(s => s.id === completion.scheduleId);
      const completedDate = new Date(completion.completedAt);
      
      const row = monthSheet.getRow(currentRow);
      row.values = [
        index + 1,
        schedule?.title || "Unknown Task",
        completedDate.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
        completion.completedByName || completion.completedBy,
        "✓ Completed",
      ];
      
      // Style the row
      row.alignment = { vertical: "middle", wrapText: true };
      row.height = 20;
      
      // Alternate row colors and add borders (only columns 1-5)
      for (let col = 1; col <= 5; col++) {
        const cell = row.getCell(col);
        
        // Alternate row colors
        if (index % 2 === 0) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF9FAFB" }, // gray-50
          };
        }
        
        // Add borders
        cell.border = {
          top: { style: "thin", color: { argb: "FFD1D5DB" } },
          left: { style: "thin", color: { argb: "FFD1D5DB" } },
          bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
          right: { style: "thin", color: { argb: "FFD1D5DB" } },
        };
      }
      
      // Center align number and status columns
      row.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
      row.getCell(5).alignment = { vertical: "middle", horizontal: "center" };
      row.getCell(5).font = { color: { argb: "FF053E30" }, bold: true };
      
      currentRow++;
    });
    
    // Add empty row between days (no styling)
    currentRow++;
  }
  
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

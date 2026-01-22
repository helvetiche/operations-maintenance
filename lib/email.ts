import nodemailer from "nodemailer";
import { Schedule } from "@/types";

// Email configuration from environment variables
const getEmailConfig = () => {
  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT || "587", 10);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    throw new Error("Email configuration missing. Check EMAIL_HOST, EMAIL_USER, and EMAIL_PASS environment variables.");
  }

  return { host, port, user, pass };
};

// Create reusable transporter
const createTransporter = () => {
  const config = getEmailConfig();
  
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465, // true for 465, false for other ports
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
};

// Format deadline type for human-readable display
const formatDeadlineType = (schedule: Schedule): string => {
  const { deadline } = schedule;
  
  switch (deadline.type) {
    case "daily":
      return `Daily${deadline.time ? ` at ${deadline.time}` : ""}`;
    case "weekly": {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dayName = days[deadline.dayOfWeek ?? 0];
      return `Every ${dayName}${deadline.time ? ` at ${deadline.time}` : ""}`;
    }
    case "monthly":
      return `Monthly on day ${deadline.dayOfMonth ?? 1}${deadline.time ? ` at ${deadline.time}` : ""}`;
    case "monthly-specific": {
      const months = ["", "January", "February", "March", "April", "May", "June", 
                      "July", "August", "September", "October", "November", "December"];
      const monthName = months[deadline.month ?? 1];
      return `Annually on ${monthName} ${deadline.day ?? 1}${deadline.time ? ` at ${deadline.time}` : ""}`;
    }
    case "interval":
      return `Every ${deadline.days ?? 1} day(s)${deadline.time ? ` at ${deadline.time}` : ""}`;
    case "hourly":
      const hours = deadline.hours ?? 1;
      return hours === 1 ? `Every hour` : `Every ${hours} hours`;
    case "per-minute":
      const minutes = deadline.minutes ?? 1;
      return minutes === 1 ? `Every minute` : `Every ${minutes} minutes`;
    case "custom":
      return "Custom schedule";
    default:
      return "Scheduled";
  }
};

// Generate HTML email template - Using custom NIA template
const generateEmailHTML = (schedule: Schedule, deadlineDate: Date): string => {
  const formattedDeadline = deadlineDate.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const currentYear = new Date().getFullYear();

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Email</title>
    <link href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>* {font-family: Google Sans}</style>
  </head>
  <body style="margin:0; padding:0; background-color:#FFFBEB; font-family: Arial, Helvetica, sans-serif;">
    <!-- Wrapper -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#FFFBEB; padding:24px 0;">
      <tr>
        <td align="center">
          <!-- Container -->
          <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#FFFFFF; border-collapse:collapse;">
            <!-- Header -->
            <tr>
              <td style="background-color:#059669; padding:20px 24px;">
                <h1 style="margin:0; font-size:20px; line-height:1.3; color:#FFFFFF; font-weight:600;">National Irrigation Administration</h1>
                <p style="margin:4px 0 0; font-size:13px; color:#D1FAE5;">Operation and Maintenance (O&M)</p>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:24px; color:#1F2937; font-size:14px; line-height:1.6;">
                <h2 style="margin:0 0 12px; font-size:16px; color:#047857; font-weight:600;">Hello ${schedule.personAssigned},</h2>
                <p style="margin:0 0 16px; text-align:justify;">We would like to remind you that ${schedule.title} is due on ${formattedDeadline}. Please be informed that this task requires your timely attention to ensure compliance and avoid any possible delays or issues.</p>
                ${schedule.description ? `<p style="margin:0 0 16px; text-align:justify;">${schedule.description}</p>` : ''}
                <!-- Highlight Box -->
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#FEF3C7; border:1px solid #FDE68A; margin:16px 0;">
                  <tr>
                    <td style="padding:16px;">
                      <p style="margin:0; font-size:14px;"><strong style="color:#047857;">Schedule:</strong> ${formatDeadlineType(schedule)}</p>
                      <p style="margin:8px 0 0; font-size:14px;"><strong style="color:#047857;">Deadline:</strong> ${formattedDeadline}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background-color:#FEF3C7; padding:16px 24px; text-align:center; font-size:12px; color:#4B5563;">
                <p style="margin:0;">© ${currentYear} NIA All rights reserved.</p>
                <p style="margin:6px 0 0;"></p>
              </td>
            </tr>
          </table>
          <!-- End Container -->
        </td>
      </tr>
    </table>
    <!-- End Wrapper -->
  </body>
  </html>
  `.trim();
};

// Generate plain text fallback
const generateEmailText = (schedule: Schedule, deadlineDate: Date): string => {
  const formattedDeadline = deadlineDate.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
⏰ REMINDER: ${schedule.title}

${schedule.description ? `${schedule.description}\n\n` : ""}Deadline: ${formattedDeadline}
Schedule: ${formatDeadlineType(schedule)}
Assigned to: ${schedule.personAssigned}

---
This is an automated reminder from NIA Reminder System.
  `.trim();
};

export interface SendReminderResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send a reminder email for a schedule
 */
export const sendReminderEmail = async (
  schedule: Schedule,
  deadlineDate: Date
): Promise<SendReminderResult> => {
  try {
    const config = getEmailConfig();
    const transporter = createTransporter();

    const subject = `⏰ Reminder: ${schedule.title}`;
    
    const mailOptions = {
      from: `"Operation & Maintenance (O&M)" <${config.user}>`,
      to: schedule.personEmail,
      subject,
      text: generateEmailText(schedule, deadlineDate),
      html: generateEmailHTML(schedule, deadlineDate),
    };

    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error sending email";
    console.error(`Failed to send reminder email for schedule ${schedule.id}:`, errorMessage);
    
    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Verify email configuration is valid
 */
export const verifyEmailConfig = async (): Promise<{ valid: boolean; error?: string }> => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    return { valid: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { valid: false, error: errorMessage };
  }
};

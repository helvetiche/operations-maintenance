// Initialize security checks on app startup
import { validateEnvironmentVariables } from "./security";

// Validate environment variables on module load
if (typeof window === "undefined") {
  // Only run on server-side
  try {
    validateEnvironmentVariables();
  } catch (error) {
    // Log error but don't crash in development
    if (process.env.NODE_ENV === "production") {
      throw error;
    } else {
      console.warn("Security validation warning:", error instanceof Error ? error.message : error);
    }
  }
}

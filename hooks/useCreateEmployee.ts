import { useState } from "react";
import { Employee, ApiResponse } from "@/types";

interface CreateEmployeeData {
  name: string;
  email: string;
  position: string;
}

interface UseCreateEmployeeResult {
  createEmployee: (data: CreateEmployeeData) => Promise<Employee | null>;
  loading: boolean;
  error: string | null;
}

export const useCreateEmployee = (): UseCreateEmployeeResult => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createEmployee = async (data: CreateEmployeeData): Promise<Employee | null> => {
    try {
      setLoading(true);
      setError(null);

      // Get CSRF token
      const csrfResponse = await fetch("/api/csrf", {
        credentials: "include",
        cache: "no-store", // Ensure fresh token
      });
      
      if (!csrfResponse.ok) {
        throw new Error(`Failed to get CSRF token: HTTP ${csrfResponse.status}`);
      }
      
      const csrfData: ApiResponse<{ csrfToken: string }> = await csrfResponse.json();
      
      if (!csrfData.success || !csrfData.data) {
        throw new Error("Failed to get CSRF token: " + (csrfData.error || "Unknown error"));
      }

      const response = await fetch("/api/employees", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfData.data.csrfToken,
        },
        body: JSON.stringify(data),
      });

      const result: ApiResponse<{ employee: Employee }> = await response.json();

      if (!response.ok || !result.success || !result.data) {
        const errorMsg = result.error || result.message || `HTTP ${response.status}: Failed to create employee`;
        console.error("Employee creation error:", {
          status: response.status,
          error: result.error,
          message: result.message,
          result,
        });
        throw new Error(errorMsg);
      }

      return result.data.employee;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    createEmployee,
    loading,
    error,
  };
};

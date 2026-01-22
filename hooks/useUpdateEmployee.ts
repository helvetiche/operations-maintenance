import { useState } from "react";
import { Employee, ApiResponse } from "@/types";

interface UpdateEmployeeData {
  name?: string;
  email?: string;
  position?: string;
}

interface UseUpdateEmployeeResult {
  updateEmployee: (id: string, data: UpdateEmployeeData) => Promise<Employee | null>;
  loading: boolean;
  error: string | null;
}

export const useUpdateEmployee = (): UseUpdateEmployeeResult => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateEmployee = async (
    id: string,
    data: UpdateEmployeeData
  ): Promise<Employee | null> => {
    try {
      setLoading(true);
      setError(null);

      // Get CSRF token
      const csrfResponse = await fetch("/api/csrf", {
        credentials: "include",
      });
      const csrfData: ApiResponse<{ csrfToken: string }> = await csrfResponse.json();
      
      if (!csrfData.success || !csrfData.data) {
        throw new Error("Failed to get CSRF token");
      }

      const response = await fetch(`/api/employees/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfData.data.csrfToken,
        },
        body: JSON.stringify(data),
      });

      const result: ApiResponse<{ employee: Employee }> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to update employee");
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
    updateEmployee,
    loading,
    error,
  };
};

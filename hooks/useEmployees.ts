import { useState, useEffect } from "react";
import { Employee, ApiResponse } from "@/types";

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface UseEmployeesResult {
  employees: Employee[];
  loading: boolean;
  error: string | null;
  pagination: PaginationInfo | null;
  refetch: () => Promise<void>;
  goToPage: (page: number) => Promise<void>;
}

interface UseEmployeesOptions {
  limit?: number;
  initialPage?: number;
}

export const useEmployees = (options: UseEmployeesOptions = {}): UseEmployeesResult => {
  const { limit = 6, initialPage = 1 } = options;
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);

  const fetchEmployees = async (page: number = currentPage) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: limit.toString(),
        page: page.toString(),
      });

      const response = await fetch(`/api/employees?${params}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data: ApiResponse<{ employees: Employee[]; pagination: PaginationInfo }> = await response.json();

      if (!data.success || !data.data) {
        throw new Error(data.error || "Failed to fetch employees");
      }

      setEmployees(data.data.employees);
      setPagination(data.data.pagination);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setEmployees([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  const goToPage = async (page: number) => {
    await fetchEmployees(page);
  };

  useEffect(() => {
    fetchEmployees(initialPage);
  }, []);

  return {
    employees,
    loading,
    error,
    pagination,
    refetch: () => fetchEmployees(currentPage),
    goToPage,
  };
};

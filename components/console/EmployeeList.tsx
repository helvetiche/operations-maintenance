"use client";

import { useState, useEffect, useMemo } from "react";
import { Employee } from "@/types";
import { User, Pencil, Trash, Envelope, Briefcase, Gear } from "phosphor-react";

interface EmployeeListProps {
  employees: Employee[];
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
  deleteLoading?: string | null;
  sortBy?: "a-z" | "z-a" | "highest-assignments" | "lowest-assignments";
}

interface CachedEmployee {
  email: string;
  name: string;
  taskCount: number;
  tasks: Array<{ id: string; title: string; status: string }>;
}

export const EmployeeList = ({ employees, onEdit, onDelete, deleteLoading, sortBy = "a-z" }: EmployeeListProps) => {
  const [cachedEmployees, setCachedEmployees] = useState<CachedEmployee[]>([]);
  const [loadingCache, setLoadingCache] = useState(true);

  useEffect(() => {
    const fetchCachedEmployees = async () => {
      try {
        setLoadingCache(true);
        const response = await fetch("/api/employees/cached", {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();
        if (data.success && data.data) {
          setCachedEmployees(data.data.employees || []);
        }
      } catch (err) {
        console.error("Failed to fetch cached employees:", err);
        setCachedEmployees([]);
      } finally {
        setLoadingCache(false);
      }
    };

    fetchCachedEmployees();
  }, []);

  // Create a map of email to task count for quick lookup
  const taskCountMap = useMemo(() => {
    const map = new Map<string, number>();
    cachedEmployees.forEach(emp => {
      map.set(emp.email, emp.taskCount);
    });
    return map;
  }, [cachedEmployees]);

  // Sort employees by assignments if needed
  const sortedEmployees = useMemo(() => {
    const employeesWithCounts = employees.map(emp => ({
      employee: emp,
      taskCount: taskCountMap.get(emp.email) ?? 0,
    }));

    if (sortBy === "highest-assignments") {
      return employeesWithCounts.sort((a, b) => b.taskCount - a.taskCount).map(e => e.employee);
    } else if (sortBy === "lowest-assignments") {
      return employeesWithCounts.sort((a, b) => a.taskCount - b.taskCount).map(e => e.employee);
    }

    return employees;
  }, [employees, sortBy, taskCountMap]);

  // Create array of 6 items, filling with employees and empty rows
  const displayRows = useMemo(() => {
    const rows: (Employee | null)[] = [...sortedEmployees];
    while (rows.length < 6) {
      rows.push(null); // Add empty rows
    }
    return rows.slice(0, 6); // Ensure exactly 6 rows
  }, [sortedEmployees]);

  if (employees.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg text-center py-8 lg:py-12 px-4">
        <User size={40} weight="light" className="mx-auto text-emerald-900/40 mb-3 lg:mb-4 lg:w-12 lg:h-12" />
        <h3 className="text-base lg:text-lg font-regular text-emerald-900 mb-2">No employees yet</h3>
        <p className="text-xs lg:text-sm font-regular text-emerald-900/60">
          Create your first employee preset to get started
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden lg:block bg-gray-50 border border-emerald-900/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-emerald-900 border-b border-emerald-900/20">
                <th className="px-6 py-4 text-left text-sm font-light text-gray-50 border-r border-emerald-900/20">
                  <div className="flex items-center gap-2">
                    <User size={16} weight="light" />
                    <span>Name</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-center text-sm font-light text-gray-50 border-r border-emerald-900/20">
                  <div className="flex items-center justify-center gap-2">
                    <Briefcase size={16} weight="light" />
                    <span>Assignments</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-light text-gray-50 border-r border-emerald-900/20">
                  <div className="flex items-center gap-2">
                    <Briefcase size={16} weight="light" />
                    <span>Position</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-right text-sm font-light text-gray-50">
                  <div className="flex items-center justify-end gap-2">
                    <Gear size={16} weight="light" />
                    <span>Actions</span>
                  </div>
                </th>
              </tr>
            </thead>
          <tbody>
            {displayRows.map((employee, index) => {
              if (!employee) {
                // Empty row
                return (
                  <tr key={`empty-${index}`} className="border-b border-emerald-900/10">
                    <td className="px-6 py-4 border-r border-emerald-900/10 h-16">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex-shrink-0"></div>
                        <div className="flex flex-col">
                          <span className="text-sm font-regular text-transparent">-</span>
                          <span className="text-xs font-regular text-transparent">-</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 border-r border-emerald-900/10">
                      <div className="flex items-center justify-center">
                        <span className="text-sm font-regular text-transparent">-</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 border-r border-emerald-900/10">
                      <span className="text-sm font-regular text-transparent">-</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-9 h-9"></div>
                        <div className="w-9 h-9"></div>
                      </div>
                    </td>
                  </tr>
                );
              }

              const isIncomplete = !employee.email.trim();
              const taskCount = taskCountMap.get(employee.email) ?? 0;
              return (
              <tr
                key={employee.id}
                className={`transition-colors border-b border-emerald-900/10 ${
                  isIncomplete 
                    ? 'bg-red-50/50 hover:bg-red-100/50' 
                    : 'hover:bg-gray-100/50'
                }`}
              >
                <td className="px-6 py-4 border-r border-emerald-900/10">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <div className={`p-2 rounded-full w-10 h-10 flex items-center justify-center ${
                        isIncomplete ? 'bg-red-600' : 'bg-emerald-900'
                      }`}>
                        <span className="text-sm font-regular text-gray-50 uppercase">
                          {employee.name.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-gray-50 rounded-full flex items-center justify-center border-2 border-emerald-900">
                        <User size={12} weight="fill" className="text-emerald-900" />
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-regular text-emerald-900">
                        {employee.name}
                      </span>
                      {employee.email ? (
                        <span className="text-xs font-regular font-mono text-emerald-900/60">
                          {employee.email}
                        </span>
                      ) : (
                        <span className="text-xs font-regular italic text-red-600">
                          No email
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 border-r border-emerald-900/10">
                  <div className="flex items-center justify-center">
                    {loadingCache ? (
                      <div className="h-3 w-3 border-2 border-gray-200 border-t-emerald-900 rounded-full animate-spin"></div>
                    ) : (
                      <span className="text-sm font-regular text-emerald-900">
                        {taskCount}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 border-r border-emerald-900/10">
                  <span className="text-sm font-regular text-emerald-900/80">
                    {employee.position}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(employee)}
                      className="p-2 text-emerald-900 hover:bg-emerald-900/10 transition-colors"
                      title="Edit"
                      aria-label={`Edit ${employee.name}`}
                    >
                      <Pencil size={18} weight="light" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(employee)}
                      disabled={deleteLoading === employee.id}
                      className="p-2 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete"
                      aria-label={`Delete ${employee.name}`}
                    >
                      <Trash size={18} weight="light" />
                    </button>
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>
    </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {sortedEmployees.map((employee) => {
          const isIncomplete = !employee.email.trim();
          const taskCount = taskCountMap.get(employee.email) ?? 0;
          return (
          <div
            key={employee.id}
            className={`rounded-lg border p-4 ${
              isIncomplete 
                ? 'bg-red-50/50 border-red-200' 
                : 'bg-gray-50 border-emerald-900/20'
            }`}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="relative flex-shrink-0">
                <div className={`p-2 rounded-full w-10 h-10 flex items-center justify-center ${
                  isIncomplete ? 'bg-red-600' : 'bg-emerald-900'
                }`}>
                  <span className="text-sm font-regular text-gray-50 uppercase">
                    {employee.name.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-gray-50 rounded-full flex items-center justify-center border-2 border-emerald-900">
                  <User size={12} weight="fill" className="text-emerald-900" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-regular text-emerald-900 truncate mb-1">
                  {employee.name}
                </h3>
                <div className="flex items-center gap-2 text-xs font-regular text-emerald-900/60 mb-1">
                  <Envelope size={14} weight="light" />
                  {employee.email ? (
                    <span className="font-mono truncate">{employee.email}</span>
                  ) : (
                    <span className="italic text-red-600">No email</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs font-regular text-emerald-900/60">
                  <Briefcase size={14} weight="light" />
                  <span>{employee.position}</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                {loadingCache ? (
                  <div className="h-3 w-3 border-2 border-gray-200 border-t-emerald-900 rounded-full animate-spin"></div>
                ) : (
                  <span className="text-sm font-regular text-emerald-900">
                    {taskCount}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-emerald-900/10">
              <button
                type="button"
                onClick={() => onEdit(employee)}
                className="px-3 py-1.5 text-sm font-regular text-emerald-900 hover:bg-emerald-900/10 rounded-md transition-colors flex items-center gap-2"
                title="Edit"
                aria-label={`Edit ${employee.name}`}
              >
                <Pencil size={16} weight="light" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={() => onDelete(employee)}
                disabled={deleteLoading === employee.id}
                className="px-3 py-1.5 text-sm font-regular text-red-600 hover:bg-red-50 rounded-md transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete"
                aria-label={`Delete ${employee.name}`}
              >
                <Trash size={16} weight="light" />
                <span>{deleteLoading === employee.id ? "Deleting..." : "Delete"}</span>
              </button>
            </div>
          </div>
        )})}
      </div>
    </>
  );
};

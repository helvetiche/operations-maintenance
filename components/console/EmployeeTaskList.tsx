"use client";

import { useState, useEffect, useMemo } from "react";
import { Users, Envelope, MagnifyingGlass, X } from "phosphor-react";

interface CachedEmployee {
  email: string;
  name: string;
  taskCount: number;
  tasks: Array<{ id: string; title: string; status: string }>;
}

export const EmployeeTaskList = () => {
  const [employees, setEmployees] = useState<CachedEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cacheExists, setCacheExists] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchCachedEmployees = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/employees/cached", {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (!data.success || !data.data) {
          throw new Error(data.error || "Failed to fetch cached employees");
        }

        setEmployees(data.data.employees || []);
        setCacheExists(data.data.cacheExists);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setEmployees([]);
        setCacheExists(false);
      } finally {
        setLoading(false);
      }
    };

    fetchCachedEmployees();
  }, []);

  // Filter employees based on search query
  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) {
      return employees;
    }
    
    const query = searchQuery.toLowerCase();
    return employees.filter(employee => 
      employee.name.toLowerCase().includes(query) ||
      employee.email.toLowerCase().includes(query) ||
      employee.tasks.some(task => task.title.toLowerCase().includes(query))
    );
  }, [employees, searchQuery]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-2">
          <div className="h-4 bg-emerald-900/20 w-24 animate-pulse"></div>
          <div className="h-4 bg-emerald-900/20 w-16 animate-pulse"></div>
        </div>

        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-100 p-3 border-l-4 border-emerald-900 animate-pulse">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-emerald-900/20 rounded-full flex-shrink-0"></div>
              <div className="flex-1 min-w-0">
                <div className="h-4 bg-emerald-900/20 w-24 mb-2"></div>
                <div className="h-3 bg-emerald-900/20 w-32"></div>
              </div>
              <div className="w-6 h-6 bg-emerald-900/20 rounded-full flex-shrink-0"></div>
            </div>
            <div className="space-y-1.5 pl-2 border-l-2 border-emerald-900/20">
              <div className="h-3 bg-emerald-900/20 w-28"></div>
              <div className="h-3 bg-emerald-900/20 w-24"></div>
              <div className="h-3 bg-emerald-900/20 w-20"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !cacheExists) {
    return (
      <div className="text-center py-8">
        <Users size={32} weight="light" className="mx-auto text-emerald-900/40 mb-3" />
        <p className="text-sm font-regular text-emerald-900/60">
          {error || "No cache found. Please sync cache."}
        </p>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="text-center py-8">
        <Users size={32} weight="light" className="mx-auto text-emerald-900/40 mb-3" />
        <p className="text-sm font-regular text-emerald-900/60">No employees with tasks</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-regular text-emerald-900 uppercase tracking-wide">
          People & Tasks
        </h3>
        <span className="text-xs font-regular text-emerald-900/60">
          {searchQuery.trim() ? filteredEmployees.length : employees.length} {(searchQuery.trim() ? filteredEmployees.length : employees.length) === 1 ? "person" : "people"}
        </span>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <MagnifyingGlass 
          size={16} 
          weight="light" 
          className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-900/60" 
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search people or tasks..."
          className="w-full pl-9 pr-9 py-2 text-sm border border-emerald-900/20 focus:outline-none focus:border-emerald-900 bg-white"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-900/60 hover:text-emerald-900"
          >
            <X size={16} weight="bold" />
          </button>
        )}
      </div>

      {filteredEmployees.length === 0 && searchQuery.trim() ? (
        <div className="text-center py-8">
          <MagnifyingGlass size={32} weight="light" className="mx-auto text-emerald-900/40 mb-3" />
          <p className="text-sm font-regular text-emerald-900/60">No people found</p>
        </div>
      ) : (
        filteredEmployees.map(employee => (
        <div
          key={employee.email}
          className="bg-gray-100 p-3 border-l-4 border-emerald-900  hover:border-emerald-900/30 transition-colors"
        >
          {/* Employee Header */}
          <div className="flex items-start gap-3 mb-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-emerald-900 rounded-full flex items-center justify-center">
                <span className="text-sm font-regular text-gray-50 uppercase">
                  {employee.name.charAt(0) || employee.email.charAt(0)}
                </span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-regular text-emerald-900 truncate">
                {employee.name}
              </p>
              <p className="text-xs font-regular text-emerald-900/60 truncate">
                {employee.email}
              </p>
            </div>
            <div className="flex-shrink-0">
              <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-regular text-gray-50 bg-emerald-900 rounded-full">
                {employee.taskCount}
              </span>
            </div>
          </div>

          {/* Task List */}
          <div className="space-y-1.5 pl-2 border-l-2 border-emerald-900/20">
            {employee.tasks.slice(0, 3).map(task => (
              <div key={task.id} className="flex items-start gap-2">
                <Envelope size={12} weight="fill" className="text-emerald-900/40 mt-0.5 flex-shrink-0" />
                <span className="text-xs font-regular text-emerald-900/70 line-clamp-1">
                  {task.title}
                </span>
              </div>
            ))}
            {employee.tasks.length > 3 && (
              <div className="text-xs font-regular text-emerald-900/40 pl-4">
                +{employee.tasks.length - 3} more task{employee.tasks.length - 3 !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        </div>
        ))
      )}
    </div>
  );
};

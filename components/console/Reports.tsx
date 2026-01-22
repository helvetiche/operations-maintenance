"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useCompletions } from "@/hooks/useCompletions";
import { useCachedCalendarSchedules } from "@/hooks/useCachedCalendarSchedules";
import { useExportReports } from "@/hooks/useExportReports";
import { Schedule } from "@/types";
import { CheckCircle, CaretLeft, CaretRight, CalendarBlank, MagnifyingGlass, ChartBar, DownloadSimple } from "phosphor-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const ROWS_PER_PAGE = 6;

const getOrdinalSuffix = (n: number): string => {
  if (n > 3 && n < 21) return "th";
  switch (n % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
};

export const Reports = () => {
  const currentDate = new Date();
  
  // Consolidated date state
  const [selectedDate, setSelectedDate] = useState({
    year: currentDate.getFullYear(),
    month: currentDate.getMonth(),
    day: currentDate.getDate(),
  });
  
  // Pagination state
  const [tablePage, setTablePage] = useState(1);
  const [pageInput, setPageInput] = useState("");
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const { completions, loading: completionsLoading, refetch } = useCompletions();
  const { schedules, loading: schedulesLoading } = useCachedCalendarSchedules();
  const { exportReports, loading: exporting } = useExportReports();

  // Handle completion change events
  useEffect(() => {
    const handleCompletionChange = () => {
      refetch();
    };

    window.addEventListener('taskCompletionChanged', handleCompletionChange);
    
    return () => {
      window.removeEventListener('taskCompletionChanged', handleCompletionChange);
    };
  }, [refetch]);

  const loading = completionsLoading || schedulesLoading;

  // Create schedule lookup map for O(1) access
  const scheduleMap = useMemo(() => {
    const map = new Map<string, Schedule>();
    schedules.forEach((schedule) => {
      map.set(schedule.id, schedule);
    });
    return map;
  }, [schedules]);

  // Calculate completions per month
  const completionsPerMonth = useMemo(() => {
    const counts: Record<number, number> = {};
    
    completions.forEach((completion) => {
      const date = new Date(completion.completedAt);
      if (date.getFullYear() === selectedDate.year) {
        const month = date.getMonth();
        counts[month] = (counts[month] || 0) + 1;
      }
    });
    
    return counts;
  }, [completions, selectedDate.year]);

  const daysInMonth = new Date(selectedDate.year, selectedDate.month + 1, 0).getDate();

  // Filter completions for selected day
  const dayCompletions = useMemo(() => {
    const startOfDay = new Date(selectedDate.year, selectedDate.month, selectedDate.day, 0, 0, 0);
    const endOfDay = new Date(selectedDate.year, selectedDate.month, selectedDate.day, 23, 59, 59);

    let filtered = completions.filter((completion) => {
      const completedDate = new Date(completion.completedAt);
      return completedDate >= startOfDay && completedDate <= endOfDay;
    });

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((completion) => {
        const schedule = scheduleMap.get(completion.scheduleId);
        const taskTitle = schedule?.title.toLowerCase() || "";
        const completedBy = completion.completedBy.toLowerCase();
        return taskTitle.includes(query) || completedBy.includes(query);
      });
    }

    // Apply type filter
    if (filterType !== "all") {
      filtered = filtered.filter((completion) => completion.deadlineType === filterType);
    }

    return filtered;
  }, [completions, selectedDate, searchQuery, filterType, scheduleMap]);

  // Get unique task types for filter pills (sorted for consistency)
  const taskTypes = useMemo(() => {
    const types = Array.from(new Set(completions.map((c) => c.deadlineType))).sort();
    return ["all", ...types];
  }, [completions]);

  // Paginate table data
  const paginatedCompletions = useMemo(() => {
    const sorted = [...dayCompletions].sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );
    const startIndex = (tablePage - 1) * ROWS_PER_PAGE;
    const endIndex = startIndex + ROWS_PER_PAGE;
    
    return sorted.slice(startIndex, endIndex);
  }, [dayCompletions, tablePage]);

  const totalTablePages = Math.ceil(dayCompletions.length / ROWS_PER_PAGE);

  // Helper functions
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }, []);

  const getScheduleTitle = useCallback((scheduleId: string) => {
    return scheduleMap.get(scheduleId)?.title || "Unknown Task";
  }, [scheduleMap]);

  const handleMonthChange = useCallback((month: number) => {
    setSelectedDate((prev) => ({
      ...prev,
      month,
      day: 1,
    }));
    setTablePage(1);
  }, []);

  const handleDayChange = useCallback((day: number) => {
    if (day >= 1 && day <= daysInMonth) {
      setSelectedDate((prev) => ({
        ...prev,
        day,
      }));
      setTablePage(1);
    }
  }, [daysInMonth]);

  const handlePageInputSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInput);
    if (!isNaN(page) && page >= 1 && page <= daysInMonth) {
      handleDayChange(page);
      setPageInput("");
    }
  }, [pageInput, daysInMonth, handleDayChange]);

  const getVisiblePages = useCallback(() => {
    const pages: number[] = [];
    
    if (daysInMonth <= 4) {
      for (let i = 1; i <= daysInMonth; i++) {
        pages.push(i);
      }
    } else {
      if (selectedDate.day <= 2) {
        pages.push(1, 2, 3, 4);
      } else if (selectedDate.day >= daysInMonth - 1) {
        pages.push(daysInMonth - 3, daysInMonth - 2, daysInMonth - 1, daysInMonth);
      } else {
        pages.push(selectedDate.day - 1, selectedDate.day, selectedDate.day + 1, selectedDate.day + 2);
      }
    }
    
    return pages;
  }, [daysInMonth, selectedDate.day]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div>
          <div className="h-8 bg-emerald-900/20 w-32 mb-2"></div>
          <div className="h-4 bg-emerald-900/10 w-64"></div>
        </div>

        {/* Month Selector Skeleton */}
        <div>
          <div className="h-4 bg-emerald-900/20 w-24 mb-3"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-200"></div>
            ))}
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="bg-gray-100 p-6 border border-emerald-900/10">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-emerald-900/20 w-64"></div>
            <div className="flex items-center gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 w-16 bg-gray-200"></div>
              ))}
            </div>
          </div>

          {/* Search and Filter Skeleton */}
          <div className="mb-4 space-y-3">
            <div className="h-10 bg-white border border-emerald-900/20"></div>
            <div className="flex items-center gap-2">
              <div className="h-4 bg-emerald-900/20 w-12"></div>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-6 w-16 bg-gray-200 rounded-full"></div>
              ))}
            </div>
          </div>

          {/* Table Skeleton */}
          <div className="bg-white border border-emerald-900/20">
            <div className="bg-emerald-900 p-3">
              <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-4 bg-emerald-800"></div>
                ))}
              </div>
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`p-3 border-b border-emerald-900/10 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                <div className="grid grid-cols-4 gap-4">
                  <div className="h-4 bg-emerald-900/20"></div>
                  <div className="h-4 bg-emerald-900/20"></div>
                  <div className="h-4 bg-emerald-900/20"></div>
                  <div className="h-4 bg-emerald-900/20 mx-auto w-5"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Skeleton */}
          <div className="mt-4 flex items-center justify-between">
            <div className="h-4 bg-emerald-900/20 w-48"></div>
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 bg-gray-200"></div>
              <div className="h-4 bg-emerald-900/20 w-24"></div>
              <div className="h-10 w-10 bg-gray-200"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6 pt-2 lg:pt-0">
      {/* Mobile Header - Simplified */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-900 p-2 rounded-md">
              <ChartBar size={20} weight="light" className="text-gray-50" />
            </div>
            <div>
              <h1 className="text-xl font-regular text-emerald-900">Reports</h1>
              <p className="text-xs font-regular text-emerald-900/60">
                Task completion history
              </p>
            </div>
          </div>
          
          {/* Mobile Export Button */}
          {!loading && completions.length > 0 && (
            <button
              type="button"
              onClick={() => exportReports(selectedDate.month, selectedDate.year)}
              disabled={exporting}
              className="flex items-center gap-2 px-3 py-2 bg-emerald-900 hover:bg-emerald-800 text-gray-50 rounded-md transition-colors text-sm font-regular disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export"
            >
              <DownloadSimple size={18} weight="light" />
            </button>
          )}
        </div>
      </div>

      {/* Desktop Header - Full */}
      <div className="hidden lg:flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-900 rounded-md">
            <ChartBar size={24} weight="light" className="text-gray-50" />
          </div>
          <div>
            <h1 className="text-2xl font-regular text-emerald-900">Reports</h1>
            <p className="text-sm font-regular text-emerald-900/60 mt-1">
              View task completion history by date
            </p>
          </div>
        </div>
        
        {/* Desktop Export Button */}
        {!loading && completions.length > 0 && (
          <button
            type="button"
            onClick={() => exportReports(selectedDate.month, selectedDate.year)}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-900 hover:bg-emerald-800 text-gray-50 rounded-md transition-colors text-sm font-regular disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export to Excel"
          >
            <DownloadSimple size={18} weight="light" />
            {exporting ? "Exporting..." : "Export to Excel"}
          </button>
        )}
      </div>

      {/* Month Selection */}
      <div>
        <h2 className="text-sm font-regular text-emerald-900 uppercase tracking-wide mb-3">
          Select Month
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 lg:gap-3">
          {MONTHS.map((month, index) => (
            <button
              key={month}
              onClick={() => handleMonthChange(index)}
              className={`px-3 py-3 lg:py-4 text-sm font-regular transition-colors flex items-center gap-2 rounded-md ${
                selectedDate.month === index
                  ? "bg-emerald-900 text-gray-50"
                  : "bg-gray-100 text-emerald-900 hover:bg-gray-200 border border-emerald-900/20"
              }`}
            >
              <CalendarBlank size={16} weight="light" className="flex-shrink-0" />
              <span className="flex-1 text-left truncate">{month}</span>
              <span className={`text-xs font-regular px-2 py-0.5 rounded-full flex-shrink-0 ${
                selectedDate.month === index
                  ? "bg-gray-50 text-emerald-900"
                  : "bg-emerald-900 text-gray-50"
              }`}>
                {completionsPerMonth[index] || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Day Selection and Results */}
      <div className="bg-gray-50 rounded-lg border border-emerald-900/20 overflow-hidden">
        {/* Day Navigation Header */}
        <div className="bg-emerald-900 px-4 lg:px-6 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <h2 className="text-lg lg:text-xl font-regular text-gray-50">
              Completions for {MONTHS[selectedDate.month]} {selectedDate.day}, {selectedDate.year}
            </h2>

            {/* Mobile Day Navigation */}
            <div className="lg:hidden flex items-center justify-center gap-2">
              <button
                onClick={() => handleDayChange(selectedDate.day - 1)}
                disabled={selectedDate.day === 1}
                className="p-2 bg-emerald-800 text-gray-50 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md"
              >
                <CaretLeft size={16} weight="bold" />
              </button>
              
              <span className="px-4 py-2 bg-gray-50 text-emerald-900 text-sm font-regular rounded-md min-w-[80px] text-center">
                {selectedDate.day}{getOrdinalSuffix(selectedDate.day)}
              </span>
              
              <button
                onClick={() => handleDayChange(selectedDate.day + 1)}
                disabled={selectedDate.day === daysInMonth}
                className="p-2 bg-emerald-800 text-gray-50 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md"
              >
                <CaretRight size={16} weight="bold" />
              </button>
            </div>

            {/* Desktop Day Navigation */}
            <div className="hidden lg:flex items-center gap-2">
              <button
                onClick={() => handleDayChange(selectedDate.day - 1)}
                disabled={selectedDate.day === 1}
                className="p-2 bg-emerald-800 text-gray-50 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md"
              >
                <CaretLeft size={16} weight="bold" />
              </button>

              {getVisiblePages().map((page, index) => (
                <button
                  key={index}
                  onClick={() => handleDayChange(page)}
                  className={`px-4 py-2 text-sm font-regular transition-colors rounded-md ${
                    selectedDate.day === page
                      ? "bg-gray-50 text-emerald-900"
                      : "bg-emerald-800 text-gray-50 hover:bg-emerald-700"
                  }`}
                >
                  {page}{getOrdinalSuffix(page)}
                </button>
              ))}

              <form onSubmit={handlePageInputSubmit} className="flex items-center">
                <input
                  type="number"
                  min="1"
                  max={daysInMonth}
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  placeholder="Day"
                  className="w-16 px-2 py-2 text-sm text-center border border-emerald-900/20 focus:outline-none focus:border-emerald-900 rounded-md"
                />
              </form>

              <button
                onClick={() => handleDayChange(selectedDate.day + 1)}
                disabled={selectedDate.day === daysInMonth}
                className="p-2 bg-emerald-800 text-gray-50 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md"
              >
                <CaretRight size={16} weight="bold" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 lg:p-6">
          {/* Search and Filter */}
          <div className="mb-4 lg:mb-6 space-y-3">
            {/* Search Bar */}
            <div className="relative">
              <MagnifyingGlass size={18} weight="light" className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-900/60" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setTablePage(1);
                }}
                placeholder="Search by task name or completed by..."
                className="w-full pl-10 pr-4 py-2 lg:py-3 text-sm lg:text-base border border-emerald-900/20 focus:outline-none focus:ring-2 focus:ring-emerald-900 bg-white rounded-md"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-regular text-emerald-900/60 uppercase">Filter:</span>
              {taskTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setFilterType(type);
                    setTablePage(1);
                  }}
                  className={`px-3 py-1.5 text-xs font-regular rounded-full transition-colors ${
                    filterType === type
                      ? "bg-emerald-900 text-gray-50"
                      : "bg-gray-100 text-emerald-900 hover:bg-gray-200 border border-emerald-900/20"
                  }`}
                >
                  {type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-white rounded-lg border border-emerald-900/20 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-emerald-900">
                    <th className="text-left py-3 lg:py-4 px-4 lg:px-6 text-xs lg:text-sm font-regular text-gray-50 uppercase tracking-wide border-r border-emerald-800">
                      Task
                    </th>
                    <th className="text-left py-3 lg:py-4 px-4 lg:px-6 text-xs lg:text-sm font-regular text-gray-50 uppercase tracking-wide border-r border-emerald-800">
                      Time
                    </th>
                    <th className="text-left py-3 lg:py-4 px-4 lg:px-6 text-xs lg:text-sm font-regular text-gray-50 uppercase tracking-wide border-r border-emerald-800">
                      Completed By
                    </th>
                    <th className="text-center py-3 lg:py-4 px-4 lg:px-6 text-xs lg:text-sm font-regular text-gray-50 uppercase tracking-wide">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCompletions.length > 0 ? (
                    paginatedCompletions.map((completion, index) => (
                      <tr
                        key={completion.id}
                        className={`border-b border-emerald-900/10 hover:bg-gray-50 transition-colors ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                        }`}
                      >
                        <td className="py-3 lg:py-4 px-4 lg:px-6 border-r border-emerald-900/10">
                          <p className="text-sm lg:text-base font-regular text-emerald-900">
                            {getScheduleTitle(completion.scheduleId)}
                          </p>
                        </td>
                        <td className="py-3 lg:py-4 px-4 lg:px-6 border-r border-emerald-900/10">
                          <p className="text-sm lg:text-base font-regular text-emerald-900">
                            {formatDate(completion.completedAt)}
                          </p>
                        </td>
                        <td className="py-3 lg:py-4 px-4 lg:px-6 border-r border-emerald-900/10">
                          <div>
                            {completion.completedByName && (
                              <p className="text-sm lg:text-base font-regular text-emerald-900">
                                {completion.completedByName}
                              </p>
                            )}
                            <p className="text-xs lg:text-sm font-regular text-emerald-900/60">
                              {completion.completedBy}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 lg:py-4 px-4 lg:px-6 text-center">
                          <CheckCircle size={20} weight="fill" className="text-emerald-900 inline-block" />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="bg-white">
                      <td colSpan={4} className="py-8 lg:py-12 px-4 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <ChartBar size={40} weight="light" className="text-emerald-900/40" />
                          <div>
                            <p className="text-sm lg:text-base font-regular text-emerald-900/60 mb-1">
                              No completions found for this day
                            </p>
                            <p className="text-xs lg:text-sm font-regular text-emerald-900/40">
                              Try selecting a different date or adjusting your filters
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {dayCompletions.length > 0 && (
              <>
                {/* Mobile Pagination */}
                <div className="lg:hidden flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 border-t border-emerald-900/10">
                  <button
                    onClick={() => setTablePage(tablePage - 1)}
                    disabled={tablePage === 1}
                    className="px-3 py-2 text-sm font-regular rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-900 text-gray-50 disabled:bg-gray-300"
                  >
                    ←
                  </button>
                  
                  <span className="px-3 py-2 text-sm font-regular text-emerald-900">
                    {tablePage} of {totalTablePages || 1}
                  </span>
                  
                  <button
                    onClick={() => setTablePage(tablePage + 1)}
                    disabled={tablePage === totalTablePages || totalTablePages === 0}
                    className="px-3 py-2 text-sm font-regular rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-900 text-gray-50 disabled:bg-gray-300"
                  >
                    →
                  </button>
                </div>

                {/* Desktop Pagination */}
                <div className="hidden lg:flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-emerald-900/10">
                  <div className="text-sm text-emerald-900/60">
                    Showing {dayCompletions.length > 0 ? ((tablePage - 1) * ROWS_PER_PAGE) + 1 : 0} to {Math.min(tablePage * ROWS_PER_PAGE, dayCompletions.length)} of {dayCompletions.length} completions
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTablePage(tablePage - 1)}
                      disabled={tablePage === 1}
                      className="p-2 bg-gray-200 text-emerald-900 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md"
                    >
                      <CaretLeft size={16} weight="bold" />
                    </button>
                    <span className="text-sm text-emerald-900 px-3">
                      Page {tablePage} of {totalTablePages || 1}
                    </span>
                    <button
                      onClick={() => setTablePage(tablePage + 1)}
                      disabled={tablePage === totalTablePages || totalTablePages === 0}
                      className="p-2 bg-gray-200 text-emerald-900 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md"
                    >
                      <CaretRight size={16} weight="bold" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

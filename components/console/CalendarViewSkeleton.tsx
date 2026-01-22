"use client";

export const CalendarViewSkeleton = () => {
  return (
    <div className="space-y-4 lg:space-y-6 pt-2 lg:pt-0">
      {/* Calendar Skeleton */}
      <div className="bg-gray-50 p-3 lg:p-4 border border-emerald-900/20 rounded-lg">
        {/* Navigation Skeleton */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-3 lg:mb-4">
          <div className="flex items-center gap-2 lg:gap-4 w-full sm:w-auto justify-between sm:justify-start">
            <div className="w-9 h-9 lg:w-10 lg:h-10 bg-emerald-900/20 animate-pulse rounded-md"></div>
            <div className="h-5 lg:h-6 bg-emerald-900/20 w-40 lg:w-48 animate-pulse rounded"></div>
            <div className="w-9 h-9 lg:w-10 lg:h-10 bg-emerald-900/20 animate-pulse rounded-md"></div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="h-4 lg:h-5 bg-emerald-900/10 w-32 lg:w-40 animate-pulse rounded"></div>
            <div className="w-16 lg:w-20 h-8 lg:h-10 bg-gray-100/50 border border-emerald-900/20 animate-pulse rounded-md"></div>
          </div>
        </div>

        {/* Calendar Grid Skeleton */}
        <div className="grid grid-cols-7 gap-0 border border-emerald-900/20">
          {/* Day Headers */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="text-left py-2 lg:py-3 px-2 lg:px-3 text-xs lg:text-sm font-light text-gray-50 bg-emerald-900 border-r border-b border-emerald-900/20 hidden sm:flex sm:items-center sm:justify-between"
            >
              <span>{day}</span>
              <span className="text-xs lg:text-sm font-light bg-gray-50 text-emerald-900 px-1.5 py-0.5 rounded animate-pulse w-6"></span>
            </div>
          ))}
          {/* Mobile day headers */}
          {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
            <div
              key={`mobile-${index}`}
              className="text-left py-2 px-2 text-xs font-light text-gray-50 bg-emerald-900 border-r border-b border-emerald-900/20 sm:hidden flex items-center justify-between"
            >
              <span>{day}</span>
              <span className="text-[10px] font-light bg-gray-50 text-emerald-900 px-1 py-0.5 rounded animate-pulse w-4"></span>
            </div>
          ))}

          {/* Calendar Days Skeleton */}
          {Array.from({ length: 42 }).map((_, index) => (
            <div
              key={index}
              className={`min-h-[80px] lg:min-h-[100px] p-2 lg:p-3 border-r border-b border-emerald-900/20 bg-gray-50 animate-pulse ${
                (index + 1) % 7 === 0 ? "border-r-0" : ""
              }`}
            >
              <div className="h-3 lg:h-4 bg-emerald-900/20 w-5 lg:w-6 rounded mb-auto"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

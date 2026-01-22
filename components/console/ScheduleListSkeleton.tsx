"use client";

export const ScheduleListSkeleton = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="bg-gray-50 shadow-xl rounded-sm h-full flex flex-col animate-pulse">
          {/* Header with emerald-900 background */}
          <div className="bg-emerald-900/90 w-full py-3 px-4 flex-shrink-0">
            <div className="flex items-center gap-3 mb-1">
              <div className="bg-gray-50/20 p-2 rounded-md flex-shrink-0">
                <div className="w-5 h-5 bg-gray-50/30 rounded"></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="h-4 bg-gray-50/30 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-50/20 rounded w-1/2"></div>
              </div>
            </div>
          </div>

          {/* Card Body */}
          <div className="p-4 flex flex-col flex-1 bg-gray-100 min-h-0">
            {/* Reminder */}
            <div className="mb-4">
              <div className="h-4 bg-emerald-900/20 rounded w-2/3"></div>
            </div>

            {/* Description */}
            <div className="mb-4 flex-1">
              <div className="h-3 bg-emerald-900/10 rounded w-full mb-2"></div>
              <div className="h-3 bg-emerald-900/10 rounded w-5/6 mb-2"></div>
              <div className="h-3 bg-emerald-900/10 rounded w-4/5"></div>
            </div>
          </div>

          {/* Profile Section */}
          <div className="px-4 py-3 border-t border-emerald-900/10 flex items-center gap-3 bg-gray-100 flex-shrink-0">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-emerald-900/20 rounded-full"></div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="h-4 bg-emerald-900/20 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-emerald-900/10 rounded w-1/2"></div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-emerald-900/90 px-4 py-2 flex-shrink-0">
            <div className="flex items-center justify-between mb-1">
              <div className="h-3 bg-gray-50/30 rounded w-16"></div>
              <div className="h-3 bg-gray-50/20 rounded w-32"></div>
            </div>
            <div className="w-full bg-white/30 rounded-full h-2"></div>
          </div>

          {/* Time Until Email */}
          <div className="bg-emerald-900/90 px-4 py-2 border-t border-emerald-800/50 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="h-3 bg-gray-50/30 rounded w-24"></div>
              <div className="h-3 bg-gray-50/20 rounded w-28"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

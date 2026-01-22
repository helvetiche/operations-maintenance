"use client";

import { useMemo, useState } from "react";
import { useCachedCalendarSchedules } from "@/hooks/useCachedCalendarSchedules";
import { calculateNextDeadline } from "@/lib/deadline-calculator";
import { Warning, Clock, CalendarX, Envelope, Funnel, Check } from "phosphor-react";

type AlertFilter = "all" | "urgent" | "soon" | "upcoming";

export const CautionWindow = () => {
  const { schedules, loading, error, cacheExists } = useCachedCalendarSchedules();
  const [activeFilter, setActiveFilter] = useState<AlertFilter>("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const alerts = useMemo(() => {
    const now = new Date();
    const activeSchedules = schedules.filter(s => s.status === "active");

    // Calculate deadlines for all schedules
    const schedulesWithDeadlines = activeSchedules.map(schedule => {
      const nextDeadline = calculateNextDeadline(schedule.deadline, now, schedule.createdAt);
      const hoursUntil = (nextDeadline.getTime() - now.getTime()) / (1000 * 60 * 60);
      const daysUntil = hoursUntil / 24;

      return {
        schedule,
        nextDeadline,
        hoursUntil,
        daysUntil,
      };
    });

    // Categorize alerts
    const urgent = schedulesWithDeadlines.filter(s => s.hoursUntil <= 24); // Within 24 hours
    const soon = schedulesWithDeadlines.filter(s => s.hoursUntil > 24 && s.daysUntil <= 3); // 1-3 days
    const upcoming = schedulesWithDeadlines.filter(s => s.daysUntil > 3 && s.daysUntil <= 7); // 3-7 days

    return {
      urgent: urgent.sort((a, b) => a.hoursUntil - b.hoursUntil),
      soon: soon.sort((a, b) => a.hoursUntil - b.hoursUntil),
      upcoming: upcoming.sort((a, b) => a.hoursUntil - b.hoursUntil),
    };
  }, [schedules]);

  // Apply filter
  const filteredAlerts = useMemo(() => {
    switch (activeFilter) {
      case "urgent":
        return { urgent: alerts.urgent, soon: [], upcoming: [] };
      case "soon":
        return { urgent: [], soon: alerts.soon, upcoming: [] };
      case "upcoming":
        return { urgent: [], soon: [], upcoming: alerts.upcoming };
      default:
        return alerts;
    }
  }, [alerts, activeFilter]);

  const totalFilteredAlerts = filteredAlerts.urgent.length + filteredAlerts.soon.length + filteredAlerts.upcoming.length;

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Summary Skeleton */}
        <div className="bg-gray-100 border-l-4 border-amber-800 p-3 animate-pulse">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 bg-amber-800/20 rounded"></div>
            <div className="h-4 bg-amber-800/20 w-24"></div>
          </div>
          <div className="flex gap-3">
            <div className="h-3 bg-amber-800/20 w-16"></div>
            <div className="h-3 bg-amber-800/20 w-12"></div>
            <div className="h-3 bg-amber-800/20 w-20"></div>
          </div>
        </div>

        {/* Alert Sections Skeleton */}
        {[1, 2, 3].map((section) => (
          <div key={section} className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-emerald-900/20 rounded animate-pulse"></div>
              <div className="h-4 bg-emerald-900/20 w-20 animate-pulse"></div>
            </div>
            {[1, 2].map((item) => (
              <div key={item} className="bg-gray-100 border-l-4 border-red-800 p-3 animate-pulse">
                <div className="flex items-start gap-2 mb-2">
                  <div className="w-4 h-4 bg-red-800/20 rounded mt-0.5 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <div className="h-4 bg-red-800/20 w-32 mb-1"></div>
                    <div className="h-3 bg-red-800/20 w-24"></div>
                  </div>
                  <div className="h-6 bg-red-800/20 w-8 flex-shrink-0"></div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (error || !cacheExists) {
    return (
      <div className="text-center py-8">
        <Warning size={32} weight="light" className="mx-auto text-emerald-900/40 mb-3" />
        <p className="text-sm font-regular text-emerald-900/60">
          {error || "No cache found. Please sync cache."}
        </p>
      </div>
    );
  }

  const totalAlerts = alerts.urgent.length + alerts.soon.length + alerts.upcoming.length;

  const filterOptions: { value: AlertFilter; label: string; count: number }[] = [
    { value: "all", label: "All Alerts", count: totalAlerts },
    { value: "urgent", label: "Urgent (24h)", count: alerts.urgent.length },
    { value: "soon", label: "Soon (1-3d)", count: alerts.soon.length },
    { value: "upcoming", label: "Upcoming (3-7d)", count: alerts.upcoming.length },
  ];

  if (totalAlerts === 0) {
    return (
      <div className="text-center py-8">
        <Warning size={32} weight="light" className="mx-auto text-emerald-900/40 mb-3" />
        <p className="text-sm font-regular text-emerald-900/60">No upcoming deadlines</p>
        <p className="text-xs font-regular text-emerald-900/40 mt-1">All clear!</p>
      </div>
    );
  }

  const formatTimeUntil = (hours: number): string => {
    if (hours < 1) {
      const minutes = Math.floor(hours * 60);
      return `${minutes}m`;
    }
    if (hours < 24) {
      return `${Math.floor(hours)}h`;
    }
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  return (
    <div className="space-y-4">
      {/* Summary with Filter */}
      <div className="space-y-3">
        <div className="bg-gray-100 border-l-4 border-amber-800 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Warning size={18} weight="fill" className="text-amber-800" />
            <span className="text-sm font-regular text-emerald-900">
              {totalAlerts} Active Alert{totalAlerts !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex gap-3 text-xs font-regular text-emerald-900/60">
            {alerts.urgent.length > 0 && (
              <span>{alerts.urgent.length} urgent</span>
            )}
            {alerts.soon.length > 0 && (
              <span>{alerts.soon.length} soon</span>
            )}
            {alerts.upcoming.length > 0 && (
              <span>{alerts.upcoming.length} upcoming</span>
            )}
          </div>
        </div>

        {/* Filter Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm border border-emerald-900/20 hover:border-emerald-900 bg-white transition-colors"
          >
            <div className="flex items-center gap-2">
              <Funnel size={16} weight="light" className="text-emerald-900/60" />
              <span className="text-emerald-900">
                {filterOptions.find(f => f.value === activeFilter)?.label}
              </span>
            </div>
            <span className="text-xs font-regular text-emerald-900/60">
              {totalFilteredAlerts} {totalFilteredAlerts === 1 ? "alert" : "alerts"}
            </span>
          </button>

          {showFilterMenu && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowFilterMenu(false)}
              />
              
              {/* Dropdown Menu */}
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-emerald-900/20 shadow-lg z-20">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setActiveFilter(option.value);
                      setShowFilterMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-emerald-50 transition-colors ${
                      activeFilter === option.value ? "bg-emerald-50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {activeFilter === option.value && (
                        <Check size={14} weight="bold" className="text-emerald-900" />
                      )}
                      <span className={`${activeFilter === option.value ? "font-medium text-emerald-900" : "text-emerald-900/70"}`}>
                        {option.label}
                      </span>
                    </div>
                    <span className="text-xs font-regular text-emerald-900/60">
                      {option.count}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {totalFilteredAlerts === 0 && activeFilter !== "all" ? (
        <div className="text-center py-8">
          <Warning size={32} weight="light" className="mx-auto text-emerald-900/40 mb-3" />
          <p className="text-sm font-regular text-emerald-900/60">
            No {filterOptions.find(f => f.value === activeFilter)?.label.toLowerCase()}
          </p>
        </div>
      ) : (
        <>
          {/* Urgent Alerts (Within 24 hours) */}
          {filteredAlerts.urgent.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-regular text-emerald-900 uppercase tracking-wide flex items-center gap-2">
                <CalendarX size={16} weight="fill" className="text-red-900" />
                Urgent (24h)
              </h3>
              {filteredAlerts.urgent.map(({ schedule, hoursUntil }) => (
                <div
                  key={schedule.id}
                  className="bg-gray-100 border-l-4 border-red-900 p-3"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <Envelope size={14} weight="fill" className="text-red-900 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-regular text-emerald-900 line-clamp-1">
                        {schedule.title}
                      </p>
                      <p className="text-xs font-regular text-emerald-900/60 truncate">
                        {schedule.personAssigned}
                      </p>
                    </div>
                    <span className="text-xs font-regular text-gray-50 bg-red-900 px-2 py-1 flex-shrink-0">
                      {formatTimeUntil(hoursUntil)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Soon Alerts (1-3 days) */}
          {filteredAlerts.soon.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-regular text-emerald-900 uppercase tracking-wide flex items-center gap-2">
                <Clock size={16} weight="fill" className="text-amber-800" />
                Soon (1-3d)
              </h3>
              {filteredAlerts.soon.map(({ schedule, hoursUntil }) => (
                <div
                  key={schedule.id}
                  className="bg-gray-100 border-l-4 border-amber-800 p-3"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <Envelope size={14} weight="fill" className="text-amber-800 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-regular text-emerald-900 line-clamp-1">
                        {schedule.title}
                      </p>
                      <p className="text-xs font-regular text-emerald-900/60 truncate">
                        {schedule.personAssigned}
                      </p>
                    </div>
                    <span className="text-xs font-regular text-gray-50 bg-amber-800 px-2 py-1 flex-shrink-0">
                      {formatTimeUntil(hoursUntil)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upcoming Alerts (3-7 days) */}
          {filteredAlerts.upcoming.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-regular text-emerald-900 uppercase tracking-wide flex items-center gap-2">
                <Clock size={16} weight="light" className="text-green-800" />
                Upcoming (3-7d)
              </h3>
              {filteredAlerts.upcoming.slice(0, 5).map(({ schedule, hoursUntil }) => (
                <div
                  key={schedule.id}
                  className="bg-gray-100 border-l-4 border-green-800 p-3"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <Envelope size={14} weight="fill" className="text-green-800 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-regular text-emerald-900 line-clamp-1">
                        {schedule.title}
                      </p>
                      <p className="text-xs font-regular text-emerald-900/60 truncate">
                        {schedule.personAssigned}
                      </p>
                    </div>
                    <span className="text-xs font-regular text-gray-50 bg-green-800 px-2 py-1 flex-shrink-0">
                      {formatTimeUntil(hoursUntil)}
                    </span>
                  </div>
                </div>
              ))}
              {filteredAlerts.upcoming.length > 5 && (
                <p className="text-xs font-regular text-emerald-900/60 text-center">
                  +{filteredAlerts.upcoming.length - 5} more upcoming
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

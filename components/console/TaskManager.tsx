"use client";

import { useState, useEffect, useMemo } from "react";
import { Schedule, ScheduleWithCompletion, ReminderDate } from "@/types";
import { useCachedCalendarSchedules } from "@/hooks/useCachedCalendarSchedules";
import { useCompletions } from "@/hooks/useCompletions";
import { useToggleCompletion } from "@/hooks/useToggleCompletion";
import { getCurrentPeriod, getPeriodLabel } from "@/lib/period-calculator";
import { Modal } from "../ui/Modal";
import { Calendar, CheckCircle, Clock, CaretDown, Envelope, User, Check, MagnifyingGlass, X } from "phosphor-react";

export const TaskManager = () => {
  const { schedules, loading, error, cacheExists } = useCachedCalendarSchedules();
  const { completions, refetch: refetchCompletions, error: completionsError } = useCompletions();
  const { markComplete, markIncomplete, error: toggleError } = useToggleCompletion();
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Schedule | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [optimisticCompletions, setOptimisticCompletions] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  // Log errors
  useEffect(() => {
    if (completionsError) {
      console.error("Completions error:", completionsError);
    }
    if (toggleError) {
      console.error("Toggle error:", toggleError);
    }
  }, [completionsError, toggleError]);

  // Merge schedules with completion status (including optimistic updates)
  const schedulesWithCompletion: ScheduleWithCompletion[] = useMemo(() => {
    return schedules.map(schedule => {
      const period = getCurrentPeriod(schedule.deadline.type);
      const completionKey = `${schedule.id}-${period.start}-${period.end}`;
      const completion = completions.find(
        c => c.scheduleId === schedule.id &&
             c.periodStart === period.start &&
             c.periodEnd === period.end
      );
      
      // Check if there's an optimistic update in progress for this task
      const isOptimisticallyUpdating = optimisticCompletions.has(completionKey);
      
      // If optimistically updating, show the opposite of current state
      const currentPeriodCompleted = isOptimisticallyUpdating ? !completion : !!completion;
      
      return {
        ...schedule,
        currentPeriodCompleted,
        lastCompletedAt: completion?.completedAt,
      };
    });
  }, [schedules, completions, optimisticCompletions]);

  const activeSchedules = useMemo(() => 
    schedulesWithCompletion.filter(s => s.status === "active"),
    [schedulesWithCompletion]
  );
  
  const inactiveSchedules = useMemo(() => 
    schedulesWithCompletion.filter(s => s.status === "inactive"),
    [schedulesWithCompletion]
  );

  // Filter schedules based on search query
  const filteredSchedules = useMemo(() => {
    if (!searchQuery.trim()) {
      return activeSchedules;
    }
    
    const query = searchQuery.toLowerCase();
    return activeSchedules.filter(schedule => 
      schedule.title.toLowerCase().includes(query) ||
      schedule.description.toLowerCase().includes(query) ||
      schedule.personAssigned.toLowerCase().includes(query) ||
      schedule.personEmail.toLowerCase().includes(query)
    );
  }, [activeSchedules, searchQuery]);

  // Group by deadline type (only when not searching)
  const taskGroups = useMemo(() => {
    if (searchQuery.trim()) {
      return []; // Don't group when searching
    }

    const dailyTasks = filteredSchedules.filter(s => s.deadline.type === "daily");
    const weeklyTasks = filteredSchedules.filter(s => s.deadline.type === "weekly");
    const monthlyTasks = filteredSchedules.filter(s => s.deadline.type === "monthly");
    const otherTasks = filteredSchedules.filter(
      s => !["daily", "weekly", "monthly"].includes(s.deadline.type)
    );

    return [
      { type: "daily", label: "Daily Tasks", tasks: dailyTasks },
      { type: "weekly", label: "Weekly Tasks", tasks: weeklyTasks },
      { type: "monthly", label: "Monthly Tasks", tasks: monthlyTasks },
      { type: "other", label: "Other Tasks", tasks: otherTasks },
    ].filter(group => group.tasks.length > 0);
  }, [filteredSchedules, searchQuery]);

  const handleToggleComplete = async (schedule: ScheduleWithCompletion, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const period = getCurrentPeriod(schedule.deadline.type);
    const completionKey = `${schedule.id}-${period.start}-${period.end}`;
    
    // Prevent multiple clicks on the same task
    if (optimisticCompletions.has(completionKey)) {
      return;
    }
    
    const isCurrentlyCompleted = schedule.currentPeriodCompleted;
    
    // Optimistically update UI immediately
    setOptimisticCompletions(prev => {
      const newSet = new Set(prev);
      newSet.add(completionKey);
      return newSet;
    });
    
    try {
      if (isCurrentlyCompleted) {
        // Find the completion to delete
        const completion = completions.find(
          c => c.scheduleId === schedule.id &&
               c.periodStart === period.start &&
               c.periodEnd === period.end
        );
        
        if (completion) {
          const result = await markIncomplete(completion.id);
          if (result) {
            // Wait a bit before refetching to ensure backend is updated
            await new Promise(resolve => setTimeout(resolve, 300));
            await refetchCompletions();
            window.dispatchEvent(new CustomEvent('taskCompletionChanged'));
          } else {
            console.error("Failed to unmark task");
          }
        }
        // Always clear optimistic state
        setOptimisticCompletions(prev => {
          const newSet = new Set(prev);
          newSet.delete(completionKey);
          return newSet;
        });
      } else {
        const result = await markComplete({
          scheduleId: schedule.id,
          periodStart: period.start,
          periodEnd: period.end,
          deadlineType: schedule.deadline.type,
        });
        
        if (result) {
          // Wait a bit before refetching to ensure backend is updated
          await new Promise(resolve => setTimeout(resolve, 300));
          await refetchCompletions();
          window.dispatchEvent(new CustomEvent('taskCompletionChanged'));
        } else {
          console.error("Failed to mark task as complete");
        }
        // Always clear optimistic state
        setOptimisticCompletions(prev => {
          const newSet = new Set(prev);
          newSet.delete(completionKey);
          return newSet;
        });
      }
    } catch (err) {
      // Revert optimistic update on error
      setOptimisticCompletions(prev => {
        const newSet = new Set(prev);
        newSet.delete(completionKey);
        return newSet;
      });
      console.error("Toggle error:", err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {/* Summary Skeleton */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-900 p-3 animate-pulse">
            <div className="h-4 bg-emerald-800 w-16 mb-2"></div>
            <div className="h-8 bg-emerald-800 w-12"></div>
          </div>
          <div className="bg-gray-200 p-3 animate-pulse">
            <div className="h-4 bg-gray-300 w-16 mb-2"></div>
            <div className="h-8 bg-gray-300 w-12"></div>
          </div>
        </div>

        {/* Task Type Skeleton */}
        <div className="space-y-3">
          <div className="h-4 bg-emerald-900/20 w-24 animate-pulse"></div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-100 p-3 border-l-4 border-emerald-900 animate-pulse">
              <div className="flex items-center justify-between mb-2">
                <div className="h-4 bg-emerald-900/20 w-24"></div>
                <div className="h-6 bg-emerald-900/20 w-8 rounded-full"></div>
              </div>
              <div className="space-y-1">
                <div className="h-3 bg-emerald-900/20 w-32"></div>
                <div className="h-3 bg-emerald-900/20 w-28"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !cacheExists) {
    return (
      <div className="text-center py-8">
        <Calendar size={32} weight="light" className="mx-auto text-emerald-900/40 mb-3" />
        <p className="text-sm font-regular text-emerald-900/60">
          {error || "No cache found. Please sync cache."}
        </p>
      </div>
    );
  }

  const handleTaskClick = (task: Schedule) => {
    setSelectedTask(task);
    setShowModal(true);
  };

  const formatDate = (dateString: string | number) => {
    if (!dateString) return "N/A";
    
    try {
      let date: Date;
      
      // Handle different date formats
      if (typeof dateString === 'number') {
        // Unix timestamp (seconds or milliseconds)
        date = new Date(dateString > 1000000000000 ? dateString : dateString * 1000);
      } else if (typeof dateString === 'string') {
        // Handle Firestore timestamp format or ISO string
        if (dateString.includes('seconds') || dateString.includes('nanoseconds')) {
          // Firestore timestamp object as string - extract seconds
          const match = dateString.match(/seconds['":\s]*(\d+)/);
          if (match) {
            date = new Date(parseInt(match[1]) * 1000);
          } else {
            date = new Date(dateString);
          }
        } else {
          date = new Date(dateString);
        }
      } else {
        return "N/A";
      }
      
      if (isNaN(date.getTime())) return "N/A";
      
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const formatTime12Hour = (time24: string) => {
    if (!time24) return "";
    
    try {
      const [hours, minutes] = time24.split(':');
      const hour = parseInt(hours);
      const min = minutes || '00';
      
      if (hour === 0) return `12:${min} AM`;
      if (hour < 12) return `${hour}:${min} AM`;
      if (hour === 12) return `12:${min} PM`;
      return `${hour - 12}:${min} PM`;
    } catch {
      return time24;
    }
  };

  const formatReminderDate = (reminderDate: ReminderDate | undefined): string => {
    if (!reminderDate) return "N/A";
    
    if (reminderDate.type === "relative") {
      const days = reminderDate.daysBefore || 0;
      const time = reminderDate.time ? formatTime12Hour(reminderDate.time) : "12:00 AM";
      return `${days} day${days !== 1 ? "s" : ""} before at ${time}`;
    } else if (reminderDate.type === "absolute" && reminderDate.dateTime) {
      return formatDate(reminderDate.dateTime);
    }
    return "N/A";
  };

  const formatDeadline = (deadline: Schedule["deadline"]): string => {
    if (!deadline) return "N/A";

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    switch (deadline.type) {
      case "daily":
        return `Daily${deadline.time ? ` at ${formatTime12Hour(deadline.time)}` : ""}`;
      case "weekly":
        const dayOfWeek = deadline.dayOfWeek !== undefined ? dayNames[deadline.dayOfWeek] : "Unknown";
        return `Weekly, every ${dayOfWeek}${deadline.time ? ` at ${formatTime12Hour(deadline.time)}` : ""}`;
      case "monthly":
        const dayOfMonth = deadline.dayOfMonth || 1;
        return `Monthly, on day ${dayOfMonth}${deadline.time ? ` at ${formatTime12Hour(deadline.time)}` : ""}`;
      case "monthly-specific":
        const month = deadline.month || 1;
        const day = deadline.day || 1;
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${monthNames[month - 1]} ${day}${deadline.time ? ` at ${formatTime12Hour(deadline.time)}` : ""}`;
      case "interval":
        const days = deadline.days || 1;
        return `Every ${days} day${days !== 1 ? "s" : ""}${deadline.time ? ` at ${formatTime12Hour(deadline.time)}` : ""}`;
      case "hourly":
        const hours = deadline.hours || 1;
        return `Every ${hours} hour${hours !== 1 ? "s" : ""}`;
      case "per-minute":
        const minutes = deadline.minutes || 1;
        return `Every ${minutes} minute${minutes !== 1 ? "s" : ""}`;
      case "custom":
        return `Custom: ${deadline.cronExpression || "N/A"}`;
      default:
        const exhaustiveCheck: never = deadline.type;
        return exhaustiveCheck;
    }
  };

  return (
    <>
      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-900 p-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={16} weight="fill" className="text-gray-50" />
              <span className="text-xs font-regular text-gray-50/80">Active</span>
            </div>
            <p className="text-2xl font-regular text-gray-50">{activeSchedules.length}</p>
          </div>
          <div className="bg-gray-200 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={16} weight="light" className="text-emerald-900" />
              <span className="text-xs font-regular text-emerald-900/80">Inactive</span>
            </div>
            <p className="text-2xl font-regular text-emerald-900">{inactiveSchedules.length}</p>
          </div>
        </div>

        {/* Task Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-regular text-emerald-900 uppercase tracking-wide">
              {searchQuery.trim() ? "Search Results" : "By Schedule Type"}
            </h3>
            {searchQuery.trim() && (
              <span className="text-xs font-regular text-emerald-900/60">
                {filteredSchedules.length} {filteredSchedules.length === 1 ? "task" : "tasks"}
              </span>
            )}
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
              placeholder="Search tasks..."
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

          {/* Search Results (ungrouped) */}
          {searchQuery.trim() && (
            <div className="space-y-2">
              {filteredSchedules.length > 0 ? (
                filteredSchedules.map(task => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 py-2 px-3 bg-gray-100 border-l-4 border-emerald-900 hover:bg-emerald-50 transition-colors"
                  >
                    <button
                      onClick={(e) => handleToggleComplete(task, e)}
                      className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${
                        task.currentPeriodCompleted
                          ? "bg-emerald-900 border-emerald-900"
                          : "border-emerald-900/30 hover:border-emerald-900"
                      }`}
                      title={task.currentPeriodCompleted ? `Completed for ${getPeriodLabel(task.deadline.type)}` : `Mark as complete for ${getPeriodLabel(task.deadline.type)}`}
                    >
                      {task.currentPeriodCompleted ? (
                        <Check size={14} weight="bold" className="text-gray-50" />
                      ) : null}
                    </button>
                    <button
                      onClick={() => handleTaskClick(task)}
                      className="flex-1 text-left"
                    >
                      <p className={`text-xs font-regular font-medium mb-1 ${
                        task.currentPeriodCompleted ? "text-emerald-900/50 line-through" : "text-emerald-900"
                      }`}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs font-regular text-emerald-900/60">
                        <span>{task.personAssigned}</span>
                        <span>•</span>
                        <span className="capitalize">{task.deadline.type}</span>
                      </div>
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <MagnifyingGlass size={32} weight="light" className="mx-auto text-emerald-900/40 mb-3" />
                  <p className="text-sm font-regular text-emerald-900/60">No tasks found</p>
                </div>
              )}
            </div>
          )}

          {/* Grouped Results (when not searching) */}
          {!searchQuery.trim() && taskGroups.map((group) => (
            <div key={group.type} className="bg-gray-100 border-l-4 border-emerald-900">
              <button
                onClick={() => setExpandedType(expandedType === group.type ? null : group.type)}
                className="w-full p-3 flex items-center justify-between hover:bg-gray-200/50 transition-colors"
              >
                <div className="flex items-center justify-between flex-1">
                  <span className="text-sm font-regular text-emerald-900">{group.label}</span>
                  <span className="text-xs font-regular text-gray-50 bg-emerald-900 px-2 py-1 rounded-full">
                    {group.tasks.length}
                  </span>
                </div>
                <CaretDown 
                  size={16} 
                  weight="light" 
                  className={`text-emerald-900 transition-transform ml-2 flex-shrink-0 ${
                    expandedType === group.type ? "rotate-180" : ""
                  }`}
                />
              </button>

              {expandedType === group.type && (
                <div className="px-3 pb-3 pt-2 space-y-2 border-t border-emerald-900/10">
                  {group.tasks.map(task => {
                    return (
                      <div
                        key={task.id}
                        className="flex items-center gap-2 py-2 px-2 bg-gray-50 rounded border border-emerald-900/10 hover:bg-emerald-50 hover:border-emerald-900/30 transition-colors"
                      >
                        <button
                          onClick={(e) => handleToggleComplete(task, e)}
                          className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${
                            task.currentPeriodCompleted
                              ? "bg-emerald-900 border-emerald-900"
                              : "border-emerald-900/30 hover:border-emerald-900"
                          }`}
                          title={task.currentPeriodCompleted ? `Completed for ${getPeriodLabel(task.deadline.type)}` : `Mark as complete for ${getPeriodLabel(task.deadline.type)}`}
                        >
                          {task.currentPeriodCompleted ? (
                            <Check size={14} weight="bold" className="text-gray-50" />
                          ) : null}
                        </button>
                        <button
                          onClick={() => handleTaskClick(task)}
                          className="flex-1 text-left"
                        >
                          <p className={`text-xs font-regular font-medium mb-1 ${
                            task.currentPeriodCompleted ? "text-emerald-900/50 line-through" : "text-emerald-900"
                          }`}>
                            {task.title}
                          </p>
                          <p className="text-xs font-regular text-emerald-900/60">
                            {task.personAssigned}
                          </p>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {!searchQuery.trim() && activeSchedules.length === 0 && (
            <div className="text-center py-8">
              <Calendar size={32} weight="light" className="mx-auto text-emerald-900/40 mb-3" />
              <p className="text-sm font-regular text-emerald-900/60">No active tasks</p>
            </div>
          )}
        </div>
      </div>

      {/* Task Details Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={selectedTask?.title || "Task Details"}
        description={selectedTask?.description || ""}
        size="lg"
        animateFrom="bottom"
      >
        {selectedTask && (
          <div className="space-y-4">
            {/* Task Title and Status */}
            <div className="bg-emerald-900 p-4">
              <h2 className="text-lg font-regular text-gray-50 mb-2">{selectedTask.title}</h2>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-regular px-2 py-1 rounded-full ${
                  selectedTask.status === "active"
                    ? "bg-green-600 text-gray-50"
                    : "bg-gray-600 text-gray-50"
                }`}>
                  {selectedTask.status === "active" ? "Active" : "Inactive"}
                </span>
                <span className="text-xs font-regular text-gray-50/60">
                  {selectedTask.deadline.type.charAt(0).toUpperCase() + selectedTask.deadline.type.slice(1)}
                </span>
              </div>
            </div>

            {/* Description */}
            {selectedTask.description && (
              <div>
                <h3 className="text-sm font-regular text-emerald-900 mb-2">Description</h3>
                <p className="text-sm font-regular text-emerald-900/70 bg-gray-50 p-3 rounded border border-emerald-900/10">
                  {selectedTask.description}
                </p>
              </div>
            )}

            {/* Person Assigned */}
            <div className="bg-gray-100 p-3 border-l-4 border-emerald-900">
              <div className="flex items-start gap-3">
                <User size={18} weight="light" className="text-emerald-900 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-regular text-emerald-900/60">Assigned To</p>
                  <p className="text-sm font-regular text-emerald-900 mt-1">{selectedTask.personAssigned}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Envelope size={14} weight="light" className="text-emerald-900/60" />
                    <p className="text-xs font-regular text-emerald-900/60">{selectedTask.personEmail}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Deadline Information */}
            <div className="bg-gray-100 p-3 border-l-4 border-emerald-900">
              <p className="text-xs font-regular text-emerald-900/60 mb-1">Deadline</p>
              <p className="text-sm font-regular text-emerald-900">
                {formatDeadline(selectedTask.deadline)}
              </p>
            </div>

            {/* Reminder Date */}
            <div className="bg-gray-100 p-3 border-l-4 border-emerald-900">
              <p className="text-xs font-regular text-emerald-900/60 mb-1">Reminder</p>
              <p className="text-sm font-regular text-emerald-900">
                {formatReminderDate(selectedTask.reminderDate)}
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowModal(false)}
              className="w-full px-4 py-2 bg-emerald-900 hover:bg-emerald-800 text-gray-50 font-regular text-sm transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </Modal>
    </>
  );
};

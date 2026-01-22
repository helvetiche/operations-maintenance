"use client";

import { useState } from "react";
import { useSyncCache } from "@/hooks/useSyncCache";
import { useSyncCalendarCache } from "@/hooks/useSyncCalendarCache";
import { useSyncEmployeeCache } from "@/hooks/useSyncEmployeeCache";
import { Database, ArrowsClockwise, CheckCircle, Warning, Clock } from "phosphor-react";
import { ToastContainer, ToastType } from "../ui/Toast";

interface CacheStatus {
  name: string;
  description: string;
  status: "idle" | "syncing" | "success" | "error";
  lastSynced?: Date;
  count?: number;
  error?: string;
}

export const CacheManagement = () => {
  const { syncCache } = useSyncCache();
  const { syncCalendarCache } = useSyncCalendarCache();
  const { syncEmployeeCache } = useSyncEmployeeCache();
  
  const [caches, setCaches] = useState<CacheStatus[]>([
    {
      name: "Schedule Cache",
      description: "Optimizes cron job reads for reminder emails",
      status: "idle",
    },
    {
      name: "Calendar Cache",
      description: "Optimizes calendar view reads for all schedules",
      status: "idle",
    },
    {
      name: "Employee Cache",
      description: "Optimizes employee task list reads in right sidebar",
      status: "idle",
    },
  ]);
  
  const [syncingAll, setSyncingAll] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType }>>([]);

  const updateCacheStatus = (index: number, updates: Partial<CacheStatus>) => {
    setCaches(prev => prev.map((cache, i) => 
      i === index ? { ...cache, ...updates } : cache
    ));
  };

  const syncScheduleCache = async (index: number) => {
    updateCacheStatus(index, { status: "syncing" });
    
    try {
      const result = await syncCache();
      if (result) {
        updateCacheStatus(index, {
          status: "success",
          lastSynced: new Date(),
          count: result.reminderCount,
        });
        return true;
      } else {
        updateCacheStatus(index, {
          status: "error",
          error: "Failed to sync cache",
        });
        return false;
      }
    } catch (error) {
      updateCacheStatus(index, {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return false;
    }
  };

  const syncCalendar = async (index: number) => {
    updateCacheStatus(index, { status: "syncing" });
    
    try {
      const result = await syncCalendarCache();
      if (result) {
        updateCacheStatus(index, {
          status: "success",
          lastSynced: new Date(),
          count: result.scheduleCount,
        });
        return true;
      } else {
        updateCacheStatus(index, {
          status: "error",
          error: "Failed to sync calendar cache",
        });
        return false;
      }
    } catch (error) {
      updateCacheStatus(index, {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return false;
    }
  };

  const syncEmployee = async (index: number) => {
    updateCacheStatus(index, { status: "syncing" });
    
    try {
      const result = await syncEmployeeCache();
      if (result) {
        updateCacheStatus(index, {
          status: "success",
          lastSynced: new Date(),
          count: result.employeeCount,
        });
        return true;
      } else {
        updateCacheStatus(index, {
          status: "error",
          error: "Failed to sync employee cache",
        });
        return false;
      }
    } catch (error) {
      updateCacheStatus(index, {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return false;
    }
  };

  const handleSyncSingle = async (index: number) => {
    if (index === 0) {
      await syncScheduleCache(index);
    } else if (index === 1) {
      await syncCalendar(index);
    } else if (index === 2) {
      await syncEmployee(index);
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    
    // Sync all caches sequentially
    const results = await Promise.all([
      syncScheduleCache(0),
      syncCalendar(1),
      syncEmployee(2),
    ]);

    const successCount = results.filter(r => r).length;
    const failCount = results.length - successCount;

    // Show toast
    const toastId = `toast-${Date.now()}`;
    setToasts(prev => [
      ...prev,
      {
        id: toastId,
        message: `Sync complete: ${successCount} succeeded${failCount > 0 ? `, ${failCount} failed` : ""}`,
        type: failCount > 0 ? "warning" : "success",
      },
    ]);

    setSyncingAll(false);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const getStatusIcon = (status: CacheStatus["status"]) => {
    switch (status) {
      case "syncing":
        return <ArrowsClockwise size={20} weight="light" className="text-gray-50 animate-spin" />;
      case "success":
        return <CheckCircle size={20} weight="fill" className="text-green-400" />;
      case "error":
        return <Warning size={20} weight="fill" className="text-red-400" />;
      default:
        return <Clock size={20} weight="light" className="text-gray-50/40" />;
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6 pt-2 lg:pt-0">
      {/* Mobile Header - Simplified */}
      <div className="lg:hidden">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-emerald-900 p-2 rounded-md">
            <Database size={20} weight="light" className="text-gray-50" />
          </div>
          <div>
            <h1 className="text-xl font-regular text-emerald-900">Cache Management</h1>
            <p className="text-xs font-regular text-emerald-900/60">
              Sync all caches to optimize reads
            </p>
          </div>
        </div>
        
        {/* Mobile Sync All Button */}
        <button
          type="button"
          onClick={handleSyncAll}
          disabled={syncingAll}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md transition-colors text-sm font-regular shadow-lg ${
            syncingAll
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-emerald-900 hover:bg-emerald-800 text-white"
          }`}
        >
          <ArrowsClockwise size={20} weight="light" className={syncingAll ? "animate-spin" : ""} />
          {syncingAll ? "Syncing All..." : "Sync All Caches"}
        </button>
      </div>

      {/* Desktop Header - Full */}
      <div className="hidden lg:flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="bg-emerald-900 p-3 rounded-md flex-shrink-0">
            <Database size={24} weight="light" className="text-gray-50" />
          </div>
          <div>
            <h1 className="text-2xl font-regular text-emerald-900">Cache Management</h1>
            <p className="text-sm font-regular text-emerald-900/60">
              Sync all caches to optimize database reads
            </p>
          </div>
        </div>
        
        {/* Desktop Sync All Button */}
        <button
          type="button"
          onClick={handleSyncAll}
          disabled={syncingAll}
          className={`flex items-center gap-2 px-5 py-3 rounded-md transition-colors text-base font-regular shadow-lg flex-shrink-0 ${
            syncingAll
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-emerald-900 hover:bg-emerald-800 text-white"
          }`}
        >
          <ArrowsClockwise size={20} weight="light" className={syncingAll ? "animate-spin" : ""} />
          {syncingAll ? "Syncing All..." : "Sync All Caches"}
        </button>
      </div>

      {/* Info Alert */}
      <div className="bg-emerald-900 border border-emerald-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Database size={20} weight="fill" className="text-gray-50 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-regular text-gray-50">
              Caches optimize database reads by storing frequently accessed data. Sync caches after creating, updating, or deleting schedules.
            </p>
          </div>
        </div>
      </div>

      {/* Cache Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {caches.map((cache, index) => (
          <div
            key={cache.name}
            className="bg-emerald-900 border border-emerald-800 rounded-lg p-4 lg:p-6"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getStatusIcon(cache.status)}
                </div>
                <div>
                  <h3 className="text-lg font-regular text-gray-50">{cache.name}</h3>
                  <p className="text-xs font-regular text-gray-50/60 mt-1">
                    {cache.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Status Info */}
            <div className="space-y-2 mb-4">
              {cache.status === "success" && cache.lastSynced && (
                <div className="text-xs font-regular text-gray-50/80">
                  Last synced: {cache.lastSynced.toLocaleTimeString()}
                  {cache.count !== undefined && ` • ${cache.count} items`}
                </div>
              )}
              {cache.status === "error" && cache.error && (
                <div className="text-xs font-regular text-red-400">
                  Error: {cache.error}
                </div>
              )}
              {cache.status === "syncing" && (
                <div className="text-xs font-regular text-gray-50/80">
                  Syncing cache...
                </div>
              )}
              {cache.status === "idle" && (
                <div className="text-xs font-regular text-gray-50/60">
                  Ready to sync
                </div>
              )}
            </div>

            {/* Sync Button */}
            <button
              type="button"
              onClick={() => handleSyncSingle(index)}
              disabled={cache.status === "syncing" || syncingAll}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 lg:py-3 rounded-md transition-colors text-sm font-regular ${
                cache.status === "syncing" || syncingAll
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : "bg-gray-50 hover:bg-gray-100 text-emerald-900"
              }`}
            >
              <ArrowsClockwise 
                size={16} 
                weight="light" 
                className={cache.status === "syncing" ? "animate-spin" : ""} 
              />
              {cache.status === "syncing" ? "Syncing..." : "Sync Cache"}
            </button>
          </div>
        ))}
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

"use client";

import { useState, useMemo } from "react";
import { Schedule } from "@/types";
import { useSchedules } from "@/hooks/useSchedules";
import { useCreateSchedule } from "@/hooks/useCreateSchedule";
import { useUpdateSchedule } from "@/hooks/useUpdateSchedule";
import { useDeleteSchedule } from "@/hooks/useDeleteSchedule";
import { useSentToday } from "@/hooks/useSentToday";
import { useSyncCache } from "@/hooks/useSyncCache";
import { useSyncCalendarCache } from "@/hooks/useSyncCalendarCache";
import { ScheduleForm } from "./ScheduleForm";
import { ScheduleList } from "./ScheduleList";
import { ScheduleListSkeleton } from "./ScheduleListSkeleton";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { ToastContainer, ToastType } from "../ui/Toast";
import { Plus, MagnifyingGlass, Calendar, Trash, SquaresFour, Table, DownloadSimple } from "phosphor-react";
import { calculateNextDeadline } from "@/lib/deadline-calculator";
import { useExportSchedules } from "@/hooks/useExportSchedules";

export const Schedules = () => {
  const { schedules, loading, error, pagination, goToPage, updateScheduleInList, removeSchedule } = useSchedules(6);
  const { createSchedule, loading: creating } = useCreateSchedule();
  const { updateSchedule, loading: updating } = useUpdateSchedule();
  const { deleteSchedule, loading: deleting, error: deleteError } = useDeleteSchedule();
  // Don't fetch sentToday initially - it's optional and can load later
  const { sentToday } = useSentToday();
  const { syncCache } = useSyncCache();
  const { syncCalendarCache } = useSyncCalendarCache();
  const { exportSchedules, loading: exporting } = useExportSchedules();

  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | undefined>();
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [deletingSchedule, setDeletingSchedule] = useState<Schedule | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType }>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [sortBy, setSortBy] = useState<"a-z" | "z-a" | "nearest" | "farthest">("nearest");

  const handleCreate = async (data: {
    title: string;
    description: string;
    deadline: Schedule["deadline"];
    reminderDate: Schedule["reminderDate"];
    personAssigned: string;
    personEmail: string;
    status: "active" | "inactive";
  }) => {
    const result = await createSchedule(data);
    if (result) {
      setShowForm(false);
      
      // IMPORTANT: Sequential operations to avoid race conditions
      // 1. First, refetch the schedule list (this waits for Firestore indexing)
      await goToPage(1);
      
      // 2. Then sync caches after we know the schedule is in the list
      await Promise.all([
        syncCache(),
        syncCalendarCache(),
      ]);
    }
  };

  const handleUpdate = async (data: {
    title: string;
    description: string;
    deadline: Schedule["deadline"];
    reminderDate: Schedule["reminderDate"];
    personAssigned: string;
    personEmail: string;
    status: "active" | "inactive";
  }) => {
    if (!editingSchedule) return;

    const result = await updateSchedule(editingSchedule.id, data);
    if (result) {
      setEditingSchedule(undefined);
      setShowForm(false);
      // Update the schedule in the list without refetching
      updateScheduleInList(result);
      // Sync both caches after updating a schedule
      await syncCache();
      await syncCalendarCache();
    }
  };

  const handleDeleteClick = (schedule: Schedule) => {
    setDeletingSchedule(schedule);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingSchedule) return;

    setDeleteLoadingId(deletingSchedule.id);
    const success = await deleteSchedule(deletingSchedule.id);
    
    if (success) {
      setShowDeleteModal(false);
      setDeletingSchedule(null);
      // Remove the schedule from the list without refetching
      removeSchedule(deletingSchedule.id);
      
      // Show success toast
      const toastId = `toast-${Date.now()}`;
      setToasts((prev) => [
        ...prev,
        {
          id: toastId,
          message: `Schedule "${deletingSchedule.title}" deleted successfully`,
          type: "success",
        },
      ]);
      
      // Sync both caches after deleting a schedule
      await syncCache();
      await syncCalendarCache();
    }
    
    setDeleteLoadingId(null);
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setDeletingSchedule(null);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingSchedule(undefined);
  };

  const handleNewSchedule = () => {
    setEditingSchedule(undefined);
    setShowForm(true);
  };

  // Filter schedules based on search query and status filter
  const filteredSchedules = useMemo(() => {
    let filtered = schedules.filter((schedule) => {
      // Status filter
      if (statusFilter !== "all" && schedule.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          schedule.title.toLowerCase().includes(query) ||
          schedule.description.toLowerCase().includes(query) ||
          schedule.personAssigned.toLowerCase().includes(query) ||
          schedule.personEmail.toLowerCase().includes(query)
        );
      }

      return true;
    });

    // Sort schedules
    const now = new Date();
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "a-z":
          return a.title.localeCompare(b.title);
        case "z-a":
          return b.title.localeCompare(a.title);
        case "nearest": {
          const aDeadline = calculateNextDeadline(a.deadline, now, a.createdAt);
          const bDeadline = calculateNextDeadline(b.deadline, now, b.createdAt);
          return aDeadline.getTime() - bDeadline.getTime();
        }
        case "farthest": {
          const aDeadline = calculateNextDeadline(a.deadline, now, a.createdAt);
          const bDeadline = calculateNextDeadline(b.deadline, now, b.createdAt);
          return bDeadline.getTime() - aDeadline.getTime();
        }
        default:
          return 0;
      }
    });

    return filtered;
  }, [schedules, searchQuery, statusFilter, sortBy]);

  return (
      <div className="space-y-4 lg:space-y-6 pt-2 lg:pt-0">
      {/* Mobile Header - Simplified */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-900 p-2 rounded-md">
              <Calendar size={20} weight="light" className="text-gray-50" />
            </div>
            <div>
              <h1 className="text-xl font-regular text-emerald-900">Schedules</h1>
              <p className="text-xs font-regular text-emerald-900/60">
                Manage email schedules
              </p>
            </div>
          </div>
          
          {/* Single Add Button */}
          {!loading && (
            <button
              type="button"
              onClick={handleNewSchedule}
              className="flex items-center gap-2 px-3 py-2 bg-emerald-900 hover:bg-emerald-800 text-gray-50 rounded-md transition-colors text-sm font-regular"
              title="Add Schedule"
            >
              <Plus size={18} weight="light" />
            </button>
          )}
        </div>
      </div>

      {/* Desktop Header - Full */}
      <div className="hidden lg:flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="bg-emerald-900 p-3 rounded-md flex-shrink-0">
            <Calendar size={24} weight="light" className="text-gray-50" />
          </div>
          <div>
            <h1 className="text-2xl font-regular text-emerald-900">Schedules</h1>
            <p className="text-sm font-regular text-emerald-900/60">
              Manage your email schedules and reminders
            </p>
          </div>
        </div>
        
        {/* Desktop Action Buttons */}
        {!loading && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportSchedules}
              disabled={exporting || schedules.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-900 hover:bg-emerald-800 text-gray-50 rounded-md transition-colors text-sm font-regular disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export to Excel"
            >
              <DownloadSimple size={18} weight="light" />
              {exporting ? "Exporting..." : "Export to Excel"}
            </button>
            <button
              type="button"
              onClick={handleNewSchedule}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-900 hover:bg-emerald-800 text-gray-50 rounded-md transition-colors text-sm font-regular"
              title="Create New Schedule"
            >
              <Plus size={18} weight="light" />
              Add Schedule
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 lg:p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-xs lg:text-sm font-regular text-red-600">{error}</p>
        </div>
      )}

      {deleteError && (
        <div className="p-3 lg:p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-xs lg:text-sm font-regular text-red-600">{deleteError}</p>
        </div>
      )}

      {/* Search and Filter Bar */}
      {!loading && schedules.length > 0 && (
        <div className="space-y-3">
          {/* Mobile: Simplified Search + Export */}
          <div className="lg:hidden">
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <MagnifyingGlass 
                  size={18} 
                  weight="light" 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-900/60"
                />
                <input
                  type="text"
                  placeholder="Search schedules..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full shadow-lg pl-9 pr-4 py-2 text-sm bg-gray-100 border border-emerald-900/20 rounded-full text-emerald-900 font-regular placeholder-emerald-900/40 focus:outline-none focus:ring-2 focus:ring-emerald-900"
                />
              </div>
              
              {/* Mobile Export Button */}
              <button
                type="button"
                onClick={exportSchedules}
                disabled={exporting || schedules.length === 0}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-900 hover:bg-emerald-800 text-gray-50 rounded-md transition-colors text-sm font-regular disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export"
              >
                <DownloadSimple size={18} weight="light" />
              </button>
            </div>
            
            {/* Mobile: Compact Filter Row */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 text-xs font-regular rounded-full whitespace-nowrap transition-colors ${
                  statusFilter === "all"
                    ? "bg-emerald-900 text-gray-50"
                    : "bg-gray-100 text-emerald-900 border border-emerald-900/20"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("active")}
                className={`px-3 py-1.5 text-xs font-regular rounded-full whitespace-nowrap transition-colors ${
                  statusFilter === "active"
                    ? "bg-emerald-900 text-gray-50"
                    : "bg-gray-100 text-emerald-900 border border-emerald-900/20"
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setSortBy("nearest")}
                className={`px-3 py-1.5 text-xs font-regular rounded-full whitespace-nowrap transition-colors ${
                  sortBy === "nearest"
                    ? "bg-emerald-900 text-gray-50"
                    : "bg-gray-100 text-emerald-900 border border-emerald-900/20"
                }`}
              >
                Nearest
              </button>
              <button
                type="button"
                onClick={() => setSortBy("a-z")}
                className={`px-3 py-1.5 text-xs font-regular rounded-full whitespace-nowrap transition-colors ${
                  sortBy === "a-z"
                    ? "bg-emerald-900 text-gray-50"
                    : "bg-gray-100 text-emerald-900 border border-emerald-900/20"
                }`}
              >
                A-Z
              </button>
            </div>
          </div>

          {/* Desktop: Full Filter Layout */}
          <div className="hidden lg:block">
            <div className="flex gap-4 mb-4">
              <div className="relative flex-1">
                <MagnifyingGlass 
                  size={20} 
                  weight="light" 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-900/60"
                />
                <input
                  type="text"
                  placeholder="Search schedules..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full shadow-lg pl-10 pr-4 py-2 text-base bg-gray-100 border border-emerald-900/20 rounded-full text-emerald-900 font-regular placeholder-emerald-900/40 focus:outline-none focus:ring-2 focus:ring-emerald-900"
                />
              </div>
              
              {/* View Toggle Buttons */}
              <div className="flex gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === "grid"
                      ? "bg-emerald-900 text-gray-50"
                      : "bg-gray-100 text-emerald-900 border border-emerald-900/20 hover:bg-gray-200"
                  }`}
                  title="Grid View"
                >
                  <SquaresFour size={20} weight="light" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === "table"
                      ? "bg-emerald-900 text-gray-50"
                      : "bg-gray-100 text-emerald-900 border border-emerald-900/20 hover:bg-gray-200"
                  }`}
                  title="Table View"
                >
                  <Table size={20} weight="light" />
                </button>
              </div>
            </div>

            {/* Desktop Status Filter */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-4 py-2 text-sm font-regular rounded-full transition-colors ${
                  statusFilter === "all"
                    ? "bg-emerald-900 text-gray-50"
                    : "bg-gray-100 text-emerald-900 border border-emerald-900/20 hover:bg-gray-200"
                }`}
              >
                All Status
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("active")}
                className={`px-4 py-2 text-sm font-regular rounded-full transition-colors ${
                  statusFilter === "active"
                    ? "bg-emerald-900 text-gray-50"
                    : "bg-gray-100 text-emerald-900 border border-emerald-900/20 hover:bg-gray-200"
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("inactive")}
                className={`px-4 py-2 text-sm font-regular rounded-full transition-colors ${
                  statusFilter === "inactive"
                    ? "bg-emerald-900 text-gray-50"
                    : "bg-gray-100 text-emerald-900 border border-emerald-900/20 hover:bg-gray-200"
                }`}
              >
                Inactive
              </button>
            </div>

            {/* Desktop Sort Filter */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSortBy("a-z")}
                className={`px-4 py-2 text-sm font-regular rounded-full transition-colors ${
                  sortBy === "a-z"
                    ? "bg-emerald-900 text-gray-50"
                    : "bg-gray-100 text-emerald-900 border border-emerald-900/20 hover:bg-gray-200"
                }`}
              >
                A-Z
              </button>
              <button
                type="button"
                onClick={() => setSortBy("z-a")}
                className={`px-4 py-2 text-sm font-regular rounded-full transition-colors ${
                  sortBy === "z-a"
                    ? "bg-emerald-900 text-gray-50"
                    : "bg-gray-100 text-emerald-900 border border-emerald-900/20 hover:bg-gray-200"
                }`}
              >
                Z-A
              </button>
              <button
                type="button"
                onClick={() => setSortBy("nearest")}
                className={`px-4 py-2 text-sm font-regular rounded-full transition-colors ${
                  sortBy === "nearest"
                    ? "bg-emerald-900 text-gray-50"
                    : "bg-gray-100 text-emerald-900 border border-emerald-900/20 hover:bg-gray-200"
                }`}
              >
                Nearest Deadline
              </button>
              <button
                type="button"
                onClick={() => setSortBy("farthest")}
                className={`px-4 py-2 text-sm font-regular rounded-full transition-colors ${
                  sortBy === "farthest"
                    ? "bg-emerald-900 text-gray-50"
                    : "bg-gray-100 text-emerald-900 border border-emerald-900/20 hover:bg-gray-200"
                }`}
              >
                Farthest Deadline
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <ScheduleListSkeleton />
      ) : (
        <ScheduleList
          schedules={filteredSchedules}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          deleteLoading={deleteLoadingId}
          sentToday={sentToday}
          viewMode={viewMode}
          pagination={pagination}
          onPageChange={goToPage}
        />
      )}

      <Modal
        isOpen={showForm}
        onClose={handleCancel}
        title={editingSchedule ? "Edit Schedule" : "Create New Schedule"}
        description={
          editingSchedule
            ? "Update the schedule details below. All fields marked with * are required."
            : "Fill in the details below to create a new email schedule. All fields marked with * are required."
        }
        size="lg"
        animateFrom="bottom"
        closeOnBackdropClick={!creating && !updating}
        closeOnEscape={!creating && !updating}
      >
        <ScheduleForm
          schedule={editingSchedule}
          onSubmit={editingSchedule ? handleUpdate : handleCreate}
          onCancel={handleCancel}
          loading={creating || updating}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        title="Delete Schedule"
        description={`Are you sure you want to delete "${deletingSchedule?.title}"? This action cannot be undone.`}
        size="sm"
        animateFrom="center"
        closeOnBackdropClick={!deleting}
        closeOnEscape={!deleting}
        showCloseButton={!deleting}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-900/20 rounded-md">
            <Trash size={24} weight="light" className="text-red-900 flex-shrink-0" />
            <p className="text-sm font-regular text-red-900">
              This will permanently delete the schedule and stop all future reminder emails.
            </p>
          </div>
          
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={handleDeleteCancel}
              disabled={deleting}
              className="bg-gray-100 hover:bg-gray-200 text-emerald-900 border border-emerald-900/20"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? "Deleting..." : "Delete Schedule"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

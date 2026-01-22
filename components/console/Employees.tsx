"use client";

import { useState, useMemo } from "react";
import { Employee } from "@/types";
import { useEmployees } from "@/hooks/useEmployees";
import { useCreateEmployee } from "@/hooks/useCreateEmployee";
import { useUpdateEmployee } from "@/hooks/useUpdateEmployee";
import { useDeleteEmployee } from "@/hooks/useDeleteEmployee";
import { useExportEmployees } from "@/hooks/useExportEmployees";
import { EmployeeForm } from "./EmployeeForm";
import { EmployeeList } from "./EmployeeList";
import { EmployeeListSkeleton } from "./EmployeeListSkeleton";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Plus, MagnifyingGlass, User, Trash, DownloadSimple } from "phosphor-react";

type SortOption = "a-z" | "z-a" | "highest-assignments" | "lowest-assignments";

export const Employees = () => {
  const { employees, loading, error, pagination, refetch, goToPage } = useEmployees({ limit: 6 });
  const { createEmployee, loading: creating } = useCreateEmployee();
  const { updateEmployee, loading: updating } = useUpdateEmployee();
  const { deleteEmployee, loading: deleting, error: deleteError } = useDeleteEmployee();
  const { exportEmployees, loading: exporting } = useExportEmployees();

  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>();
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("a-z");

  const handleCreate = async (data: {
    name: string;
    email: string;
    position: string;
  }) => {
    const result = await createEmployee(data);
    if (result) {
      setShowForm(false);
      await refetch();
    }
  };

  const handleUpdate = async (data: {
    name: string;
    email: string;
    position: string;
  }) => {
    if (!editingEmployee) return;

    const result = await updateEmployee(editingEmployee.id, data);
    if (result) {
      setEditingEmployee(undefined);
      setShowForm(false);
      await refetch();
    }
  };

  const handleDeleteClick = (employee: Employee) => {
    setDeletingEmployee(employee);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingEmployee) return;

    setDeleteLoadingId(deletingEmployee.id);
    const success = await deleteEmployee(deletingEmployee.id);
    
    if (success) {
      setShowDeleteModal(false);
      setDeletingEmployee(null);
      await refetch();
    }
    
    setDeleteLoadingId(null);
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setDeletingEmployee(null);
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingEmployee(undefined);
  };

  const handleNewEmployee = () => {
    setEditingEmployee(undefined);
    setShowForm(true);
  };

  // Filter and sort employees
  const filteredAndSortedEmployees = useMemo(() => {
    const result = employees.filter((employee) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          employee.name.toLowerCase().includes(query) ||
          employee.email.toLowerCase().includes(query) ||
          employee.position.toLowerCase().includes(query)
        );
      }
      return true;
    });

    // Sort based on selected option
    switch (sortBy) {
      case "a-z":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "z-a":
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "highest-assignments":
        // This will be handled by EmployeeList with cache data
        break;
      case "lowest-assignments":
        // This will be handled by EmployeeList with cache data
        break;
    }

    return result;
  }, [employees, searchQuery, sortBy]);

  return (
    <div className="space-y-4 lg:space-y-6 pt-2 lg:pt-0">
      <div className="flex items-start justify-between gap-3 lg:gap-4">
        <div className="flex items-start gap-3 lg:gap-4">
          <div className="bg-emerald-900 p-2 lg:p-3 rounded-md flex-shrink-0">
            <User size={20} weight="light" className="text-gray-50 lg:w-6 lg:h-6" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-regular text-emerald-900">Employees</h1>
            <p className="text-xs lg:text-sm font-regular text-emerald-900/60">
              Manage your employee presets
            </p>
          </div>
        </div>
        
        {/* Export Button */}
        {!loading && employees.length > 0 && (
          <button
            type="button"
            onClick={exportEmployees}
            disabled={exporting}
            className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-emerald-900 hover:bg-emerald-800 text-gray-50 rounded-md transition-colors text-xs lg:text-sm font-regular disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export to Excel"
            aria-label="Export to Excel"
          >
            <DownloadSimple size={18} weight="light" />
            {exporting ? "Exporting..." : "Export to Excel"}
          </button>
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

      {/* Search and Sort Bar */}
      {!loading && employees.length > 0 && (
        <div className="space-y-3">
          <div className="relative">
            <MagnifyingGlass 
              size={18} 
              weight="light" 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-900/60 lg:w-5 lg:h-5"
            />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 lg:pl-10 pr-4 py-2 text-sm lg:text-base bg-gray-100 border border-emerald-900/20 rounded-full text-emerald-900 font-regular placeholder-emerald-900/40 focus:outline-none focus:ring-2 focus:ring-emerald-900"
            />
          </div>

          {/* Sort Pills */}
          <div className="flex flex-wrap gap-2">
            {[
              { value: "a-z" as SortOption, label: "A - Z" },
              { value: "z-a" as SortOption, label: "Z - A" },
              { value: "highest-assignments" as SortOption, label: "Highest Assignments" },
              { value: "lowest-assignments" as SortOption, label: "Lowest Assignments" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setSortBy(option.value)}
                className={`px-3 py-1.5 text-sm font-regular rounded-full transition-colors ${
                  sortBy === option.value
                    ? "bg-emerald-900 text-gray-50"
                    : "bg-gray-100 text-emerald-900 hover:bg-gray-200 border border-emerald-900/20"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <EmployeeListSkeleton />
      ) : (
        <>
          <EmployeeList
            employees={filteredAndSortedEmployees}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            deleteLoading={deleteLoadingId}
            sortBy={sortBy}
          />
          
          {/* Pagination - Always show */}
          {pagination && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm font-regular text-emerald-900">
                Showing {((pagination.currentPage - 1) * pagination.limit) + 1} to {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} of {pagination.totalCount} employees
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToPage(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrevPage}
                  className="px-3 py-1.5 text-sm font-regular transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 text-emerald-900 hover:bg-gray-200 border border-emerald-900/20"
                >
                  Previous
                </button>
                
                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className={`w-8 h-8 text-sm font-regular transition-colors ${
                        page === pagination.currentPage
                          ? "bg-emerald-900 text-gray-50"
                          : "bg-gray-100 text-emerald-900 hover:bg-gray-200 border border-emerald-900/20"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={() => goToPage(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="px-3 py-1.5 text-sm font-regular transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 text-emerald-900 hover:bg-gray-200 border border-emerald-900/20"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={showForm}
        onClose={handleCancel}
        title={editingEmployee ? "Edit Employee" : "Create New Employee"}
        description={
          editingEmployee
            ? "Update the employee details below. All fields marked with * are required."
            : "Fill in the details below to create a new employee preset. All fields marked with * are required."
        }
        size="lg"
        animateFrom="bottom"
        closeOnBackdropClick={!creating && !updating}
        closeOnEscape={!creating && !updating}
      >
        <EmployeeForm
          employee={editingEmployee}
          onSubmit={editingEmployee ? handleUpdate : handleCreate}
          onCancel={handleCancel}
          loading={creating || updating}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        title="Delete Employee"
        description={`Are you sure you want to delete "${deletingEmployee?.name}"? This action cannot be undone.`}
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
              This will permanently delete the employee preset. This action cannot be undone.
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
              {deleting ? "Deleting..." : "Delete Employee"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Floating Add Button */}
      {!showForm && !loading && (
        <button
          onClick={handleNewEmployee}
          className="fixed bottom-6 right-6 lg:bottom-8 lg:right-8 w-12 h-12 lg:w-14 lg:h-14 bg-emerald-900 hover:bg-emerald-800 text-gray-50 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-50"
          title="Create New Employee"
          aria-label="Create New Employee"
          tabIndex={0}
        >
          <Plus size={20} weight="light" className="lg:w-6 lg:h-6" />
        </button>
      )}
    </div>
  );
};

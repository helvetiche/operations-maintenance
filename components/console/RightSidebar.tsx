"use client";

import { useState } from "react";
import { X, ListChecks, Users, Warning } from "phosphor-react";
import { TaskManager } from "./TaskManager";
import { EmployeeTaskList } from "./EmployeeTaskList";
import { CautionWindow } from "./CautionWindow";

interface RightSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = "tasks" | "employees" | "cautions";

export const RightSidebar = ({ isOpen, onClose }: RightSidebarProps) => {
  const [activeTab, setActiveTab] = useState<TabType>("tasks");

  return (
    <>
      {/* Backdrop - mobile only */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar - Always visible on desktop, collapsible on mobile */}
      <aside
        className={`
          fixed lg:fixed top-0 right-0 h-screen w-full lg:w-80 xl:w-96 bg-gray-50 border-l border-emerald-900/20 z-[10000]
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
          flex flex-col shadow-2xl lg:shadow-none
        `}
      >
        {/* Header */}
        <div className="bg-emerald-900 px-4 py-4 flex items-center justify-between border-b border-emerald-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <ListChecks size={20} weight="light" className="text-gray-50" />
            <h2 className="text-lg font-regular text-gray-50">Checklists</h2>
          </div>
          {/* Close Button - Mobile only */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 text-gray-50 hover:bg-emerald-800 rounded-md transition-colors"
            aria-label="Close sidebar"
          >
            <X size={20} weight="light" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-emerald-900/20 bg-gray-100 flex-shrink-0">
          <button
            onClick={() => setActiveTab("tasks")}
            className={`flex-1 px-4 py-3 text-sm font-regular transition-colors flex items-center justify-center gap-2 ${
              activeTab === "tasks"
                ? "bg-gray-50 text-emerald-900 border-b-2 border-emerald-900"
                : "text-emerald-900/60 hover:text-emerald-900 hover:bg-gray-50/50"
            }`}
          >
            <ListChecks size={18} weight="light" />
            <span>Tasks</span>
          </button>
          <button
            onClick={() => setActiveTab("employees")}
            className={`flex-1 px-4 py-3 text-sm font-regular transition-colors flex items-center justify-center gap-2 ${
              activeTab === "employees"
                ? "bg-gray-50 text-emerald-900 border-b-2 border-emerald-900"
                : "text-emerald-900/60 hover:text-emerald-900 hover:bg-gray-50/50"
            }`}
          >
            <Users size={18} weight="light" />
            <span>People</span>
          </button>
          <button
            onClick={() => setActiveTab("cautions")}
            className={`flex-1 px-4 py-3 text-sm font-regular transition-colors flex items-center justify-center gap-2 ${
              activeTab === "cautions"
                ? "bg-gray-50 text-emerald-900 border-b-2 border-emerald-900"
                : "text-emerald-900/60 hover:text-emerald-900 hover:bg-gray-50/50"
            }`}
          >
            <Warning size={18} weight="light" />
            <span>Alerts</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "tasks" && <TaskManager />}
          {activeTab === "employees" && <EmployeeTaskList />}
          {activeTab === "cautions" && <CautionWindow />}
        </div>
      </aside>
    </>
  );
};

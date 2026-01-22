"use client";

import { useState } from "react";
import { User } from "@/types";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import Image from "next/image";
import { 
  ChartLineUp, 
  Calendar, 
  Users, 
  Database,
  SignOut,
  X,
  GridFour,
  List as ListIcon,
  ChartBar,
  Warning
} from "phosphor-react";

type ViewType = "overview" | "schedules" | "employee" | "cache" | "reports";
type NavLayout = "table" | "grid";

interface SidebarProps {
  user: User;
  onSignOut: () => void;
  isLoading?: boolean;
  activeView?: ViewType;
  onNavigate?: (view: ViewType) => void;
  navLayout?: NavLayout;
  onNavLayoutChange?: (layout: NavLayout) => void;
}

export const Sidebar = ({ user, onSignOut, isLoading = false, activeView = "overview", onNavigate, navLayout = "table", onNavLayoutChange }: SidebarProps) => {
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const handleNavigate = (view: ViewType) => {
    if (onNavigate) {
      onNavigate(view);
    }
  };

  const handleSignOutClick = () => {
    setShowSignOutModal(true);
  };

  const handleConfirmSignOut = () => {
    setShowSignOutModal(false);
    onSignOut();
  };
  
  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-full w-80 bg-emerald-900 border-r border-emerald-900/20 flex-col z-50">
      {/* Text Section */}
      <div className="p-6 border-b border-emerald-800/30 flex items-center gap-4">
        <div className="relative h-12 w-12 flex-shrink-0">
          <Image
            src="/nia-logo.png"
            alt="NIA Logo"
            fill
            className="object-contain"
          />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-regular tracking-tight text-gray-50">
            Console
          </h1>
          <p className="text-xs font-mono font-regular text-gray-50/80 mt-1">
            What would you like to do today?
          </p>
        </div>
      </div>

      {/* Video Section */}
      <div className="relative w-full border-b border-emerald-800/30 overflow-hidden">
        <video
          className="w-full h-auto object-cover"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src="/nia.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        {/* Tint overlay */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-emerald-900/80 to-transparent"></div>
        {/* User Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center gap-3">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || "Profile"}
              className="h-10 w-10 rounded-full flex-shrink-0 border-2 border-gray-50"
            />
          ) : (
            <div className="h-10 w-10 rounded-full flex-shrink-0 bg-emerald-900 border-2 border-gray-50 flex items-center justify-center">
              <span className="text-sm font-regular text-gray-50">
                {user.email?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-mono font-regular text-gray-50 truncate">
              {user.email}
            </div>
            <div className="text-xs font-mono font-regular text-gray-50/80 uppercase truncate mt-1">
              Employee
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Section */}
      <nav className="flex-1 p-4 overflow-y-auto">
        {navLayout === "table" ? (
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => handleNavigate("overview")}
                className={`w-full text-left px-4 py-3 text-sm font-regular text-gray-50 hover:bg-emerald-800 rounded-md transition-colors ${
                  activeView === "overview" ? "bg-emerald-800" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-50 rounded-md flex-shrink-0">
                    <ChartLineUp size={20} weight="light" className="text-emerald-900" />
                  </div>
                  <div className="flex-1">
                    <div className="font-regular">Overview</div>
                    <div className="text-xs font-mono font-regular text-gray-50/60 mt-1">
                      View your schedules in calendar
                    </div>
                  </div>
                </div>
              </button>
            </li>
            <li>
              <button
                onClick={() => handleNavigate("schedules")}
                className={`w-full text-left px-4 py-3 text-sm font-regular text-gray-50 hover:bg-emerald-800 rounded-md transition-colors ${
                  activeView === "schedules" ? "bg-emerald-800" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-50 rounded-md flex-shrink-0">
                    <Calendar size={20} weight="light" className="text-emerald-900" />
                  </div>
                  <div className="flex-1">
                    <div className="font-regular">Schedules</div>
                    <div className="text-xs font-mono font-regular text-gray-50/60 mt-1">
                      Manage your email schedules now
                    </div>
                  </div>
                </div>
              </button>
            </li>
            <li>
              <button
                onClick={() => handleNavigate("employee")}
                className={`w-full text-left px-4 py-3 text-sm font-regular text-gray-50 hover:bg-emerald-800 rounded-md transition-colors ${
                  activeView === "employee" ? "bg-emerald-800" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-50 rounded-md flex-shrink-0">
                    <Users size={20} weight="light" className="text-emerald-900" />
                  </div>
                  <div className="flex-1">
                    <div className="font-regular">Employee</div>
                    <div className="text-xs font-mono font-regular text-gray-50/60 mt-1">
                      Add and manage employee records
                    </div>
                  </div>
                </div>
              </button>
            </li>
            <li>
              <button
                onClick={() => handleNavigate("reports")}
                className={`w-full text-left px-4 py-3 text-sm font-regular text-gray-50 hover:bg-emerald-800 rounded-md transition-colors ${
                  activeView === "reports" ? "bg-emerald-800" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-50 rounded-md flex-shrink-0">
                    <ChartBar size={20} weight="light" className="text-emerald-900" />
                  </div>
                  <div className="flex-1">
                    <div className="font-regular">Reports</div>
                    <div className="text-xs font-mono font-regular text-gray-50/60 mt-1">
                      View completion history and stats
                    </div>
                  </div>
                </div>
              </button>
            </li>
            <li>
              <button
                onClick={() => handleNavigate("cache")}
                className={`w-full text-left px-4 py-3 text-sm font-regular text-gray-50 hover:bg-emerald-800 rounded-md transition-colors ${
                  activeView === "cache" ? "bg-emerald-800" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-50 rounded-md flex-shrink-0">
                    <Database size={20} weight="light" className="text-emerald-900" />
                  </div>
                  <div className="flex-1">
                    <div className="font-regular">Cache</div>
                    <div className="text-xs font-mono font-regular text-gray-50/60 mt-1">
                      Sync all caches to optimize reads
                    </div>
                  </div>
                </div>
              </button>
            </li>
          </ul>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleNavigate("overview")}
              className={`p-4 rounded-md transition-colors flex flex-col items-center justify-center gap-2 ${
                activeView === "overview" ? "bg-emerald-800" : "hover:bg-emerald-800"
              }`}
              title="Overview"
            >
              <div className="p-2 bg-gray-50 rounded-md">
                <ChartLineUp size={24} weight="light" className="text-emerald-900" />
              </div>
              <span className="text-xs font-regular text-gray-50 text-center">Overview</span>
            </button>
            <button
              onClick={() => handleNavigate("schedules")}
              className={`p-4 rounded-md transition-colors flex flex-col items-center justify-center gap-2 ${
                activeView === "schedules" ? "bg-emerald-800" : "hover:bg-emerald-800"
              }`}
              title="Schedules"
            >
              <div className="p-2 bg-gray-50 rounded-md">
                <Calendar size={24} weight="light" className="text-emerald-900" />
              </div>
              <span className="text-xs font-regular text-gray-50 text-center">Schedules</span>
            </button>
            <button
              onClick={() => handleNavigate("employee")}
              className={`p-4 rounded-md transition-colors flex flex-col items-center justify-center gap-2 ${
                activeView === "employee" ? "bg-emerald-800" : "hover:bg-emerald-800"
              }`}
              title="Employee"
            >
              <div className="p-2 bg-gray-50 rounded-md">
                <Users size={24} weight="light" className="text-emerald-900" />
              </div>
              <span className="text-xs font-regular text-gray-50 text-center">Employee</span>
            </button>
            <button
              onClick={() => handleNavigate("cache")}
              className={`p-4 rounded-md transition-colors flex flex-col items-center justify-center gap-2 ${
                activeView === "cache" ? "bg-emerald-800" : "hover:bg-emerald-800"
              }`}
              title="Cache"
            >
              <div className="p-2 bg-gray-50 rounded-md">
                <Database size={24} weight="light" className="text-emerald-900" />
              </div>
              <span className="text-xs font-regular text-gray-50 text-center">Cache</span>
            </button>
            <button
              onClick={() => handleNavigate("reports")}
              className={`p-4 rounded-md transition-colors flex flex-col items-center justify-center gap-2 ${
                activeView === "reports" ? "bg-emerald-800" : "hover:bg-emerald-800"
              }`}
              title="Reports"
            >
              <div className="p-2 bg-gray-50 rounded-md">
                <ChartBar size={24} weight="light" className="text-emerald-900" />
              </div>
              <span className="text-xs font-regular text-gray-50 text-center">Reports</span>
            </button>
          </div>
        )}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-emerald-800/30 space-y-3">
        {/* Layout Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => onNavLayoutChange?.("table")}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-colors text-sm font-regular ${
              navLayout === "table"
                ? "bg-emerald-800 text-gray-50"
                : "bg-emerald-800/50 text-gray-50 hover:bg-emerald-800"
            }`}
            title="Table Layout"
          >
            <ListIcon size={16} weight="light" />
            <span>Table</span>
          </button>
          <button
            onClick={() => onNavLayoutChange?.("grid")}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-colors text-sm font-regular ${
              navLayout === "grid"
                ? "bg-emerald-800 text-gray-50"
                : "bg-emerald-800/50 text-gray-50 hover:bg-emerald-800"
            }`}
            title="Grid Layout"
          >
            <GridFour size={16} weight="light" />
            <span>Grid</span>
          </button>
        </div>

        {/* Sign Out Button */}
        <Button
          variant="danger"
          onClick={handleSignOutClick}
          disabled={isLoading}
          fullWidth
          className="text-sm bg-red-800 hover:bg-red-800 flex items-center justify-center gap-2"
        >
          <SignOut size={18} weight="light" />
          Sign Out
        </Button>
      </div>

      {/* Sign Out Confirmation Modal */}
      <Modal
        isOpen={showSignOutModal}
        onClose={() => setShowSignOutModal(false)}
        title="Sign Out"
        description="Are you sure you want to sign out?"
        size="sm"
        animateFrom="center"
      >
        <div className="space-y-6">
          {/* Warning Message */}
          <div className="bg-amber-50 border-l-4 border-amber-800 p-4">
            <div className="flex items-start gap-3">
              <Warning size={20} weight="fill" className="text-amber-800 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-regular text-emerald-900">
                  You will be logged out of your account and redirected to the login page.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowSignOutModal(false)}
              fullWidth
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmSignOut}
              fullWidth
              disabled={isLoading}
              className="bg-red-800 hover:bg-red-700"
            >
              {isLoading ? "Signing Out..." : "Sign Out"}
            </Button>
          </div>
        </div>
      </Modal>
    </aside>
  );
};

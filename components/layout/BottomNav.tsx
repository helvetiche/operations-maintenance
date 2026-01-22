"use client";

import { 
  ChartLineUp, 
  Calendar, 
  Users, 
  ChartBar,
  Sidebar as SidebarIcon,
  SignOut
} from "phosphor-react";
import { RefObject, useState } from "react";
import { useLogout } from "@/hooks/useLogout";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

type ViewType = "overview" | "schedules" | "employee" | "cache" | "reports";

interface BottomNavProps {
  activeView?: ViewType;
  onNavigate?: (view: ViewType) => void;
  scrollContainerRef?: RefObject<HTMLElement | null>;
  onRightSidebarToggle?: () => void;
}

export const BottomNav = ({ activeView = "overview", onNavigate, scrollContainerRef, onRightSidebarToggle }: BottomNavProps) => {
  const { logout, loading: logoutLoading } = useLogout();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleNavigate = (view: ViewType) => {
    if (onNavigate) {
      onNavigate(view);
    }
    
    // Force scroll to top - try multiple methods to ensure it works
    setTimeout(() => {
      // Method 1: Try scrolling the main container if ref exists
      if (scrollContainerRef?.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
      
      // Method 2: Also try window scroll as fallback
      window.scrollTo(0, 0);
      
      // Method 3: Try document scroll
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 0);
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    await logout();
  };

  const handleCancelLogout = () => {
    setShowLogoutModal(false);
  };

  const navItems = [
    {
      id: "overview" as ViewType,
      label: "Overview",
      icon: ChartLineUp,
    },
    {
      id: "schedules" as ViewType,
      label: "Schedules",
      icon: Calendar,
    },
    {
      id: "employee" as ViewType,
      label: "Employee",
      icon: Users,
    },
    {
      id: "reports" as ViewType,
      label: "Reports",
      icon: ChartBar,
    },
  ];

  return (
    <>
      <nav 
        className="lg:hidden z-[9999] bg-emerald-900 border-t border-emerald-800/30"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          width: '100vw',
          paddingBottom: 'env(safe-area-inset-bottom)',
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        } as React.CSSProperties}
      >
        <div className="flex items-center justify-around px-1 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg transition-all duration-200 min-w-[50px] ${
                  isActive 
                    ? "bg-emerald-800 text-gray-50" 
                    : "text-gray-50/70 hover:text-gray-50 hover:bg-emerald-800/50"
                }`}
                aria-label={item.label}
              >
                <Icon 
                  size={20} 
                  weight={isActive ? "fill" : "light"} 
                  className="transition-all"
                />
                <span className={`text-[9px] font-regular transition-all ${
                  isActive ? "font-medium" : ""
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
          
          {/* Right Sidebar Toggle Button */}
          <button
            onClick={onRightSidebarToggle}
            className="flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg transition-all duration-200 min-w-[50px] text-yellow-400 hover:text-yellow-300 hover:bg-emerald-800/50"
            aria-label="Open checklists"
          >
            <SidebarIcon 
              size={20} 
              weight="light" 
              className="transition-all"
            />
            <span className="text-[9px] font-regular transition-all">
              Checklists
            </span>
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogoutClick}
            disabled={logoutLoading}
            className="flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg transition-all duration-200 min-w-[50px] text-red-400 hover:text-red-300 hover:bg-emerald-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Logout"
          >
            <SignOut 
              size={20} 
              weight="light" 
              className="transition-all"
            />
            <span className="text-[9px] font-regular transition-all">
              Logout
            </span>
          </button>
        </div>
      </nav>

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={showLogoutModal}
        onClose={handleCancelLogout}
        title="Confirm Logout"
        description="Are you sure you want to sign out of your account?"
        size="sm"
        animateFrom="center"
      >
        <div className="space-y-6">
          <p className="text-sm text-emerald-900/80">
            You will need to sign in again to access the system.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Button
              variant="secondary"
              onClick={handleCancelLogout}
              fullWidth
              disabled={logoutLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmLogout}
              disabled={logoutLoading}
              fullWidth
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600/20"
            >
              {logoutLoading ? "Signing out..." : "Sign Out"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

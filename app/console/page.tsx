"use client";

import { useState, useRef } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { RightSidebar } from "@/components/console/RightSidebar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";
import { useLogout } from "@/hooks/useLogout";
import { Overview } from "@/components/console/Overview";
import { Schedules } from "@/components/console/Schedules";
import { Employees } from "@/components/console/Employees";
import { CacheManagement } from "@/components/console/CacheManagement";
import { Reports } from "@/components/console/Reports";


type ViewType = "overview" | "schedules" | "employee" | "cache" | "reports";

export default function ConsolePage() {
  const { user, loading } = useAuth({
    redirectTo: "/",
    requireAuth: true,
  });

  const { logout, loading: logoutLoading } = useLogout();
  const [activeView, setActiveView] = useState<ViewType>("overview");
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [navLayout, setNavLayout] = useState<"table" | "grid">("table");
  const mainRef = useRef<HTMLElement>(null);

  const handleViewChange = (view: ViewType) => {
    setActiveView(view);
    
    // Force scroll to top immediately
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  if (loading || !user) {
    return <LoadingSpinner fullScreen />;
  }

  const renderView = () => {
    switch (activeView) {
      case "overview":
        return <Overview />;
      case "schedules":
        return <Schedules />;
      case "employee":
        return <Employees />;
      case "cache":
        return <CacheManagement />;
      case "reports":
        return <Reports />;
      default:
        return <Overview />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar 
        user={user} 
        onSignOut={logout} 
        isLoading={logoutLoading}
        activeView={activeView}
        onNavigate={handleViewChange}
        navLayout={navLayout}
        onNavLayoutChange={setNavLayout}
      />
      
      <main ref={mainRef} className="flex-1 lg:ml-80 lg:mr-80 xl:mr-96 p-4 lg:p-8 pb-24 lg:pb-8 bg-gradient-to-br from-gray-50 to-gray-100 overflow-y-auto overflow-x-hidden">
        {/* Background Image */}
        <div 
          className="fixed inset-0 lg:left-80 lg:right-80 xl:right-96 opacity-30 pointer-events-none z-0"
          style={{
            backgroundImage: 'url(/console-bg.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        
        {/* Vignette Effect */}
        <div 
          className="fixed inset-0 lg:left-80 lg:right-80 xl:right-96 pointer-events-none z-20"
          style={{
            boxShadow: 'inset 0 0 120px rgba(6, 78, 59, 0.3)',
          }}
        />
        {/* Grid Background - Fixed to cover entire scrollable area */}
        <div 
          className="fixed inset-0 lg:left-80 lg:right-80 xl:right-96 opacity-80 pointer-events-none z-10"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(5, 150, 105, 0.2) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(5, 150, 105, 0.2) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
            top: 0,
            bottom: 0
          }}
        />

        <div className="relative z-30 pt-4 lg:pt-6">
          {renderView()}
        </div>
      </main>

      <RightSidebar 
        isOpen={rightSidebarOpen}
        onClose={() => setRightSidebarOpen(false)}
      />

      {/* Mobile Bottom Navigation */}
      <BottomNav 
        activeView={activeView}
        onNavigate={handleViewChange}
        scrollContainerRef={mainRef}
        onRightSidebarToggle={() => setRightSidebarOpen(true)}
      />
    </div>
  );
}

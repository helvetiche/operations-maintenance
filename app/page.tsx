"use client";

import { useEffect } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/layout/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { LoginForm } from "@/components/auth/LoginForm";
import { useAuth } from "@/hooks/useAuth";
import Image from "next/image";

export default function Home() {
  const { loading } = useAuth({
    redirectTo: "/console",
    requireAuth: false,
  });

  useEffect(() => {
    // If user is authenticated, redirect will happen via useAuth hook
  }, []);

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <>
      <PageContainer centered maxWidth="full" className="relative">
        {/* Video Background */}
        <video
          className="absolute top-0 left-0 w-full h-full object-cover z-0"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src="/nia.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        
        {/* Overlay for readability */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-gray-50/50 to-gray-100/50 z-10"></div>
        
        {/* Grid overlay */}
        <div 
          className="absolute top-0 left-0 w-full h-full z-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(0, 0, 0, 0.03) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(0, 0, 0, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
          }}
        ></div>

        {/* Content */}
        <div className="relative z-30 w-full">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] py-12">
              {/* Centered Login Form */}
              <div className="w-full max-w-md">
                <Card>
                  <div className="mb-8">
                    <h1 className="mb-2 text-3xl font-regular tracking-tight text-emerald-900 sm:text-4xl">
                      Operation and Maintenance
                    </h1>
                    <p className="text-base font-regular text-emerald-800/80 sm:text-lg">
                      Automated Email for Reminding Employee
                    </p>
                  </div>

                  <div className="mb-6">
              
                  </div>

                  <LoginForm />
                </Card>
              </div>
            </div>
          </div>
        </div>
      </PageContainer>

      {/* Footer */}
      <footer className="w-full bg-gradient-to-br from-emerald-900 to-emerald-800 py-6 sm:py-8 lg:py-12">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-6 lg:space-y-8">
            {/* About Section */}
            <div className="text-center lg:text-left">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-regular text-white mb-3 sm:mb-4">
                [ About This Application ]
              </h2>
              <p className="text-xs sm:text-sm font-mono font-regular text-emerald-100 leading-relaxed max-w-3xl mx-auto lg:mx-0">
                This system is an intelligent scheduling and reminder system designed to streamline operations and maintenance management.
              </p>
            </div>

            {/* Footer Content */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-8 pt-6 border-t border-emerald-800/50">
              {/* Logo and Organization Info */}
              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 text-center sm:text-left">
                <div className="relative h-10 w-10 sm:h-12 sm:w-12 border-2 border-white rounded-none flex-shrink-0">
                  <Image
                    src="/nia-logo.png"
                    alt="NIA Logo"
                    fill
                    className="object-contain p-1"
                  />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm sm:text-base lg:text-lg font-regular text-white leading-tight">
                    National Irrigation Administration
                  </h3>
                  <p className="text-xs sm:text-sm font-regular text-emerald-100">
                    Tambubong, San Rafael, Bulacan
                  </p>
                </div>
              </div>

              {/* Mission and Copyright */}
              <div className="text-center lg:text-right space-y-2">
                <p className="text-xs sm:text-sm font-regular text-emerald-100 max-w-xs lg:max-w-none">
                  Committed to sustainable irrigation development
                </p>
                <p className="text-xs font-regular text-emerald-200/80">
                  © {new Date().getFullYear()} Tambubong, San Rafael, Bulacan. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

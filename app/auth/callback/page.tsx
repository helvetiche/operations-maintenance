"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/layout/Card";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { checkIsEmailLink, signInWithEmailLinkAuth } from "@/lib/firebase-client";
import { authApi } from "@/lib/api-client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleEmailLink = async () => {
      try {
        // Check if this is an email link
        if (!checkIsEmailLink()) {
          setError("Invalid sign-in link. Please request a new one.");
          setLoading(false);
          return;
        }

        // Get email from localStorage (stored when sending link) or prompt user
        const storedEmail = localStorage.getItem("emailForSignIn");
        
        let email = storedEmail;
        if (!email) {
          // Prompt user for email if not stored
          const userEmail = prompt("Please enter your email address to complete sign-in:");
          if (!userEmail) {
            setError("Email is required to complete sign-in.");
            setLoading(false);
            return;
          }
          email = userEmail;
        }

        // Get the full URL including query parameters
        const emailLink = window.location.href;

        // Sign in with email link
        const { idToken } = await signInWithEmailLinkAuth(email, emailLink);

        // Clear stored email
        localStorage.removeItem("emailForSignIn");

        // Verify with backend and create session
        const response = await authApi.verifyLink(idToken);

        if (response.success && response.data) {
          // Successfully authenticated, redirect to console
          router.push("/console");
        } else {
          setError(response.message || "Authentication failed. Please try again.");
          setLoading(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to complete sign-in. Please try again.");
        setLoading(false);
      }
    };

    handleEmailLink();
  }, [router]);

  const handleReturnToLogin = () => {
    router.push("/");
  };

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
              <div className="w-full max-w-md">
                <Card>
                  <div className="mb-8">
                    <h1 className="mb-2 text-3xl font-regular tracking-tight text-emerald-900 sm:text-4xl">
                      Verifying Sign-In Link
                    </h1>
                    <p className="text-base font-regular text-emerald-800/80 sm:text-lg">
                      Please wait while we verify your authentication
                    </p>
                  </div>

                  {loading && (
                    <div className="space-y-6">
                      <div className="flex flex-col items-center justify-center py-8">
                        <div className="relative mb-6">
                          <div className="h-16 w-16 border-4 border-emerald-200 border-t-emerald-900 rounded-full animate-spin"></div>
                        </div>
                        <p className="text-sm font-regular text-emerald-800/80">
                          Verifying your sign-in link...
                        </p>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="space-y-6">
                      <Alert type="error" className="mb-4">
                        {error}
                      </Alert>
                      <Button 
                        fullWidth 
                        onClick={handleReturnToLogin}
                        className="bg-emerald-900 hover:bg-emerald-800 focus:ring-emerald-900/20"
                      >
                        Return to Login
                      </Button>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </>
  );
}

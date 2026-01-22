import { useState } from "react";
import { sendPasswordlessLink } from "@/lib/firebase-client";
import { authApi } from "@/lib/api-client";

export const usePasswordlessLogin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const sendLink = async (email: string) => {
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      // Store email in localStorage for callback page
      localStorage.setItem("emailForSignIn", email.trim());

      // Send passwordless link via Firebase client SDK
      await sendPasswordlessLink(email.trim());

      // Notify backend (for validation/logging)
      const response = await authApi.sendLoginLink(email.trim());

      if (response.success) {
        setSuccess(true);
      } else {
        // Handle different backend error scenarios
        if (response.message?.includes("not found")) {
          setError("We couldn't find an account with that email address.");
        } else if (response.message?.includes("disabled")) {
          setError("Your account has been temporarily disabled. Please contact support.");
        } else {
          setError("Unable to send sign-in link at this time. Please try again in a few moments.");
        }
        localStorage.removeItem("emailForSignIn");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "";
      
      // Handle Firebase and network errors with user-friendly messages
      if (errorMessage.includes("auth/invalid-email")) {
        setError("Please enter a valid email address.");
      } else if (errorMessage.includes("auth/user-not-found")) {
        setError("We couldn't find an account with that email address.");
      } else if (errorMessage.includes("auth/user-disabled")) {
        setError("Your account has been temporarily disabled. Please contact support.");
      } else if (errorMessage.includes("auth/too-many-requests")) {
        setError("Too many requests. Please wait a few minutes before trying again.");
      } else if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
        setError("Network connection problem. Please check your internet and try again.");
      } else if (errorMessage.includes("quota-exceeded")) {
        setError("Service temporarily unavailable. Please try again later.");
      } else {
        setError("Unable to send sign-in link at this time. Please try again in a few moments.");
      }
      localStorage.removeItem("emailForSignIn");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setError(null);
    setSuccess(false);
  };

  return {
    sendLink,
    loading,
    error,
    success,
    reset,
  };
};

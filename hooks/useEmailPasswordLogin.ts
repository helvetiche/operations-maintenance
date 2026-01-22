import { useState } from "react";
import { signInWithEmailAndPassword } from "@/lib/firebase-client";
import { authApi } from "@/lib/api-client";

export const useEmailPasswordLogin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async (email: string, password: string) => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Sign in with Firebase
      const { idToken } = await signInWithEmailAndPassword(email.trim(), password);

      // Verify with backend and create session
      const response = await authApi.verifyEmailPassword(idToken);

      if (response.success) {
        // Redirect will be handled by useAuth hook
        window.location.href = "/console";
      } else {
        setError("Unable to sign in. Please check your credentials and try again.");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "";
      
      // Handle specific Firebase auth errors with user-friendly messages
      if (errorMessage.includes("auth/user-not-found")) {
        setError("We couldn't find an account with that email address.");
      } else if (errorMessage.includes("auth/wrong-password")) {
        setError("The password you entered is incorrect. Please try again.");
      } else if (errorMessage.includes("auth/invalid-email")) {
        setError("Please enter a valid email address.");
      } else if (errorMessage.includes("auth/user-disabled")) {
        setError("Your account has been temporarily disabled. Please contact support.");
      } else if (errorMessage.includes("auth/too-many-requests")) {
        setError("Too many failed sign-in attempts. Please wait a few minutes and try again.");
      } else if (errorMessage.includes("auth/network-request-failed")) {
        setError("Network connection problem. Please check your internet and try again.");
      } else if (errorMessage.includes("auth/invalid-credential")) {
        setError("The email or password you entered is incorrect.");
      } else {
        setError("Unable to sign in at this time. Please try again in a few moments.");
      }
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setError(null);
  };

  return {
    signIn,
    loading,
    error,
    reset,
  };
};
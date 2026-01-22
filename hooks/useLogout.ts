import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthInstance } from "@/lib/firebase-client";
import { signOut } from "firebase/auth";
import { authApi } from "@/lib/api-client";

export const useLogout = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logout = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get CSRF token
      const csrfResponse = await authApi.getCsrfToken();
      if (!csrfResponse.success || !csrfResponse.data) {
        throw new Error("Failed to get CSRF token");
      }

      const csrfToken = csrfResponse.data.csrfToken;

      // Sign out from Firebase
      const auth = getAuthInstance();
      await signOut(auth);

      // Call logout API
      const response = await authApi.logout(csrfToken);

      if (response.success) {
        router.push("/");
        router.refresh();
      } else {
        throw new Error(response.message || "Logout failed");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to logout";
      setError(errorMessage);
      console.error("Logout error:", errorMessage, err);
      // Still redirect even on error
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return {
    logout,
    loading,
    error,
  };
};

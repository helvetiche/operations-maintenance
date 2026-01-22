import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/types";
import { authApi } from "@/lib/api-client";

interface UseAuthOptions {
  redirectTo?: string;
  requireAuth?: boolean;
}

export const useAuth = (options: UseAuthOptions = {}) => {
  const { redirectTo = "/", requireAuth = false } = options;
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authApi.getSession();

      if (response.success && response.data) {
        setUser(response.data);
        // If user is authenticated and we're on login page, redirect to console
        if (!requireAuth) {
          router.push("/console");
        }
      } else {
        setUser(null);
        if (requireAuth) {
          router.push(redirectTo);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check session");
      setUser(null);
      if (requireAuth) {
        router.push(redirectTo);
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    error,
    checkSession,
  };
};

import { ApiResponse, User } from "@/types";

const API_BASE_URL = "/api";

/**
 * Generic API fetch wrapper
 */
const apiFetch = async <T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  // Remove leading /api if present since API_BASE_URL already includes it
  const cleanEndpoint = endpoint.startsWith('/api') 
    ? endpoint.substring(4) 
    : endpoint;
    
  const response = await fetch(`${API_BASE_URL}${cleanEndpoint}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  return response.json();
};

/**
 * Generic API client for CRUD operations
 */
export const apiClient = {
  get: async <T = unknown>(endpoint: string): Promise<ApiResponse<T>> => {
    return apiFetch<T>(endpoint, { method: "GET" });
  },

  post: async <T = unknown>(
    endpoint: string,
    data?: unknown
  ): Promise<ApiResponse<T>> => {
    return apiFetch<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  put: async <T = unknown>(
    endpoint: string,
    data?: unknown
  ): Promise<ApiResponse<T>> => {
    return apiFetch<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  delete: async <T = unknown>(endpoint: string): Promise<ApiResponse<T>> => {
    return apiFetch<T>(endpoint, { method: "DELETE" });
  },
};

/**
 * Auth API client
 */
export const authApi = {
  /**
   * Get current session
   */
  getSession: async (): Promise<ApiResponse<User>> => {
    return apiFetch<User>("/auth/session");
  },

  /**
   * Send passwordless login link
   */
  sendLoginLink: async (email: string): Promise<ApiResponse<{ message: string }>> => {
    return apiFetch("/auth/send-link", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  /**
   * Verify email link and create session
   */
  verifyLink: async (idToken: string): Promise<ApiResponse<User>> => {
    return apiFetch<User>("/auth/verify-link", {
      method: "POST",
      body: JSON.stringify({ idToken }),
    });
  },

  /**
   * Verify email/password login and create session
   */
  verifyEmailPassword: async (idToken: string): Promise<ApiResponse<User>> => {
    return apiFetch<User>("/auth/verify-password", {
      method: "POST",
      body: JSON.stringify({ idToken }),
    });
  },

  /**
   * Logout
   */
  logout: async (csrfToken: string): Promise<ApiResponse<{ message: string }>> => {
    return apiFetch("/auth/logout", {
      method: "POST",
      headers: {
        "X-CSRF-Token": csrfToken,
      },
    });
  },

  /**
   * Get CSRF token
   */
  getCsrfToken: async (): Promise<ApiResponse<{ csrfToken: string }>> => {
    return apiFetch<{ csrfToken: string }>("/csrf");
  },
};

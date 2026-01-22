import { useState } from "react";

export const useExportEmployees = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportEmployees = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/export/employees", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to export employees");
      }

      // Get the blob from response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `employees-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to export employees";
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { exportEmployees, loading, error };
};

import { useState } from "react";

export const useExportReports = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportReports = async (month: number, year: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/export/reports?month=${month}&year=${year}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to export reports");
      }

      // Get the blob from response
      const blob = await response.blob();
      
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const filename = `reports-${monthNames[month]}-${year}-${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to export reports";
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { exportReports, loading, error };
};

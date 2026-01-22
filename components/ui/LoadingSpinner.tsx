interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

export const LoadingSpinner = ({
  message = "Loading...",
  fullScreen = false,
  className = "",
}: LoadingSpinnerProps) => {
  const containerClasses = fullScreen
    ? "flex min-h-screen items-center justify-center bg-gray-100"
    : "flex items-center justify-center";

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className="text-center">
        <div className="relative mb-4 inline-block">
          <div className="h-12 w-12 border-4 border-gray-200 border-t-emerald-900 rounded-full animate-spin"></div>
        </div>
        {message && (
          <div className="text-sm font-regular text-emerald-800/80">
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

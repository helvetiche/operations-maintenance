import { ReactNode } from "react";

interface AlertProps {
  type?: "success" | "error" | "info" | "warning";
  title?: string;
  children: ReactNode;
  className?: string;
}

export const Alert = ({
  type = "info",
  title,
  children,
  className = "",
}: AlertProps) => {
  const typeClasses = {
    success: "bg-emerald-50 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-400",
    error: "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400",
    info: "bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
    warning: "bg-gray-100 text-gray-900 dark:bg-gray-900/20 dark:text-gray-400",
  };

  return (
    <div className={`rounded-md p-4 text-sm ${typeClasses[type]} ${className}`}>
      {title && <p className="font-medium">{title}</p>}
      <div className={title ? "mt-1" : ""}>{children}</div>
    </div>
  );
};

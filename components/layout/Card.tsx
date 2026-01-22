import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
}

export const Card = ({
  children,
  className = "",
  padding = "md",
}: CardProps) => {
  const paddingClasses = {
    sm: "p-4",
    md: "p-8",
    lg: "p-12",
  };

  return (
    <div
      className={`bg-gray-100 border-1 border-emerald-900 shadow-lg shadow-emerald-900/5 dark:bg-zinc-900 ${paddingClasses[padding]} ${className}`}
    >
      {children}
    </div>
  );
};

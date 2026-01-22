import { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  centered?: boolean;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  className?: string;
}

export const PageContainer = ({
  children,
  centered = false,
  maxWidth = "full",
  className = "",
}: PageContainerProps) => {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    full: "max-w-full",
  };

  const containerClasses = centered
    ? "flex min-h-screen items-center justify-center font-sans dark:bg-black"
    : "min-h-screen font-sans dark:bg-black";

  const gridStyle = {
    backgroundImage: `
      linear-gradient(to right, rgba(0, 0, 0, 0.03) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(0, 0, 0, 0.03) 1px, transparent 1px),
      linear-gradient(to bottom right, rgb(255, 251, 235), rgb(254, 243, 199))
    `,
    backgroundSize: '80px 80px, 80px 80px, 100% 100%',
  };

  return (
    <div className={`${containerClasses} ${className}`} style={gridStyle}>
      <div className={`w-full ${maxWidthClasses[maxWidth]} mx-auto px-4 sm:px-6 lg:px-8`}>
        {children}
      </div>
    </div>
  );
};

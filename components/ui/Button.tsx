import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  fullWidth?: boolean;
  children: ReactNode;
}

export const Button = ({
  variant = "primary",
  fullWidth = false,
  className = "",
  disabled,
  children,
  onClick,
  ...props
}: ButtonProps) => {
  const baseClasses = "rounded-md px-5 py-3 font-regular transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantClasses = {
    primary: "bg-emerald-900 hover:bg-emerald-800 text-gray-50",
    secondary: "bg-gray-100 hover:bg-gray-200 text-emerald-900 border border-emerald-900/20",
    danger: "bg-red-600 hover:bg-red-700 text-white",
  };

  const widthClass = fullWidth ? "w-full" : "";

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${widthClass} ${className}`}
      disabled={disabled}
      {...props}
      onClick={handleClick}
    >
      {children}
    </button>
  );
};

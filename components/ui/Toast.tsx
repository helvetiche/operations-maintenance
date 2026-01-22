"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { CheckCircle, XCircle, Info, Warning } from "phosphor-react";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: Warning,
};

const colors = {
  success: {
    bg: "bg-emerald-50",
    border: "border-emerald-900/20",
    text: "text-emerald-900",
    icon: "text-emerald-900",
  },
  error: {
    bg: "bg-red-50",
    border: "border-red-900/20",
    text: "text-red-900",
    icon: "text-red-900",
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-900/20",
    text: "text-blue-900",
    icon: "text-blue-900",
  },
  warning: {
    bg: "bg-gray-100",
    border: "border-gray-900/20",
    text: "text-gray-900",
    icon: "text-gray-900",
  },
};

export const Toast = ({ message, type = "success", duration = 3000, onClose }: ToastProps) => {
  const toastRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!toastRef.current) return;

    const toast = toastRef.current;
    const Icon = icons[type];
    const colorClasses = colors[type];

    // Set initial position (off-screen to the right)
    gsap.set(toast, {
      x: 400,
      opacity: 0,
      scale: 0.8,
    });

    // Animate in
    const tl = gsap.timeline({
      onComplete: () => {
        // Auto-close after duration
        setTimeout(() => {
          animateOut();
        }, duration);
      },
    });

    tl.to(toast, {
      x: 0,
      opacity: 1,
      scale: 1,
      duration: 0.5,
      ease: "back.out(1.7)",
    });

    const animateOut = () => {
      gsap.to(toast, {
        x: 400,
        opacity: 0,
        scale: 0.8,
        duration: 0.4,
        ease: "power2.in",
        onComplete: onClose,
      });
    };

    return () => {
      tl.kill();
    };
  }, [duration, onClose, type]);

  const Icon = icons[type];
  const colorClasses = colors[type];

  return (
    <div
      ref={toastRef}
      className={`${colorClasses.bg} ${colorClasses.border} border rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 min-w-[300px] max-w-[400px]`}
      style={{ willChange: "transform, opacity" }}
    >
      <Icon size={24} weight="light" className={colorClasses.icon} />
      <p className={`text-sm font-regular ${colorClasses.text} flex-1`}>{message}</p>
    </div>
  );
};

interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; type?: ToastType }>;
  onRemove: (id: string) => void;
}

export const ToastContainer = ({ toasts, onRemove }: ToastContainerProps) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => onRemove(toast.id)}
          />
        </div>
      ))}
    </div>
  );
};

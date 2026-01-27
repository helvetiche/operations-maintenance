"use client";

import { useEffect, useRef, ReactNode } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import { X } from "phosphor-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  description?: string;
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  animateFrom?: "top" | "bottom" | "left" | "right" | "center";
  className?: string;
}

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-full mx-4",
};

export const Modal = ({
  isOpen,
  onClose,
  children,
  title,
  description,
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  size = "md",
  animateFrom = "center",
  className = "",
}: ModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, closeOnEscape, onClose]);

  useEffect(() => {
    if (!isOpen || !modalRef.current || !backdropRef.current || !contentRef.current) {
      return;
    }

    const backdrop = backdropRef.current;
    const content = contentRef.current;

    // Get initial position based on animateFrom
    const getInitialPosition = () => {
      const windowHeight = window.innerHeight;
      const contentRect = content.getBoundingClientRect();

      switch (animateFrom) {
        case "top":
          return { y: -windowHeight - contentRect.height, x: 0 };
        case "bottom":
          return { y: windowHeight + contentRect.height, x: 0 };
        case "left":
          return { x: -window.innerWidth - contentRect.width, y: 0 };
        case "right":
          return { x: window.innerWidth + contentRect.width, y: 0 };
        case "center":
        default:
          return { x: 0, y: 0, scale: 0.9 };
      }
    };

    const initialPos = getInitialPosition();

    // Set initial state immediately
    gsap.set(backdrop, {
      opacity: 0,
    });

    gsap.set(content, {
      ...initialPos,
      opacity: 0,
    });

    // Animate in
    const tl = gsap.timeline();

    tl.to(backdrop, {
      opacity: 1,
      duration: 0.3,
      ease: "power2.out",
    })
      .to(
        content,
        {
          x: 0,
          y: 0,
          scale: 1,
          opacity: 1,
          duration: 0.5,
          ease: "power3.out",
        },
        "-=0.2"
      );

    return () => {
      tl.kill();
    };
  }, [isOpen, animateFrom]);

  const handleClose = () => {
    if (!modalRef.current || !backdropRef.current || !contentRef.current) {
      onClose();
      return;
    }

    const backdrop = backdropRef.current;
    const content = contentRef.current;

    const getExitPosition = () => {
      const windowHeight = window.innerHeight;
      const contentRect = content.getBoundingClientRect();

      switch (animateFrom) {
        case "top":
          return { y: -windowHeight - contentRect.height };
        case "bottom":
          return { y: windowHeight + contentRect.height };
        case "left":
          return { x: -window.innerWidth - contentRect.width };
        case "right":
          return { x: window.innerWidth + contentRect.width };
        case "center":
        default:
          return { scale: 0.9, opacity: 0 };
      }
    };

    const exitPos = getExitPosition();

    const tl = gsap.timeline({
      onComplete: onClose,
    });

    tl.to(content, {
      ...exitPos,
      opacity: 0,
      duration: 0.4,
      ease: "power2.in",
    }).to(
      backdrop,
      {
        opacity: 0,
        duration: 0.2,
        ease: "power2.out",
      },
      "-=0.2"
    );
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  // Use portal to render at document body level
  if (typeof document === "undefined") return null;

  const modalContent = (
    <div
      ref={modalRef}
      className="fixed inset-0 z-[10001] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        ref={contentRef}
        className={`relative bg-gray-50 border border-emerald-900/20 shadow-lg shadow-emerald-900/10 rounded-lg ${sizeClasses[size]} w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col ${className}`}
        style={{ willChange: "transform, opacity" }}
      >
        {/* Header */}
        {(title || description || showCloseButton) && (
          <div className="p-6 border-b border-emerald-900/20">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {title && (
                  <h2
                    id="modal-title"
                    className="text-2xl font-regular text-emerald-900"
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="text-sm font-regular text-emerald-900/60 mt-1">
                    {description}
                  </p>
                )}
              </div>
              {showCloseButton && (
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-emerald-900/10 rounded-md transition-colors text-emerald-900 flex-shrink-0"
                  aria-label="Close modal"
                >
                  <X size={20} weight="light" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

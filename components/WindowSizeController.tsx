"use client";

import { useEffect } from "react";

interface WindowSizeControllerProps {
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export const WindowSizeController = ({
  width,
  height,
  minWidth = 1024,
  minHeight = 768,
  maxWidth = 1920,
  maxHeight = 1080,
}: WindowSizeControllerProps) => {
  useEffect(() => {
    // Only apply in PWA mode (standalone or window-controls-overlay)
    const isPWA =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: window-controls-overlay)").matches ||
      (window.navigator as any).standalone === true;

    if (!isPWA) {
      return;
    }

    const setWindowSize = () => {
      // For desktop PWAs, try to set window size if APIs are available
      if (typeof window !== "undefined" && window.screen) {
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;

        // Calculate optimal window size
        const targetWidth = width || Math.min(maxWidth, screenWidth * 0.9);
        const targetHeight = height || Math.min(maxHeight, screenHeight * 0.9);

        // Apply constraints via CSS custom properties
        document.documentElement.style.setProperty(
          "--pwa-window-width",
          `${targetWidth}px`
        );
        document.documentElement.style.setProperty(
          "--pwa-window-height",
          `${targetHeight}px`
        );
        document.documentElement.style.setProperty(
          "--pwa-window-min-width",
          `${minWidth}px`
        );
        document.documentElement.style.setProperty(
          "--pwa-window-min-height",
          `${minHeight}px`
        );
        document.documentElement.style.setProperty(
          "--pwa-window-max-width",
          `${maxWidth}px`
        );
        document.documentElement.style.setProperty(
          "--pwa-window-max-height",
          `${maxHeight}px`
        );
      }
    };

    setWindowSize();
    window.addEventListener("resize", setWindowSize);

    return () => {
      window.removeEventListener("resize", setWindowSize);
    };
  }, [width, height, minWidth, minHeight, maxWidth, maxHeight]);

  return null;
};

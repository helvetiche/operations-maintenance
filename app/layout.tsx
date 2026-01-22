import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { WindowSizeController } from "@/components/WindowSizeController";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "NIA Operation & Maintenance",
  description: "Automated Email for Reminding Employee - National Irrigation Administration Operation and Maintenance System",
  applicationName: "NIA O&M",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NIA O&M",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/nia-logo.png", sizes: "750x750", type: "image/png" },
      { url: "/nia-logo.png", sizes: "192x192", type: "image/png" },
      { url: "/nia-logo.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/nia-logo-mobile.png", sizes: "1000x1000", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    siteName: "NIA Operation & Maintenance",
    title: "NIA Operation & Maintenance",
    description: "Automated Email for Reminding Employee - National Irrigation Administration Operation and Maintenance System",
  },
  twitter: {
    card: "summary",
    title: "NIA Operation & Maintenance",
    description: "Automated Email for Reminding Employee - National Irrigation Administration Operation and Maintenance System",
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#065f46",
    "msapplication-tap-highlight": "no",
  },
};

export const viewport: Viewport = {
  themeColor: "#065f46",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${poppins.variable} font-poppins antialiased`}
      >
        <WindowSizeController
          width={1400}
          height={900}
          minWidth={1024}
          minHeight={768}
          maxWidth={1920}
          maxHeight={1080}
        />
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}

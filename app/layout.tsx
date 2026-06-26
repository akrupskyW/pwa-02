import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Personalized Nutrition",
  description:
    "Pick the codes that matter to you. Weight them. See how any food scores against your personal definition of good food.",
  applicationName: "Personalized Nutrition",
  appleWebApp: {
    capable: true,
    title: "Personalized Nutrition",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#fbf6ed",
  viewportFit: "cover",
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="en">
    <body className="font-sans">{children}</body>
  </html>
);

export default RootLayout;

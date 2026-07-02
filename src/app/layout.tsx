import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "GymStreak — Don't break the chain",
    template: "%s · GymStreak",
  },
  description:
    "The social gym platform for college students. Build your streak, climb the tiers, and keep your friends accountable.",
};

export const viewport: Viewport = {
  themeColor: "#14213d",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}

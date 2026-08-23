import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastProvider } from "@/components/feedback/ToastProvider";
import { SiteNav } from "@/components/layout/SiteNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Battleship Multiplayer",
  description:
    "Team-based multiplayer Battleship — lobby, placement, and real-time match play.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <a href="#content" className="skip-link">
          Skip to content
        </a>
        <ToastProvider>
          <SiteNav />
          <div id="content">{children}</div>
        </ToastProvider>
      </body>
    </html>
  );
}

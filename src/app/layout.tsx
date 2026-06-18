import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Toolkit Hub - Discover the Best AI Tools & Software",
  description: "Your go-to resource for AI tool reviews, comparisons, and guides. Discover the best AI software to boost your productivity, marketing, and business.",
  keywords: ["AI tools", "AI software", "SaaS reviews", "AI productivity", "AI marketing tools", "best AI tools 2026"],
  authors: [{ name: "AI Toolkit Hub" }],
  openGraph: {
    title: "AI Toolkit Hub - Discover the Best AI Tools & Software",
    description: "Expert reviews and guides for the best AI tools and software",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}

import "./globals.css";
import type { Metadata } from "next";
import { EnvBanner } from "@/components/EnvBanner";

export const metadata: Metadata = {
  title: "greybeard — verify once, flash anywhere",
  description: "Verified identity, portable into any chat.",
  robots: { index: false, follow: false }, // beta: keep out of indexes
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;450;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <EnvBanner />
        {children}
      </body>
    </html>
  );
}

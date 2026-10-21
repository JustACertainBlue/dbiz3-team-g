import type { Metadata } from "next";
import React from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hanoi Artisan Bridge",
  description: "Cultural and Craft Tourism Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header>
          <nav>
            <a href="/">Hanoi Artisan Bridge</a>
            <a href="#">Sign in</a>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}

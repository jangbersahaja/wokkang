import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StoreHub Transaction Monitor",
  description: "Real-time transaction monitoring for StoreHub",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

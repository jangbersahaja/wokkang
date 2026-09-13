import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wokkang | StoreHub Sales Pulse",
  description: "Live StoreHub sales and transaction monitoring for Wokkang.",
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

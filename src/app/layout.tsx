import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BrokerFlow",
  description:
    "Automatisera administrationen kring fastighetsmäklares förmedlingsuppdrag",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}

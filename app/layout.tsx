import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import ClientProviders from "@/components/ClientProviders";

export const metadata: Metadata = {
  title: "NextNote — Producer Brain for Guitarists",
  description: "Record your guitar idea for chord detection, tempo, and piano visualizer practice",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="flex min-h-screen bg-surface overflow-x-hidden">
        <ClientProviders>
          <Sidebar />
          <div className="flex-1 md:ml-44 ml-0 min-w-0 overflow-x-hidden pb-16 md:pb-0">
            {children}
          </div>
          <MobileNav />
        </ClientProviders>
      </body>
    </html>
  );
}

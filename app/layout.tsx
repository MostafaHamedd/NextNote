import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "NextNote — Producer Brain for Guitarists",
  description: "Record your guitar idea and get instant producer feedback powered by AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen bg-surface overflow-x-hidden">
        <Sidebar />
        {/* Main content — offset by the fixed 176px (w-44) sidebar */}
        <div className="flex-1 ml-44 min-w-0 overflow-x-hidden">{children}</div>
      </body>
    </html>
  );
}

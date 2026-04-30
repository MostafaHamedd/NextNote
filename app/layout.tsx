import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import Footer from "@/components/Footer";
import ClientProviders from "@/components/ClientProviders";

export const metadata: Metadata = {
  title: "NextNote — Guitar chords, piano view & MIDI",
  description:
    "Chord and key detection from guitar recordings, piano keyboard view, and MIDI export for your DAW.",
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
          <div className="flex-1 md:ml-44 ml-0 min-w-0 overflow-x-hidden pb-16 md:pb-0 flex flex-col">
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
          <MobileNav />
        </ClientProviders>
      </body>
    </html>
  );
}

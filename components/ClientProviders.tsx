"use client";

import { AuthProvider } from "@/context/AuthContext";
import { PlatformProvider } from "@/context/PlatformContext";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <PlatformProvider>
      <AuthProvider>{children}</AuthProvider>
    </PlatformProvider>
  );
}

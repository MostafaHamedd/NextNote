"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { API_URL } from "@/lib/config";

interface PlatformConfig {
  free_mode: boolean;
  producer_enabled: boolean;
}

const PlatformContext = createContext<PlatformConfig>({ free_mode: false, producer_enabled: true });

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<PlatformConfig>({ free_mode: false, producer_enabled: true });

  useEffect(() => {
    fetch(`${API_URL}/config`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setConfig(data); })
      .catch(() => {});
  }, []);

  return (
    <PlatformContext.Provider value={config}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform() {
  return useContext(PlatformContext);
}

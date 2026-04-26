"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { API_URL } from "@/lib/config";

interface PlatformConfig {
  free_mode: boolean;
  producer_enabled: boolean;
  noise_removal_enabled: boolean;
  visualizer_enabled: boolean;
  live_detector_enabled: boolean;
  ear_training_enabled: boolean;
  guitar_piano_enabled: boolean;
}

const DEFAULTS: PlatformConfig = {
  free_mode: false,
  producer_enabled: true,
  noise_removal_enabled: false,
  visualizer_enabled: true,
  live_detector_enabled: true,
  ear_training_enabled: true,
  guitar_piano_enabled: true,
};

const PlatformContext = createContext<PlatformConfig>(DEFAULTS);

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<PlatformConfig>(DEFAULTS);

  useEffect(() => {
    fetch(`${API_URL}/config`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setConfig({ ...DEFAULTS, ...data }); })
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

"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { API_URL } from "@/lib/config";

interface PlatformConfig {
  loaded: boolean;
  free_mode: boolean;
  producer_enabled: boolean;
  noise_removal_enabled: boolean;
  visualizer_enabled: boolean;
  live_detector_enabled: boolean;
  ear_training_enabled: boolean;
  guitar_piano_enabled: boolean;
  logic_preset_enabled: boolean;
}

const DEFAULTS: PlatformConfig = {
  loaded: false,
  free_mode: false,
  producer_enabled: false,
  noise_removal_enabled: false,
  visualizer_enabled: false,
  live_detector_enabled: false,
  ear_training_enabled: false,
  guitar_piano_enabled: false,
  logic_preset_enabled: false,
};

const PlatformContext = createContext<PlatformConfig>(DEFAULTS);

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<PlatformConfig>(DEFAULTS);

  useEffect(() => {
    fetch(`${API_URL}/config`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { setConfig({ ...DEFAULTS, loaded: true, ...(data ?? {}) }); })
      .catch(() => { setConfig({ ...DEFAULTS, loaded: true }); });
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

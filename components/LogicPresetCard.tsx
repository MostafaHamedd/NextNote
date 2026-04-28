"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Zap,
  Sliders,
  Activity,
  Waves,
  Clock,
  Circle,
  Star,
  Tag,
  Lightbulb,
} from "lucide-react";
import clsx from "clsx";
import LogicKnob from "./LogicKnob";

interface SignalChainPlugin {
  plugin: string;
  category: string;
  parameters: Record<string, number | string>;
}

interface PresetData {
  id: string;
  name: string;
  description: string;
  match_score: number;
  genre_tags: string[];
  vibe: string;
  signal_chain: SignalChainPlugin[];
  logic_stock_patches: string[];
  tips: string[];
}

interface LogicPresetCardProps {
  preset: PresetData;
  rank: number;
}

const CATEGORY_META: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  amp:        { icon: Zap,      color: "#f59e0b", bg: "bg-amber-500/10",   label: "Amp" },
  eq:         { icon: Sliders,  color: "#3b82f6", bg: "bg-blue-500/10",    label: "Channel EQ" },
  dynamics:   { icon: Activity, color: "#10b981", bg: "bg-emerald-500/10", label: "Compressor" },
  reverb:     { icon: Waves,    color: "#8b5cf6", bg: "bg-violet-500/10",  label: "Space Designer" },
  delay:      { icon: Clock,    color: "#06b6d4", bg: "bg-cyan-500/10",    label: "Tape Delay" },
  modulation: { icon: Circle,   color: "#ec4899", bg: "bg-pink-500/10",    label: "Chorus" },
  drive:      { icon: Zap,      color: "#ef4444", bg: "bg-red-500/10",     label: "Overdrive" },
};

const VIBE_COLORS: Record<string, string> = {
  warm:       "text-amber-400 bg-amber-400/10 border-amber-400/20",
  bright:     "text-sky-400 bg-sky-400/10 border-sky-400/20",
  aggressive: "text-red-400 bg-red-400/10 border-red-400/20",
  clean:      "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  ambient:    "text-violet-400 bg-violet-400/10 border-violet-400/20",
};

function MatchMeter({ score }: { score: number }) {
  const color =
    score >= 85 ? "#10b981" :
    score >= 70 ? "#f59e0b" :
    "#6366f1";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-bold tabular-nums" style={{ color }}>{score}%</span>
    </div>
  );
}

function EQVisualizer({ params }: { params: Record<string, number | string> }) {
  const bands = [
    { label: "Low", freq: params.low_shelf_freq, gain: Number(params.low_shelf_gain ?? 0) },
    { label: "Low Mid", freq: params.low_mid_freq, gain: Number(params.low_mid_gain ?? 0) },
    { label: "High Mid", freq: params.high_mid_freq, gain: Number(params.high_mid_gain ?? 0) },
    { label: "High", freq: params.high_shelf_freq, gain: Number(params.high_shelf_gain ?? 0) },
  ].filter(b => b.freq !== undefined);

  return (
    <div className="flex items-end gap-1 h-12 px-1">
      {bands.map((b, i) => {
        const gain = b.gain;
        const pct = ((gain + 12) / 24); // -12 to +12 → 0 to 1
        const heightPx = Math.abs(gain) * 2.5;
        const isBoost = gain >= 0;
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-center gap-0.5">
            <div className="flex flex-col items-center justify-center h-10 gap-0">
              {isBoost ? (
                <>
                  <div style={{ height: `${heightPx}px`, minHeight: "2px" }}
                    className="w-full bg-blue-500/70 rounded-sm" />
                  <div className="w-full h-0.5 bg-gray-600" />
                </>
              ) : (
                <>
                  <div className="w-full h-0.5 bg-gray-600" />
                  <div style={{ height: `${heightPx}px`, minHeight: "2px" }}
                    className="w-full bg-red-500/70 rounded-sm" />
                </>
              )}
            </div>
            <span className="text-[8px] text-gray-600">{b.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function AmpPlugin({ params }: { params: Record<string, number | string> }) {
  const knobs = [
    { key: "gain",     label: "Gain",     color: "#f59e0b" },
    { key: "bass",     label: "Bass",     color: "#3b82f6" },
    { key: "mid",      label: "Mid",      color: "#10b981" },
    { key: "treble",   label: "Treble",   color: "#f59e0b" },
    { key: "presence", label: "Presence", color: "#8b5cf6" },
    { key: "master",   label: "Master",   color: "#ef4444" },
  ];
  return (
    <div className="space-y-2">
      {params.amp_model && (
        <div className="text-xs text-gray-400 font-medium">
          Model: <span className="text-white">{String(params.amp_model)}</span>
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        {knobs.map(({ key, label, color }) =>
          params[key] !== undefined ? (
            <LogicKnob
              key={key}
              value={Number(params[key])}
              min={0}
              max={100}
              label={label}
              color={color}
            />
          ) : null
        )}
      </div>
    </div>
  );
}

function EQPlugin({ params }: { params: Record<string, number | string> }) {
  return (
    <div className="space-y-3">
      <EQVisualizer params={params} />
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
        {[
          ["Low Shelf", params.low_shelf_freq, params.low_shelf_gain, "Hz", "dB"],
          ["Low Mid",   params.low_mid_freq,   params.low_mid_gain,   "Hz", "dB"],
          ["High Mid",  params.high_mid_freq,  params.high_mid_gain,  "Hz", "dB"],
          ["High Shelf",params.high_shelf_freq,params.high_shelf_gain,"Hz", "dB"],
        ].filter(([, freq]) => freq !== undefined).map(([label, freq, gain, u1, u2]) => (
          <div key={String(label)} className="flex justify-between text-[11px]">
            <span className="text-gray-500">{label}</span>
            <span className="text-gray-300 tabular-nums">
              {freq}{u1} {Number(gain) >= 0 ? "+" : ""}{gain}{u2}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompressorPlugin({ params }: { params: Record<string, number | string> }) {
  const threshold = Number(params.threshold ?? -20);
  const ratio = Number(params.ratio ?? 4);
  const attack = Number(params.attack ?? 10);
  const release = Number(params.release ?? 100);
  const gainMakeup = Number(params.gain ?? 0);

  return (
    <div className="flex flex-wrap gap-3">
      <LogicKnob value={Math.max(0, 100 + threshold * 2.5)} label="Threshold" unit={`dB`} color="#10b981" />
      <LogicKnob value={Math.min(100, (ratio - 1) / 19 * 100)} label={`Ratio ${ratio}:1`} color="#10b981" />
      <LogicKnob value={Math.min(100, attack)} label="Attack" unit="ms" color="#06b6d4" />
      <LogicKnob value={Math.min(100, release / 5)} label="Release" unit="ms" color="#06b6d4" />
      <LogicKnob value={Math.min(100, gainMakeup * 5)} label="Gain" unit="dB" color="#f59e0b" />
    </div>
  );
}

function ReverbPlugin({ params }: { params: Record<string, number | string> }) {
  return (
    <div className="space-y-2">
      {params.preset && (
        <div className="text-xs text-gray-400">
          IR: <span className="text-white">{String(params.preset)}</span>
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <LogicKnob value={Number(params.wet_dry ?? 20)} label="Wet/Dry" unit="%" color="#8b5cf6" />
        <LogicKnob value={Number(params.room_size ?? 50)} label="Size" color="#8b5cf6" />
        <LogicKnob value={Math.min(100, Number(params.decay ?? 1.5) * 20)} label={`Decay ${params.decay}s`} color="#a855f7" />
        <LogicKnob value={Math.min(100, Number(params.pre_delay ?? 10) * 3)} label="Pre-delay" unit="ms" color="#7c3aed" />
      </div>
    </div>
  );
}

function DelayPlugin({ params }: { params: Record<string, number | string> }) {
  return (
    <div className="flex flex-wrap gap-3">
      <LogicKnob value={Math.min(100, Number(params.time_ms ?? 250) / 10)} label={`Time ${params.time_ms}ms`} color="#06b6d4" />
      <LogicKnob value={Number(params.feedback ?? 30)} label="Feedback" unit="%" color="#06b6d4" />
      <LogicKnob value={Number(params.wet_dry ?? 25)} label="Wet/Dry" unit="%" color="#0891b2" />
    </div>
  );
}

function DrivePlugin({ params }: { params: Record<string, number | string> }) {
  return (
    <div className="space-y-2">
      {params.pedal_type && (
        <div className="text-xs text-gray-400">
          Type: <span className="text-white">{String(params.pedal_type)}</span>
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <LogicKnob value={Number(params.drive ?? 50)} label="Drive" color="#ef4444" />
        <LogicKnob value={Number(params.tone ?? 50)} label="Tone" color="#f59e0b" />
        <LogicKnob value={Number(params.level ?? 70)} label="Level" color="#10b981" />
      </div>
    </div>
  );
}

function ModPlugin({ params }: { params: Record<string, number | string> }) {
  return (
    <div className="flex flex-wrap gap-3">
      <LogicKnob value={Math.min(100, Number(params.rate ?? 0.5) * 20)} label={`Rate ${params.rate}Hz`} color="#ec4899" />
      <LogicKnob value={Number(params.depth ?? 50)} label="Depth" color="#ec4899" />
      <LogicKnob value={Number(params.wet_dry ?? 50)} label="Wet/Dry" unit="%" color="#db2777" />
    </div>
  );
}

function PluginBlock({ plugin }: { plugin: SignalChainPlugin }) {
  const meta = CATEGORY_META[plugin.category] ?? CATEGORY_META.amp;
  const Icon = meta.icon;

  const renderParams = () => {
    switch (plugin.category) {
      case "amp":        return <AmpPlugin params={plugin.parameters} />;
      case "eq":         return <EQPlugin params={plugin.parameters} />;
      case "dynamics":   return <CompressorPlugin params={plugin.parameters} />;
      case "reverb":     return <ReverbPlugin params={plugin.parameters} />;
      case "delay":      return <DelayPlugin params={plugin.parameters} />;
      case "drive":      return <DrivePlugin params={plugin.parameters} />;
      case "modulation": return <ModPlugin params={plugin.parameters} />;
      default:           return null;
    }
  };

  return (
    <div className={clsx("rounded-xl p-4 border border-white/5", meta.bg)}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ backgroundColor: `${meta.color}20` }}>
          <Icon size={13} style={{ color: meta.color }} />
        </div>
        <span className="text-sm font-semibold text-white">{plugin.plugin}</span>
        <span className="text-[10px] text-gray-500 ml-auto uppercase tracking-wide">{meta.label}</span>
      </div>
      {renderParams()}
    </div>
  );
}

export default function LogicPresetCard({ preset, rank }: LogicPresetCardProps) {
  const [expanded, setExpanded] = useState(rank === 0);
  const vibeClass = VIBE_COLORS[preset.vibe] ?? VIBE_COLORS.clean;

  return (
    <div className={clsx(
      "rounded-2xl border transition-all duration-200",
      expanded
        ? "border-white/10 bg-surface-2 shadow-xl shadow-black/30"
        : "border-surface-border bg-surface-1 hover:border-white/10 hover:bg-surface-2/50"
    )}>
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-5"
      >
        <div className="flex items-start gap-3">
          {/* Rank badge */}
          <div className={clsx(
            "shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold",
            rank === 0 ? "bg-amber-500/20 text-amber-400" : "bg-surface-3 text-gray-500"
          )}>
            {rank === 0 ? <Star size={14} /> : rank + 1}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white">{preset.name}</h3>
              <span className={clsx(
                "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                vibeClass
              )}>
                {preset.vibe}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{preset.description}</p>
            <div className="mt-2">
              <MatchMeter score={preset.match_score} />
            </div>
          </div>

          <div className="shrink-0 text-gray-500 mt-1">
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {preset.genre_tags.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 text-[10px] text-gray-500 bg-surface-3 px-2 py-0.5 rounded-full border border-surface-border">
              <Tag size={8} />
              {tag}
            </span>
          ))}
          {/* Plugin chain preview */}
          {preset.signal_chain.map(p => {
            const meta = CATEGORY_META[p.category];
            if (!meta) return null;
            const Icon = meta.icon;
            return (
              <span key={p.category} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-white/5"
                style={{ color: meta.color, backgroundColor: `${meta.color}10` }}>
                <Icon size={8} />
                {p.plugin}
              </span>
            );
          })}
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          {/* Divider */}
          <div className="h-px bg-surface-border" />

          {/* Signal chain */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
              Signal Chain
            </h4>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {preset.signal_chain.map((p, i) => {
                const meta = CATEGORY_META[p.category];
                if (!meta) return null;
                const Icon = meta.icon;
                return (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium"
                      style={{ backgroundColor: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}25` }}>
                      <Icon size={11} />
                      {p.plugin}
                    </div>
                    {i < preset.signal_chain.length - 1 && (
                      <ChevronRight size={12} className="text-gray-600 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="space-y-3">
              {preset.signal_chain.map((plugin, i) => (
                <PluginBlock key={i} plugin={plugin} />
              ))}
            </div>
          </div>

          {/* Logic Stock Patches */}
          {preset.logic_stock_patches?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                Closest Logic Stock Patches
              </h4>
              <div className="flex flex-wrap gap-2">
                {preset.logic_stock_patches.map(patch => (
                  <div key={patch} className="flex items-center gap-1.5 text-xs text-gray-300 bg-surface-3 border border-surface-border px-3 py-1.5 rounded-lg">
                    <Zap size={10} className="text-brand-400" />
                    {patch}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          {preset.tips?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                Dialing Tips
              </h4>
              <ul className="space-y-1.5">
                {preset.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                    <Lightbulb size={11} className="text-amber-500 shrink-0 mt-0.5" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

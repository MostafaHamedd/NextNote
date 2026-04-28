"use client";

interface LogicKnobProps {
  value: number;       // 0–100
  min?: number;
  max?: number;
  label: string;
  size?: number;
  color?: string;
  unit?: string;
}

export default function LogicKnob({
  value,
  min = 0,
  max = 100,
  label,
  size = 44,
  color = "#6366f1",
  unit = "",
}: LogicKnobProps) {
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));

  // Arc from -135deg to 135deg (270deg sweep)
  const startAngle = -135;
  const sweepAngle = 270;
  const angle = startAngle + pct * sweepAngle;

  const r = (size / 2) * 0.72;
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = size * 0.1;

  const polarToXY = (angleDeg: number, radius: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  const describeArc = (startDeg: number, endDeg: number, radius: number) => {
    const start = polarToXY(startDeg, radius);
    const end = polarToXY(endDeg, radius);
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  const tickEnd = polarToXY(angle, r * 0.55);
  const tickStart = polarToXY(angle, r * 0.15);

  const displayValue = typeof value === "number"
    ? Math.abs(value) >= 10
      ? Math.round(value)
      : value.toFixed(1)
    : value;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="overflow-visible">
        {/* Track */}
        <path
          d={describeArc(startAngle, startAngle + sweepAngle, r)}
          fill="none"
          stroke="#2a2a3a"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Fill */}
        {pct > 0 && (
          <path
            d={describeArc(startAngle, angle, r)}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 3px ${color}60)` }}
          />
        )}
        {/* Knob body */}
        <circle
          cx={cx}
          cy={cy}
          r={r * 0.52}
          fill="#1a1a2e"
          stroke="#3a3a4e"
          strokeWidth={1}
        />
        {/* Tick */}
        <line
          x1={tickStart.x}
          y1={tickStart.y}
          x2={tickEnd.x}
          y2={tickEnd.y}
          stroke="white"
          strokeWidth={strokeWidth * 0.5}
          strokeLinecap="round"
          opacity={0.9}
        />
      </svg>
      <span className="text-[10px] font-mono text-gray-300 leading-none">
        {displayValue}{unit}
      </span>
      <span className="text-[9px] text-gray-600 leading-none text-center max-w-[48px] truncate">
        {label}
      </span>
    </div>
  );
}

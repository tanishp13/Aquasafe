
import React from 'react';

interface GaugeProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  color: string;
  decimals?: number;
}

const Gauge: React.FC<GaugeProps> = ({ label, value, min, max, unit, color, decimals = 1 }) => {
  const percentage = ((value - min) / (max - min)) * 100;
  const clamped = Math.max(0, Math.min(100, percentage));

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center shadow-lg">
      <div className="text-slate-400 text-sm font-semibold mb-2 uppercase tracking-wider">{label}</div>
      <div className="relative w-32 h-32 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="64"
            cy="64"
            r="58"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-slate-800"
          />
          <circle
            cx="64"
            cy="64"
            r="58"
            stroke={color}
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={364.4}
            strokeDashoffset={364.4 - (364.4 * clamped) / 100}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold mono">{value.toFixed(decimals)}</span>
          <span className="text-xs text-slate-500 font-medium uppercase">{unit}</span>
        </div>
      </div>
    </div>
  );
};

export default Gauge;

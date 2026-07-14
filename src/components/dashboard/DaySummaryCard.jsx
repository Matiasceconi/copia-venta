import React from "react";

export default function DaySummaryCard({ icon: Icon, label, value, colors, onClick }) {
  return (
    <button onClick={onClick}
      className="text-left bg-zinc-950/40 border border-zinc-800 rounded-xl p-3 hover:border-zinc-700 transition-colors">
      <div className="flex items-center justify-between mb-1">
        <Icon size={14} className={colors.text} />
      </div>
      <p className={`text-xl font-bold ${colors.text}`}>{value}</p>
      <p className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{label}</p>
    </button>
  );
}
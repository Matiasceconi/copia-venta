import React from "react";
import { Flame, Gauge, Leaf, Route, Dumbbell } from "lucide-react";

const cards = [
  { key: "total", label: "Carga esperada semanal", icon: Route, accent: "text-red-600", note: "vs semana anterior" },
  { key: "peak", label: "Pico de carga", icon: Gauge, accent: "text-orange-500", note: "Alta intensidad" },
  { key: "intense", label: "Día más intenso", icon: Flame, accent: "text-red-500", note: "Carga alta" },
  { key: "recovery", label: "Día de recuperación", icon: Leaf, accent: "text-green-600", note: "Carga baja" },
  { key: "sessions", label: "Sesiones", icon: Dumbbell, accent: "text-blue-600", note: "Plan semanal" },
];

export default function MicrocycleMetricCards({ summary, compactNumber }) {
  const values = {
    total: compactNumber(summary.total),
    peak: summary.peak?.day || "—",
    intense: summary.peak?.day || "—",
    recovery: summary.recovery?.date ? summary.recovery.md || "Recuperación" : "—",
    sessions: `${summary.field} Campo / ${summary.gym} Gym`,
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-2">
      {cards.map(({ key, label, icon: Icon, accent, note }) => (
        <div key={key} className="bg-white border border-zinc-200 rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Icon size={17} className={accent} />
            <p className="text-[10px] font-black text-zinc-500 uppercase">{label}</p>
          </div>
          <p className={`text-sm font-black mt-2 ${accent}`}>{values[key]}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">{note}</p>
        </div>
      ))}
    </div>
  );
}
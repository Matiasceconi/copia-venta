import React from "react";
import { HeartPulse, Gauge, Moon, Activity, Frown, Zap, Smile, CalendarRange } from "lucide-react";

const SECTIONS = [
  { label: "RPE", icon: Gauge },
  { label: "Wellness", icon: HeartPulse },
  { label: "Fatiga", icon: Activity },
  { label: "Sueño", icon: Moon },
  { label: "Dolor muscular", icon: Frown },
  { label: "Estrés", icon: Zap },
  { label: "Ánimo", icon: Smile },
  { label: "Carga interna semanal", icon: CalendarRange },
];

export default function PerformanceInternalLoad() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <HeartPulse size={22} className="text-zinc-400" />
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Carga Interna</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Rendimiento · Percepción del esfuerzo y bienestar del plantel activo</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {SECTIONS.map(({ label, icon: Icon }) => (
          <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <Icon size={20} className="text-zinc-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-white">{label}</p>
            <p className="text-[11px] text-zinc-600 mt-1">Próximamente</p>
          </div>
        ))}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
        <p className="text-zinc-500 text-sm">Esta sección se irá completando próximamente con los registros de carga interna del plantel.</p>
      </div>
    </div>
  );
}
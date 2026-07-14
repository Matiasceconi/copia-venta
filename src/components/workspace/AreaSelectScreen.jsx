import React from "react";
import { Users, Gauge, Heart, HeartPulse, Apple, Brain, ClipboardList, Settings2, ArrowRight } from "lucide-react";

const ICONS = { Users, Gauge, Heart, HeartPulse, Apple, Brain, ClipboardList, Settings2 };

export default function AreaSelectScreen({ areas, userName, currentAreaId, onSelect }) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-1.5">
          <h1 className="text-2xl font-bold text-white">Bienvenido a PerformancePitch</h1>
          <p className="text-zinc-400 text-sm">
            {userName ? `${userName} — ` : ""}Seleccioná tu área de trabajo
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {areas.map(area => {
            const Icon = ICONS[area.icon] || Users;
            const isCurrent = area.id === currentAreaId;
            return (
              <button
                key={area.id}
                onClick={() => onSelect(area.id)}
                className={`text-left bg-zinc-900 border rounded-2xl p-5 transition-all hover:border-yellow-500/50 hover:bg-zinc-800/60 ${
                  isCurrent ? "border-yellow-500/60" : "border-zinc-800"
                }`}
              >
                <div className="w-11 h-11 rounded-xl bg-zinc-800 flex items-center justify-center mb-3">
                  <Icon size={20} style={{ color: "#F0C800" }} />
                </div>
                <p className="text-white font-semibold text-sm">{area.name}</p>
                <p className="text-zinc-500 text-xs mt-1 leading-relaxed">{area.description}</p>
                <div className="flex items-center gap-1.5 text-xs font-medium mt-4" style={{ color: "#F0C800" }}>
                  Ingresar <ArrowRight size={13} />
                </div>
              </button>
            );
          })}
        </div>

        {areas.length === 0 && (
          <p className="text-center text-zinc-500 text-sm">No tenés áreas asignadas. Contactá al administrador.</p>
        )}
      </div>
    </div>
  );
}
import React from "react";

const MAIN_CARDS = [
  { key: "total",        label: "Total",        color: "text-white" },
  { key: "disponibles",  label: "Disponibles",  color: "text-emerald-400" },
  { key: "lesionados",   label: "Lesionados",   color: "text-red-400" },
  { key: "molestias",    label: "Molestias",    color: "text-orange-400" },
  { key: "diferenciados",label: "Diferenciados",color: "text-amber-400" },
  { key: "suspendidos",  label: "Suspendidos",  color: "text-yellow-400" },
  { key: "bajan",        label: "Bajan",        color: "text-pink-400" },
  { key: "suben",        label: "Suben",        color: "text-violet-400" },
  { key: "convocados",   label: "Convocados",   color: "text-blue-400" },
  { key: "ausentes",     label: "Ausentes",     color: "text-zinc-400" },
];

const GK_CARDS = [
  { key: "gk_total",        label: "Total ARQ",    color: "text-yellow-300" },
  { key: "gk_disponibles",  label: "ARQ Disp.",    color: "text-emerald-400" },
  { key: "gk_lesionados",   label: "ARQ Lesión",   color: "text-red-400" },
  { key: "gk_diferenciados",label: "ARQ Difer.",   color: "text-amber-400" },
  { key: "gk_ausentes",     label: "ARQ Aus.",     color: "text-zinc-400" },
  { key: "gk_convocados",   label: "ARQ Conv.",    color: "text-blue-400" },
];

export default function DailySquadSummary({ data }) {
  const hasGk = (data.gk_total || 0) > 0 || (data.field_total || 0) > 0;

  return (
    <div className="space-y-2">
      {/* Main summary */}
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
        {MAIN_CARDS.map(({ key, label, color }) => (
          <div key={key} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
            <p className={`text-2xl font-bold ${color}`}>{data[key] ?? 0}</p>
            <p className="text-[10px] text-zinc-500 mt-1 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* Goalkeeper breakdown — only if squad has data */}
      {hasGk && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">🥅</span>
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Arqueros</span>
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-[10px] text-zinc-500">Campo: {data.field_disponibles ?? 0} disp. de {data.field_total ?? 0}</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {GK_CARDS.map(({ key, label, color }) => (
              <div key={key} className="bg-zinc-900/70 border border-zinc-800 rounded-lg p-2 text-center">
                <p className={`text-lg font-bold ${color}`}>{data[key] ?? 0}</p>
                <p className="text-[9px] text-zinc-500 mt-0.5 leading-tight">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
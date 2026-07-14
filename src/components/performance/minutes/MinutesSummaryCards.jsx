import React from "react";
import { AlertTriangle, CalendarDays, Clock3, FileDown, Users } from "lucide-react";

export default function MinutesSummaryCards({ availableMinutes, includedMatches, playersWithMinutesCount, pendingMatches, onTogglePending, pendingOpen, onExport }) {
  const items = [
    { label: "Minutos disponibles", value: `${availableMinutes.toLocaleString("es-AR")}'`, icon: Clock3 },
    { label: "Partidos incluidos", value: includedMatches, icon: CalendarDays },
    { label: "Jugadores con minutos", value: playersWithMinutesCount, icon: Users },
    { label: "Partidos pendientes", value: pendingMatches.length, icon: AlertTriangle, clickable: true },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]">
        {items.map((item) => {
          const Icon = item.icon;
          const content = (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition hover:border-zinc-700">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">{item.label}</p>
                  <p className="mt-2 text-2xl font-bold text-white">{item.value}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-300">
                  <Icon size={18} />
                </div>
              </div>
            </div>
          );
          return item.clickable ? <button key={item.label} onClick={onTogglePending} className="text-left">{content}</button> : <div key={item.label}>{content}</div>;
        })}
        <button onClick={onExport} className="inline-flex min-h-[112px] items-center justify-center gap-2 rounded-2xl border border-yellow-500/40 bg-yellow-500/10 px-5 text-sm font-semibold text-yellow-200 transition hover:bg-yellow-500/20">
          <FileDown size={16} /> Exportar PDF
        </button>
      </div>
      {pendingOpen && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <h3 className="text-sm font-semibold text-white">Partidos pendientes</h3>
          <div className="mt-3 space-y-2">
            {pendingMatches.length === 0 && <p className="text-sm text-zinc-500">No hay partidos pendientes para este filtro.</p>}
            {pendingMatches.map((match) => (
              <a key={match.id} href={`/matches/${match.id}?tab=minutos`} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 transition hover:border-zinc-700 hover:bg-zinc-900">
                <div>
                  <p className="text-sm font-medium text-white">{match.date} · {match.rival}</p>
                  <p className="text-xs text-zinc-500">{match.displayCompetition} · {match.status.label}</p>
                </div>
                <span className="text-xs text-yellow-300">Abrir partido</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
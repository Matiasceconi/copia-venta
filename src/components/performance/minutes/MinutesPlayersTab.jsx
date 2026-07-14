import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import PlayerPhoto from "@/components/player/PlayerPhoto";

function percentLabel(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

function barColor(value) {
  if (value >= 0.7) return "bg-emerald-400";
  if (value >= 0.4) return "bg-yellow-400";
  if (value > 0) return "bg-orange-400";
  return "bg-zinc-600";
}

export default function MinutesPlayersTab({ rows, filters, updateFilter }) {
  const [openPlayers, setOpenPlayers] = useState({});
  const visibleRows = useMemo(() => rows, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Resumen por jugador</h3>
          <p className="text-xs text-zinc-500">Consulta consolidada desde los registros oficiales de cada partido.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <span>Ordenar por:</span>
          <select value={filters.sortBy} onChange={(e) => updateFilter("sortBy", e.target.value)} className="h-9 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-yellow-500">
            <option value="minutes">Minutos</option>
            <option value="percentage">Porcentaje</option>
            <option value="matches">Partidos</option>
            <option value="starts">Titularidades</option>
            <option value="name">Nombre</option>
          </select>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
        <div className="grid grid-cols-[42px_1.6fr_1fr_90px_110px_120px_110px_110px_140px_30px] gap-3 border-b border-zinc-800 px-4 py-3 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
          <span>#</span><span>Jugador</span><span>Posición</span><span>Partidos</span><span>Titularidades</span><span>Ingresos</span><span>Minutos</span><span>Disponibles</span><span>% jugado</span><span />
        </div>
        <div className="divide-y divide-zinc-800/70">
          {visibleRows.map((row) => {
            const isOpen = !!openPlayers[row.player_id || row.player_name];
            const key = row.player_id || row.player_name;
            return (
              <div key={key}>
                <button onClick={() => setOpenPlayers((current) => ({ ...current, [key]: !current[key] }))} className="grid w-full grid-cols-[42px_1.6fr_1fr_90px_110px_120px_110px_110px_140px_30px] gap-3 px-4 py-3 text-left transition hover:bg-zinc-800/30">
                  <span className="flex items-center gap-2 text-sm font-semibold text-white">{row.rank}</span>
                  <div className="flex items-center gap-3">
                    <PlayerPhoto player={{ full_name: row.player_name, photo_url: row.photo_url }} alt={row.player_name} className="h-10 w-10 rounded-full border border-zinc-700 object-cover" fallbackClassName="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800" textClassName="text-sm font-bold text-zinc-400" />
                    <div>
                      <p className="text-sm font-semibold text-white">{row.player_name}</p>
                      <p className="text-xs text-zinc-500">Ranking general</p>
                    </div>
                  </div>
                  <span className="text-sm text-zinc-300">{row.position}</span>
                  <span className="text-sm text-zinc-300">{row.matchesCount}</span>
                  <span className="text-sm text-zinc-300">{row.starts}</span>
                  <span className="text-sm text-zinc-300">{row.subEntries}</span>
                  <span className="text-sm font-semibold text-white">{row.accumulatedMinutes.toLocaleString("es-AR")}'</span>
                  <span className="text-sm text-zinc-400">{row.availableMinutes.toLocaleString("es-AR")}'</span>
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-sm font-semibold text-white">{percentLabel(row.percentage)}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800"><div className={`h-full rounded-full ${barColor(row.percentage)}`} style={{ width: `${Math.min(100, Math.round(row.percentage * 100))}%` }} /></div>
                  </div>
                  <span className="flex items-center justify-end text-zinc-400">{isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
                </button>
                {isOpen && (
                  <div className="bg-zinc-950/60 px-4 pb-4">
                    <div className="overflow-hidden rounded-2xl border border-zinc-800">
                      <div className="grid grid-cols-[110px_1.3fr_1.2fr_100px_80px_80px_90px_110px] gap-3 border-b border-zinc-800 px-4 py-3 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                        <span>Fecha</span><span>Rival</span><span>Competencia</span><span>Condición</span><span>Rol</span><span>Minutos</span><span>Duración</span><span>% partido</span>
                      </div>
                      <div className="divide-y divide-zinc-800/70">
                        {row.detailRows.map((detail) => (
                          <div key={`${detail.match_id}-${detail.date}`} className="grid grid-cols-[110px_1.3fr_1.2fr_100px_80px_80px_90px_110px_auto] gap-3 px-4 py-3 text-sm text-zinc-300">
                            <span>{detail.date}</span>
                            <span>{detail.rival}</span>
                            <span>{detail.competition}</span>
                            <span>{detail.location}</span>
                            <span className="capitalize">{detail.lineup_role}</span>
                            <span className="font-semibold text-white">{detail.minutes}'</span>
                            <span>{detail.duration}'</span>
                            <span>{percentLabel(detail.percentage)}</span>
                            <a href={`/matches/${detail.match_id}?tab=minutos`} className="inline-flex items-center justify-end gap-1 text-yellow-300 transition hover:text-yellow-200">Abrir partido <ExternalLink size={13} /></a>
                          </div>
                        ))}
                        {row.detailRows.length === 0 && <div className="px-4 py-4 text-sm text-zinc-500">Sin participaciones dentro del filtro seleccionado.</div>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {visibleRows.length === 0 && <div className="px-4 py-10 text-center text-sm text-zinc-500">No hay jugadores para este filtro.</div>}
        </div>
      </div>
    </div>
  );
}
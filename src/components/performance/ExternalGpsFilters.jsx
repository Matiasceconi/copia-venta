import React from "react";
import { X } from "lucide-react";

export default function ExternalGpsFilters({ filters, onChange, sessions, players, customRange, onCustomRangeChange }) {
  function set(key, val) { onChange({ ...filters, [key]: val }); }
  const positions = [...new Set(players.map(p => p.position).filter(Boolean))];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-wrap items-center gap-2">
      <input type="date" value={customRange.from} onChange={e => onCustomRangeChange({ ...customRange, from: e.target.value })}
        title="Desde (rango personalizado)"
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none" />
      <input type="date" value={customRange.to} onChange={e => onCustomRangeChange({ ...customRange, to: e.target.value })}
        title="Hasta (rango personalizado)"
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none" />
      {(customRange.from || customRange.to) && (
        <button onClick={() => onCustomRangeChange({ from: "", to: "" })}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white text-xs transition-colors">
          <X size={11} /> Rango
        </button>
      )}

      <select value={filters.sessionId} onChange={e => set("sessionId", e.target.value)}
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none">
        <option value="">Todas las sesiones</option>
        {sessions.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
      </select>

      <select value={filters.playerId} onChange={e => set("playerId", e.target.value)}
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none">
        <option value="">Todos los jugadores</option>
        {players.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
      </select>

      <select value={filters.position} onChange={e => set("position", e.target.value)}
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none">
        <option value="">Todas las posiciones</option>
        {positions.map(p => <option key={p} value={p}>{p}</option>)}
      </select>

      <select value={filters.inclusion} onChange={e => set("inclusion", e.target.value)}
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none">
        <option value="todos">Incluidos y excluidos</option>
        <option value="incluidos">Solo incluidos en promedio</option>
        <option value="excluidos">Solo excluidos del promedio</option>
      </select>
    </div>
  );
}
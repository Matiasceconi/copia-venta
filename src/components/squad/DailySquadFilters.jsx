import React from "react";
import { Search, X } from "lucide-react";
import { STATUS_LABELS, ALL_TAGS } from "@/components/squad/squadConstants";

export default function DailySquadFilters({ players, filters, setFilters, getEffectiveStatus }) {
  const set = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  const teams = [...new Set(players.map(p => p.division).filter(Boolean))].sort();
  const categories = [...new Set(players.map(p => p.category).filter(Boolean))].sort();
  const positions = [...new Set(players.map(p => p.position).filter(Boolean))].sort();
  const hasFilters = Object.values(filters).some(v => v !== "");

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={filters.search} onChange={e => set("search", e.target.value)}
            placeholder="Buscar jugador..."
            className="bg-zinc-800 border border-zinc-700 rounded-lg pl-8 pr-3 py-2 text-sm text-white w-44 focus:outline-none focus:border-zinc-600" />
        </div>

        <select value={filters.team} onChange={e => set("team", e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
          <option value="">Todos los equipos</option>
          {teams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select value={filters.category} onChange={e => set("category", e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={filters.position} onChange={e => set("position", e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
          <option value="">Todas las posiciones</option>
          {positions.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <select value={filters.status} onChange={e => set("status", e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        <select value={filters.tag} onChange={e => set("tag", e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
          <option value="">Todas las etiquetas</option>
          {ALL_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {hasFilters && (
          <button onClick={() => setFilters({ team: "", category: "", position: "", status: "", tag: "", search: "" })}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
            <X size={12} /> Limpiar
          </button>
        )}
      </div>
    </div>
  );
}
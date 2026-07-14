import React, { useMemo } from "react";
import { Filter, Search, X } from "lucide-react";

const POSITION_OPTIONS = ["Todos", "Arquero", "Central", "Lateral", "Volante", "Extremo", "Delantero"];
const EVENT_OPTIONS = ["Todos", "Entrenamiento", "Partido"];
const MD_OPTIONS = ["Todos", "MD", "MD-1", "MD-2", "MD-3", "MD-4", "MD-5", "MD+1", "MD+2"];

function Field({ label, children }) {
  return (
    <label className="space-y-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

const inputClass = "w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/60";

export default function GpsSessionAnalyticsFilters({ filters, onChange, squads, seasons, players, physicalObjectives, resultCount, totalCount }) {
  const selectedPlayers = filters.playerIds || [];
  const playerMatches = useMemo(() => {
    const q = (filters.playerSearch || "").toLowerCase().trim();
    return players
      .filter((p) => !q || (p.full_name || "").toLowerCase().includes(q))
      .slice(0, 12);
  }, [players, filters.playerSearch]);

  function set(key, value) {
    onChange({ ...filters, [key]: value });
  }

  function togglePlayer(id) {
    const next = selectedPlayers.includes(id) ? selectedPlayers.filter((p) => p !== id) : [...selectedPlayers, id];
    set("playerIds", next);
  }

  function clear() {
    onChange({
      squadId: "all",
      season: seasons[0] || "",
      dateFrom: "",
      dateTo: "",
      playerSearch: "",
      playerIds: [],
      position: "Todos",
      event: "Todos",
      objective: "Todos",
      md: "Todos",
      minutesMode: "Todos",
      minutesMin: "",
      minutesMax: "",
    });
  }

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Filter size={15} className="text-emerald-300" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">Buscar sesiones</h3>
              <p className="text-zinc-500 text-xs">Filtros combinables para analizar entrenamientos y partidos.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
            {resultCount} de {totalCount} sesiones
          </span>
          <button onClick={clear} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 hover:text-white hover:border-zinc-700">
            <X size={12} /> Limpiar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <Field label="1. Plantel">
          <select value={filters.squadId || "all"} onChange={(e) => set("squadId", e.target.value)} className={inputClass}>
            <option value="all">Todos</option>
            {squads.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>

        <Field label="2. Temporada">
          <select value={filters.season || ""} onChange={(e) => set("season", e.target.value)} className={inputClass}>
            <option value="">Todas</option>
            {seasons.map((season) => <option key={season} value={season}>{season}</option>)}
          </select>
        </Field>

        <Field label="3. Fecha desde">
          <input type="date" value={filters.dateFrom || ""} onChange={(e) => set("dateFrom", e.target.value)} className={inputClass} />
        </Field>

        <Field label="3. Fecha hasta">
          <input type="date" value={filters.dateTo || ""} onChange={(e) => set("dateTo", e.target.value)} className={inputClass} />
        </Field>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-1 space-y-2">
          <Field label="4. Jugador">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input value={filters.playerSearch || ""} onChange={(e) => set("playerSearch", e.target.value)} placeholder="Buscar por nombre..." className={`${inputClass} pl-8`} />
            </div>
          </Field>
          <div className="max-h-40 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900/60 p-2 space-y-1">
            {playerMatches.map((player) => (
              <label key={player.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-800/70 text-xs text-zinc-300 cursor-pointer">
                <input type="checkbox" checked={selectedPlayers.includes(player.id)} onChange={() => togglePlayer(player.id)} className="accent-emerald-500" />
                <span className="truncate">{player.full_name}</span>
              </label>
            ))}
            {playerMatches.length === 0 && <p className="text-xs text-zinc-600 px-2 py-3">Sin jugadores encontrados</p>}
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 content-start">
          <Field label="5. Puesto">
            <select value={filters.position || "Todos"} onChange={(e) => set("position", e.target.value)} className={inputClass}>
              {POSITION_OPTIONS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </Field>

          <Field label="6. Evento">
            <select value={filters.event || "Todos"} onChange={(e) => set("event", e.target.value)} className={inputClass}>
              {EVENT_OPTIONS.map((event) => <option key={event}>{event}</option>)}
            </select>
          </Field>

          <Field label="7. Objetivo físico">
            <select value={filters.objective || "Todos"} onChange={(e) => set("objective", e.target.value)} className={inputClass}>
              <option>Todos</option>
              {physicalObjectives.map((objective) => <option key={objective}>{objective}</option>)}
            </select>
          </Field>

          <Field label="8. Código del día">
            <select value={filters.md || "Todos"} onChange={(e) => set("md", e.target.value)} className={inputClass}>
              {MD_OPTIONS.map((md) => <option key={md}>{md}</option>)}
            </select>
          </Field>

          <Field label="9. Tiempo / Minutos">
            <select value={filters.minutesMode || "Todos"} onChange={(e) => set("minutesMode", e.target.value)} className={inputClass}>
              <option>Todos</option>
              <option value="gt">Mayor a...</option>
              <option value="lt">Menor a...</option>
              <option value="between">Entre...</option>
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Mínimo">
              <input type="number" value={filters.minutesMin || ""} onChange={(e) => set("minutesMin", e.target.value)} placeholder="Ej: 75" className={inputClass} />
            </Field>
            <Field label="Máximo">
              <input type="number" value={filters.minutesMax || ""} onChange={(e) => set("minutesMax", e.target.value)} placeholder="Ej: 90" className={inputClass} />
            </Field>
          </div>
        </div>
      </div>
    </div>
  );
}
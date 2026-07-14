import React, { useState, useEffect, useMemo } from "react";
import { Search, FileDown, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { getMatchDuration, getRecordMinutes, getValidMinuteRecords, isFinishedMatch } from "@/lib/minutesUtils";
import { generateMinutesPdf } from "@/lib/reports/minutesPdf";
import PlayerPhoto from "@/components/player/PlayerPhoto";

const TORNEOS = [
  { id: "all",                  label: "Todo el semestre" },
  { id: "Proyección Apertura",  label: "Torneo Proyección Apertura 2026" },
  { id: "Juveniles",            label: "Torneo Juveniles 2026" },
  { id: "Amistosos",            label: "Amistosos" },
];

function PctBar({ pct, color }) {
  const width = Math.min(100, Math.round(pct * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
      </div>
      <span className="text-xs font-mono w-10 text-right">{width}%</span>
    </div>
  );
}

function getPctColor(pct) {
  if (pct >= 0.7) return "bg-emerald-400";
  if (pct >= 0.4) return "bg-yellow-400";
  if (pct >= 0.1) return "bg-orange-400";
  return "bg-zinc-600";
}

function norm(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

export default function MinutesTracker({ onSelectPlayer }) {
  const { activeSquadId, activeSquad, activeSeasonId } = useWorkspace();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("res");
  const [torneoId, setTorneoId] = useState("all");
  const [viewMode, setViewMode] = useState("reserva");
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [records, setRecords] = useState([]);
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [squadPlayerIds, setSquadPlayerIds] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeSquadId) { setSquadPlayerIds(null); return; }
    base44.entities.SquadMembership.filter({ squad_id: activeSquadId, status: "activo" }, "player_name", 200)
      .then(members => setSquadPlayerIds(new Set(members.map(m => m.player_id))));
  }, [activeSquadId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      base44.entities.MatchPlayerMinutes.list("-created_date", 800).catch(() => []),
      base44.entities.Player.list("-created_date", 200),
      base44.entities.MatchReport.list("-date", 500),
    ]).then(([recs, plrs, allMatches]) => {
      setRecords(recs);
      setPlayers(plrs);
      setMatches(allMatches);
    }).finally(() => setLoading(false));

    // Suscripción en tiempo real con debounce para evitar rate limit
    let timer;
    const unsub = base44.entities.MatchPlayerMinutes.subscribe(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        base44.entities.MatchPlayerMinutes.list("-created_date", 800).then(setRecords);
      }, 2000);
    });
    return () => { unsub(); clearTimeout(timer); };
  }, []);

  // Solo registros vinculados a un partido real, activo y del plantel activo, con minutos > 0
  const validRecords = useMemo(
    () => getValidMinuteRecords(records, matches, { squadId: activeSquadId, requirePositive: false }),
    [records, matches, activeSquadId]
  );

  const playerMap = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players]);

  // Mapa player_id -> foto
  const photoMap = useMemo(() => {
    const map = {};
    players.forEach(p => { if (p.photo_url) map[p.id] = p.photo_url; });
    return map;
  }, [players]);

  // Mapa player_id -> jersey_number
  const numberMap = useMemo(() => {
    const map = {};
    players.forEach(p => { if (p.jersey_number) map[p.id] = p.jersey_number; });
    return map;
  }, [players]);

  // Consolidar registros por jugador — deduplicar por (player_id/name + match_date + tournament)
  const playerData = useMemo(() => {
    const map = {};
    // Deduplicar: para mismo jugador+fecha+torneo, solo contar el registro más reciente
    const seen = new Set();
    const sorted = [...validRecords].sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""));

    sorted.forEach(r => {
      const playerKey = r.player_id || `name:${norm(r.player_name)}`;
      const dedupKey = `${r.match_id || r.match_date}|${playerKey}`;
      if (seen.has(dedupKey)) return;
      seen.add(dedupKey);

      if (!map[playerKey]) {
        map[playerKey] = {
          player_id: r.player_id || null,
          player_name: r.player_name,
          player_number: r.player_number,
          reserva: 0,
          juveniles: 0,
          amistosos: 0,
          hasReserva: false,
          hasJuveniles: false,
          hasAmistosos: false,
        };
      }
      const t = r.tournament;
      const mins = getRecordMinutes(r);
      if (t === "Proyección Apertura" || t === "Clausura") { map[playerKey].reserva += mins; map[playerKey].hasReserva = true; }
      else if (t === "Juveniles") { map[playerKey].juveniles += mins; map[playerKey].hasJuveniles = true; }
      else if (t === "Amistosos") { map[playerKey].amistosos += mins; map[playerKey].hasAmistosos = true; }
    });

    return Object.values(map);
  }, [validRecords]);

  const torneo = TORNEOS.find(t => t.id === torneoId) || TORNEOS[0];
  const showRes = torneoId !== "Juveniles" && (viewMode === "reserva" || viewMode === "ambos");
  const showJuv = torneoId !== "Proyección Apertura" && torneoId !== "Amistosos" && (viewMode === "juveniles" || viewMode === "ambos");

  function matchBelongsToBucket(match, bucket) {
    const comp = match.competition || "";
    if (bucket === "juv") return comp.includes("Juvenil");
    if (torneoId === "Amistosos") return comp.includes("Amistoso");
    if (torneoId === "Proyección Apertura") return comp.includes("Apertura");
    return !comp.includes("Juvenil") && !comp.includes("Amistoso");
  }

  const denominator = useMemo(() => {
    const totals = { res: 0, juv: 0, missingRes: [], missingJuv: [] };
    matches
      .filter((m) => isFinishedMatch(m))
      .filter((m) => !activeSquadId || m.squad_id === activeSquadId)
      .filter((m) => !activeSeasonId || !m.season_id || m.season_id === activeSeasonId)
      .forEach((m) => {
        const bucket = matchBelongsToBucket(m, "juv") ? "juv" : "res";
        if ((bucket === "juv" && !showJuv) || (bucket === "res" && !showRes)) return;
        const minutes = getMatchDuration(m);
        if (minutes > 0) totals[bucket] += minutes;
        else bucket === "juv" ? totals.missingJuv.push(m) : totals.missingRes.push(m);
      });
    return totals;
  }, [matches, activeSquadId, activeSeasonId, torneoId, showRes, showJuv]);

  function getMinutes(p) {
    switch (torneoId) {
      case "Proyección Apertura": return { res: p.reserva,    juv: null };
      case "Juveniles":           return { res: null,          juv: p.juveniles };
      case "Amistosos":           return { res: p.amistosos,   juv: null };
      default:                    return { res: p.reserva,     juv: p.juveniles };
    }
  }

  function changeViewMode(mode) {
    setViewMode(mode);
    setTorneoId("all");
    setSortBy(mode === "juveniles" ? "juv" : "res");
  }

  function matchesView(p, mode, selectedTorneoId) {
    if (selectedTorneoId === "Proyección Apertura") return p.hasReserva;
    if (selectedTorneoId === "Juveniles") return p.hasJuveniles;
    if (selectedTorneoId === "Amistosos") return p.hasAmistosos;
    if (mode === "reserva") return p.hasReserva;
    if (mode === "juveniles") return p.hasJuveniles;
    return p.hasReserva || p.hasJuveniles;
  }

  function buildRows(mode) {
    return playerData
      .filter(p => {
        if (search && !norm(p.player_name).includes(norm(search))) return false;
        return matchesView(p, mode, torneoId);
      })
      .map(p => ({ ...p, ...getMinutes(p) }))
      .sort((a, b) => {
        if (sortBy === "juv")  return (b.juv || 0) - (a.juv || 0);
        if (sortBy === "name") return (a.player_name || "").localeCompare(b.player_name || "");
        return (b.res || 0) - (a.res || 0);
      });
  }

  const display = useMemo(() => buildRows(viewMode), [playerData, search, sortBy, torneoId, viewMode]);

  async function exportPDF(mode) {
    setShowExportOptions(false);
    await generateMinutesPdf({ rows: buildRows(mode), torneo, viewMode: mode, playerMap, activeSquad, activeSeasonId });
  }

  const cols = showRes && showJuv ? "2rem 2.5rem 1fr 1fr 1fr" : "2rem 2.5rem 1fr 1fr";

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Selector de vista */}
      <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden w-fit">
        {[
          { id: "reserva", label: "Reserva" },
          { id: "juveniles", label: "Juveniles" },
          { id: "ambos", label: "Ambos" },
        ].map((option) => (
          <button key={option.id} onClick={() => changeViewMode(option.id)} className={`px-4 py-2 text-sm font-semibold transition-all ${viewMode === option.id ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"}`}>
            {option.label}
          </button>
        ))}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {showRes && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Total disponible — Reserva</p>
            <p className="text-2xl font-bold text-white">{denominator.res.toLocaleString()}'</p>
            <p className="text-xs text-zinc-500 mt-1">{torneo.label}</p>
            {denominator.missingRes.length > 0 && <a href={`/matches/${denominator.missingRes[0].id}?tab=minutos`} className="mt-2 inline-block text-xs text-yellow-300 hover:text-yellow-200">Falta cargar la duración de {denominator.missingRes.length} partido{denominator.missingRes.length !== 1 ? "s" : ""}</a>}
          </div>
        )}
        {showJuv && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Total disponible — Juveniles</p>
            <p className="text-2xl font-bold text-white">{denominator.juv.toLocaleString()}'</p>
            <p className="text-xs text-zinc-500 mt-1">{torneo.label}</p>
            {denominator.missingJuv.length > 0 && <a href={`/matches/${denominator.missingJuv[0].id}?tab=minutos`} className="mt-2 inline-block text-xs text-yellow-300 hover:text-yellow-200">Falta cargar la duración de {denominator.missingJuv.length} partido{denominator.missingJuv.length !== 1 ? "s" : ""}</a>}
          </div>
        )}
      </div>

      {/* Controles */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <button onClick={() => setShowFilters((v) => !v)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
          <SlidersHorizontal size={13} /> {showFilters ? "Ocultar filtros" : "Mostrar filtros"}
        </button>
        <div className="relative">
          <button onClick={() => setShowExportOptions((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-yellow-400/15 border border-yellow-400/30 text-yellow-200 hover:bg-yellow-400/25 rounded-lg transition-colors">
            <FileDown size={13} />
            Exportar / PDF
          </button>
          {showExportOptions && (
            <div className="absolute right-0 top-9 z-20 w-52 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl p-1">
              <button onClick={() => exportPDF("reserva")} className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 rounded-lg">Exportar solo Reserva</button>
              <button onClick={() => exportPDF("juveniles")} className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 rounded-lg">Exportar solo Juveniles</button>
              <button onClick={() => exportPDF("ambos")} className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 rounded-lg">Exportar ambos</button>
            </div>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3 items-center justify-between bg-zinc-950/40 border border-zinc-800 rounded-xl p-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar jugador..."
              className="bg-zinc-900 border-zinc-800 text-white pl-8 w-56 h-8 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
              {TORNEOS.map((t) => (
              <button key={t.id} onClick={() => { setTorneoId(t.id); if (t.id === "Juveniles") { setViewMode("juveniles"); setSortBy("juv"); } else { setViewMode("reserva"); setSortBy("res"); } }}
                  className={`px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${torneoId === t.id ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"}`}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
              {showRes && <button onClick={() => setSortBy("res")} className={`px-3 py-1.5 text-xs font-medium transition-all ${sortBy === "res" ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"}`}>↓ Reserva</button>}
              {showJuv && <button onClick={() => setSortBy("juv")} className={`px-3 py-1.5 text-xs font-medium transition-all ${sortBy === "juv" ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"}`}>↓ Juv.</button>}
              <button onClick={() => setSortBy("name")} className={`px-3 py-1.5 text-xs font-medium transition-all ${sortBy === "name" ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"}`}>A-Z</button>
            </div>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="grid text-xs text-zinc-500 uppercase tracking-wider px-4 py-2.5 border-b border-zinc-800"
          style={{ gridTemplateColumns: cols }}>
          <span>#</span>
          <span />
          <span>Jugador</span>
          {showRes && <span>Reserva</span>}
          {showJuv && <span>Juveniles</span>}
        </div>

        <div className="divide-y divide-zinc-800/50">
          {display.map((p, i) => {
            const player = p.player_id ? playerMap[p.player_id] : null;
            const num = p.player_id ? (numberMap[p.player_id] || p.player_number) : p.player_number;
            return (
              <div key={p.player_id || p.player_name}
                onClick={() => onSelectPlayer?.(p.player_id, p.player_name)}
                className="grid items-center gap-4 px-4 py-2.5 hover:bg-zinc-800/30 transition-colors cursor-pointer"
                style={{ gridTemplateColumns: cols }}>
                <span className="text-zinc-600 text-sm font-mono">{num || i + 1}</span>
                <PlayerPhoto
                  player={player || { full_name: p.player_name }}
                  alt={p.player_name}
                  className="w-8 h-8 rounded-full object-cover border border-zinc-700 shrink-0"
                  fallbackClassName="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0"
                  textClassName="text-xs font-bold text-zinc-500"
                />
                <p className="text-sm text-white font-medium">{p.player_name}</p>

                {showRes && (
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-white font-semibold text-sm">{p.res ?? 0}'</span>
                      <span className="text-zinc-500 text-xs">/ {denominator.res}'</span>
                    </div>
                    <PctBar pct={denominator.res > 0 ? (p.res || 0) / denominator.res : 0} color={getPctColor(denominator.res > 0 ? (p.res || 0) / denominator.res : 0)} />
                  </div>
                )}

                {showJuv && (
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-white font-semibold text-sm">{p.juv ?? 0}'</span>
                      <span className="text-zinc-500 text-xs">/ {denominator.juv}'</span>
                    </div>
                    <PctBar pct={denominator.juv > 0 ? (p.juv || 0) / denominator.juv : 0} color={getPctColor(denominator.juv > 0 ? (p.juv || 0) / denominator.juv : 0)} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-emerald-400 inline-block" /> ≥70%</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-yellow-400 inline-block" /> 40–69%</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-orange-400 inline-block" /> 10–39%</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-zinc-600 inline-block" /> &lt;10%</span>
      </div>
    </div>
  );
}
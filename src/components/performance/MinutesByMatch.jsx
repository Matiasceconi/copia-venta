import React, { useState, useEffect, useMemo } from "react";
import { Search, ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { getRivalLogo } from "@/lib/match-utils";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { buildActiveMatchMap, getRecordMinutes } from "@/lib/minutesUtils";
import PlayerPhoto from "@/components/player/PlayerPhoto";
import moment from "moment";
import "moment/locale/es";
moment.locale("es");

const FILTER_OPTIONS = [
  { id: "all",        label: "Todos los torneos" },
  { id: "Apertura",   label: "Torneo Proyección Apertura 2026" },
  { id: "Clausura",   label: "Torneo Proyección Clausura 2026" },
  { id: "Amistosos",  label: "Amistosos" },
];

function norm(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

export default function MinutesByMatch({ selectedPlayer }) {
  const { activeSquadId } = useWorkspace();
  const [search, setSearch] = useState("");
  const [tournamentFilter, setTournamentFilter] = useState("all");
  const [fechaFilter, setFechaFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [minutesRecords, setMinutesRecords] = useState([]);
  const [matchReports, setMatchReports] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playerFilter, setPlayerFilter] = useState(selectedPlayer || null);

  // Sincronizar cuando cambia selectedPlayer desde afuera
  useEffect(() => {
    setPlayerFilter(selectedPlayer || null);
    if (selectedPlayer) {
      setSearch(selectedPlayer.name || "");
    }
  }, [selectedPlayer]);

  useEffect(() => {
    Promise.all([
      base44.entities.MatchPlayerMinutes.list("-created_date", 800).catch(() => []),
      base44.entities.MatchReport.list("-date", 100),
      base44.entities.Player.list("-created_date", 200),
    ]).then(([recs, matches, plrs]) => {
      setMinutesRecords(recs);
      setMatchReports(matches
        .filter(m => m.status !== "archivado")
        .filter(m => !activeSquadId || m.squad_id === activeSquadId)
        .filter(m => !m.competition?.includes("Juveniles"))
      );
      setPlayers(plrs);
    }).finally(() => setLoading(false));
  }, [activeSquadId]);

  // Agrupar partidos por torneo y asignar fecha
  const groupedMatches = useMemo(() => {
    const groups = {};
    for (const m of matchReports) {
      const comp = m.competition || "";
      let groupKey = "otros";
      if (comp.includes("Apertura")) groupKey = "Apertura";
      else if (comp.includes("Clausura")) groupKey = "Clausura";
      else if (comp === "Amistosos") groupKey = "Amistosos";

      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(m);
    }
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      groups[key].forEach((m, i) => { m._fecha = i + 1; });
    }
    return groups;
  }, [matchReports]);

  // Mapa rápido match_date -> match info
  const matchByDate = useMemo(() => {
    const map = {};
    for (const m of matchReports) {
      map[m.date] = m;
    }
    return map;
  }, [matchReports]);

  // Mapa player_id -> info
  const playerMap = useMemo(() => {
    const map = {};
    for (const p of players) map[p.id] = p;
    return map;
  }, [players]);

  // Lista de fechas disponibles filtradas por torneo
  const availableFechas = useMemo(() => {
    if (tournamentFilter === "all") return [];
    const ms = groupedMatches[tournamentFilter] || [];
    return ms.map(m => ({ label: `Fecha ${m._fecha} — ${moment(m.date).format("DD/MM")} vs ${m.rival}`, value: m._fecha }));
  }, [tournamentFilter, groupedMatches]);

  // Mapa de minutos: match_date+tournament -> { player_id/name -> minutes }
  // Solo se consideran registros vinculados a un partido real/activo, con minutos > 0.
  // Si hay duplicados con mismo key, se toma el registro más reciente (mayor minutos en caso de edición)
  const minutesMap = useMemo(() => {
    const activeMatchMap = buildActiveMatchMap(matchReports);
    const map = {};
    // Ordenar por created_date desc para que el más reciente gane en caso de duplicado
    const sorted = [...minutesRecords].sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""));
    for (const r of sorted) {
      if (getRecordMinutes(r) <= 0) continue;
      if (!r.match_id || !activeMatchMap[r.match_id]) continue;
      const date = r.match_date;
      const key = r.player_id || `name:${norm(r.player_name)}`;
      const t = (r.tournament || "").toLowerCase().trim();
      if (!map[date]) map[date] = {};
      if (!map[date]._byTourney) map[date]._byTourney = {};
      if (!map[date]._byTourney[t]) map[date]._byTourney[t] = {};
      // Solo guardar si no existe ya (el más reciente gana)
      if (!map[date]._byTourney[t][key]) {
      map[date]._byTourney[t][key] = { id: r.id, minutes: getRecordMinutes(r), player_name: r.player_name, player_id: r.player_id };
      }
    }
    return map;
  }, [minutesRecords, matchReports]);

  function matchTournamentsForLookup(match) {
    const comp = match.competition || "";
    if (comp.includes("Juveniles")) return ["juveniles"];
    if (comp.includes("Clausura")) return ["proyección apertura", "clausura"];
    if (comp.includes("Apertura")) return ["proyección apertura"];
    if (comp === "Amistosos") return ["amistosos", "proyección apertura"];
    return ["proyección apertura"];
  }

  function getRecsForMatch(match) {
    const dateMap = minutesMap[match.date] || {};
    const lookups = dateMap._byTourney || {};
    const tournaments = matchTournamentsForLookup(match);
    for (const t of tournaments) {
      const recs = lookups[t];
      if (recs) return recs;
    }
    return {};
  }

  // Función para determinar si un registro pertenece al jugador filtrado
  function recMatchesPlayer(rec) {
    if (!playerFilter) return true;
    if (playerFilter.id && rec.player_id === playerFilter.id) return true;
    if (!rec.player_id && playerFilter.name && norm(rec.player_name).includes(norm(playerFilter.name))) return true;
    return false;
  }

  // Partidos visibles según filtros
  const visibleMatches = useMemo(() => {
    let list = matchReports;
    if (tournamentFilter !== "all") {
      list = list.filter(m => {
        const comp = m.competition || "";
        if (tournamentFilter === "Apertura") return comp.includes("Apertura");
        if (tournamentFilter === "Clausura") return comp.includes("Clausura");
        if (tournamentFilter === "Amistosos") return comp === "Amistosos";
        return true;
      });
    }
    if (fechaFilter !== "all") {
      const fechaNum = Number(fechaFilter);
      const ms = groupedMatches[tournamentFilter !== "all" ? tournamentFilter : "Apertura"] || [];
      const matchAtFecha = ms.find(m => m._fecha === fechaNum);
      if (matchAtFecha) {
        list = list.filter(m => m.date === matchAtFecha.date);
      } else {
        list = [];
      }
    }
    // Agregar _fecha
    for (const key of Object.keys(groupedMatches)) {
      for (const m of groupedMatches[key]) {
        const idx = list.findIndex(l => l.id === m.id);
        if (idx !== -1) list[idx] = { ...list[idx], _fecha: m._fecha };
      }
    }
    list.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    // Si tenemos un jugador filtrado, mostrar solo partidos donde tiene minutos
    if (playerFilter) {
      list = list.filter(m => {
        const recs = getRecsForMatch(m);
        const keys = Object.keys(recs);
        return keys.some(k => recMatchesPlayer(recs[k]));
      });
    }
    return list;
  }, [matchReports, tournamentFilter, fechaFilter, groupedMatches, playerFilter, minutesMap]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Controles */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <button onClick={() => setShowFilters((v) => !v)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
          <SlidersHorizontal size={13} /> {showFilters ? "Ocultar filtros" : "Mostrar filtros"}
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3 items-center justify-between bg-zinc-950/40 border border-zinc-800 rounded-xl p-3">
          <div className="flex flex-wrap gap-2">
            <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
              {FILTER_OPTIONS.map((o) => (
                <button key={o.id} onClick={() => { setTournamentFilter(o.id); setFechaFilter("all"); }}
                  className={`px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${tournamentFilter === o.id ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"}`}>
                  {o.label}
                </button>
              ))}
            </div>
            {availableFechas.length > 0 && (
              <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                <button onClick={() => setFechaFilter("all")}
                  className={`px-3 py-1.5 text-xs font-medium transition-all ${fechaFilter === "all" ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"}`}>
                  Todas las fechas
                </button>
                <select
                  value={fechaFilter}
                  onChange={e => setFechaFilter(e.target.value)}
                  className="bg-zinc-800 border-l border-zinc-700 text-white text-xs px-2 py-1.5 focus:outline-none"
                >
                  <option value="all">Seleccionar fecha...</option>
                  {availableFechas.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar jugador..."
              className="bg-zinc-900 border-zinc-800 text-white pl-8 w-56 h-8 text-sm"
            />
          </div>
        </div>
      )}

      {/* Tarjetas de partidos */}
      {visibleMatches.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl py-16 text-center">
          <p className="text-zinc-500 text-sm">No hay partidos para este filtro</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleMatches.map(match => {
            const logo = getRivalLogo(match);
            const recs = getRecsForMatch(match);
            const playerKeys = Object.keys(recs)
              .filter(k => !search || norm(recs[k].player_name).includes(norm(search)))
              .sort((a, b) => (recs[b]?.minutes || 0) - (recs[a]?.minutes || 0));
            const totalMins = playerKeys.reduce((s, k) => s + (recs[k]?.minutes || 0), 0);

            return (
              <MatchCard
                key={match.id}
                match={match}
                logo={logo}
                playerKeys={playerKeys}
                recs={recs}
                totalMins={totalMins}
                playerMap={playerMap}
                highlightedPlayer={playerFilter}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function MatchCard({ match, logo, playerKeys, recs, totalMins, playerMap, highlightedPlayer }) {
  const [expanded, setExpanded] = useState(!!highlightedPlayer);

  function recMatchesPlayerHighlight(rec) {
    if (!highlightedPlayer) return false;
    if (highlightedPlayer.id && rec.player_id === highlightedPlayer.id) return true;
    if (!rec.player_id && highlightedPlayer.name && norm(rec.player_name).includes(norm(highlightedPlayer.name))) return true;
    return false;
  }
  const won = match.our_score != null && match.rival_score != null && match.our_score > match.rival_score;
  const drew = match.our_score != null && match.rival_score != null && match.our_score === match.rival_score;
  const hasResult = match.our_score != null && match.rival_score != null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-zinc-800/40 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {logo ? (
            <img src={logo} alt={match.rival} className="w-8 h-8 object-contain shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-zinc-500">{(match.rival || "?").charAt(0)}</span>
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-white">{match.rival}</p>
            <p className="text-xs text-zinc-500">{moment(match.date).format("dddd DD/MM")} · {match.location === "Local" ? "Local" : "Visitante"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {match._fecha && <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">Fecha {match._fecha}</span>}
          {match.competition?.includes("Apertura") && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-400">Apertura</span>
          )}
          {match.competition?.includes("Clausura") && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/30 text-emerald-400">Clausura</span>
          )}
          {match.competition === "Amistosos" && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-400">Amistoso</span>
          )}
          {hasResult && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${won ? "text-green-400" : drew ? "text-zinc-400" : "text-red-400"}`}>
              {match.our_score}–{match.rival_score}
            </span>
          )}
          <span className="text-xs text-zinc-500 font-mono">{playerKeys.length}j · {totalMins}'</span>
          {expanded ? <ChevronUp size={15} className="text-zinc-500" /> : <ChevronDown size={15} className="text-zinc-500" />}
        </div>
      </div>

      {/* Expanded: jugadores con minutos */}
      {expanded && (
        <div className="border-t border-zinc-800">
          <div className="px-4 py-2 border-b border-zinc-800/50 grid grid-cols-[2rem_1fr_4rem] gap-2 text-xs text-zinc-500 uppercase tracking-wider">
            <span>#</span>
            <span>Jugador</span>
            <span className="text-right">Min</span>
          </div>
          <div className="divide-y divide-zinc-800/30 max-h-96 overflow-y-auto">
            {playerKeys.map((key, i) => {
              const rec = recs[key];
              const player = rec.player_id ? playerMap[rec.player_id] : null;
              return (
                <div key={key} className={`px-4 py-2 grid grid-cols-[2rem_1fr_4rem] gap-2 items-center transition-colors ${recMatchesPlayerHighlight(rec) ? "bg-yellow-500/10 border-l-2 border-l-yellow-400" : "hover:bg-zinc-800/30"}`}>
                  <span className="text-xs text-zinc-500 font-mono">
                    {player?.jersey_number || rec.player_number || i + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <PlayerPhoto
                      player={player || { full_name: rec.player_name }}
                      alt={rec.player_name}
                      className="w-6 h-6 rounded-full object-cover border border-zinc-700 shrink-0"
                      fallbackClassName="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0"
                      textClassName="text-[10px] font-bold text-zinc-500"
                    />
                    <span className={`text-sm truncate ${recMatchesPlayerHighlight(rec) ? "text-yellow-300 font-semibold" : "text-white"}`}>{rec.player_name}</span>
                  </div>
                  <span className={`text-sm font-mono font-semibold text-right ${recMatchesPlayerHighlight(rec) ? "text-yellow-300" : "text-white"}`}>{rec.minutes}'</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
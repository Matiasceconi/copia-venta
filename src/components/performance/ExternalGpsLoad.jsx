import React, { useState, useEffect, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import moment from "moment";
import "moment/locale/es";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { isGoalkeeper } from "@/components/squad/squadConstants";
import { CalendarRange, Zap, Users, UserX, BarChart2, FileDown } from "lucide-react";
import ExternalGpsLoadHeader from "./ExternalGpsLoadHeader";
import ImportHistoricalGPSModal from "./ImportHistoricalGPSModal";
import ExternalGpsFilters from "./ExternalGpsFilters";
import ExternalGpsWeeklySummary from "./ExternalGpsWeeklySummary";
import ExternalGpsDailyChart from "./ExternalGpsDailyChart";
import ExternalGpsPlayerTable from "./ExternalGpsPlayerTable";
import ExternalGpsSessionList from "./ExternalGpsSessionList";
import ExternalGpsAlerts from "./ExternalGpsAlerts";
import ExternalGpsExcludedList from "./ExternalGpsExcludedList";
import TeamGPSProfileSection from "./TeamGPSProfileSection";
import MonthlyReport from "@/pages/MonthlyReport";
import { avg, fmtInt, computeAlerts, classifyGpsInclusion } from "./externalGpsLoadUtils";
import { useToast } from "@/components/ui/use-toast";

moment.locale("es");
const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DEFAULT_FILTERS = { sessionId: "", playerId: "", position: "", inclusion: "todos" };

const TABS = [
  { key: "resumen",     label: "Resumen semanal",         icon: BarChart2 },
  { key: "sesion",      label: "Por sesión",              icon: CalendarRange },
  { key: "jugador",     label: "Por jugador",             icon: Users },
  { key: "excluidos",   label: "Excluidos del promedio",  icon: UserX },
  { key: "perfil_equipo",label: "Perfil GPS del Equipo",   icon: Users },
  { key: "reportes",    label: "Reportes",                icon: FileDown },
];

function buildPlayerAgg(rows, playerMap) {
  const map = {};
  rows.forEach((r) => {
    if (!map[r.player_id]) {
      map[r.player_id] = {
        player_id: r.player_id, player_name: r.player_name || playerMap[r.player_id]?.full_name || "",
        position: r.position, player_type: r.player_type,
        sessions: new Set(), total_distance: 0, player_load: 0, sprints: 0, acc_3: 0, dec_3: 0, smax_max: 0,
      };
    }
    const acc = map[r.player_id];
    acc.sessions.add(r.session_id);
    acc.total_distance += r.total_distance || 0;
    acc.player_load += r.player_load || 0;
    acc.sprints += r.sprints || 0;
    acc.acc_3 += r.acc_3 || 0;
    acc.dec_3 += r.dec_3 || 0;
    if ((r.smax || 0) > acc.smax_max) acc.smax_max = r.smax || 0;
  });
  return Object.values(map).map((v) => ({ ...v, sessions: v.sessions.size }));
}

export default function ExternalGpsLoad() {
  const { activeSquadId, activeSquad } = useWorkspace();
  const navigate = useNavigate();
  const [tab, setTab] = useState("resumen");
  const [weekStart, setWeekStart] = useState(moment().startOf("isoWeek"));
  const [customRange, setCustomRange] = useState({ from: "", to: "" });
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [players, setPlayers] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [gpsRows, setGpsRows] = useState([]);
  const [weekSessionPlayers, setWeekSessionPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const { toast } = useToast();

  const weekEnd = useMemo(() => moment(weekStart).endOf("isoWeek"), [weekStart]);
  const dateFrom = customRange.from || weekStart.format("YYYY-MM-DD");
  const dateTo = customRange.to || weekEnd.format("YYYY-MM-DD");

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    const [allPlayers, mb, allSessions] = await Promise.all([
      base44.entities.Player.list("-created_date", 500),
      base44.entities.SquadMembership.list("-effective_from", 1000),
      base44.entities.TrainingSession.list("-date", 500),
    ]);
    setPlayers(allPlayers.filter((p) => p.active !== false));
    setMemberships(mb.filter((m) => m.status === "activo"));

    const weekSessions = allSessions.filter((s) =>
      (!activeSquadId || !s.squad_id || s.squad_id === activeSquadId) &&
      s.date >= dateFrom && s.date <= dateTo
    );
    setSessions(weekSessions);

    if (weekSessions.length === 0) {
      setGpsRows([]);
      setWeekSessionPlayers([]);
    } else {
      const [rowsPerSession, playersPerSession] = await Promise.all([
        Promise.all(weekSessions.map((s) => base44.entities.SessionGPSData.filter({ session_id: s.id }, "-created_date", 500))),
        Promise.all(weekSessions.map((s) => base44.entities.SessionPlayer.filter({ session_id: s.id }, "-created_date", 500))),
      ]);
      setGpsRows(rowsPerSession.flat());
      setWeekSessionPlayers(playersPerSession.flat());
    }
    setLoading(false);
    setRefreshing(false);
  }, [activeSquadId, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const playerMap = useMemo(() => {
    const map = {};
    players.forEach((p) => { map[p.id] = p; });
    return map;
  }, [players]);

  // Miembros activos del plantel activo (los arqueros no usan GPS, quedan fuera de este módulo)
  const squadPlayers = useMemo(() => {
    const base = !activeSquadId ? players : (() => {
      const ids = new Set(memberships.filter((m) => m.squad_id === activeSquadId).map((m) => m.player_id));
      return players.filter((p) => ids.has(p.id));
    })();
    return base.filter((p) => !isGoalkeeper(p));
  }, [players, memberships, activeSquadId]);

  // Enriquecer filas GPS con datos de sesión (fecha, MD) y jugador (posición, tipo) — excluye arqueros
  const enrichedRows = useMemo(() => {
    const sessionMap = {};
    sessions.forEach((s) => { sessionMap[s.id] = s; });
    return gpsRows
      .map((r) => {
        const session = sessionMap[r.session_id];
        const player = playerMap[r.player_id];
        return {
          ...r,
          date: session?.date,
          session_title: session?.title,
          match_day_code: session?.match_day_code,
          position: player?.position || "",
          player_type: player?.player_type || (isGoalkeeper(player) ? "arquero" : "jugador_campo"),
        };
      })
      .filter((r) => r.player_type !== "arquero");
  }, [gpsRows, sessions, playerMap]);

  // Regla: los promedios solo se calculan con include_in_session_average = true
  const includedRows = useMemo(() => enrichedRows.filter((r) => r.include_in_session_average !== false), [enrichedRows]);
  const excludedRows = useMemo(() => enrichedRows.filter((r) => r.include_in_session_average === false), [enrichedRows]);

  const matchesBaseFilters = useCallback((r) => {
    if (filters.sessionId && r.session_id !== filters.sessionId) return false;
    if (filters.playerId && r.player_id !== filters.playerId) return false;
    if (filters.position && r.position !== filters.position) return false;
    return true;
  }, [filters]);

  // Filas para promedios/gráficos/comparativas: siempre solo incluidas, con filtros de sesión/jugador/posición/tipo
  const filteredIncludedRows = useMemo(() => includedRows.filter(matchesBaseFilters), [includedRows, matchesBaseFilters]);
  const filteredExcludedRows = useMemo(() => excludedRows.filter(matchesBaseFilters), [excludedRows, matchesBaseFilters]);

  // Filas para tablas "Por sesión" / "Por jugador": respetan el filtro incluidos/excluidos
  const tableRows = useMemo(() => {
    if (filters.inclusion === "excluidos") return filteredExcludedRows;
    if (filters.inclusion === "incluidos") return filteredIncludedRows;
    return [...filteredIncludedRows, ...filteredExcludedRows];
  }, [filters.inclusion, filteredIncludedRows, filteredExcludedRows]);

  const summary = useMemo(() => ({
    sessionsCount: new Set(filteredIncludedRows.map((r) => r.session_id)).size,
    playersCount: new Set(filteredIncludedRows.map((r) => r.player_id)).size,
    avgDistance: avg(filteredIncludedRows.map((r) => r.total_distance)),
    avgMMin: avg(filteredIncludedRows.map((r) => r.m_min)),
    avgPlayerLoad: avg(filteredIncludedRows.map((r) => r.player_load)),
    avgSprints: avg(filteredIncludedRows.map((r) => r.sprints)),
    avgAcc: avg(filteredIncludedRows.map((r) => r.acc_3)),
    avgDec: avg(filteredIncludedRows.map((r) => r.dec_3)),
    maxSmax: filteredIncludedRows.length ? Math.max(...filteredIncludedRows.map((r) => r.smax || 0)) : null,
  }), [filteredIncludedRows]);

  const dailyData = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const day = moment(weekStart).add(i, "days");
      const dayStr = day.format("YYYY-MM-DD");
      const rows = filteredIncludedRows.filter((r) => r.date === dayStr);
      return {
        label: DAY_LABELS[i],
        date: dayStr,
        avgDistance: rows.length ? avg(rows.map((r) => r.total_distance)) : null,
        avgPlayerLoad: rows.length ? avg(rows.map((r) => r.player_load)) : null,
        avgMMin: rows.length ? avg(rows.map((r) => r.m_min)) : null,
      };
    });
  }, [filteredIncludedRows, weekStart]);

  const playerAggSummary = useMemo(() => buildPlayerAgg(filteredIncludedRows, playerMap), [filteredIncludedRows, playerMap]);
  const playerAggTable = useMemo(() => buildPlayerAgg(tableRows, playerMap), [tableRows, playerMap]);

  const sessionsToShow = useMemo(() => filters.sessionId ? sessions.filter((s) => s.id === filters.sessionId) : sessions, [sessions, filters.sessionId]);

  const sessionList = useMemo(() => {
    return sessionsToShow.map((s) => {
      const rows = tableRows.filter((r) => r.session_id === s.id);
      return {
        id: s.id, title: s.title, date: s.date, match_day_code: s.match_day_code,
        playersWithGps: new Set(rows.map((r) => r.player_id)).size,
        avgDistance: rows.length ? avg(rows.map((r) => r.total_distance)) : null,
        avgMMin: rows.length ? avg(rows.map((r) => r.m_min)) : null,
        avgPlayerLoad: rows.length ? avg(rows.map((r) => r.player_load)) : null,
      };
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [sessionsToShow, tableRows]);

  const alerts = useMemo(() => computeAlerts({ squadPlayers, playerAgg: Object.fromEntries(playerAggSummary.map(p => [p.player_id, p])), sessions, gpsRows: filteredIncludedRows, sessionPlayers: weekSessionPlayers }),
    [squadPlayers, playerAggSummary, sessions, filteredIncludedRows, weekSessionPlayers]);

  function handleExport() {
    const squadName = activeSquad?.name || "plantel";
    let text = `Carga Externa GPS — ${squadName} — ${dateFrom} a ${dateTo}\n\n`;
    text += `Resumen:\n`;
    text += `Sesiones con GPS: ${summary.sessionsCount}\n`;
    text += `Jugadores con GPS: ${summary.playersCount}\n`;
    text += `Distancia prom.: ${fmtInt(summary.avgDistance)} m\n`;
    text += `m/min prom.: ${fmtInt(summary.avgMMin)}\n`;
    text += `Player Load prom.: ${fmtInt(summary.avgPlayerLoad)}\n\n`;
    text += `Carga por jugador:\n`;
    playerAggSummary.forEach((r) => {
      text += `${r.player_name} | ${r.position} | ${r.player_type === "arquero" ? "Arquero" : "Campo"} | Sesiones: ${r.sessions} | Distancia: ${fmtInt(r.total_distance)} | PL: ${fmtInt(r.player_load)}\n`;
    });
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `carga-externa-gps-${dateFrom}.txt`; a.click();
    URL.revokeObjectURL(url);
  }

  function handleViewSession(sessionId) {
    navigate(`/sessions?session=${sessionId}`);
  }

  // Revisa el estado de cada jugador en cada sesión de la semana y recalcula
  // include_in_session_average / gps_group / exclusion_reason en SessionGPSData.
  async function recalculateAverages() {
    setRecalculating(true);
    let updatedCount = 0;
    for (const s of sessions) {
      const [sessionPlayers, sessionGpsRows] = await Promise.all([
        base44.entities.SessionPlayer.filter({ session_id: s.id }, "-created_date", 500),
        base44.entities.SessionGPSData.filter({ session_id: s.id }, "-created_date", 500),
      ]);
      const spByPlayerId = {};
      sessionPlayers.forEach((sp) => { spByPlayerId[sp.player_id] = sp; });

      const updates = sessionGpsRows.map((row) => {
        const cls = classifyGpsInclusion(spByPlayerId[row.player_id]);
        return { id: row.id, include_in_session_average: cls.include, gps_group: cls.group, exclusion_reason: cls.reason };
      }).filter((u) => {
        const orig = sessionGpsRows.find((r) => r.id === u.id);
        return orig?.include_in_session_average !== u.include_in_session_average || orig?.gps_group !== u.gps_group;
      });

      if (updates.length > 0) {
        await base44.entities.SessionGPSData.bulkUpdate(updates);
        updatedCount += updates.length;
      }
    }
    await load(true);
    setRecalculating(false);
    toast({ title: `✓ Promedios recalculados (${updatedCount} registros actualizados)` });

    // Actualizar perfiles individuales de carga externa de todos los jugadores de la semana
    const affectedPlayerIds = [...new Set(enrichedRows.map((r) => r.player_id).filter(Boolean))];
    if (affectedPlayerIds.length > 0) {
      base44.functions.invoke("recalculatePlayerGPSProfiles", { player_ids: affectedPlayerIds });
    }
    if (activeSquadId) {
      base44.functions.invoke("recalculateTeamGPSProfile", { squad_id: activeSquadId });
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      <ExternalGpsLoadHeader
        activeSquad={activeSquad}
        weekStart={weekStart}
        weekEnd={weekEnd}
        onPrevWeek={() => setWeekStart((m) => moment(m).subtract(1, "week"))}
        onNextWeek={() => setWeekStart((m) => moment(m).add(1, "week"))}
        onThisWeek={() => setWeekStart(moment().startOf("isoWeek"))}
        onExport={handleExport}
        onRefresh={() => load(true)}
        refreshing={refreshing}
        onRecalculate={recalculateAverages}
        recalculating={recalculating}
        onImportHistorical={() => setShowImportModal(true)}
      />

      {showImportModal && (
        <ImportHistoricalGPSModal onClose={() => { setShowImportModal(false); load(true); }} />
      )}

      <ExternalGpsFilters
        filters={filters} onChange={setFilters}
        sessions={sessions} players={squadPlayers}
        customRange={customRange} onCustomRangeChange={setCustomRange}
      />

      {/* Tabs internas */}
      <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1 gap-1 overflow-x-auto">
        {TABS.map(({ key, label, icon: TabIcon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              tab === key ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"
            }`}>
            <TabIcon size={12} /> {label}
          </button>
        ))}
      </div>

      {enrichedRows.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-14 text-center">
          <p className="text-zinc-400 text-sm font-medium">Sin datos GPS para este período</p>
        </div>
      ) : (
        <>
          {tab === "resumen" && (
            <>
              <ExternalGpsWeeklySummary summary={summary} />
              <ExternalGpsDailyChart dailyData={dailyData} />
              <ExternalGpsAlerts alerts={alerts} />
            </>
          )}
          {tab === "sesion" && (
            <ExternalGpsSessionList sessions={sessionList} onViewSession={handleViewSession} />
          )}
          {tab === "jugador" && (
            <ExternalGpsPlayerTable rows={playerAggTable} playerMap={playerMap} />
          )}
          {tab === "excluidos" && (
            <ExternalGpsExcludedList rows={filteredExcludedRows} />
          )}
          {tab === "perfil_equipo" && (
            <TeamGPSProfileSection />
          )}
          {tab === "reportes" && (
            <div className="space-y-5">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Exportar carga externa (semana/rango actual)</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Genera un archivo de texto con el resumen y la carga por jugador</p>
                </div>
                <button onClick={handleExport}
                  className="flex items-center gap-1.5 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-zinc-900 font-semibold rounded-lg text-sm transition-colors">
                  <FileDown size={15} /> Exportar
                </button>
              </div>
              <MonthlyReport />
            </div>
          )}
        </>
      )}
    </div>
  );
}
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useSidebarCollapse } from "@/components/staff/Layout";
import { isGoalkeeper } from "@/components/squad/squadConstants";
import { avg, withRetry } from "../externalGpsLoadUtils";
import ImportHistoricalGPSModal from "../ImportHistoricalGPSModal";
import GpsDashboardHeader from "./GpsDashboardHeader";
import GpsWeeklyEvolutionPanel from "./GpsWeeklyEvolutionPanel";
import GpsIndividualProfilePanel from "./GpsIndividualProfilePanel";
import GpsIndividualPlayerTab from "./GpsIndividualPlayerTab";
import GpsKinesiologyLoadTab from "./GpsKinesiologyLoadTab";
import GpsTeamProfilePanel from "./GpsTeamProfilePanel";
import GpsSessionAnalyticsFilters from "./GpsSessionAnalyticsFilters";
import GpsSessionsAdvancedTable from "./GpsSessionsAdvancedTable";
import moment from "moment";

function positionGroup(position, player) {
  if (isGoalkeeper(player || { position })) return "Arquero";
  const text = (position || "").toLowerCase();
  if (text.includes("central")) return "Central";
  if (text.includes("lateral")) return "Lateral";
  if (text.includes("volante") || text.includes("medio")) return "Volante";
  if (text.includes("extremo")) return "Extremo";
  if (text.includes("delantero") || text.includes("punta")) return "Delantero";
  return "";
}

function sessionEvent(session) {
  const text = `${session.session_type || ""} ${session.title || ""} ${session.match_day_code || ""}`.toLowerCase();
  return text.includes("partido") || session.match_day_code === "MD" ? "Partido" : "Entrenamiento";
}

function sessionDuration(session, rows = []) {
  const direct = Number(session.duration_minutes || session.minutes || 0);
  if (direct) return direct;
  const values = rows.map((r) => Number(r.duration_minutes || r.minutes || r.duration || 0)).filter(Boolean);
  return values.length ? Math.max(...values) : 0;
}

function minutesMatch(value, filters) {
  const mode = filters.minutesMode || "Todos";
  const min = Number(filters.minutesMin || 0);
  const max = Number(filters.minutesMax || 0);
  if (mode === "gt") return value > min;
  if (mode === "lt") return value < min;
  if (mode === "between") return value >= min && value <= max;
  return true;
}

export default function ExternalGpsDashboard() {
  const { activeSquadId } = useWorkspace();
  const { collapsed: sidebarCollapsed, setCollapsed: setSidebarCollapsed } = useSidebarCollapse();
  const dashboardRef = useRef(null);
  const previousSidebarCollapsedRef = useRef(null);
  const [wideMode, setWideMode] = useState(false);

  const [squads, setSquads] = useState([]);
  const [selectedSquadId, setSelectedSquadId] = useState(activeSquadId || "");
  const [selectedSeason, setSelectedSeason] = useState("");
  const [players, setPlayers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [allSessionsData, setAllSessionsData] = useState([]);
  const [gpsBySession, setGpsBySession] = useState({});
  const [allGpsBySession, setAllGpsBySession] = useState({});
  const [physicalObjectives, setPhysicalObjectives] = useState([]);
  const [competitionProfiles, setCompetitionProfiles] = useState([]);
  const [microcycleProfiles, setMicrocycleProfiles] = useState([]);
  const [medicalEpisodes, setMedicalEpisodes] = useState([]);
  const [medicalStatuses, setMedicalStatuses] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [weeklyPlans, setWeeklyPlans] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [matchReports, setMatchReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [activeTab, setActiveTab] = useState("microcycle");
  const [sessionFilters, setSessionFilters] = useState({
    squadId: activeSquadId || "all",
    season: "",
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

  useEffect(() => {
    if (!wideMode && previousSidebarCollapsedRef.current !== null) {
      setSidebarCollapsed(previousSidebarCollapsedRef.current);
      previousSidebarCollapsedRef.current = null;
    }
  }, [wideMode, setSidebarCollapsed]);

  useEffect(() => {
    return () => {
      if (previousSidebarCollapsedRef.current !== null) {
        setSidebarCollapsed(previousSidebarCollapsedRef.current);
      }
    };
  }, [setSidebarCollapsed]);

  function handleWideModeChange(nextWideMode) {
    if (nextWideMode) {
      previousSidebarCollapsedRef.current = sidebarCollapsed;
      setSidebarCollapsed(true);
      setWideMode(true);
      return;
    }
    setWideMode(false);
  }

  useEffect(() => {
    if (activeSquadId) {
      setSelectedSquadId(activeSquadId);
      setSessionFilters((prev) => ({ ...prev, squadId: prev.squadId === "all" ? activeSquadId : prev.squadId }));
    }
  }, [activeSquadId]);

  useEffect(() => {
    async function loadSquads() {
      const all = await base44.entities.Squad.list("-season", 200);
      setSquads(all);
      const current = all.find((s) => s.id === (activeSquadId || selectedSquadId));
      if (current) setSelectedSeason(current.season || "");
    }
    loadSquads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const seasons = useMemo(() => [...new Set(squads.map((s) => s.season).filter(Boolean))].sort().reverse(), [squads]);
  const selectedSquad = useMemo(() => squads.find((s) => s.id === selectedSquadId), [squads, selectedSquadId]);

  useEffect(() => {
    if (selectedSeason) setSessionFilters((prev) => ({ ...prev, season: prev.season || selectedSeason }));
  }, [selectedSeason]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allPlayers, allSessions, allCompetitionProfiles, allMicrocycleProfiles, allMedicalEpisodes, allMedicalStatuses, allMemberships, allWeeklyPlans, allCalendarEvents, allMatchReports] = await Promise.all([
        base44.entities.Player.list("-created_date", 500),
        base44.entities.TrainingSession.list("-date", 500),
        base44.entities.PlayerCompetitionProfile.list("-updated_at", 1000),
        base44.entities.PlayerMicrocycleGPSProfile.list("-updated_at", 2000),
        base44.entities.MedicalEpisode.list("-fecha_inicio_tto", 2000),
        base44.entities.MedicalCurrentStatus.list("-updated_at", 2000),
        base44.entities.SquadMembership.list("-created_date", 2000),
        base44.entities.WeeklyPlan.list("-week_start", 100),
        base44.entities.DayEvent.list("-date", 500),
        base44.entities.MatchReport.list("-date", 500),
      ]);
      const objectiveRows = await base44.entities.PhysicalObjective.list("order", 100);
      setPhysicalObjectives(objectiveRows.filter((o) => o.active !== false && o.hidden !== true).map((o) => o.name).filter(Boolean));
      setAllSessionsData(allSessions);
      setPlayers(allPlayers.filter((p) => p.active !== false));
      setCompetitionProfiles(allCompetitionProfiles.filter((p) => (!selectedSquadId || p.squad_id === selectedSquadId) && (!selectedSeason || p.season_id === selectedSeason)));
      setMicrocycleProfiles(allMicrocycleProfiles.filter((p) => (!selectedSquadId || p.squad_id === selectedSquadId) && (!selectedSeason || p.season_id === selectedSeason)));
      setMedicalEpisodes(allMedicalEpisodes.filter((e) => (!selectedSquadId || !e.squad_id || e.squad_id === selectedSquadId) && (!selectedSeason || !e.season_id || e.season_id === selectedSeason)));
      setMedicalStatuses(allMedicalStatuses.filter((s) => (!selectedSquadId || !s.squad_id || s.squad_id === selectedSquadId)));
      setMemberships(allMemberships.filter((m) => m.squad_id === selectedSquadId && m.status !== "fuera_del_plantel" && m.status !== "inactivo" && !m.effective_to));
      setWeeklyPlans(selectedSquadId ? allWeeklyPlans.filter((p) => p.squad_id === selectedSquadId && (!selectedSeason || !p.season_id || p.season_id === selectedSeason)) : allWeeklyPlans);
      setCalendarEvents(allCalendarEvents.filter((e) => (!selectedSquadId || !e.squad_id || e.squad_id === selectedSquadId) && (!selectedSeason || !e.season_id || e.season_id === selectedSeason)));
      setMatchReports(allMatchReports.filter((m) => (!selectedSquadId || !m.squad_id || m.squad_id === selectedSquadId) && (!selectedSeason || !m.season_id || m.season_id === selectedSeason)));

      const squadSessions = allSessions.filter((s) => selectedSquadId && s.squad_id === selectedSquadId && (!selectedSeason || !s.season_id || s.season_id === selectedSeason));
      setSessions(squadSessions);

      const allGpsRows = await withRetry(() => base44.entities.SessionGPSData.list("-created_date", 5000));
      const allGrouped = {};
      allGpsRows.forEach((r) => {
        if (!allGrouped[r.session_id]) allGrouped[r.session_id] = [];
        allGrouped[r.session_id].push(r);
      });
      setAllGpsBySession(allGrouped);

      if (squadSessions.length > 0) {
        const sessionIds = new Set(squadSessions.map((s) => s.id));
        const grouped = {};
        Object.entries(allGrouped).forEach(([sessionId, rows]) => {
          if (sessionIds.has(sessionId)) grouped[sessionId] = rows;
        });
        setGpsBySession(grouped);
        setSelectedSessionId((prev) => prev && squadSessions.some((s) => s.id === prev) ? prev : squadSessions[0].id);
      } else {
        setGpsBySession({});
        setSelectedSessionId("");
      }
    } catch (err) {
      console.error("ExternalGpsDashboard load error:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedSquadId, selectedSeason]);

  useEffect(() => { load(); }, [load]);

  const playerMap = useMemo(() => {
    const map = {};
    players.forEach((p) => { map[p.id] = p; });
    return map;
  }, [players]);

  const competitionMap = useMemo(() => {
    const map = {};
    competitionProfiles.forEach((c) => { map[c.player_id] = c; });
    return map;
  }, [competitionProfiles]);

  // Todas las filas GPS del plantel (excluye arqueros e inactivos del promedio)
  const allEnrichedRows = useMemo(() => {
    const sessionMap = {};
    sessions.forEach((s) => { sessionMap[s.id] = s; });
    return Object.entries(gpsBySession).flatMap(([sessionId, rows]) =>
      rows
        .filter((r) => r.include_in_session_average !== false)
        .map((r) => {
          const player = playerMap[r.player_id];
          return { ...r, date: sessionMap[sessionId]?.date, position: player?.position || "", player_name: r.player_name || player?.full_name || "" };
        })
        .filter((r) => !isGoalkeeper(playerMap[r.player_id]))
    );
  }, [gpsBySession, sessions, playerMap]);

  const sortedSessions = useMemo(() => [...sessions].sort((a, b) => (b.date || "").localeCompare(a.date || "")), [sessions]);

  const sessionsForList = useMemo(() => sortedSessions.map((s) => ({
    ...s,
    playerCount: new Set((gpsBySession[s.id] || []).filter((r) => r.include_in_session_average !== false).map((r) => r.player_id)).size,
  })), [sortedSessions, gpsBySession]);

  const analyticsObjectives = useMemo(() => {
    const fromSessions = allSessionsData.map((s) => s.session_objective).filter(Boolean);
    return [...new Set([...physicalObjectives, ...fromSessions])].sort((a, b) => a.localeCompare(b));
  }, [physicalObjectives, allSessionsData]);

  const filteredAnalyticsSessions = useMemo(() => {
    return [...allSessionsData]
      .filter((session) => {
        const rows = allGpsBySession[session.id] || [];
        const squad = squads.find((s) => s.id === session.squad_id);
        const season = session.season_id || squad?.season || "";
        const duration = sessionDuration(session, rows);
        const selectedPlayers = sessionFilters.playerIds || [];
        const hasPlayerOrPositionFilter = selectedPlayers.length > 0 || (sessionFilters.position && sessionFilters.position !== "Todos");
        const matchingRows = rows.filter((row) => {
          const player = playerMap[row.player_id];
          const rowPosition = player?.position || row.position || "";
          const playerOk = selectedPlayers.length === 0 || selectedPlayers.includes(row.player_id);
          const positionOk = !sessionFilters.position || sessionFilters.position === "Todos" || positionGroup(rowPosition, player) === sessionFilters.position;
          return playerOk && positionOk;
        });
        if (sessionFilters.squadId && sessionFilters.squadId !== "all" && session.squad_id !== sessionFilters.squadId) return false;
        if (sessionFilters.season && season !== sessionFilters.season) return false;
        if (sessionFilters.dateFrom && session.date < sessionFilters.dateFrom) return false;
        if (sessionFilters.dateTo && session.date > sessionFilters.dateTo) return false;
        if (sessionFilters.event && sessionFilters.event !== "Todos" && sessionEvent(session) !== sessionFilters.event) return false;
        if (sessionFilters.objective && sessionFilters.objective !== "Todos" && session.session_objective !== sessionFilters.objective) return false;
        if (sessionFilters.md && sessionFilters.md !== "Todos" && (session.match_day_code || session.microcycle_day || "") !== sessionFilters.md) return false;
        if (!minutesMatch(duration, sessionFilters)) return false;
        if (hasPlayerOrPositionFilter && matchingRows.length === 0) return false;
        return true;
      })
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .map((session) => ({
        ...session,
        playerCount: new Set((allGpsBySession[session.id] || []).filter((r) => r.include_in_session_average !== false).map((r) => r.player_id)).size,
        durationForFilter: sessionDuration(session, allGpsBySession[session.id] || []),
      }));
  }, [allSessionsData, allGpsBySession, squads, sessionFilters, playerMap]);

  const selectedAnalyticsSession = useMemo(() => {
    return filteredAnalyticsSessions.find((s) => s.id === selectedSessionId) || filteredAnalyticsSessions[0] || null;
  }, [filteredAnalyticsSessions, selectedSessionId]);

  useEffect(() => {
    if (activeTab === "sessions" && selectedAnalyticsSession && selectedSessionId !== selectedAnalyticsSession.id) {
      setSelectedSessionId(selectedAnalyticsSession.id);
    }
  }, [activeTab, selectedAnalyticsSession, selectedSessionId]);

  const analyticsSessionRows = useMemo(() => {
    if (!selectedAnalyticsSession) return [];
    const selectedPlayers = sessionFilters.playerIds || [];
    return (allGpsBySession[selectedAnalyticsSession.id] || [])
      .filter((r) => r.include_in_session_average !== false)
      .map((r) => {
        const player = playerMap[r.player_id];
        return { ...r, position: player?.position || r.position || "", player_name: r.player_name || player?.full_name || "" };
      })
      .filter((r) => selectedPlayers.length === 0 || selectedPlayers.includes(r.player_id))
      .filter((r) => !sessionFilters.position || sessionFilters.position === "Todos" || positionGroup(r.position, playerMap[r.player_id]) === sessionFilters.position);
  }, [allGpsBySession, selectedAnalyticsSession, sessionFilters.playerIds, sessionFilters.position, playerMap]);

  const analyticsSessionSummary = useMemo(() => ({
    playersCount: analyticsSessionRows.length,
    avgDistance: avg(analyticsSessionRows.map((r) => r.total_distance)),
    avgMMin: avg(analyticsSessionRows.map((r) => r.m_min)),
    avgPlayerLoad: avg(analyticsSessionRows.map((r) => r.player_load)),
    avgSprints: avg(analyticsSessionRows.map((r) => r.sprints)),
  }), [analyticsSessionRows]);

  const analyticsHighlights = useMemo(() => {
    function top(key) {
      const withVal = analyticsSessionRows.filter((r) => r[key] != null);
      if (!withVal.length) return null;
      const best = withVal.reduce((a, b) => (b[key] > a[key] ? b : a));
      return { name: best.player_name, value: best[key] };
    }
    return {
      maxDistance: top("total_distance"),
      maxSprints: top("sprints"),
      maxPlayerLoad: top("player_load"),
      maxSmax: top("smax"),
      maxRhie: top("rhie_bouts"),
    };
  }, [analyticsSessionRows]);

  const kpis = useMemo(() => {
    const sessionsWithGps = sessions.filter((s) => (gpsBySession[s.id] || []).length > 0);
    const playersPerSession = sessionsWithGps.map((s) => new Set((gpsBySession[s.id] || []).map((r) => r.player_id)).size);
    return {
      sessionsCount: sessionsWithGps.length,
      lastSessionDate: sortedSessions[0]?.date,
      lastSessionTitle: sortedSessions[0] ? `${sortedSessions[0].match_day_code || ""} ${sortedSessions[0].title || ""}`.trim() : "",
      avgPlayersPerSession: avg(playersPerSession),
      avgTotalDistance: avg(allEnrichedRows.map((r) => r.total_distance)),
      avgPlayerLoad: avg(allEnrichedRows.map((r) => r.player_load)),
      avgSprints: avg(allEnrichedRows.map((r) => r.sprints)),
    };
  }, [sessions, gpsBySession, sortedSessions, allEnrichedRows]);

  const today = moment().format("YYYY-MM-DD");
  const currentCycle = useMemo(() => {
    if (!weeklyPlans.length) return null;
    const withToday = weeklyPlans.find((p) => (p.days_data || []).some((d) => d.date === today));
    if (withToday) return withToday;
    return weeklyPlans.find((p) => p.week_start && p.week_start <= today) || weeklyPlans[0];
  }, [weeklyPlans, today]);

  const cycleDays = currentCycle?.days_data || [];

  const rosterPlayerIds = useMemo(() => new Set(memberships.map((m) => m.player_id)), [memberships]);
  const rosterPlayers = useMemo(() => players.filter((p) => rosterPlayerIds.has(p.id)), [players, rosterPlayerIds]);

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);
  const sessionRows = useMemo(() => {
    const rows = (gpsBySession[selectedSessionId] || []).filter((r) => r.include_in_session_average !== false);
    return rows
      .map((r) => {
        const player = playerMap[r.player_id];
        return { ...r, position: player?.position || "", player_name: r.player_name || player?.full_name || "" };
      })
      .filter((r) => !isGoalkeeper(playerMap[r.player_id]));
  }, [gpsBySession, selectedSessionId, playerMap]);

  const sessionSummary = useMemo(() => ({
    playersCount: sessionRows.length,
    avgDistance: avg(sessionRows.map((r) => r.total_distance)),
    avgMMin: avg(sessionRows.map((r) => r.m_min)),
    avgPlayerLoad: avg(sessionRows.map((r) => r.player_load)),
    avgSprints: avg(sessionRows.map((r) => r.sprints)),
  }), [sessionRows]);

  const highlights = useMemo(() => {
    function top(key) {
      const withVal = sessionRows.filter((r) => r[key] != null);
      if (!withVal.length) return null;
      const best = withVal.reduce((a, b) => (b[key] > a[key] ? b : a));
      return { name: best.player_name, value: best[key] };
    }
    return {
      maxDistance: top("total_distance"),
      maxSprints: top("sprints"),
      maxPlayerLoad: top("player_load"),
      maxSmax: top("smax"),
      maxRhie: top("rhie_bouts"),
    };
  }, [sessionRows]);

  const alertCounts = useMemo(() => {
    const counts = { muyAlta: 0, alta: 0, optima: 0 };
    sessionRows.forEach((r) => {
      const comp = competitionMap[r.player_id];
      if (!comp?.avg_total_distance) return;
      const pct = (r.total_distance / comp.avg_total_distance) * 100;
      if (pct >= 110) counts.muyAlta++;
      else if (pct >= 95) counts.alta++;
      else counts.optima++;
    });
    return counts;
  }, [sessionRows, competitionMap]);

  useEffect(() => {
    const sourceRows = sessionRows.length ? sessionRows : allEnrichedRows;
    if (sourceRows.length && !sourceRows.some((r) => r.player_id === selectedPlayerId)) {
      setSelectedPlayerId(sourceRows[0].player_id);
    }
  }, [sessionRows, allEnrichedRows, selectedPlayerId]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
    </div>
  );

  const tabs = [
    { id: "microcycle", label: "Carga del Microciclo" },
    { id: "sessions", label: "Buscar sesiones" },
    { id: "kinesiology", label: "Diferenciados en Kinesiología" },
    { id: "individual-player", label: "Individual" },
    { id: "individual", label: "Perfil competitivo individual" },
    { id: "team", label: "Perfil del equipo" },
  ];

  return (
    <div className="space-y-5" ref={dashboardRef}>
      <GpsDashboardHeader
        squads={squads}
        selectedSquadId={selectedSquadId}
        onSquadChange={(id) => {
          setSelectedSquadId(id);
          const squad = squads.find((s) => s.id === id);
          if (squad) setSelectedSeason(squad.season || "");
        }}
        seasons={seasons}
        selectedSeason={selectedSeason}
        onSeasonChange={setSelectedSeason}
        wideMode={wideMode}
        onWideModeChange={handleWideModeChange}
      />

      {showImportModal && <ImportHistoricalGPSModal onClose={() => { setShowImportModal(false); load(); }} />}

      <div className="flex overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/70 p-2 shadow-[0_16px_42px_rgba(0,0,0,0.22)]">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative px-5 py-2.5 text-sm font-semibold transition-colors ${activeTab === tab.id ? "rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-950/30" : "text-zinc-400 hover:text-white"} ${index > 0 ? "before:absolute before:left-0 before:top-1/2 before:h-5 before:w-px before:-translate-y-1/2 before:bg-zinc-800" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "microcycle" && (
        <GpsWeeklyEvolutionPanel sessions={sessions} gpsBySession={gpsBySession} cycleDays={cycleDays} playerMap={playerMap} squadName={selectedSquad?.name} season={selectedSeason} squadId={selectedSquadId} weeklyPlans={weeklyPlans} competitionProfiles={competitionProfiles} microcycleProfiles={microcycleProfiles} calendarEvents={calendarEvents} matchReports={matchReports} onReload={load} />
      )}

      {activeTab === "sessions" && (
        <div className="space-y-4">
          <GpsSessionAnalyticsFilters
            filters={sessionFilters}
            onChange={setSessionFilters}
            squads={squads}
            seasons={seasons}
            players={players}
            physicalObjectives={analyticsObjectives}
            resultCount={filteredAnalyticsSessions.length}
            totalCount={allSessionsData.length}
          />
          <GpsSessionsAdvancedTable
            sessions={filteredAnalyticsSessions}
            gpsBySession={allGpsBySession}
            playerMap={playerMap}
            sessionFilters={sessionFilters}
            loading={loading}
          />
        </div>
      )}

      {activeTab === "kinesiology" && (
        <GpsKinesiologyLoadTab sessions={sessions} gpsBySession={gpsBySession} playerMap={playerMap} competitionProfiles={competitionProfiles} medicalEpisodes={medicalEpisodes} medicalStatuses={medicalStatuses} />
      )}

      {activeTab === "individual-player" && (
        <GpsIndividualPlayerTab
          players={rosterPlayers}
          gpsBySession={gpsBySession}
          sessions={sessions}
          playerMap={playerMap}
          competitionProfiles={competitionProfiles}
        />
      )}

      {activeTab === "individual" && (
        <GpsIndividualProfilePanel
          players={rosterPlayers}
          competitionProfiles={competitionProfiles}
          microcycleProfiles={microcycleProfiles}
          squadId={selectedSquadId}
          seasonId={selectedSeason || selectedSquad?.season || ""}
          onReload={load}
        />
      )}

      {activeTab === "team" && (
        <GpsTeamProfilePanel
          squadId={selectedSquadId}
          squadName={selectedSquad?.name}
          season={selectedSeason || selectedSquad?.season || ""}
          sessions={sessions}
          gpsBySession={gpsBySession}
          playerMap={playerMap}
          onReload={load}
        />
      )}
    </div>
  );
}
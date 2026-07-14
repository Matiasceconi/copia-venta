import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, ClipboardList } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useWorkspace } from "@/lib/WorkspaceContext";
import SessionList from "@/components/sessions/SessionList";
import SessionForm from "@/components/sessions/SessionForm";
import SessionDetail from "@/components/sessions/SessionDetail";
import SessionFilters, { DEFAULT_FILTERS } from "@/components/sessions/SessionFilters";
import { effectiveSessionMeta, findPlanDay } from "@/components/planning/microcycleSync";
import moment from "moment";

export default function Sessions() {
  const { activeSquadId, activeSquad, activeSeasonId } = useWorkspace();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // "list" | "new" | "detail"
  const [selectedSession, setSelectedSession] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [exerciseCounts, setExerciseCounts] = useState({});
  const [videoLinksBySession, setVideoLinksBySession] = useState({});
  const [weeklyPlans, setWeeklyPlans] = useState([]);
  const [physicalObjectives, setPhysicalObjectives] = useState([]);
  const [selectedTab, setSelectedTab] = useState("players");
  const [autoOpenPDF, setAutoOpenPDF] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    setView("list");
    setSelectedSession(null);
    Promise.all([
      base44.entities.TrainingSession.list("-date", 200),
      base44.entities.SessionExercise.list("-order", 3000),
      base44.entities.SessionVideoLink.list("-created_date", 1000),
      base44.entities.WeeklyPlan.list("-week_start", 100),
      base44.entities.PhysicalObjective.list("order", 100),
    ]).then(([all, allExercises, allVideoLinks, allPlans, allObjectives]) => {
      const filtered = activeSquadId
        ? all.filter(s => s.squad_id === activeSquadId)
        : all;
      setSessions(filtered);
      setWeeklyPlans(activeSquadId ? allPlans.filter(p => p.squad_id === activeSquadId && (!p.season_id || !activeSeasonId || p.season_id === activeSeasonId)) : allPlans);
      setPhysicalObjectives(allObjectives.filter(o => o.active !== false && o.hidden !== true));
      const counts = {};
      allExercises.forEach(ex => { counts[ex.session_id] = (counts[ex.session_id] || 0) + 1; });
      setExerciseCounts(counts);
      const linksMap = {};
      allVideoLinks.forEach(l => {
        if (!linksMap[l.session_id]) linksMap[l.session_id] = [];
        linksMap[l.session_id].push(l);
      });
      setVideoLinksBySession(linksMap);
      setLoading(false);

      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get("session");
      if (sessionId) {
        const found = filtered.find(s => s.id === sessionId);
        if (found) { setSelectedSession(found); setView("detail"); }
      }
    });
  }, [activeSquadId, activeSeasonId]);

  function handleCreated(session) {
    setSessions(prev => [session, ...prev]);
    setSelectedSession(session);
    setView("detail");
    toast({ title: "✓ Sesión creada" });
  }

  function handleSelect(session, tab = "players", openPdf = false) {
    setSelectedSession(session);
    setSelectedTab(tab);
    setAutoOpenPDF(openPdf);
    setView("detail");
  }

  async function handleDelete(id) {
    if (!window.confirm("¿Eliminar esta sesión?")) return;
    const strengthStations = await base44.entities.StrengthStation.filter({ session_id: id }, "order", 200);
    const strengthBlocks = await base44.entities.StrengthWorkBlock.filter({ session_id: id }, "order", 100);
    const libraryFromSession = await base44.entities.StrengthExerciseLibrary.filter({ created_from_session_id: id }, "-created_date", 200);
    for (const station of strengthStations) {
      await base44.entities.StrengthStation.delete(station.id);
    }
    for (const block of strengthBlocks) {
      await base44.entities.StrengthWorkBlock.delete(block.id);
    }
    for (const exercise of libraryFromSession) {
      await base44.entities.StrengthExerciseLibrary.delete(exercise.id);
    }
    await base44.entities.TrainingSession.delete(id);
    setSessions(prev => prev.filter(s => s.id !== id));
    toast({ title: "Sesión eliminada" });
  }

  function handleBack() {
    setSelectedSession(null);
    setView("list");
  }

  const filteredSessions = useMemo(() => {
    let list = [...sessions];
    const f = filters;

    if (f.search.trim()) {
      const q = f.search.trim().toLowerCase();
      list = list.filter(s => {
        const meta = effectiveSessionMeta(s, findPlanDay(weeklyPlans, { date: s.date, squadId: s.squad_id, seasonId: s.season_id }));
        const haystack = [
          s.title, moment(s.date).format("DD/MM/YYYY"), s.date,
          meta.match_day_code, meta.session_objective, s.squad_name, s.period,
        ].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(q);
      });
    }
    if (f.sessionNumber) list = list.filter(s => String(s.session_number || "").includes(String(f.sessionNumber).trim()));
    if (f.dateFrom) list = list.filter(s => s.date >= f.dateFrom);
    if (f.dateTo) list = list.filter(s => s.date <= f.dateTo);
    if (f.period) list = list.filter(s => (s.period || "Competencia") === f.period);
    if (f.md) list = list.filter(s => effectiveSessionMeta(s, findPlanDay(weeklyPlans, { date: s.date, squadId: s.squad_id, seasonId: s.season_id })).match_day_code === f.md);
    if (f.physicalObjective) list = list.filter(s => effectiveSessionMeta(s, findPlanDay(weeklyPlans, { date: s.date, squadId: s.squad_id, seasonId: s.season_id })).session_objective === f.physicalObjective);
    if (f.minPlayers) list = list.filter(s => (s.players_selected || 0) >= parseInt(f.minPlayers));
    if (f.gps === "con") list = list.filter(s => !!s.csv_label);
    if (f.gps === "sin") list = list.filter(s => !s.csv_label);
    if (f.video === "con") list = list.filter(s => !!s.video_url);
    if (f.video === "sin") list = list.filter(s => !s.video_url);
    if (f.sort === "antiguas") list.sort((a, b) => a.date.localeCompare(b.date));
    else if (f.sort === "duracion") list.sort((a, b) => (b.duration_minutes || 0) - (a.duration_minutes || 0));
    else if (f.sort === "jugadores") list.sort((a, b) => (b.players_selected || 0) - (a.players_selected || 0));
    else list.sort((a, b) => b.date.localeCompare(a.date));

    return list;
  }, [sessions, filters, weeklyPlans]);

  const hasActiveFilters = Object.entries(filters).some(([k, v]) => k !== "sort" && v !== "" && v !== "todos");
  const nextSessionNumber = useMemo(() => {
    const numbers = sessions.map(s => Number(s.session_number)).filter(Number.isFinite);
    return numbers.length ? Math.max(...numbers) + 1 : sessions.length + 1;
  }, [sessions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      {view === "list" && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-4">
            <ClipboardList size={22} className="text-zinc-400" />
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Sesiones</h1>
              <p className="text-zinc-500 text-sm mt-0.5">
                {activeSquad ? activeSquad.name : "Todos los planteles"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setView("new")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-zinc-900 font-semibold text-sm hover:bg-zinc-200 transition-colors">
            <Plus size={15} /> Nueva sesión
          </button>
        </div>
      )}

      {view === "new" && (
        <>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Nueva sesión</h1>
            <p className="text-zinc-500 text-sm mt-0.5">Los jugadores se cargan automáticamente desde Estado del Plantel</p>
          </div>
          <SessionForm onCreated={handleCreated} onCancel={handleBack} nextSessionNumber={nextSessionNumber} />
        </>
      )}

      {view === "list" && (
        loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <SessionFilters filters={filters} onChange={setFilters} physicalObjectives={physicalObjectives} />
            <SessionList sessions={filteredSessions} onSelect={handleSelect} onDelete={handleDelete} hasFilters={hasActiveFilters} exerciseCounts={exerciseCounts} videoLinksBySession={videoLinksBySession} weeklyPlans={weeklyPlans} physicalObjectives={physicalObjectives} />
          </>
        )
      )}

      {view === "detail" && selectedSession && (
        <SessionDetail session={selectedSession} onBack={handleBack} initialTab={selectedTab} autoOpenPDF={autoOpenPDF} />
      )}
    </div>
  );
}
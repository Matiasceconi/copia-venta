import React, { useEffect, useMemo, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import moment from "moment";
import { CheckCircle2 } from "lucide-react";
import { BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import GpsMicrocycleHighlights from "./GpsMicrocycleHighlights";
import GpsMicrocyclePdfButton from "./GpsMicrocyclePdfButton";
import GpsMicrocycleFiltersPanel, { getMicrocycleFilterLabels } from "./GpsMicrocycleFiltersPanel";
import GpsMicrocycleHistoryPanel from "./GpsMicrocycleHistoryPanel";
import GpsMicrocycleWeekNavigator from "./GpsMicrocycleWeekNavigator";
import GpsMicrocycleDayHeader from "./GpsMicrocycleDayHeader";
import GpsDailyPlayerTable from "./GpsDailyPlayerTable";
import GpsMicrocycleCharts, { DEFAULT_CHART_CONFIG } from "./GpsMicrocycleCharts";
import {
  MICRO_METRICS,
  buildDailySummaries,
  rowsForCycle,
  buildHighlights,
  buildComparison,
  getCycleDays,
} from "./gpsMicrocycleReportUtils";
import { resolveMicrocycleMatch } from "./gpsMatchResolver";

const RANKING_STORAGE_KEY = "gps_microcycle_ranking_metrics_v1";
const CHART_STORAGE_KEY = "gps_microcycle_chart_config_v1";
const DEFAULT_RANKING_CONFIG = {
  metricKeys: ["total_distance", "player_load", "sprints"],
  topCount: 3,
  scope: "full",
};

function MetricChart({ metric, data }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      <div className="mb-3">
        <h3 className="text-white font-bold text-sm">{metric.label}</h3>
        <p className="text-zinc-500 text-xs">Datos filtrados por día</p>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ReBarChart data={data} margin={{ top: 18, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="label" stroke="#71717a" fontSize={10} />
            <YAxis stroke="#71717a" fontSize={10} />
            <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 12, color: "#fff" }} />
            <Bar dataKey={metric.key} name={metric.label} fill={metric.color} radius={[6, 6, 0, 0]}>
              <LabelList dataKey={metric.key} position="top" fill="#e4e4e7" fontSize={10} fontWeight={700} formatter={(v) => v == null ? "—" : Math.round(v)} />
            </Bar>
          </ReBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function addDays(date, days) { return moment(date).add(days, "days").format("YYYY-MM-DD"); }
function rangeDays(start, end) {
  if (!start || !end || start > end) return [];
  const days = [];
  let current = moment(start);
  const limit = moment(end);
  while (current.isSameOrBefore(limit, "day")) { days.push({ date: current.format("YYYY-MM-DD"), md: "—" }); current.add(1, "day"); }
  return days;
}
function daysFromSummary(summary) {
  const daily = summary?.summary_snapshot?.daily;
  if (Array.isArray(daily) && daily.length) return daily.map((d) => ({ date: d.date, md: d.md || "—", objetivo: d.objetivo || "—" }));
  return rangeDays(summary?.fecha_inicio, summary?.fecha_fin);
}
function aggregateRows(rows, metric) {
  const values = rows.map((r) => Number(r[metric.key])).filter((v) => Number.isFinite(v));
  if (!values.length) return null;
  if (metric.mode === "max") return Math.max(...values);
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function loadRankingConfig() {
  if (typeof window === "undefined") return DEFAULT_RANKING_CONFIG;
  try {
    return { ...DEFAULT_RANKING_CONFIG, ...(JSON.parse(window.localStorage.getItem(RANKING_STORAGE_KEY) || "{}")) };
  } catch {
    return DEFAULT_RANKING_CONFIG;
  }
}

function loadChartConfig() {
  if (typeof window === "undefined") return DEFAULT_CHART_CONFIG;
  try {
    return { ...DEFAULT_CHART_CONFIG, ...(JSON.parse(window.localStorage.getItem(CHART_STORAGE_KEY) || "{}")) };
  } catch {
    return DEFAULT_CHART_CONFIG;
  }
}

export default function GpsWeeklyEvolutionPanel({ sessions, gpsBySession, cycleDays, playerMap, squadName, season, squadId, weeklyPlans = [], competitionProfiles = [], microcycleProfiles = [], calendarEvents = [], matchReports = [] }) {
  const reportCaptureRef = useRef(null);
  const [filters, setFilters] = useState({});
  const [summaries, setSummaries] = useState([]);
  const [cycleMode, setCycleMode] = useState("current");
  const [selectedSummaryId, setSelectedSummaryId] = useState("");
  const [selectedWeekStart, setSelectedWeekStart] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedDates, setSelectedDates] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [savingState, setSavingState] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [rankingConfig, setRankingConfig] = useState(loadRankingConfig);
  const [chartConfig, setChartConfig] = useState(loadChartConfig);
  const players = useMemo(() => Object.values(playerMap || {}).filter(Boolean), [playerMap]);

  useEffect(() => {
    window.localStorage.setItem(RANKING_STORAGE_KEY, JSON.stringify(rankingConfig));
  }, [rankingConfig]);

  useEffect(() => {
    window.localStorage.setItem(CHART_STORAGE_KEY, JSON.stringify(chartConfig));
  }, [chartConfig]);

  async function loadSummaries() {
    if (!squadId) { setSummaries([]); return; }
    const rows = await base44.entities.MicrocycleSummary.filter({ squad_id: squadId }, "-fecha_inicio", 300);
    setSummaries(rows);
  }

  useEffect(() => { loadSummaries(); }, [squadId]);

  const latestSummary = useMemo(() => [...summaries].sort((a, b) => String(b.updated_at || b.created_at || b.fecha_inicio || "").localeCompare(String(a.updated_at || a.created_at || a.fecha_inicio || "")))[0] || null, [summaries]);
  const selectedSummary = useMemo(() => summaries.find((s) => s.id === selectedSummaryId), [summaries, selectedSummaryId]);
  const nextMicrocycleNumber = useMemo(() => {
    const numbers = summaries.map((s) => Number(s.microcycle_number)).filter(Number.isFinite);
    return numbers.length ? Math.max(...numbers) + 1 : summaries.length + 1;
  }, [summaries]);

  useEffect(() => {
    if (cycleMode === "lastSaved" && latestSummary && selectedSummaryId !== latestSummary.id) setSelectedSummaryId(latestSummary.id);
  }, [cycleMode, latestSummary, selectedSummaryId]);

  const selectedPlan = useMemo(() => {
    if (!weeklyPlans.length) return null;
    return weeklyPlans.find((plan) => plan.week_start === selectedWeekStart) || weeklyPlans.find((plan) => (plan.days_data || []).some((day) => day.date === moment().format("YYYY-MM-DD"))) || weeklyPlans[0];
  }, [weeklyPlans, selectedWeekStart]);

  useEffect(() => {
    if (!selectedWeekStart && selectedPlan?.week_start) setSelectedWeekStart(selectedPlan.week_start);
  }, [selectedWeekStart, selectedPlan]);

  const normalizedCurrentDays = useMemo(() => getCycleDays(selectedPlan?.days_data?.length ? selectedPlan.days_data : cycleDays), [selectedPlan, cycleDays]);
  const baseCycleDays = useMemo(() => {
    if ((cycleMode === "historical" || cycleMode === "lastSaved") && selectedSummary) return daysFromSummary(selectedSummary);
    if (cycleMode === "previous") return normalizedCurrentDays.map((d) => ({ ...d, date: addDays(d.date, -7) }));
    return normalizedCurrentDays;
  }, [cycleMode, selectedSummary, normalizedCurrentDays]);

  const effectiveCycleDays = useMemo(() => {
    let days = baseCycleDays;
    const today = moment().format("YYYY-MM-DD");
    if (filters.rangePreset === "current") days = normalizedCurrentDays;
    if (filters.rangePreset === "previous") days = normalizedCurrentDays.map((d) => ({ ...d, date: addDays(d.date, -7) }));
    if (filters.rangePreset === "last7") days = rangeDays(addDays(today, -6), today);
    if (filters.rangePreset === "last14") days = rangeDays(addDays(today, -13), today);
    if (filters.rangePreset === "last4weeks") days = rangeDays(addDays(today, -27), today);
    if (filters.dateFrom || filters.dateTo || filters.rangePreset === "custom") {
      const start = filters.dateFrom || days[0]?.date;
      const end = filters.dateTo || days[days.length - 1]?.date;
      const byDate = Object.fromEntries(days.map((d) => [d.date, d]));
      days = rangeDays(start, end).map((d) => byDate[d.date] || d);
    }
    if (filters.selectedDates?.length) {
      const byDate = Object.fromEntries(days.map((d) => [d.date, d]));
      filters.selectedDates.forEach((date) => { if (!byDate[date]) byDate[date] = { date, md: "—" }; });
      days = Object.values(byDate).sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    }
    return days;
  }, [baseCycleDays, normalizedCurrentDays, filters.rangePreset, filters.dateFrom, filters.dateTo, filters.selectedDates]);

  const visibleMetrics = useMemo(() => filters.metricKey ? MICRO_METRICS.filter((m) => m.key === filters.metricKey) : MICRO_METRICS, [filters.metricKey]);
  const displayedChartConfig = ((cycleMode === "historical" || cycleMode === "lastSaved") && selectedSummary) ? (selectedSummary?.charts_snapshot?.config || DEFAULT_CHART_CONFIG) : chartConfig;
  const selectedChartMetrics = useMemo(() => (displayedChartConfig.metricKeys || []).map((key) => MICRO_METRICS.find((metric) => metric.key === key)).filter(Boolean), [displayedChartConfig.metricKeys]);
  const reportMetrics = useMemo(() => {
    const map = new Map();
    [...visibleMetrics, ...selectedChartMetrics].forEach((metric) => { if (metric) map.set(metric.key, metric); });
    return Array.from(map.values());
  }, [visibleMetrics, selectedChartMetrics]);
  const rankingMetrics = useMemo(() => (rankingConfig.metricKeys || []).map((key) => MICRO_METRICS.find((metric) => metric.key === key)).filter(Boolean), [rankingConfig.metricKeys]);
  const dailySummaries = useMemo(() => buildDailySummaries({ sessions, gpsBySession, cycleDays: effectiveCycleDays, playerMap, filters, metrics: reportMetrics }), [sessions, gpsBySession, effectiveCycleDays, playerMap, filters, reportMetrics]);
  const cycleRows = useMemo(() => rowsForCycle({ sessions, gpsBySession, cycleDays: effectiveCycleDays, playerMap, filters }), [sessions, gpsBySession, effectiveCycleDays, playerMap, filters]);
  const allCycleRows = useMemo(() => rowsForCycle({ sessions, gpsBySession, cycleDays: effectiveCycleDays, playerMap, filters, includeExcluded: true }), [sessions, gpsBySession, effectiveCycleDays, playerMap, filters]);
  const rankingRows = useMemo(() => rankingConfig.scope === "selected" && selectedDates.length ? rowsForCycle({ sessions, gpsBySession, cycleDays: baseCycleDays, playerMap, filters: { ...filters, selectedDates } }) : cycleRows, [rankingConfig.scope, selectedDates, sessions, gpsBySession, baseCycleDays, playerMap, filters, cycleRows]);
  const highlights = useMemo(() => buildHighlights(rankingRows, playerMap, rankingMetrics, { topCount: rankingConfig.topCount || 3, scope: rankingConfig.scope === "selected" ? "Días seleccionados" : "Microciclo completo" }), [rankingRows, playerMap, rankingMetrics, rankingConfig.topCount, rankingConfig.scope]);
  const comparison = useMemo(() => buildComparison({ sessions, gpsBySession, cycleDays: effectiveCycleDays, playerMap, filters, metrics: visibleMetrics }), [sessions, gpsBySession, effectiveCycleDays, playerMap, filters, visibleMetrics]);
  const isSavedMicrocycleView = (cycleMode === "historical" || cycleMode === "lastSaved") && selectedSummary;
  const shownDailySummaries = (isSavedMicrocycleView && selectedSummary?.snapshot?.dailySummaries) || (isSavedMicrocycleView && selectedSummary?.summary_snapshot?.daily) || dailySummaries;
  const shownHighlights = highlights;
  const shownComparison = (isSavedMicrocycleView && selectedSummary?.snapshot?.comparison) || comparison;
  const filterLabels = useMemo(() => getMicrocycleFilterLabels(filters, { players, sessions, metrics: MICRO_METRICS }), [filters, players, sessions]);
  const weekStart = shownDailySummaries[0]?.date || effectiveCycleDays[0]?.date;
  const weekEnd = shownDailySummaries[shownDailySummaries.length - 1]?.date || effectiveCycleDays[effectiveCycleDays.length - 1]?.date;
  const cycleDateSet = useMemo(() => new Set(baseCycleDays.map((day) => day.date).filter(Boolean)), [baseCycleDays]);
  const cycleCalendarEvents = useMemo(() => calendarEvents.filter((event) => cycleDateSet.has(event.date) && (!squadId || !event.squad_id || event.squad_id === squadId) && (!season || !event.season_id || event.season_id === season)), [calendarEvents, cycleDateSet, squadId, season]);
  const cycleMatchReports = useMemo(() => matchReports.filter((match) => cycleDateSet.has(match.date) && (!squadId || !match.squad_id || match.squad_id === squadId) && (!season || !match.season_id || match.season_id === season)), [matchReports, cycleDateSet, squadId, season]);
  const matchContext = useMemo(() => resolveMicrocycleMatch(baseCycleDays, cycleCalendarEvents, cycleMatchReports), [baseCycleDays, cycleCalendarEvents, cycleMatchReports]);

  const cycleTitle = selectedSummary?.nombre_microciclo || selectedSummary?.microcycle_name || `Microciclo ${selectedPlan?.microcycle_number || nextMicrocycleNumber}`;
  const selectedDays = useMemo(() => baseCycleDays.filter((day) => selectedDates.includes(day.date)), [baseCycleDays, selectedDates]);
  const selectedDay = useMemo(() => selectedDays[0] || baseCycleDays.find((day) => day.date === selectedDate) || baseCycleDays[0] || null, [baseCycleDays, selectedDate, selectedDays]);

  useEffect(() => {
    if (!baseCycleDays.length) return;
    const today = moment().format("YYYY-MM-DD");
    const todayInCycle = baseCycleDays.find((day) => day.date === today);
    const lastWithGps = [...baseCycleDays].reverse().find((day) => sessions.some((s) => s.date === day.date && (gpsBySession[s.id] || []).length > 0));
    const nextDate = todayInCycle?.date || lastWithGps?.date || baseCycleDays[0]?.date || "";
    if (!selectedDate || !baseCycleDays.some((day) => day.date === selectedDate)) setSelectedDate(nextDate);
    setSelectedDates((current) => {
      const valid = current.filter((date) => baseCycleDays.some((day) => day.date === date));
      if (valid.length && valid.length === current.length) return current;
      return valid.length ? valid : nextDate ? [nextDate] : [];
    });
  }, [baseCycleDays, sessions, gpsBySession, selectedDate]);

  async function saveMicrocycle(nextState, silent = false) {
    if (!squadId || !weekStart || !weekEnd) return;
    const existing = selectedSummary || summaries.find((s) => s.squad_id === squadId && s.fecha_inicio === weekStart && (!season || !s.season_id || s.season_id === season) && !["finalizado", "archivado", "cerrado", "congelado"].includes(s.estado));
    if (existing?.snapshot_locked && !silent) {
      const shouldUpdate = window.confirm("Este microciclo ya está finalizado. ¿Desea actualizar también el microciclo guardado?");
      if (!shouldUpdate) return;
    }
    if (!silent) {
      setSavingState(nextState);
      setSaveMessage("");
    }
    const now = new Date().toISOString();
    const gpsVariables = Object.fromEntries(MICRO_METRICS.map((metric) => [metric.key, { label: metric.label, value: aggregateRows(cycleRows, metric), mode: metric.mode, unit: metric.unit }]));
    const rankings = Object.fromEntries(highlights.map((item) => [item.metric.key, { label: item.metric.label, top: item.top.map((p) => ({ player_id: p.player?.id || p.player_id || "", name: p.name, value: p.value, rank: p.rank })), top_count: rankingConfig.topCount, scope: rankingConfig.scope }]));
    const sessionsInCycle = sessions.filter((s) => s.date >= weekStart && s.date <= weekEnd && (!squadId || !s.squad_id || s.squad_id === squadId));
    const sessionsWithGps = new Set(cycleRows.map((row) => row.session_id).filter(Boolean));
    const daysSnapshot = effectiveCycleDays.map((day) => ({ date: day.date, md: day.md || "—", objective: day.objetivo || day.physical_objective || day.objetivo_fisico || "—", sessions: sessionsInCycle.filter((s) => s.date === day.date).map((s) => s.id) }));
    const sessionsSnapshot = sessionsInCycle.map((s) => ({ id: s.id, title: s.title, date: s.date, session_type: s.session_type, duration_minutes: s.duration_minutes, session_objective: s.session_objective, objective: s.objective, match_day_code: s.match_day_code, microcycle_day: s.microcycle_day, squad_id: s.squad_id, squad_name: s.squad_name, season_id: s.season_id, csv_url: s.csv_url, pdf_exported: s.pdf_exported, notes: s.notes }));
    const payload = {
      squad_id: squadId,
      squad_name: squadName || "",
      season_id: season || "",
      microcycle_number: selectedSummary?.microcycle_number || existing?.microcycle_number || nextMicrocycleNumber,
      version_number: (selectedSummary?.version_number || existing?.version_number || 0) + (nextState === "finalizado" && !existing ? 1 : 0) || 1,
      microcycle_name: cycleTitle,
      nombre_microciclo: cycleTitle,
      fecha_inicio: weekStart,
      fecha_fin: weekEnd,
      rival: matchContext?.rival || selectedSummary?.rival || existing?.rival || "",
      rival_logo_url: matchContext?.rival_logo_url || selectedSummary?.rival_logo_url || existing?.rival_logo_url || "",
      partido_asociado: matchContext?.match_id || selectedSummary?.partido_asociado || selectedSummary?.rival || existing?.partido_asociado || existing?.rival || "",
      resultado: selectedSummary?.resultado || existing?.resultado || "",
      competencia: selectedSummary?.competencia || existing?.competencia || "",
      tags: selectedSummary?.tags || existing?.tags || [],
      cantidad_sesiones: sessionsWithGps.size || sessionsInCycle.length,
      cantidad_partidos: selectedSummary?.cantidad_partidos || existing?.cantidad_partidos || 0,
      estado: nextState,
      created_at: selectedSummary?.created_at || existing?.created_at || now,
      updated_at: now,
      archived_at: nextState === "finalizado" || nextState === "archivado" ? now : selectedSummary?.archived_at || existing?.archived_at || "",
      finalized_at: nextState === "finalizado" ? now : selectedSummary?.finalized_at || existing?.finalized_at || "",
      snapshot_locked: nextState === "finalizado" || nextState === "archivado",
      pdf_url: selectedSummary?.pdf_url || existing?.pdf_url || "",
      pdf_generated_at: selectedSummary?.pdf_generated_at || existing?.pdf_generated_at || "",
      exports_snapshot: { pdf_url: selectedSummary?.pdf_url || existing?.pdf_url || "", cronograma_url: "", resumen_url: "", informes_gps_url: "" },
      days_snapshot: daysSnapshot,
      sessions_snapshot: sessionsSnapshot,
      physical_objectives_snapshot: daysSnapshot.map((d) => ({ date: d.date, objective: d.objective })),
      md_codes_snapshot: daysSnapshot.map((d) => ({ date: d.date, md: d.md })),
      load_summary_snapshot: gpsVariables,
      ai_analysis_snapshot: selectedSummary?.ai_analysis_snapshot || existing?.ai_analysis_snapshot || {},
      reports_snapshot: { gps_rows_included: cycleRows.length, gps_rows_excluded: Math.max(0, allCycleRows.length - cycleRows.length), pdf_url: selectedSummary?.pdf_url || existing?.pdf_url || "" },
      summary_snapshot: { daily: dailySummaries, gps_rows_included: cycleRows.length, gps_rows_excluded: Math.max(0, allCycleRows.length - cycleRows.length) },
      charts_snapshot: { daily: dailySummaries, metrics: selectedChartMetrics, config: chartConfig },
      rankings_snapshot: rankings,
      ranking_config_snapshot: rankingConfig,
      match_snapshot: matchContext || {},
      gps_variables_snapshot: gpsVariables,
      promedios_snapshot: gpsVariables,
      highlighted_players_snapshot: { items: highlights },
      weekly_comparison_snapshot: { items: comparison },
      filters_snapshot: filters,
      snapshot: { days: daysSnapshot, sessions: sessionsSnapshot, dailySummaries, highlights, comparison, filters, metrics: visibleMetrics, chartMetrics: selectedChartMetrics, chartConfig, loadSummary: gpsVariables, rankingConfig, match: matchContext || {} },
    };
    if (existing) await base44.entities.MicrocycleSummary.update(existing.id, payload);
    else await base44.entities.MicrocycleSummary.create(payload);
    await loadSummaries();
    if (!silent) {
      setSavingState("");
      setSaveMessage(nextState === "finalizado" ? "Informe semanal cerrado y guardado como snapshot histórico." : "Informe semanal guardado.");
    }
  }

  async function updateMicrocycleSummary(id, data) {
    await base44.entities.MicrocycleSummary.update(id, { ...data, snapshot_locked: data.estado === "cerrado", updated_at: new Date().toISOString() });
    await loadSummaries();
    setSaveMessage("Microciclo actualizado.");
  }

  async function deleteMicrocycleSummary(id) {
    await base44.entities.MicrocycleSummary.delete(id);
    if (selectedSummaryId === id) {
      setSelectedSummaryId("");
      setCycleMode("current");
    }
    await loadSummaries();
    setSaveMessage("Microciclo eliminado.");
  }

  // La semana ahora se encuentra desde WeeklyPlan; el informe cerrado es opcional y no se guarda automáticamente.
  function toggleSelectedDate(date) {
    setSelectedDate(date);
    setSelectedDates((current) => current.includes(date) ? current.filter((item) => item !== date) : [...current, date].sort());
  }

  function selectWholeWeek() {
    const dates = baseCycleDays.map((day) => day.date).filter(Boolean);
    setSelectedDates(dates);
    if (dates[0]) setSelectedDate(dates[0]);
  }

  function clearSelectedDays() {
    setSelectedDates([]);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 shadow-[0_18px_48px_rgba(0,0,0,0.25)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <h2 className="text-xl font-black tracking-tight text-white">Carga del Microciclo</h2>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
            <GpsMicrocycleWeekNavigator weeklyPlans={weeklyPlans} selectedWeekStart={selectedPlan?.week_start || selectedWeekStart} onSelectWeek={(weekStart) => { setSelectedWeekStart(weekStart); setCycleMode("current"); setSelectedSummaryId(""); setSelectedDates([]); setFilters((current) => ({ ...current, selectedDates: [] })); }} sessions={sessions} gpsBySession={gpsBySession} />
            <GpsMicrocycleFiltersPanel filters={filters} onApply={setFilters} players={players} sessions={sessions} cycleDays={effectiveCycleDays} metrics={MICRO_METRICS} />
            <GpsMicrocyclePdfButton squadName={squadName} season={season} dailySummaries={shownDailySummaries} highlights={shownHighlights} comparison={shownComparison} cycleDays={effectiveCycleDays} selectedDates={selectedDates} visibleMetrics={selectedChartMetrics} chartMetrics={selectedChartMetrics} chartConfig={displayedChartConfig} rankingConfig={rankingConfig} matchContext={matchContext} cycleRows={rankingRows} />
          </div>
        </div>
        {saveMessage && <p className="mt-3 flex items-center gap-1 text-xs font-semibold text-emerald-300"><CheckCircle2 size={13} />{saveMessage}</p>}
      </div>

      {showHistory && <GpsMicrocycleHistoryPanel summaries={summaries} selectedSummaryId={selectedSummaryId} onSelect={(id) => { setSelectedSummaryId(id); setCycleMode("historical"); setShowHistory(false); }} onUpdate={updateMicrocycleSummary} onDelete={deleteMicrocycleSummary} onClose={() => setShowHistory(false)} />}

      <GpsMicrocycleDayHeader days={baseCycleDays} sessions={sessions} gpsBySession={gpsBySession} selectedDates={selectedDates} onToggleDate={toggleSelectedDate} onSelectAll={selectWholeWeek} onClear={clearSelectedDays} calendarEvents={cycleCalendarEvents} matchReports={cycleMatchReports} />
      <GpsDailyPlayerTable selectedDates={selectedDates} selectedDays={selectedDays} totalDays={baseCycleDays.length} sessions={sessions} gpsBySession={gpsBySession} playerMap={playerMap} microcycleProfiles={microcycleProfiles} competitionProfiles={competitionProfiles} squadId={squadId} season={season} selectedDay={selectedDay} />
      {selectedDates.length > 0 && <div className="flex justify-end"><button onClick={() => setFilters((current) => ({ ...current, selectedDates }))} className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white">Filtrar gráficos por días seleccionados</button></div>}

      <div ref={reportCaptureRef} className="space-y-5">
        {filterLabels.length > 0 && <div className="bg-zinc-900 border border-emerald-500/30 rounded-2xl p-4"><p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">Filtros aplicados</p><div className="flex flex-wrap gap-2">{filterLabels.map((label) => <span key={label} className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs font-semibold">{label}</span>)}</div></div>}
        <GpsMicrocycleCharts data={shownDailySummaries} metrics={MICRO_METRICS} config={displayedChartConfig} onConfigChange={setChartConfig} />
        <GpsMicrocycleHighlights highlights={shownHighlights} metrics={MICRO_METRICS} config={rankingConfig} onConfigChange={setRankingConfig} />
      </div>
    </div>
  );
}
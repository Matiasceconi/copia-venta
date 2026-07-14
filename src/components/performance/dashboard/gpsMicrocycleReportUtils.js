import moment from "moment";
import { isGoalkeeper, resolvePositionGroup } from "@/components/squad/squadConstants";

export const MICRO_METRICS = [
  { key: "total_distance", label: "Distancia total", short: "Dist. total", unit: "m", color: "#22c55e", mode: "avg", rankMode: "sum", group: "Volumen" },
  { key: "player_load", label: "Player Load", short: "PL", unit: "u", color: "#3b82f6", mode: "avg", rankMode: "sum", group: "Volumen" },
  { key: "duration_minutes", label: "Minutos", short: "Min.", unit: "min", color: "#84cc16", mode: "sum", rankMode: "sum", group: "Volumen" },
  { key: "sessions_count", label: "Sesiones", short: "Ses.", unit: "", color: "#10b981", mode: "sum", rankMode: "countSessions", group: "Volumen" },
  { key: "m_min", label: "m/min", short: "m/min", unit: "", color: "#60a5fa", mode: "avg", rankMode: "weightedDistanceDuration", group: "Intensidad" },
  { key: "distance_14_19_8", label: "D 14–19,8", short: "D 14–19,8", unit: "m", color: "#38bdf8", mode: "avg", rankMode: "sum", group: "Intensidad" },
  { key: "distance_19_8", label: "D 19,8–25", short: "D 19,8–25", unit: "m", color: "#f97316", mode: "avg", rankMode: "sum", group: "Intensidad" },
  { key: "distance_25", label: "D +25", short: "D +25", unit: "m", color: "#ef4444", mode: "avg", rankMode: "sum", group: "Intensidad" },
  { key: "sprints", label: "Sprints", short: "Sprints", unit: "", color: "#f59e0b", mode: "avg", rankMode: "sum", group: "Intensidad" },
  { key: "smax", label: "Vel. máxima", short: "Vel. máx.", unit: "km/h", color: "#eab308", mode: "max", rankMode: "max", group: "Intensidad" },
  { key: "max_vel_percent", label: "% Vel. máxima", short: "% Vel.", unit: "%", color: "#fde047", mode: "max", rankMode: "max", group: "Intensidad" },
  { key: "acc_3", label: "ACC +3", short: "ACC +3", unit: "", color: "#a855f7", mode: "avg", rankMode: "sum", group: "Neuromuscular" },
  { key: "dec_3", label: "DEC +3", short: "DEC +3", unit: "", color: "#14b8a6", mode: "avg", rankMode: "sum", group: "Neuromuscular" },
  { key: "hmld", label: "HMLD", short: "HMLD", unit: "m", color: "#fb7185", mode: "avg", rankMode: "sum", group: "Neuromuscular" },
  { key: "rhie_bouts", label: "RHIE", short: "RHIE", unit: "", color: "#c084fc", mode: "avg", rankMode: "sum", group: "Neuromuscular" },
  { key: "player_load_per_min", label: "Player Load/min", short: "PL/min", unit: "u/min", color: "#818cf8", mode: "avg", rankMode: "weightedPlayerLoadDuration", group: "Intensidad" },
];

export const HIGHLIGHT_METRICS = [
  { key: "total_distance", label: "Distancia acumulada", unit: "m", color: "#22c55e", mode: "sum" },
  { key: "m_min", label: "m/min", unit: "", color: "#60a5fa", mode: "avg" },
  { key: "distance_19_8", label: "D >19.8", unit: "m", color: "#f97316", mode: "sum" },
  { key: "distance_25", label: "D >25", unit: "m", color: "#ef4444", mode: "sum" },
  { key: "sprints", label: "Sprints", unit: "", color: "#f59e0b", mode: "sum" },
  { key: "acc_3", label: "ACC +3", unit: "", color: "#a855f7", mode: "sum" },
  { key: "dec_3", label: "DEC +3", unit: "", color: "#14b8a6", mode: "sum" },
  { key: "player_load", label: "Player Load", unit: "u", color: "#3b82f6", mode: "sum" },
  { key: "smax", label: "Vel. máxima", unit: "km/h", color: "#eab308", mode: "max" },
];

export function fmt(value, unit = "") {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const n = Number(value);
  const shown = unit === "km/h" || unit === "u/min" || unit === "%" || n < 100 ? n.toFixed(1) : Math.round(n).toLocaleString("es-AR");
  return `${shown} ${unit}`.trim();
}

export function aggregateMetric(rows, key, mode = "avg") {
  const metric = MICRO_METRICS.find((item) => item.key === key);
  if (key === "sessions_count") return new Set(rows.map((r) => r.session_id).filter(Boolean)).size || null;
  if (metric?.rankMode === "weightedDistanceDuration") {
    const totals = rows.reduce((acc, row) => { const duration = rowDuration(row); const distance = Number(row.total_distance || 0); return duration && distance ? { distance: acc.distance + distance, duration: acc.duration + duration } : acc; }, { distance: 0, duration: 0 });
    return totals.duration ? totals.distance / totals.duration : null;
  }
  if (metric?.rankMode === "weightedPlayerLoadDuration") {
    const totals = rows.reduce((acc, row) => { const duration = rowDuration(row); const load = Number(row.player_load || 0); return duration && load ? { load: acc.load + load, duration: acc.duration + duration } : acc; }, { load: 0, duration: 0 });
    return totals.duration ? totals.load / totals.duration : null;
  }
  const values = rows.map((r) => Number(r[key])).filter((v) => Number.isFinite(v));
  if (!values.length) return null;
  if (mode === "sum") return values.reduce((a, b) => a + b, 0);
  if (mode === "max") return Math.max(...values);
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function getCycleDays(cycleDays) {
  return cycleDays?.length ? cycleDays : Array.from({ length: 7 }, (_, i) => ({ date: moment().startOf("isoWeek").add(i, "days").format("YYYY-MM-DD"), md: "—", objetivo: "—" }));
}

function rowStatus(row) {
  const group = String(row.gps_group || row.exclusion_reason || "").toLowerCase();
  if (group.includes("kinesiologia")) return "kinesiologia";
  if (group.includes("diferenciado")) return "diferenciado";
  if (row.include_in_session_average === false || (row.gps_group && row.gps_group !== "principal")) return "excluidos";
  return "incluidos";
}

export function normalizeRows(rows, playerMap) {
  return rows.map((r) => {
    const player = playerMap[r.player_id];
    const duration = r.m_min && r.total_distance ? r.total_distance / r.m_min : 0;
    return {
      ...r,
      player,
      player_name: r.player_name || player?.full_name || "Jugador",
      position: player?.position || r.position || "",
      position_group: player?.position_group || resolvePositionGroup(player?.position) || "",
      player_type: isGoalkeeper(player) ? "arqueros" : "campo",
      row_status: rowStatus(r),
      duration_minutes: Number(r.duration_minutes || r.minutes || r.duration || duration || 0),
      distance_14_19_8: Number(r.distance_14_19_8 ?? r.distance_14_198 ?? r.distance_14_19 ?? r.dist_14_19_8 ?? 0),
      hmld: Number(r.hmld ?? r.hml_distance ?? r.high_metabolic_load_distance ?? 0),
      rhie_bouts: Number(r.rhie_bouts ?? r.rhie ?? 0),
      player_load_per_min: r.player_load_per_min || (duration ? r.player_load / duration : 0),
    };
  });
}

export function applyMicrocycleDayFilters(days, filters = {}) {
  const selectedWeekdays = filters.selectedWeekdays || [];
  const selectedDates = filters.selectedDates || [];
  return days.filter((day) => {
    if (filters.md && day.md !== filters.md) return false;
    if (filters.date && day.date !== filters.date) return false;
    if (filters.dateFrom && day.date < filters.dateFrom) return false;
    if (filters.dateTo && day.date > filters.dateTo) return false;
    if (selectedWeekdays.length && !selectedWeekdays.includes(String(moment(day.date).isoWeekday()))) return false;
    if (selectedDates.length && !selectedDates.includes(day.date)) return false;
    return true;
  });
}

export function applyMicrocycleFilters(rows, filters = {}) {
  const selectedWeekdays = filters.selectedWeekdays || [];
  const selectedDates = filters.selectedDates || [];
  return rows.filter((row) => {
    if (filters.playerId && row.player_id !== filters.playerId) return false;
    if (filters.position && row.position !== filters.position) return false;
    if (filters.positionGroup && row.position_group !== filters.positionGroup) return false;
    if (filters.playerType && row.player_type !== filters.playerType) return false;
    if (filters.status && row.row_status !== filters.status) return false;
    if (filters.md && row.md !== filters.md) return false;
    if (filters.objective && row.objective !== filters.objective) return false;
    if (filters.sessionType && row.session_type !== filters.sessionType) return false;
    if (filters.squadId && row.squad_id !== filters.squadId) return false;
    if (filters.rival && !String(row.rival || "").toLowerCase().includes(String(filters.rival).toLowerCase())) return false;
    if (filters.season && row.season_id !== filters.season) return false;
    if (filters.sessionId && row.session_id !== filters.sessionId) return false;
    if (filters.date && row.session_date !== filters.date) return false;
    if (filters.dateFrom && row.session_date < filters.dateFrom) return false;
    if (filters.dateTo && row.session_date > filters.dateTo) return false;
    if (selectedWeekdays.length && !selectedWeekdays.includes(String(moment(row.session_date).isoWeekday()))) return false;
    if (selectedDates.length && !selectedDates.includes(row.session_date)) return false;
    return true;
  });
}

export function splitRows(rows, playerMap, filters = {}) {
  const status = filters.status || "";
  const filtered = applyMicrocycleFilters(normalizeRows(rows, playerMap), { ...filters, status: "" });
  const main = filtered.filter((r) => r.row_status === "incluidos");
  const excluded = filtered.filter((r) => r.row_status !== "incluidos");
  if (status === "incluidos") return { main, excluded: [] };
  if (status) return { main: [], excluded: excluded.filter((r) => r.row_status === status) };
  return { main, excluded };
}

export function buildDailySummaries({ sessions, gpsBySession, cycleDays, playerMap, filters = {}, metrics = MICRO_METRICS }) {
  return applyMicrocycleDayFilters(getCycleDays(cycleDays), filters).map((day) => {
    const daySessions = sessions.filter((s) => {
      if (s.date !== day.date) return false;
      if (filters.sessionId && s.id !== filters.sessionId) return false;
      if (filters.sessionType && s.session_type !== filters.sessionType) return false;
      if (filters.squadId && s.squad_id !== filters.squadId) return false;
      if (filters.season && s.season_id !== filters.season) return false;
      const objective = s.session_objective || day.physical_objective || day.objetivo_fisico || day.objetivo || "—";
      const rival = s.rival || day.rival || "";
      if (filters.objective && objective !== filters.objective) return false;
      if (filters.rival && !String(rival).toLowerCase().includes(String(filters.rival).toLowerCase())) return false;
      return true;
    });
    const rawRows = daySessions.flatMap((s) => {
      const objective = s.session_objective || day.physical_objective || day.objetivo_fisico || day.objetivo || "—";
      const md = s.match_day_code || s.microcycle_day || day.md || "—";
      const rival = s.rival || day.rival || "";
      return (gpsBySession[s.id] || []).map((r) => ({ ...r, session_id: s.id, session_date: s.date, session_title: s.title, md, objective, rival, session_type: s.session_type || "", squad_id: s.squad_id || "", squad_name: s.squad_name || "", season_id: s.season_id || "" }));
    });
    const { main, excluded } = splitRows(rawRows, playerMap, filters);
    const metricValues = Object.fromEntries(metrics.map((m) => [m.key, aggregateMetric(main, m.key, m.mode)]));
    return { date: day.date, label: day.date ? moment(day.date).format("ddd DD/MM") : "—", md: day.md || "—", objetivo: day.objetivo || "—", observations: day.observaciones || "", sessions: daySessions, mainRows: main, excludedRows: excluded, gpsPlayers: new Set(main.map((r) => r.player_id)).size, excludedCount: new Set(excluded.map((r) => r.player_id)).size, ...metricValues };
  });
}

export function rowsForCycle({ sessions, gpsBySession, cycleDays, playerMap, filters = {}, includeExcluded = false }) {
  const days = applyMicrocycleDayFilters(getCycleDays(cycleDays), filters);
  const dayByDate = Object.fromEntries(days.map((d) => [d.date, d]));
  const rows = sessions
    .filter((s) => dayByDate[s.date] && (!filters.sessionId || s.id === filters.sessionId) && (!filters.sessionType || s.session_type === filters.sessionType) && (!filters.squadId || s.squad_id === filters.squadId) && (!filters.season || s.season_id === filters.season))
    .flatMap((s) => {
      const day = dayByDate[s.date] || {};
      const objective = s.session_objective || day.physical_objective || day.objetivo_fisico || day.objetivo || "—";
      const md = s.match_day_code || s.microcycle_day || day.md || "—";
      const rival = s.rival || day.rival || "";
      return (gpsBySession[s.id] || []).map((r) => ({ ...r, session_id: s.id, session_date: s.date, session_title: s.title, md, objective, rival, session_type: s.session_type || "", squad_id: s.squad_id || "", squad_name: s.squad_name || "", season_id: s.season_id || "" }));
    });
  const split = splitRows(rows, playerMap, filters);
  return includeExcluded ? [...split.main, ...split.excluded] : split.main;
}

function rowDuration(row) {
  const direct = Number(row.duration_minutes || row.minutes || row.duration || 0);
  if (direct) return direct;
  const distance = Number(row.total_distance || 0);
  const mMin = Number(row.m_min || 0);
  return distance && mMin ? distance / mMin : 0;
}

function rankingValue(summary, metric) {
  if (metric.rankMode === "max" || metric.mode === "max") return summary.max;
  if (metric.rankMode === "countSessions") return summary.sessions.size;
  if (metric.rankMode === "weightedDistanceDuration") return summary.duration > 0 ? summary.total_distance / summary.duration : null;
  if (metric.rankMode === "weightedPlayerLoadDuration") return summary.duration > 0 ? summary.player_load / summary.duration : null;
  return summary.sum;
}

export function buildHighlights(rows, playerMap, metrics = HIGHLIGHT_METRICS, options = {}) {
  const topCount = options.topCount || 3;
  return metrics.map((metric) => {
    const byPlayer = {};
    rows.forEach((row) => {
      if (!row.player_id) return;
      const value = Number(row[metric.key]);
      const duration = rowDuration(row);
      const player = row.player || playerMap[row.player_id];
      const current = byPlayer[row.player_id] || { player, player_id: row.player_id, name: row.player_name || player?.full_name || "Jugador", position: player?.position || row.position || "", sum: 0, max: null, duration: 0, total_distance: 0, player_load: 0, sessions: new Set() };
      if (metric.rankMode === "weightedDistanceDuration") {
        const distance = Number(row.total_distance || 0);
        if (distance > 0 && duration > 0) { current.total_distance += distance; current.duration += duration; }
      } else if (metric.rankMode === "weightedPlayerLoadDuration") {
        const load = Number(row.player_load || 0);
        if (load > 0 && duration > 0) { current.player_load += load; current.duration += duration; }
      } else if (metric.rankMode === "countSessions") {
        if (row.session_id) current.sessions.add(row.session_id);
      } else if (Number.isFinite(value) && value > 0) {
        if (metric.rankMode === "max" || metric.mode === "max") current.max = current.max == null ? value : Math.max(current.max, value);
        else current.sum += value;
      }
      byPlayer[row.player_id] = current;
    });
    const top = Object.values(byPlayer)
      .map((item) => ({ ...item, value: rankingValue(item, metric) }))
      .filter((item) => Number.isFinite(Number(item.value)) && Number(item.value) > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, topCount)
      .map((item, index) => ({ ...item, rank: index + 1, sessions: Array.from(item.sessions || []) }));
    return { metric, top, best: top[0] || null, topCount, scope: options.scope || "Microciclo completo" };
  });
}

export function buildComparison({ sessions, gpsBySession, cycleDays, playerMap, filters = {}, metrics = MICRO_METRICS }) {
  const days = applyMicrocycleDayFilters(getCycleDays(cycleDays), filters);
  const currentRows = rowsForCycle({ sessions, gpsBySession, cycleDays: days, playerMap, filters });
  const previousDays = days.map((d) => ({ ...d, date: moment(d.date).subtract(7, "days").format("YYYY-MM-DD") }));
  const previousRows = rowsForCycle({ sessions, gpsBySession, cycleDays: previousDays, playerMap, filters: { ...filters, sessionId: "", date: "", dateFrom: "", dateTo: "", selectedDates: [] } });
  return metrics.map((metric) => {
    const current = aggregateMetric(currentRows, metric.key, metric.mode);
    const previous = aggregateMetric(previousRows, metric.key, metric.mode);
    const diffAbs = current != null && previous != null ? current - previous : null;
    const diff = current != null && previous ? ((current - previous) / previous) * 100 : null;
    const trend = diff == null ? "Sin comparación" : diff > 8 ? "Sube" : diff < -8 ? "Baja" : "Estable";
    return { metric, current, previous, diffAbs, diff, trend, weeksAvailable: previousRows.length ? 1 : 0 };
  });
}

export function loadColorClass(value, average) {
  if (value == null) return "bg-zinc-700/40 text-zinc-400 border-zinc-700";
  if (!average) return "bg-blue-500/15 text-blue-300 border-blue-500/30";
  const pct = value / average;
  if (pct >= 1.18) return "bg-red-500/15 text-red-300 border-red-500/30";
  if (pct >= 1.05) return "bg-yellow-500/15 text-yellow-300 border-yellow-500/30";
  if (pct < 0.75) return "bg-blue-500/15 text-blue-300 border-blue-500/30";
  return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
}

function findPlanDay(session, weeklyPlans = []) {
  const plan = weeklyPlans.find((p) => (!session.squad_id || !p.squad_id || p.squad_id === session.squad_id) && (!session.season_id || !p.season_id || p.season_id === session.season_id) && (p.days_data || []).some((d) => d.date === session.date));
  const day = (plan?.days_data || []).find((d) => d.date === session.date) || {};
  const meta = plan?.microcycle_meta || {};
  return { plan, day, meta };
}

export function sessionMeta(session, weeklyPlans = []) {
  const { day, meta } = findPlanDay(session, weeklyPlans);
  return {
    md: session.match_day_code || session.microcycle_day || day.md || "—",
    objective: session.session_objective || day.physical_objective || day.objetivo_fisico || day.objetivo || "—",
    rival: session.rival || day.rival || meta.rival || meta.proximo_rival || meta.proximo_partido || "",
    season_id: session.season_id || "",
    squad_id: session.squad_id || "",
    squad_name: session.squad_name || "",
    session_type: session.session_type || "",
  };
}

export function buildSessionAverages({ sessions, gpsBySession, playerMap, weeklyPlans = [], filters = {}, metrics = MICRO_METRICS }) {
  return sessions.map((session) => {
    const meta = sessionMeta(session, weeklyPlans);
    const rawRows = (gpsBySession[session.id] || []).map((r) => ({ ...r, session_id: session.id, session_date: session.date, session_title: session.title, md: meta.md, objective: meta.objective, rival: meta.rival, season_id: meta.season_id, squad_id: meta.squad_id, squad_name: meta.squad_name, session_type: meta.session_type }));
    const { main } = splitRows(rawRows, playerMap, filters);
    const values = Object.fromEntries(metrics.map((m) => [m.key, aggregateMetric(main, m.key, m.mode)]));
    return { id: session.id, session, title: session.title || "Sesión", date: session.date, ...meta, rowCount: main.length, ...values };
  }).filter((s) => s.date && s.rowCount > 0).filter((s) => {
    if (filters.objective && s.objective !== filters.objective) return false;
    if (filters.sessionType && s.session_type !== filters.sessionType) return false;
    if (filters.squadId && s.squad_id !== filters.squadId) return false;
    if (filters.rival && !String(s.rival || "").toLowerCase().includes(String(filters.rival).toLowerCase())) return false;
    if (filters.season && s.season_id !== filters.season) return false;
    if (filters.md && s.md !== filters.md) return false;
    if (filters.date && s.date !== filters.date) return false;
    if (filters.dateFrom && s.date < filters.dateFrom) return false;
    if (filters.dateTo && s.date > filters.dateTo) return false;
    return true;
  }).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

export function compareGroups(groupA, groupB, metrics = MICRO_METRICS) {
  return metrics.map((metric) => {
    const a = aggregateMetric(groupA, metric.key, metric.mode);
    const b = aggregateMetric(groupB, metric.key, metric.mode);
    const diffAbs = b != null && a != null ? b - a : null;
    const diff = diffAbs != null && a ? (diffAbs / a) * 100 : null;
    const abs = Math.abs(diff || 0);
    const light = diff == null ? "Sin datos" : abs <= 5 ? "Verde" : abs <= 12 ? "Amarillo" : "Rojo";
    return { metric, a, b, diffAbs, diff, light };
  });
}

export function buildObjectiveBlocks(sessionAverages, objective, season) {
  const objectiveSessions = sessionAverages.filter((s) => s.objective === objective).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const current = objectiveSessions.slice(0, 1);
  const previous = objectiveSessions.slice(1);
  return {
    current,
    last4: previous.slice(0, 4),
    last8: previous.slice(0, 8),
    historical: previous,
    season: objectiveSessions.filter((s) => !season || s.season_id === season),
  };
}

export function buildMdBlocks(sessionAverages, md, season) {
  const mdSessions = sessionAverages.filter((s) => s.md === md).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const current = mdSessions.slice(0, 1);
  const previous = mdSessions.slice(1);
  return { current, last4: previous.slice(0, 4), last8: previous.slice(0, 8), historical: previous, season: mdSessions.filter((s) => !season || s.season_id === season) };
}
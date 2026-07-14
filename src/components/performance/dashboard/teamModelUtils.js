import moment from "moment";

export const MODEL_DAYS = ["MD-5", "MD-4", "MD-3", "MD-2", "MD-1", "MD", "MD+1", "MD+2"];

export const MODEL_METRICS = [
  { key: "total_distance", label: "Distancia total", unit: "m", color: "#22c55e" },
  { key: "m_min", label: "m/min", unit: "", color: "#38bdf8" },
  { key: "distance_19_8", label: "D >19.8", unit: "m", color: "#f59e0b" },
  { key: "distance_25", label: "D >25", unit: "m", color: "#ef4444" },
  { key: "sprints", label: "Sprints", unit: "", color: "#a855f7" },
  { key: "acc_3", label: "ACC +3", unit: "", color: "#14b8a6" },
  { key: "dec_3", label: "DEC +3", unit: "", color: "#fb7185" },
  { key: "player_load", label: "Player Load", unit: "u", color: "#60a5fa" },
  { key: "player_load_per_min", label: "PL/min", unit: "", color: "#84cc16" },
  { key: "smax", label: "Smax", unit: "km/h", color: "#f97316" },
  { key: "rhie_bouts", label: "RHIE", unit: "", color: "#c084fc" },
];

export const POSITION_FILTERS = [
  { id: "all", label: "Equipo completo", match: () => true },
  { id: "centrales", label: "Centrales", match: (p) => p === "Defensor Central" },
  { id: "laterales", label: "Laterales", match: (p) => p === "Lateral Derecho" || p === "Lateral Izquierdo" },
  { id: "volantes_centrales", label: "Volantes centrales", match: (p) => p === "Mediocampista Central" || p === "Volante Interno" },
  { id: "volantes_externos", label: "Volantes externos", match: (p) => p === "Extremo" },
  { id: "delanteros", label: "Delanteros", match: (p) => p === "Delantero Centro" },
  { id: "arqueros", label: "Arqueros", match: (p) => p === "Arquero" },
];

const EXCLUDED_GROUPS = new Set(["diferenciado", "kinesiologia", "reintegro", "individual"]);
const EXCLUDED_REASONS = new Set(["diferenciado", "kinesiologia", "reintegro", "carga_parcial", "lesion", "error_gps"]);

export function avg(rows, key) {
  const vals = rows.map((r) => Number(r[key])).filter((v) => Number.isFinite(v) && v > 0);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

export function fmt(value, unit = "") {
  if (!Number.isFinite(Number(value)) || Number(value) <= 0) return "—";
  const n = Number(value);
  const out = unit === "km/h" || n < 100 ? n.toFixed(1) : Math.round(n).toLocaleString("es-AR");
  return `${out}${unit ? ` ${unit}` : ""}`;
}

export function pctClass(pct) {
  if (!Number.isFinite(pct)) return "bg-zinc-800 text-zinc-500";
  if (pct > 100) return "bg-red-500/20 text-red-300 border-red-500/30";
  if (pct >= 85) return "bg-orange-500/20 text-orange-300 border-orange-500/30";
  if (pct >= 60) return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
  if (pct >= 30) return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
  return "bg-blue-500/20 text-blue-300 border-blue-500/30";
}

export function normalizeSessionRows({ sessions, gpsBySession, playerMap, positionFilter }) {
  const sessionMap = Object.fromEntries(sessions.map((s) => [s.id, s]));
  return Object.entries(gpsBySession).flatMap(([sessionId, rows]) => rows.map((r) => ({ ...r, session: sessionMap[sessionId] })))
    .filter((r) => r.session && r.include_in_session_average !== false && r.visible_in_report !== false)
    .filter((r) => !EXCLUDED_GROUPS.has(r.gps_group) && !EXCLUDED_REASONS.has(r.exclusion_reason))
    .filter((r) => positionFilter.match(playerMap[r.player_id]?.position || ""))
    .map((r) => ({ ...r, date: r.session.date, md: r.session.microcycle_day || r.session.match_day_code, player_load_per_min: r.player_load_per_min || (r.player_load && r.m_min ? r.player_load / Math.max(1, r.total_distance / r.m_min) : 0) }));
}

export function buildProfile(rows, sessionsKey = "session_id") {
  const profile = { sessions_count: new Set(rows.map((r) => r[sessionsKey]).filter(Boolean)).size };
  MODEL_METRICS.forEach((m) => { profile[m.key] = avg(rows, m.key); });
  return profile;
}

export function buildMicrocycle(rows) {
  return MODEL_DAYS.map((day) => ({ day, ...buildProfile(rows.filter((r) => r.md === day)) }));
}

export function normalizeMatchRows({ matches, minutes, catapultRows, playerMap, positionFilter }) {
  const officialIds = new Set(matches.filter((m) => m.status !== "archivado" && !(m.competition || "").toLowerCase().includes("amistoso")).map((m) => m.id));
  const eligible = new Set(minutes.filter((m) => officialIds.has(m.match_id) && Number(m.minutes) >= 80 && !m.hidden_from_reports).map((m) => `${m.match_id}:${m.player_id}`));
  return catapultRows.filter((r) => eligible.has(`${r.session_id}:${r.player_id}`) && positionFilter.match(playerMap[r.player_id]?.position || "")).map((r) => ({
    player_id: r.player_id, session_id: r.session_id, total_distance: r.total_distance, m_min: r.meters_per_minute,
    distance_19_8: r.distance_hsr, distance_25: r.sprint_distance, sprints: r.sprint_efforts,
    acc_3: r.accelerations, dec_3: r.decelerations, player_load: r.player_load,
    player_load_per_min: r.player_load && r.total_duration ? r.player_load / r.total_duration : 0,
    smax: r.max_velocity, rhie_bouts: r.rhie_bouts || 0,
  }));
}

export function buildEvolution(rows, metricKey) {
  const sorted = rows.filter((r) => r.date).sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const lastDate = sorted[sorted.length - 1]?.date;
  if (!lastDate) return { weekly: [], summary: [] };
  const end = moment(lastDate);
  const ranges = { actual: 7, w4: 28, w8: 56, season: 9999 };
  const byRange = Object.fromEntries(Object.entries(ranges).map(([k, days]) => [k, sorted.filter((r) => end.diff(moment(r.date), "days") < days)]));
  const weeklyMap = {};
  sorted.forEach((r) => { const w = moment(r.date).format("GGGG-[S]WW"); (weeklyMap[w] ||= []).push(r); });
  const weekly = Object.entries(weeklyMap).map(([week, rs]) => ({ week, value: Math.round(avg(rs, metricKey)) })).slice(-10);
  const summary = MODEL_METRICS.map((m) => {
    const current = avg(byRange.actual, m.key), w4 = avg(byRange.w4, m.key), w8 = avg(byRange.w8, m.key), season = avg(byRange.season, m.key);
    const historic = w4 || season;
    const diff = current - historic, pct = historic ? (diff / historic) * 100 : 0;
    return { metric: m.label, current, w4, w8, season, historic, diff, pct, trend: pct > 3 ? "Sube" : pct < -3 ? "Baja" : "Estable", unit: m.unit };
  });
  return { weekly, summary };
}
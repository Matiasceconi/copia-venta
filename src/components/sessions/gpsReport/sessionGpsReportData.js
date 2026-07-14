import { avg } from "@/components/performance/externalGpsLoadUtils";
import { isGoalkeeper } from "@/components/squad/squadConstants";

export const REPORT_METRICS = [
  { key: "total_distance", label: "Distancia Total", unit: "m", color: "#3b82f6" },
  { key: "m_min", label: "m/min", unit: "", color: "#22c55e" },
  { key: "distance_19_8", label: "D >19.8", unit: "m", color: "#10b981" },
  { key: "distance_25", label: "D >25", unit: "m", color: "#f97316" },
  { key: "sprints", label: "Sprints", unit: "", color: "#06b6d4" },
  { key: "acc_3", label: "ACC +3", unit: "", color: "#f59e0b" },
  { key: "dec_3", label: "DEC +3", unit: "", color: "#ec4899" },
  { key: "player_load", label: "Player Load", unit: "", color: "#a855f7" },
  { key: "smax", label: "Smax", unit: "km/h", color: "#ef4444" },
];

export function fmtMetricVal(key, v) {
  if (v == null || isNaN(v)) return "—";
  if (key === "smax") return Number(v).toFixed(1);
  return Math.round(v).toLocaleString("es-AR");
}

function surnameFromName(name = "") {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : (parts[0] || "—");
}

function firstInitial(name = "") {
  return (String(name || "").trim().split(/\s+/)[0] || "").charAt(0).toUpperCase();
}

export function withPlayerDisplayNames(rows = []) {
  const bases = rows.map((row) => surnameFromName(row.player_name || row.player_name_original));
  const counts = bases.reduce((acc, base) => ({ ...acc, [base]: (acc[base] || 0) + 1 }), {});
  return rows.map((row, index) => ({
    ...row,
    display_name: counts[bases[index]] > 1 ? `${bases[index]} ${firstInitial(row.player_name || row.player_name_original)}.` : bases[index],
  }));
}

const COMPETITION_KEY_MAP = {
  total_distance: "avg_total_distance",
  m_min: "avg_m_min",
  distance_19_8: "avg_distance_19_8",
  distance_25: "avg_distance_25",
  sprints: "avg_sprints",
  acc_3: "avg_acc_3",
  dec_3: "avg_dec_3",
  player_load: "avg_player_load",
  smax: "avg_smax",
};

const HIGHLIGHT_DEFS = [
  { key: "total_distance", label: "Mayor distancia" },
  { key: "m_min", label: "Mayor m/min" },
  { key: "player_load", label: "Mayor Player Load" },
  { key: "smax", label: "Mayor Smax" },
  { key: "distance_25", label: "Mayor distancia alta velocidad" },
  { key: "sprints", label: "Mayor cantidad de sprints" },
  { key: "acc_3", label: "Mayor ACC" },
  { key: "dec_3", label: "Mayor DEC" },
];

export function buildReportData({ session, sessionPlayers, gpsRows, players, weekGpsRows = [], competitionProfiles = [] }) {
  const playerMap = {};
  players.forEach((p) => { playerMap[p.id] = p; });

  const enrich = (rows) => rows
    .map((r) => ({ ...r, _player: playerMap[r.player_id] }))
    .filter((r) => !isGoalkeeper(r._player || { position: r.player_name_original }));

  const allRows = withPlayerDisplayNames(enrich(gpsRows));
  const principal = allRows.filter((r) => r.include_in_session_average !== false);
  const excluded = allRows.filter((r) => r.include_in_session_average === false);
  const weekPrincipal = enrich(weekGpsRows).filter((r) => r.include_in_session_average !== false);

  const teamAverages = {};
  const weekAverages = {};
  REPORT_METRICS.forEach((m) => {
    teamAverages[m.key] = avg(principal.map((r) => r[m.key]).filter((v) => v != null));
    weekAverages[m.key] = avg(weekPrincipal.map((r) => r[m.key]).filter((v) => v != null));
  });

  const presentRows = sessionPlayers.filter((sp) => sp.attendance === "presente");
  const diferenciados = sessionPlayers.filter((sp) => sp.attendance === "diferenciado" || sp.status_at_session === "diferenciado").length;
  const kinesiologia = sessionPlayers.filter((sp) => sp.attendance === "kinesiologia").length;
  const arqueros = presentRows.filter((sp) => isGoalkeeper({ position: sp.position })).length;

  const summary = {
    conGps: principal.length,
    excluidos: excluded.length,
    diferenciados,
    kinesiologia,
    arqueros,
    duracion: session.duration_minutes || null,
  };

  const highlights = HIGHLIGHT_DEFS.map((h) => {
    const sorted = [...principal].filter((r) => r[h.key] != null && r[h.key] > 0).sort((a, b) => (b[h.key] || 0) - (a[h.key] || 0));
    const top = sorted[0];
    if (!top) return null;
    return {
      key: h.key,
      label: h.label,
      player_name: top.display_name || top.player_name,
      photo_url: top._player?.photo_url,
      position: top._player?.position,
      value: fmtMetricVal(h.key, top[h.key]),
    };
  }).filter(Boolean);

  const profileByPlayer = {};
  competitionProfiles.forEach((cp) => { profileByPlayer[cp.player_id] = cp; });
  const comparison = principal.map((r) => {
    const cp = profileByPlayer[r.player_id];
    if (!cp) return null;
    const metrics = REPORT_METRICS.map((m) => {
      const sessionVal = r[m.key];
      const compVal = cp[COMPETITION_KEY_MAP[m.key]];
      const pct = (sessionVal != null && compVal) ? (sessionVal / compVal) * 100 : null;
      return { key: m.key, label: m.label, sessionVal, compVal, pct };
    });
    return { player_id: r.player_id, player_name: r.player_name, display_name: r.display_name, photo_url: r._player?.photo_url, position: r._player?.position, metrics };
  }).filter(Boolean);

  const alerts = [];
  presentRows.forEach((sp) => {
    if (isGoalkeeper({ position: sp.position })) return;
    const hasGps = allRows.some((r) => r.player_id === sp.player_id);
    if (!hasGps) alerts.push({ type: "sin_gps", text: `${surnameFromName(sp.player_name)}: presente sin registro GPS` });
  });
  principal.forEach((r) => {
    const missing = ["total_distance", "player_load"].some((k) => r[k] == null);
    if (missing) alerts.push({ type: "incompleto", text: `${r.display_name || r.player_name}: GPS incompleto` });
  });
  if (teamAverages.total_distance) {
    principal.forEach((r) => {
      if (r.total_distance > teamAverages.total_distance * 1.3) {
        alerts.push({ type: "carga_alta", text: `${r.display_name || r.player_name}: carga muy alta (${fmtMetricVal("total_distance", r.total_distance)} m)` });
      }
    });
  }
  const maxSmax = Math.max(0, ...principal.map((r) => r.smax || 0));
  if (maxSmax > 0) {
    principal.filter((r) => r.smax >= maxSmax - 0.3).forEach((r) =>
      alerts.push({ type: "smax", text: `${r.display_name || r.player_name}: velocidad máxima destacada (${fmtMetricVal("smax", r.smax)} km/h)` }));
  }
  const accDecAvg = avg(principal.map((r) => (r.acc_3 || 0) + (r.dec_3 || 0)));
  if (accDecAvg) {
    principal.filter((r) => ((r.acc_3 || 0) + (r.dec_3 || 0)) > accDecAvg * 1.4).forEach((r) =>
      alerts.push({ type: "accdec", text: `${r.display_name || r.player_name}: muchas ACC/DEC (ACC ${fmtMetricVal("acc_3", r.acc_3)} / DEC ${fmtMetricVal("dec_3", r.dec_3)})` }));
  }
  excluded.forEach((r) => alerts.push({ type: "excluido", text: `${r.display_name || r.player_name}: excluido del promedio` }));

  const insights = [];
  if (teamAverages.total_distance != null && weekAverages.total_distance) {
    const diffPct = ((teamAverages.total_distance - weekAverages.total_distance) / weekAverages.total_distance) * 100;
    if (Math.abs(diffPct) >= 5) {
      insights.push(`El volumen de distancia fue un ${Math.abs(Math.round(diffPct))}% ${diffPct > 0 ? "superior" : "inferior"} al promedio semanal.`);
    } else {
      insights.push("El volumen de distancia estuvo en línea con el promedio semanal.");
    }
  }
  const topLoad = highlights.find((h) => h.key === "player_load");
  if (topLoad) insights.push(`El jugador con mayor exigencia física fue ${topLoad.player_name} (Player Load ${topLoad.value}).`);
  const accdecAlerts = alerts.filter((a) => a.type === "accdec");
  if (accdecAlerts.length > 0) insights.push(`Se observaron valores elevados de ACC/DEC en ${accdecAlerts.length} jugador${accdecAlerts.length > 1 ? "es" : ""}.`);
  if (alerts.filter((a) => a.type === "carga_alta" || a.type === "accdec").length === 0) {
    insights.push("No se detectan anomalías importantes en la carga de la sesión.");
  }

  return { summary, teamAverages, weekAverages, highlights, comparison, alerts, insights, principal, excluded };
}
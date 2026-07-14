import moment from "moment";

export async function withRetry(fn, retries = 3, delay = 800) {
  try {
    return await fn();
  } catch (err) {
    if (retries > 0 && String(err?.message || err).includes("Rate limit")) {
      await new Promise((r) => setTimeout(r, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw err;
  }
}

export async function mapWithLimit(items, limit, fn) {
  const results = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export function avg(arr) {
  const v = arr.filter((x) => x != null && !isNaN(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

export function sum(arr) {
  const v = arr.filter((x) => x != null && !isNaN(x));
  return v.length ? v.reduce((a, b) => a + b, 0) : null;
}

export function fmtInt(v) {
  return v == null || isNaN(v) ? "—" : Math.round(v).toLocaleString("es-AR");
}

export function fmtSmax(v) {
  return v == null || isNaN(v) ? "—" : Number(v).toFixed(1);
}

// Determina si un jugador debe incluirse en los promedios grupales de GPS
// según su estado en la sesión (SessionPlayer.status_at_session / attendance).
export function classifyGpsInclusion(sp) {
  const status = sp?.status_at_session || "disponible";
  const attendance = sp?.attendance || "presente";
  if (attendance === "kinesiologia") return { include: false, group: "kinesiologia", reason: "kinesiologia" };
  if (attendance === "ausente" || status === "ausente") return { include: false, group: "otro", reason: "otro" };
  if (status === "diferenciado" || attendance === "diferenciado") return { include: false, group: "diferenciado", reason: "diferenciado" };
  if (status === "reintegro") return { include: false, group: "reintegro", reason: "reintegro" };
  if (status === "lesionado" || status === "molestia") return { include: false, group: "kinesiologia", reason: "kinesiologia" };
  if (status === "suspendido") return { include: false, group: "otro", reason: "otro" };
  if (attendance === "no_entrena") return { include: false, group: "otro", reason: "otro" };
  return { include: true, group: "principal", reason: undefined };
}

export const EXCLUSION_REASON_LABELS = {
  diferenciado: "Diferenciado",
  kinesiologia: "Kinesiología",
  reintegro: "Reintegro",
  lesion: "Lesión / Molestia",
  arquero: "Arquero",
  carga_parcial: "Carga parcial",
  error_gps: "Error GPS",
  otro: "Otro / Ausente",
};

// Genera alertas automáticas de la semana a partir de los agregados por jugador.
// Solo evalúa "sin GPS" / "carga baja" para jugadores que realmente tenían obligación
// de participar (según su estado en cada SessionPlayer de la semana): un jugador
// ausente, lesionado, en kinesiología, diferenciado, no convocado o excluido del
// promedio no genera alerta.
export function computeAlerts({ squadPlayers, playerAgg, sessions, gpsRows, sessionPlayers = [] }) {
  const alerts = [];
  const values = Object.values(playerAgg);
  const sessionIds = new Set(sessions.map((s) => s.id));

  // Sesiones válidas por jugador: aquellas donde su estado indica participación real
  const validSessionsByPlayer = {};
  sessionPlayers
    .filter((sp) => sessionIds.has(sp.session_id))
    .forEach((sp) => {
      if (!classifyGpsInclusion(sp).include) return;
      validSessionsByPlayer[sp.player_id] = (validSessionsByPlayer[sp.player_id] || 0) + 1;
    });

  const evaluated = squadPlayers.map((p) => {
    const validSessions = validSessionsByPlayer[p.id] || 0;
    const agg = playerAgg[p.id];
    const gpsSessions = agg?.sessions || 0;
    const avgPerSession = gpsSessions > 0 ? agg.total_distance / gpsSessions : null;
    return { player: p, validSessions, gpsSessions, avgPerSession };
  });

  const teamAvgPerSession = avg(evaluated.filter((e) => e.avgPerSession != null).map((e) => e.avgPerSession));

  evaluated.forEach((e) => {
    if (e.validSessions === 0) return; // no participó esta semana por un motivo válido: sin alerta
    if (e.gpsSessions === 0) {
      alerts.push({ type: "missing", text: `${e.player.full_name}: sin GPS (participó en ${e.validSessions} sesión${e.validSessions > 1 ? "es" : ""} sin registro GPS)` });
      return;
    }
    if (!teamAvgPerSession) return;
    if (e.avgPerSession > teamAvgPerSession * 1.3) {
      alerts.push({ type: "high", text: `${e.player.full_name}: carga muy alta (${fmtInt(e.avgPerSession)} m/sesión vs. prom. ${fmtInt(teamAvgPerSession)} m/sesión)` });
    } else if (e.avgPerSession < teamAvgPerSession * 0.7) {
      alerts.push({ type: "low", text: `${e.player.full_name}: carga baja (${fmtInt(e.avgPerSession)} m/sesión vs. prom. ${fmtInt(teamAvgPerSession)} m/sesión)` });
    }
  });

  const maxSmax = Math.max(0, ...values.map((v) => v.smax_max || 0));
  if (maxSmax > 0) {
    values.filter((v) => v.smax_max > 0 && v.smax_max >= maxSmax - 0.5)
      .forEach((v) => alerts.push({ type: "smax", text: `${v.player_name}: velocidad máxima destacada (${fmtSmax(v.smax_max)} km/h)` }));
  }

  const avgAccDec = avg(values.map((v) => (v.acc_3 || 0) + (v.dec_3 || 0)));
  if (avgAccDec) {
    values.filter((v) => ((v.acc_3 || 0) + (v.dec_3 || 0)) > avgAccDec * 1.4)
      .forEach((v) => alerts.push({ type: "accdec", text: `${v.player_name}: muchas aceleraciones/desaceleraciones (ACC ${fmtInt(v.acc_3)} / DEC ${fmtInt(v.dec_3)})` }));
  }

  sessions.filter((s) => !gpsRows.some((r) => r.session_id === s.id))
    .forEach((s) => alerts.push({ type: "pending", text: `GPS pendiente de cargar: "${s.title}" (${moment(s.date).format("DD/MM")})` }));

  return alerts;
}
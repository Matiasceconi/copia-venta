// Reglas únicas de validez para registros de MinutesRecord.
// Un registro de minutos solo es válido si depende de un partido real,
// activo (no archivado/eliminado), del plantel correspondiente, y con minutes > 0.

export function buildActiveMatchMap(matches) {
  const map = {};
  (matches || []).forEach((m) => {
    if (!["archivado", "cancelado"].includes(m.status)) map[m.id] = m;
  });
  return map;
}

export function getRecordMinutes(record) {
  return Number(record?.minutes_played ?? record?.minutes ?? 0);
}

export function isFinishedMatch(match) {
  if (!match?.date) return false;
  if (["archivado", "cancelado", "borrador"].includes(match.status)) return false;
  return String(match.date) <= new Date().toISOString().slice(0, 10);
}

export function getMatchDuration(match) {
  return Number(match?.total_duration_minutes || 0);
}

// options.squadId: si se pasa, exige que el partido pertenezca a ese plantel
// options.requirePositive: si es true (default), exige minutes_played/minutes > 0
export function getValidMinuteRecords(records, matches, options = {}) {
  const { squadId, requirePositive = true } = options;
  const activeMatches = (matches || []).filter((m) => !["archivado", "cancelado"].includes(m.status));
  const matchMap = buildActiveMatchMap(activeMatches);
  return (records || []).filter((r) => {
    const match = r.match_id
      ? matchMap[r.match_id]
      : activeMatches.find((m) => m.date === r.match_date && (!squadId || m.squad_id === squadId));
    if (!match) return false;
    if (squadId && match.squad_id !== squadId) return false;
    if (requirePositive && !(getRecordMinutes(r) > 0)) return false;
    return true;
  });
}
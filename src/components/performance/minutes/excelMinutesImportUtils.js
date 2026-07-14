import * as XLSX from "xlsx";
import { base44 } from "@/api/base44Client";

export const OFFICIAL_PAIRS = [
  [11, 12], [13, 14], [15, 16], [17, 18], [19, 20], [21, 22], [23, 24], [25, 26], [27, 28],
  [29, 30], [31, 32], [33, 34], [35, 36], [37, 38], [39, 40], [41, 42], [43, 44], [45, 46],
];

export function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function columnName(index) {
  let n = index + 1;
  let name = "";
  while (n > 0) {
    const mod = (n - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    n = Math.floor((n - mod) / 26);
  }
  return name;
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j += 1) dp[0][j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
    }
  }
  return dp[m][n];
}

function similarity(a, b) {
  const left = normalizeText(a);
  const right = normalizeText(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  const leftParts = left.split(" ").filter(Boolean);
  const rightParts = right.split(" ").filter(Boolean);
  const shared = leftParts.filter((part) => rightParts.includes(part) || rightParts.some((candidate) => levenshtein(part, candidate) <= 1)).length;
  const coverage = shared / Math.max(new Set(leftParts).size, new Set(rightParts).size, 1);
  const joined = 1 - levenshtein(left, right) / Math.max(left.length, right.length, 1);
  return Math.max(coverage, joined);
}

function getPlayerName(player) {
  return player?.full_name || [player?.first_name, player?.last_name].filter(Boolean).join(" ") || "";
}

function getPlayerNumber(player) {
  return Number(player?.jersey_number || player?.player_number || player?.number) || null;
}

function excelDate(value) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return "";
    return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }
  const text = String(value);
  const match = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : text.slice(0, 10);
}

function sheetValue(ws, row, col) {
  return ws[XLSX.utils.encode_cell({ r: row, c: col })]?.v ?? null;
}

function findRow(ws, label, fallback) {
  const ref = XLSX.utils.decode_range(ws["!ref"] || "A1:AZ80");
  const target = normalizeText(label);
  for (let r = ref.s.r; r <= Math.min(ref.e.r, 80); r += 1) {
    for (let c = ref.s.c; c <= Math.min(ref.e.c, 60); c += 1) {
      if (normalizeText(sheetValue(ws, r, c)).includes(target)) return r;
    }
  }
  return fallback;
}

function closestRole(normalized) {
  const valid = [
    { role: "titular", label: "titular" },
    { role: "suplente", label: "suplente" },
    { role: "not_called", label: "no citado" },
    { role: "not_called", label: "lesionado" },
    { role: "not_called", label: "diferenciado" },
    { role: "not_called", label: "enfermo" },
  ];
  const tokens = normalized.split(" ").filter(Boolean);
  const candidates = [normalized, ...tokens];
  let best = null;
  candidates.forEach((candidate) => {
    valid.forEach((item) => {
      const distance = levenshtein(candidate, item.label);
      if (!best || distance < best.distance) best = { ...item, distance, candidate };
    });
  });
  return best && best.distance <= 2 ? best : null;
}

function interpretRole(rawRole, minutes) {
  const normalized = normalizeText(rawRole);
  const value = Number(minutes || 0);
  if (!normalized && value > 0) return { role: "pending", reason: "Rol vacío con minutos" };
  if (normalized.includes("expuls")) return { role: "pending", reason: "Expulsado requiere revisión" };
  if (normalized.includes("titular")) return { role: "titular", role_normalized_from_typo: normalized !== "titular" };
  if (normalized.includes("suplente")) return { role: "suplente", role_normalized_from_typo: normalized !== "suplente" };
  if (["no citado", "nocitado", "lesion", "diferenciado", "enfermo", "primera"].some((key) => normalized.includes(key))) return { role: "not_called", role_normalized_from_typo: false };
  const closest = closestRole(normalized);
  if (closest) return { role: closest.role, role_normalized_from_typo: true, reason: `Normalizado desde ${rawRole}` };
  if (!normalized) return { role: "empty" };
  return { role: "pending", reason: "Estado no reconocido" };
}

function splitComment(rawRole) {
  const text = String(rawRole || "").trim();
  const plus = text.split("+").slice(1).join("+").trim();
  return plus || "";
}

function getMatchScore(match, round, competitionId, squadId, condition, excelDateValue) {
  let score = 0;
  if (Number(match.matchday_number) === Number(round)) score += 45;
  if (competitionId && match.competition_id === competitionId) score += 25;
  if (squadId && match.squad_id === squadId) score += 15;
  if (condition && normalizeText(match.location).includes(normalizeText(condition))) score += 8;
  if (excelDateValue && match.date === excelDateValue) score += 5;
  return score;
}

function buildPlayerCandidates(players, aliases, excelName) {
  const aliasByPlayer = aliases.reduce((acc, alias) => {
    acc[alias.player_id] = acc[alias.player_id] || [];
    acc[alias.player_id].push(alias.alias_name || alias.normalized_alias);
    return acc;
  }, {});
  const rawParts = normalizeText(excelName).split(" ").filter(Boolean);
  return players.map((player) => {
    const names = [getPlayerName(player), `${player.last_name || ""} ${player.first_name || ""}`, ...(aliasByPlayer[player.id] || [])];
    const score = Math.max(...names.map((name) => similarity(excelName, name)));
    const duplicateNameToken = rawParts.length !== new Set(rawParts).size;
    return { player, confidence: duplicateNameToken && score >= 0.9 ? 0.82 : Number(score.toFixed(2)) };
  }).filter((item) => item.confidence >= 0.45).sort((a, b) => b.confidence - a.confidence).slice(0, 6);
}

function pickTargetFilters(filters, squads, competitions) {
  const fallbackSquad = squads.find((squad) => normalizeText(squad.name).includes("reserva"));
  const fallbackCompetition = competitions.find((competition) => normalizeText(`${competition.name} ${competition.short_name || ""}`).includes("proyeccion apertura"));
  return {
    squadId: filters?.squadId && filters.squadId !== "all" ? filters.squadId : fallbackSquad?.id || "",
    seasonId: filters?.seasonId && filters.seasonId !== "all" ? filters.seasonId : fallbackSquad?.season || "2026",
    competitionId: filters?.competitionId && filters.competitionId !== "all" ? filters.competitionId : fallbackCompetition?.id || "",
  };
}

export async function loadImportContext() {
  const [matches, players, aliases, squads, competitions, minutes, callups] = await Promise.all([
    base44.entities.MatchReport.list("-date", 1000),
    base44.entities.Player.list("full_name", 1500),
    base44.entities.PlayerAlias.list("alias_name", 2000).catch(() => []),
    base44.entities.Squad.list("name", 200),
    base44.entities.Competitions.list("name", 500),
    base44.entities.MatchPlayerMinutes.list("-updated_date", 5000),
    base44.entities.MatchCallup.list("-updated_date", 5000),
  ]);
  return { matches, players, aliases, squads, competitions, minutes, callups };
}

export async function simulateExcelImport(file, context, filters) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  const ws = workbook.Sheets["MINUTOS JUGADOS"] || workbook.Sheets[workbook.SheetNames[0]];
  const target = pickTargetFilters(filters, context.squads, context.competitions);
  const durationRow = findRow(ws, "resultado", 2);
  const dateRow = findRow(ws, "dia", 3);
  const conditionRow = findRow(ws, "condicion", 1);
  const rivalRow = findRow(ws, "rival", 4);
  const playerHeaderRow = findRow(ws, "jugador", 6);
  const matchMappings = OFFICIAL_PAIRS.map(([roleCol, minutesCol], index) => {
    const round = index + 1;
    const duration = Number(sheetValue(ws, durationRow, roleCol) || 0);
    const condition = String(sheetValue(ws, conditionRow, roleCol) || "").trim();
    const date = excelDate(sheetValue(ws, dateRow, roleCol));
    const rivalText = String(sheetValue(ws, rivalRow, roleCol) || "").trim();
    const candidates = context.matches
      .filter((match) => !["archivado", "cancelado"].includes(match.status))
      .map((match) => ({ match, score: getMatchScore(match, round, target.competitionId, target.squadId, condition, date) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
    const best = candidates[0] || null;
    const safe = !!best && best.score >= 80;
    return { round, roleCol, minutesCol, roleColumn: columnName(roleCol), minutesColumn: columnName(minutesCol), duration, condition, date, rivalText, selectedMatchId: best?.match.id || "", status: safe ? "safe" : best ? "review" : "missing", candidates };
  });

  const records = [];
  const names = new Set();
  for (let row = playerHeaderRow + 1; row < playerHeaderRow + 45; row += 1) {
    const excelName = String(sheetValue(ws, row, 3) || "").trim();
    if (!excelName || normalizeText(excelName).includes("total")) continue;
    names.add(excelName);
    OFFICIAL_PAIRS.forEach(([roleCol, minutesCol], index) => {
      const rawRole = String(sheetValue(ws, row, roleCol) || "").trim();
      const rawMinutes = sheetValue(ws, row, minutesCol);
      const minutes = rawMinutes === null || rawMinutes === "" ? null : Number(rawMinutes || 0);
      const interpreted = interpretRole(rawRole, minutes);
      const comment = splitComment(rawRole);
      const combined = !!comment || normalizeText(rawRole).includes(" vs ") || normalizeText(rawRole).includes("amistoso");
      if (interpreted.role === "empty" && minutes == null) return;
      records.push({ row, round: index + 1, excelName, rawRole, minutes, role: interpreted.role, reason: interpreted.reason || "", role_normalized_from_typo: !!interpreted.role_normalized_from_typo, comment, combined });
    });
  }

  const playerMappings = Array.from(names).map((excelName) => {
    const candidates = buildPlayerCandidates(context.players, context.aliases, excelName);
    const best = candidates[0] || null;
    return { excelName, selectedPlayerId: best?.player.id || "", confidence: best?.confidence || 0, status: best?.confidence >= 0.86 ? "safe" : best ? "review" : "missing", candidates };
  });

  return { fileName: file.name, target, matchMappings, playerMappings, records, createdAt: new Date().toISOString() };
}

function currentByKey(rows) {
  return Object.fromEntries(rows.map((row) => [`${row.match_id}:${row.player_id}`, row]));
}

function chunk(records, size = 150) {
  const chunks = [];
  for (let i = 0; i < records.length; i += size) chunks.push(records.slice(i, i + size));
  return chunks;
}

export function buildImportPlan(simulation, context, policy, conflictActions = {}) {
  const matchById = Object.fromEntries(context.matches.map((match) => [match.id, match]));
  const playerById = Object.fromEntries(context.players.map((player) => [player.id, player]));
  const mappingByRound = Object.fromEntries(simulation.matchMappings.map((item) => [item.round, item]));
  const playerMappingByName = Object.fromEntries(simulation.playerMappings.map((item) => [item.excelName, item]));
  const existingMinutes = currentByKey(context.minutes);
  const existingCallups = currentByKey(context.callups);
  const conflicts = [];
  const callupUpserts = [];
  const minuteUpserts = [];
  const matchUpdates = [];
  const selectedByMatch = {};

  simulation.matchMappings.forEach((mapping) => {
    const match = matchById[mapping.selectedMatchId];
    if (!match) conflicts.push({ id: `match-${mapping.round}`, type: "partido", label: `Partido ${mapping.round}`, current: "Sin relación", excel: "Columna Excel", defaultAction: "skip" });
  });

  simulation.records.forEach((record, index) => {
    const mapping = mappingByRound[record.round];
    const match = matchById[mapping?.selectedMatchId];
    const playerId = playerMappingByName[record.excelName]?.selectedPlayerId;
    const player = playerById[playerId];
    const conflictId = `row-${index}`;
    if (!match || !player) {
      conflicts.push({ id: conflictId, type: "pendiente", label: `${record.excelName} · P${record.round}`, current: !match ? "Partido no relacionado" : "Jugador no relacionado", excel: record.rawRole || "—", defaultAction: "skip" });
      return;
    }
    if (record.role === "pending" || record.combined || (record.role === "titular" && Number(record.minutes || 0) === 0) || (record.role === "not_called" && Number(record.minutes || 0) > 0) || Number(record.minutes || 0) > Number(mapping.duration || 0)) {
      conflicts.push({ id: conflictId, type: "revisión", label: `${record.excelName} · ${match.rival}`, current: existingMinutes[`${match.id}:${player.id}`]?.minutes_played ?? "Sin registro", excel: `${record.rawRole || "—"} · ${record.minutes ?? "—"}'`, defaultAction: "skip" });
      if (conflictActions[conflictId] !== "excel") return;
    }
    if (record.role === "not_called") {
      const existingCallup = existingCallups[`${match.id}:${player.id}`];
      if (existingCallup) callupUpserts.push({ id: existingCallup.id, status: "desconvocado", callup_status: "desconvocado", import_observation: record.rawRole, source: "excel_import" });
      return;
    }
    if (!["titular", "suplente"].includes(record.role)) return;
    const minutes = Number(record.minutes || 0);
    const key = `${match.id}:${player.id}`;
    const existingMinute = existingMinutes[key];
    const existingCallup = existingCallups[key];
    const changed = existingMinute && (Number(existingMinute.minutes_played || 0) !== minutes || existingMinute.lineup_role !== record.role);
    if (changed) {
      const action = policy === "update" ? "excel" : policy === "empty" ? "skip" : conflictActions[`diff-${key}`] || "skip";
      conflicts.push({ id: `diff-${key}`, type: "diferencia", label: `${player.full_name} · ${match.rival}`, current: `${existingMinute.lineup_role || "—"} · ${existingMinute.minutes_played ?? "—"}'`, excel: `${record.role} · ${minutes}'`, defaultAction: action });
      if (action !== "excel") return;
    }
    if (policy === "empty" && existingMinute?.minutes_played != null && existingMinute.minutes_played !== "") return;
    const entered = record.role === "titular" || minutes > 0;
    const enteredMinute = record.role === "suplente" && minutes > 0 ? Math.max(0, Number(mapping.duration || 0) - minutes) : null;
    const exitMinute = record.role === "titular" && minutes > 0 && Number(mapping.duration || 0) > minutes ? minutes : null;
    callupUpserts.push({
      id: existingCallup?.id,
      match_id: match.id,
      player_id: player.id,
      squad_id: match.squad_id || "",
      club_id: match.club_id || "defensa-y-justicia",
      status: "convocado",
      callup_status: "convocado",
      callup_key: `${match.id}:${player.id}`,
      lineup_role: record.role,
      shirt_number: getPlayerNumber(player),
      player_name: getPlayerName(player),
      player_number: getPlayerNumber(player),
      player_position: player.position || "",
      source: "excel_import",
      source_file: simulation.fileName,
      import_observation: record.comment || record.rawRole,
      role_normalized_from_typo: !!record.role_normalized_from_typo,
    });
    minuteUpserts.push({
      id: existingMinute?.id,
      match_id: match.id,
      player_id: player.id,
      match_player_key: `${match.id}:${player.id}`,
      squad_id: match.squad_id || null,
      season_id: match.season_id || null,
      competition_id: match.competition_id || null,
      competition: match.competition || "",
      tournament: match.competition || "Torneo Proyección Apertura",
      match_date: match.date,
      match_label: `vs ${match.rival}`,
      rival: match.rival,
      player_name: getPlayerName(player),
      player_number: getPlayerNumber(player),
      lineup_role: record.role,
      started: record.role === "titular",
      entered,
      entered_minute: enteredMinute,
      entered_minute_label: enteredMinute == null ? "" : String(enteredMinute),
      exit_minute: exitMinute,
      exit_minute_label: exitMinute == null ? "" : String(exitMinute),
      match_duration_minutes: Number(mapping.duration || match.total_duration_minutes || 0),
      minutes_calculated: minutes,
      minutes_played: minutes,
      manual_override: false,
      source: "excel_import",
      source_file: simulation.fileName,
      entry_source: enteredMinute == null ? "excel" : "inferred_from_minutes",
      import_observation: record.comment || "",
      role_normalized_from_typo: !!record.role_normalized_from_typo,
    });
    selectedByMatch[match.id] = selectedByMatch[match.id] || [];
    selectedByMatch[match.id].push({ player, role: record.role });
  });

  simulation.matchMappings.forEach((mapping) => {
    const match = matchById[mapping.selectedMatchId];
    if (!match) return;
    const rows = minuteUpserts.filter((row) => row.match_id === match.id);
    const maxMinutes = rows.reduce((max, row) => Math.max(max, Number(row.minutes_played || 0)), 0);
    if (Number(mapping.duration || 0) > 0 && maxMinutes === Number(mapping.duration)) {
      matchUpdates.push({ id: match.id, total_duration_minutes: Number(mapping.duration), duration_source: "excel_import", duration_review_status: "Duración validada", duration_confirmed_at: new Date().toISOString() });
    } else {
      conflicts.push({ id: `duration-${match.id}`, type: "duración", label: `Partido ${mapping.round} · ${match.rival}`, current: `Actual ${match.total_duration_minutes || "—"}'`, excel: `Excel ${mapping.duration || "—"}' · Max ${maxMinutes}'`, defaultAction: "skip" });
    }
  });

  Object.entries(selectedByMatch).forEach(([matchId, rows]) => {
    const update = matchUpdates.find((item) => item.id === matchId) || { id: matchId };
    update.squad_called = rows.map((row) => row.player.id);
    update.squad_names = rows.map((row) => getPlayerName(row.player));
    if (!matchUpdates.find((item) => item.id === matchId)) matchUpdates.push(update);
  });

  return { conflicts, callupUpserts, minuteUpserts, matchUpdates };
}

export function buildSimulationSummary(simulation, plan) {
  return {
    partidosDetectados: simulation.matchMappings.length,
    partidosRelacionados: simulation.matchMappings.filter((item) => item.selectedMatchId).length,
    partidosPendientes: simulation.matchMappings.filter((item) => !item.selectedMatchId || item.status !== "safe").length,
    jugadoresReconocidos: simulation.playerMappings.filter((item) => item.selectedPlayerId).length,
    jugadoresPendientes: simulation.playerMappings.filter((item) => !item.selectedPlayerId || item.status !== "safe").length,
    registrosCrear: plan.minuteUpserts.filter((item) => !item.id).length,
    registrosActualizar: plan.minuteUpserts.filter((item) => item.id).length,
    conflictos: plan.conflicts.length,
  };
}

async function createBackup(importBatchId, context, affectedMatchIds) {
  const matchSet = new Set(affectedMatchIds);
  const items = [
    { entity: "MatchReport", rows: context.matches.filter((row) => matchSet.has(row.id)) },
    { entity: "MatchCallup", rows: context.callups.filter((row) => matchSet.has(row.match_id)) },
    { entity: "MatchPlayerMinutes", rows: context.minutes.filter((row) => matchSet.has(row.match_id)) },
  ];
  const backups = [];
  items.forEach((item) => {
    chunk(item.rows).forEach((rows, index) => backups.push({ backup_key: importBatchId, entity_name: item.entity, chunk_index: index, record_count: rows.length, snapshot: rows, created_at: new Date().toISOString(), notes: "excel_minutes_import" }));
  });
  if (backups.length) await base44.entities.RecoveryBackup.bulkCreate(backups);
}

export async function applyExcelImport(plan, context) {
  const importBatchId = `excel_minutes_import_${new Date().toISOString()}`;
  const affectedMatchIds = Array.from(new Set([...plan.matchUpdates.map((row) => row.id), ...plan.minuteUpserts.map((row) => row.match_id), ...plan.callupUpserts.map((row) => row.match_id)].filter(Boolean)));
  await createBackup(importBatchId, context, affectedMatchIds);
  const stamp = { import_batch_id: importBatchId, imported_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  const callupUpdates = plan.callupUpserts.filter((row) => row.id).map((row) => ({ ...row, ...stamp }));
  const callupCreates = plan.callupUpserts.filter((row) => !row.id).map((row) => ({ ...row, ...stamp, created_at: stamp.imported_at }));
  const minuteUpdates = plan.minuteUpserts.filter((row) => row.id).map((row) => ({ ...row, ...stamp }));
  const minuteCreates = plan.minuteUpserts.filter((row) => !row.id).map((row) => ({ ...row, ...stamp }));
  const matchUpdates = plan.matchUpdates.map((row) => ({ ...row, sync_source: "excel_import", sync_updated_at: stamp.imported_at }));
  if (callupUpdates.length) await base44.entities.MatchCallup.bulkUpdate(callupUpdates);
  if (callupCreates.length) await base44.entities.MatchCallup.bulkCreate(callupCreates);
  if (minuteUpdates.length) await base44.entities.MatchPlayerMinutes.bulkUpdate(minuteUpdates);
  if (minuteCreates.length) await base44.entities.MatchPlayerMinutes.bulkCreate(minuteCreates);
  if (matchUpdates.length) await base44.entities.MatchReport.bulkUpdate(matchUpdates);
  return { importBatchId, callupUpdates: callupUpdates.length, callupCreates: callupCreates.length, minuteUpdates: minuteUpdates.length, minuteCreates: minuteCreates.length, matchUpdates: matchUpdates.length };
}

export function downloadConflictsCsv(conflicts) {
  const header = ["Tipo", "Detalle", "Actual", "Excel"];
  const rows = conflicts.map((item) => [item.type, item.label, item.current, item.excel]);
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "conflictos-importacion-minutos.csv";
  link.click();
}

export async function undoLastExcelImport() {
  const backups = await base44.entities.RecoveryBackup.list("-created_date", 2000);
  const latest = backups.find((row) => row.notes === "excel_minutes_import");
  if (!latest) return { restored: false, message: "No hay importaciones para deshacer." };
  const importBatchId = latest.backup_key;
  const batchRows = backups.filter((row) => row.backup_key === importBatchId);
  const snapshots = batchRows.reduce((acc, backup) => {
    acc[backup.entity_name] = acc[backup.entity_name] || [];
    acc[backup.entity_name].push(...(backup.snapshot || []));
    return acc;
  }, {});
  const [currentCallups, currentMinutes] = await Promise.all([
    base44.entities.MatchCallup.filter({ import_batch_id: importBatchId }, "created_date", 2000).catch(() => []),
    base44.entities.MatchPlayerMinutes.filter({ import_batch_id: importBatchId }, "created_date", 2000).catch(() => []),
  ]);
  const callupSnapshotIds = new Set((snapshots.MatchCallup || []).map((row) => row.id));
  const minuteSnapshotIds = new Set((snapshots.MatchPlayerMinutes || []).map((row) => row.id));
  await Promise.all(currentCallups.filter((row) => !callupSnapshotIds.has(row.id)).map((row) => base44.entities.MatchCallup.delete(row.id)));
  await Promise.all(currentMinutes.filter((row) => !minuteSnapshotIds.has(row.id)).map((row) => base44.entities.MatchPlayerMinutes.delete(row.id)));
  if (snapshots.MatchReport?.length) await base44.entities.MatchReport.bulkUpdate(snapshots.MatchReport);
  if (snapshots.MatchCallup?.length) await base44.entities.MatchCallup.bulkUpdate(snapshots.MatchCallup.map((row) => ({ ...row, import_batch_id: row.import_batch_id || "", imported_at: row.imported_at || "" })));
  if (snapshots.MatchPlayerMinutes?.length) await base44.entities.MatchPlayerMinutes.bulkUpdate(snapshots.MatchPlayerMinutes.map((row) => ({ ...row, import_batch_id: row.import_batch_id || "", imported_at: row.imported_at || "" })));
  return { restored: true, importBatchId };
}
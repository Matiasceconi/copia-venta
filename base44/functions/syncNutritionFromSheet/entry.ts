import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import * as XLSX from 'npm:xlsx@0.18.5';

const SOURCE_FILE_ID = '1tiZoeF9KjPyvntjBreRSsUhRsh1huMjm';
const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const SHEETS_MIME = 'application/vnd.google-apps.spreadsheet';
const SUMATORIA_LOGICAL = 'Sumatoria de 6 pliegues';
const INFORME_LOGICAL = 'Informe 1 (Lectura)';
const SUMATORIA_ALIASES = ['Sumatoria de 6 pliegues', 'Datos conjuntos'];
const INFORME_ALIASES = ['Informe 1 (Lectura)', 'Informe de 1 lectura'];

function normalize(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim();
}
function tokenKey(s) { return normalize(s).split(/\s+/).filter(Boolean).sort().join(' '); }
function parseNumber(v) {
  if (v === null || v === undefined || v === '') return undefined;
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  const cleaned = String(v).replace('%', '').replace(/\s/g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}
function parseDate(v, fallbackYear = '') {
  if (!v) return undefined;
  if (v instanceof Date && !isNaN(v)) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const s = String(v).trim().replace(/[()]/g, '');
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) { let y = m[3]; if (y.length === 2) y = '20' + y; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
  m = s.match(/^(\d{1,2})[/-](\d{1,2})$/);
  if (m && fallbackYear) return `${fallbackYear}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return undefined;
}
function parsePeriod(rows) {
  const text = rows.slice(0, 5).flat().join(' ');
  const year = (text.match(/20\d{2}/) || [''])[0];
  const range = text.match(/(\d{1,2})[/-](\d{1,2})\s*-\s*(\d{1,2})[/-](\d{1,2})/);
  if (!range || !year) return { start: '', end: '' };
  return { start: `${year}-${range[2].padStart(2, '0')}-${range[1].padStart(2, '0')}`, end: `${year}-${range[4].padStart(2, '0')}-${range[3].padStart(2, '0')}` };
}
function pickIndex(headers, variants) {
  const normalized = headers.map(normalize);
  for (const variant of variants) {
    const wanted = normalize(variant);
    const idx = normalized.findIndex((h) => h === wanted || h.includes(wanted));
    if (idx >= 0) return idx;
  }
  return -1;
}
function rowHash(obj) { return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))).slice(0, 120); }
function findSheetName(sheetNames, aliases) {
  return sheetNames.find((name) => aliases.some((alias) => normalize(name) === normalize(alias))) || sheetNames.find((name) => aliases.some((alias) => normalize(name).includes(normalize(alias))));
}
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}
function rawObject(row) { return Object.fromEntries(row.map((value, idx) => [`c${idx + 1}`, value])); }

async function getWorkbook(base44, driveToken, meta) {
  if (meta.mimeType === EXCEL_MIME) {
    const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${SOURCE_FILE_ID}?alt=media`, { headers: { Authorization: `Bearer ${driveToken}` } });
    if (!fileRes.ok) throw new Error(await fileRes.text());
    const buf = await fileRes.arrayBuffer();
    return XLSX.read(new Uint8Array(buf), { type: 'array', cellDates: true });
  }
  if (meta.mimeType === SHEETS_MIME) {
    const sheets = await base44.asServiceRole.connectors.getConnection('googlesheets');
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SOURCE_FILE_ID}?fields=sheets.properties.title`, { headers: { Authorization: `Bearer ${sheets.accessToken}` } });
    if (!metaRes.ok) throw new Error(await metaRes.text());
    const titles = (await metaRes.json()).sheets.map((s) => s.properties.title);
    const names = [findSheetName(titles, SUMATORIA_ALIASES), findSheetName(titles, INFORME_ALIASES)].filter(Boolean);
    const workbook = { SheetNames: [], Sheets: {} };
    for (const title of names) {
      const range = encodeURIComponent(`'${title}'!A:Z`);
      const valuesRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SOURCE_FILE_ID}/values/${range}`, { headers: { Authorization: `Bearer ${sheets.accessToken}` } });
      if (!valuesRes.ok) throw new Error(await valuesRes.text());
      const values = (await valuesRes.json()).values || [];
      workbook.SheetNames.push(title);
      workbook.Sheets[title] = XLSX.utils.aoa_to_sheet(values);
    }
    return workbook;
  }
  throw new Error(`Formato no soportado: ${meta.mimeType}`);
}
async function updateSyncState(base44, meta, result = null) {
  const states = await base44.asServiceRole.entities.NutritionSyncState.filter({ source_file_id: SOURCE_FILE_ID }, '-created_date', 1);
  const payload = { source_file_id: SOURCE_FILE_ID, source_file_name: meta.name, source_mime_type: meta.mimeType, source_modified_time: meta.modifiedTime, last_synced_at: new Date().toISOString() };
  if (result) payload.last_sync_result = result;
  if (states[0]) await base44.asServiceRole.entities.NutritionSyncState.update(states[0].id, payload);
  else await base44.asServiceRole.entities.NutritionSyncState.create(payload);
}
function extractAssessments(workbook) {
  const sheetName = findSheetName(workbook.SheetNames, SUMATORIA_ALIASES);
  if (!sheetName) return { sheetName: '', rows: [] };
  const sheetRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: true, defval: '' });
  const headerRow = sheetRows.findIndex((row) => row.some((c) => normalize(c).includes('sumatoria')) && row.some((c) => normalize(c).includes('peso')));
  const headers = sheetRows[headerRow] || [];
  const idx = { name: pickIndex(headers, ['nombre']), fecha: pickIndex(headers, ['fecha']), edad: pickIndex(headers, ['edad']), talla: pickIndex(headers, ['talla']), peso: pickIndex(headers, ['peso']), sum6p: pickIndex(headers, ['sumatoria 6p', 'sumatoria']), imo: pickIndex(headers, ['imo']), pctMM: pickIndex(headers, ['% mm']), kgMM: pickIndex(headers, ['kg mm']), pctGrasa: pickIndex(headers, ['%mg', '% mg', '% grasa']), kgGrasa: pickIndex(headers, ['kg grasa']) };
  const rows = [];
  let currentName = '';
  for (let r = headerRow + 1; r < sheetRows.length; r++) {
    const row = sheetRows[r] || [];
    const rawName = String(idx.name >= 0 ? row[idx.name] : row[0] || '').trim();
    if (rawName && !normalize(rawName).includes('nombre') && !normalize(rawName).includes('promedio')) currentName = rawName;
    const fecha = parseDate(idx.fecha >= 0 ? row[idx.fecha] : '');
    if (!currentName || !fecha) continue;
    const hasMetric = [idx.peso, idx.sum6p, idx.imo, idx.pctMM, idx.kgMM, idx.pctGrasa, idx.kgGrasa].some((i) => i >= 0 && parseNumber(row[i]) !== undefined);
    if (!hasMetric) continue;
    rows.push({ sourceSheetName: sheetName, logicalSheetName: SUMATORIA_LOGICAL, rowNumber: r + 1, originalName: currentName, fecha, row, idx });
  }
  return { sheetName, rows };
}
function extractInterpretations(workbook) {
  const sheetName = findSheetName(workbook.SheetNames, INFORME_ALIASES);
  if (!sheetName) return { sheetName: '', rows: [] };
  const sheetRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: true, defval: '' });
  const period = parsePeriod(sheetRows);
  const headerRow = sheetRows.findIndex((row) => row.some((c) => normalize(c).includes('nombres')) && row.some((c) => normalize(c).includes('triceps')));
  const rows = [];
  for (let r = headerRow + 1; r < sheetRows.length; r++) {
    const row = sheetRows[r] || [];
    const originalName = String(row[1] || '').trim();
    if (!originalName || normalize(originalName).includes('promedio')) continue;
    const sum = parseNumber(row[11]);
    if (sum === undefined) continue;
    rows.push({ sourceSheetName: sheetName, logicalSheetName: INFORME_LOGICAL, rowNumber: r + 1, originalName, fecha: period.end, period, row });
  }
  return { sheetName, rows };
}
function buildPlayerResolver(players, aliases) {
  const playerById = {}, byDni = {}, byName = {}, byToken = {}, aliasToPlayer = {}, aliasTokenToPlayer = {}, candidateNames = [];
  players.forEach((p) => {
    const full = p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim();
    const normalizedFull = normalize(full);
    const tokenFull = tokenKey(full);
    playerById[p.id] = p;
    if (p.dni) byDni[String(p.dni).replace(/\D/g, '')] = p;
    if (p.document_number) byDni[String(p.document_number).replace(/\D/g, '')] = p;
    byName[normalizedFull] = p;
    if (p.normalized_name) byName[normalize(p.normalized_name)] = p;
    byToken[tokenFull] = p;
    candidateNames.push({ normalized: normalizedFull, token: tokenFull, player: p });
  });
  aliases.forEach((a) => {
    if (!a.player_id || !playerById[a.player_id]) return;
    const normalizedAlias = normalize(a.normalized_alias || a.alias_name);
    const tokenAlias = tokenKey(a.alias_name || a.normalized_alias || '');
    if (normalizedAlias) aliasToPlayer[normalizedAlias] = playerById[a.player_id];
    if (tokenAlias && !aliasTokenToPlayer[tokenAlias]) aliasTokenToPlayer[tokenAlias] = playerById[a.player_id];
  });
  return function resolve(originalName, explicitId = '', dni = '') {
    if (explicitId && playerById[explicitId]) return playerById[explicitId];
    if (dni && byDni[dni]) return byDni[dni];
    const normName = normalize(originalName);
    const tokenName = tokenKey(originalName);
    if (aliasToPlayer[normName]) return aliasToPlayer[normName];
    if (byName[normName]) return byName[normName];
    if (aliasTokenToPlayer[tokenName]) return aliasTokenToPlayer[tokenName];
    if (byToken[tokenName]) return byToken[tokenName];
    const fuzzy = candidateNames
      .map((entry) => ({ player: entry.player, score: Math.min(levenshtein(normName, entry.normalized), levenshtein(tokenName, entry.token)) }))
      .filter((entry) => entry.score <= 2)
      .sort((a, b) => a.score - b.score);
    if (fuzzy.length === 1) return fuzzy[0].player;
    if (fuzzy.length > 1 && fuzzy[0].score < fuzzy[1].score) return fuzzy[0].player;
    return null;
  };
}
async function upsertRecord(entity, payload, byKey, byRow, seenIds) {
  const key = payload.nutrition_assessment_key || payload.nutrition_interpretation_key;
  const existingMatch = byKey[key] || byRow[payload.source_sheet_row_id];
  if (existingMatch) {
    await entity.update(existingMatch.id, payload);
    byKey[key] = { ...existingMatch, ...payload };
    seenIds.add(existingMatch.id);
    return 'updated';
  }
  const created = await entity.create({ ...payload, created_at: new Date().toISOString() });
  byKey[key] = created;
  seenIds.add(created.id);
  return 'created';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const drive = await base44.asServiceRole.connectors.getConnection('googledrive');
    const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${SOURCE_FILE_ID}?fields=id,name,mimeType,modifiedTime,webViewLink`, { headers: { Authorization: `Bearer ${drive.accessToken}` } });
    if (!metaRes.ok) return Response.json({ error: await metaRes.text() }, { status: 500 });
    const meta = await metaRes.json();
    const workbook = await getWorkbook(base44, drive.accessToken, meta);
    const assessmentExtract = extractAssessments(workbook);
    const interpretationExtract = extractInterpretations(workbook);

    const [players, aliases, existingAssessments, existingInterpretations] = await Promise.all([
      base44.asServiceRole.entities.Player.list('-created_date', 5000),
      base44.asServiceRole.entities.PlayerAlias.list('-created_date', 5000),
      base44.asServiceRole.entities.NutritionAssessment.list('-fecha', 5000),
      base44.asServiceRole.entities.NutritionInterpretation.list('-fecha', 5000),
    ]);
    const resolvePlayer = buildPlayerResolver(players, aliases);
    const assessByKey = {}, assessByRow = {}, interpByKey = {}, interpByRow = {};
    existingAssessments.forEach((e) => { if (e.nutrition_assessment_key) assessByKey[e.nutrition_assessment_key] = e; if (e.source_sheet_row_id) assessByRow[e.source_sheet_row_id] = e; });
    existingInterpretations.forEach((e) => { if (e.nutrition_interpretation_key) interpByKey[e.nutrition_interpretation_key] = e; if (e.source_sheet_row_id) interpByRow[e.source_sheet_row_id] = e; });

    let assessmentsCreated = 0, assessmentsUpdated = 0, interpretationsCreated = 0, interpretationsUpdated = 0, unresolvedAssessments = 0, unresolvedInterpretations = 0, errors = 0;
    const unresolvedSamples = [];
    const seenAssessmentIds = new Set();
    const seenInterpretationIds = new Set();
    const now = new Date().toISOString();

    for (const item of assessmentExtract.rows) {
      try {
        const player = resolvePlayer(item.originalName);
        if (!player) { unresolvedAssessments++; if (unresolvedSamples.length < 10) unresolvedSamples.push({ sheet: SUMATORIA_LOGICAL, row: item.rowNumber, name: item.originalName }); continue; }
        const key = `${player.id}|${item.fecha}|sumatoria_de_6_pliegues`;
        const payload = {
          player_id: player.id, squad_id: player.squad_id || '', season_id: player.season_id || '', source_sheet_name: SUMATORIA_LOGICAL, source_sheet_row_id: `${SUMATORIA_LOGICAL}:${item.rowNumber}`, source_row_number: item.rowNumber,
          player_name_original: item.originalName, normalized_player_name: normalize(item.originalName), fecha: item.fecha, tipo_medicion: SUMATORIA_LOGICAL,
          edad: parseNumber(item.idx.edad >= 0 ? item.row[item.idx.edad] : ''), talla: parseNumber(item.idx.talla >= 0 ? item.row[item.idx.talla] : ''), peso: parseNumber(item.idx.peso >= 0 ? item.row[item.idx.peso] : ''),
          sumatoria_6p: parseNumber(item.idx.sum6p >= 0 ? item.row[item.idx.sum6p] : ''), imo: parseNumber(item.idx.imo >= 0 ? item.row[item.idx.imo] : ''), porcentaje_masa_muscular: parseNumber(item.idx.pctMM >= 0 ? item.row[item.idx.pctMM] : ''),
          kg_masa_muscular: parseNumber(item.idx.kgMM >= 0 ? item.row[item.idx.kgMM] : ''), porcentaje_grasa: parseNumber(item.idx.pctGrasa >= 0 ? item.row[item.idx.pctGrasa] : ''), kg_grasa: parseNumber(item.idx.kgGrasa >= 0 ? item.row[item.idx.kgGrasa] : ''),
          classification_note: String(item.row[14] || item.row[17] || '').trim(), nutrition_assessment_key: key, linked: true, source: 'google_drive', source_file_id: SOURCE_FILE_ID, source_file_mime_type: meta.mimeType,
          row_hash: rowHash(item.row), raw_values: rawObject(item.row), found_in_last_sync: true, last_synced_at: now, updated_at: now,
        };
        Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
        const status = await upsertRecord(base44.asServiceRole.entities.NutritionAssessment, payload, assessByKey, assessByRow, seenAssessmentIds);
        if (status === 'created') assessmentsCreated++; else assessmentsUpdated++;
      } catch (_e) { errors++; }
    }

    for (const item of interpretationExtract.rows) {
      try {
        const player = resolvePlayer(item.originalName);
        if (!player || !item.fecha) { unresolvedInterpretations++; if (unresolvedSamples.length < 10) unresolvedSamples.push({ sheet: INFORME_LOGICAL, row: item.rowNumber, name: item.originalName }); continue; }
        const assessmentKey = `${player.id}|${item.fecha}|sumatoria_de_6_pliegues`;
        const key = `${player.id}|${item.fecha}|informe_1_lectura`;
        const payload = {
          player_id: player.id, squad_id: player.squad_id || '', season_id: player.season_id || '', source_sheet_name: INFORME_LOGICAL, source_sheet_row_id: `${INFORME_LOGICAL}:${item.rowNumber}`, source_row_number: item.rowNumber,
          player_name_original: item.originalName, normalized_player_name: normalize(item.originalName), fecha: item.fecha, period_start: item.period.start, period_end: item.period.end, position_label: String(item.row[0] || '').trim(),
          peso: parseNumber(item.row[3]), limite_mm: parseNumber(item.row[4]), triceps: parseNumber(item.row[5]), subescapular: parseNumber(item.row[6]), supraespinal: parseNumber(item.row[7]), abdominal: parseNumber(item.row[8]), muslo: parseNumber(item.row[9]), pantorrilla: parseNumber(item.row[10]),
          sumatoria_6p: parseNumber(item.row[11]), second_cut_sumatoria_6p: parseNumber(item.row[12]), cut_difference: parseNumber(item.row[13]), interpretation_note: String(item.row[13] || '').trim(),
          nutrition_interpretation_key: key, nutrition_assessment_key: assessmentKey, nutrition_assessment_id: assessByKey[assessmentKey]?.id || '', linked: true, source_file_id: SOURCE_FILE_ID, source_file_mime_type: meta.mimeType, row_hash: rowHash(item.row), raw_values: rawObject(item.row), found_in_last_sync: true, last_synced_at: now, updated_at: now,
        };
        Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
        const status = await upsertRecord(base44.asServiceRole.entities.NutritionInterpretation, payload, interpByKey, interpByRow, seenInterpretationIds);
        if (status === 'created') interpretationsCreated++; else interpretationsUpdated++;
      } catch (_e) { errors++; }
    }

    let assessmentsMarkedMissing = 0, interpretationsMarkedMissing = 0;
    for (const rec of existingAssessments) {
      if (rec.source_file_id === SOURCE_FILE_ID && !seenAssessmentIds.has(rec.id) && rec.found_in_last_sync !== false) {
        await base44.asServiceRole.entities.NutritionAssessment.update(rec.id, { found_in_last_sync: false, updated_at: now });
        assessmentsMarkedMissing++;
      }
    }
    for (const rec of existingInterpretations) {
      if (rec.source_file_id === SOURCE_FILE_ID && !seenInterpretationIds.has(rec.id) && rec.found_in_last_sync !== false) {
        await base44.asServiceRole.entities.NutritionInterpretation.update(rec.id, { found_in_last_sync: false, updated_at: now });
        interpretationsMarkedMissing++;
      }
    }

    const result = {
      success: true, file_name: meta.name, file_type: meta.mimeType === EXCEL_MIME ? 'Excel (.xlsx)' : 'Google Sheets nativo', sheets_processed: [{ requested: SUMATORIA_LOGICAL, actual: assessmentExtract.sheetName, rows: assessmentExtract.rows.length }, { requested: INFORME_LOGICAL, actual: interpretationExtract.sheetName, rows: interpretationExtract.rows.length }],
      rows_read: assessmentExtract.rows.length + interpretationExtract.rows.length, assessments_created: assessmentsCreated, assessments_updated: assessmentsUpdated, interpretations_created: interpretationsCreated, interpretations_updated: interpretationsUpdated,
      linked_rows: assessmentsCreated + assessmentsUpdated + interpretationsCreated + interpretationsUpdated, unresolved_assessments: unresolvedAssessments, unresolved_interpretations: unresolvedInterpretations, unresolved_samples: unresolvedSamples,
      not_found_marked: assessmentsMarkedMissing + interpretationsMarkedMissing, errors,
    };
    await updateSyncState(base44, meta, result);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
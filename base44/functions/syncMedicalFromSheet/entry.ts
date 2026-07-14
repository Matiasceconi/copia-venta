import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SPREADSHEET_ID = '1rcl45gx1ngyitLCwB37CHSfhHvEVlhZHXA6U0lb1eUw';

function normalize(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function tokenKey(s) {
  return normalize(s).split(/\s+/).filter(Boolean).sort().join(' ');
}

function parseDate(str) {
  if (!str) return undefined;
  const s = String(str).trim();
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (!m) return undefined;
  let [, d, mo, y] = m;
  if (y.length === 2) y = '20' + y;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function parseDays(str) {
  if (!str) return undefined;
  const n = parseInt(String(str).replace(/[^0-9-]/g, ''), 10);
  return isNaN(n) ? undefined : n;
}

function classifyEpisode(lesionConsulta, etapaRhb, fechaFinal) {
  const text = normalize(lesionConsulta);
  const etapa = normalize(etapaRhb);
  const altaKeywords = ['alta', 'retorno con el grupo', 'disponible', 'finalizado'];
  if (fechaFinal || altaKeywords.some((k) => etapa.includes(k))) return 'alta';
  if (text.includes('kinesiolog') || etapa.includes('kinesiolog')) return 'kinesiologia';
  const consultaKeywords = ['consulta', 'control', 'sobrecarga leve', 'sintomatico'];
  if (consultaKeywords.some((k) => text.includes(k))) return 'consulta';
  const seguimientoKeywords = ['seguimiento', 'reintegro'];
  if (seguimientoKeywords.some((k) => text.includes(k) || etapa.includes(k))) return 'en_recuperacion';
  return 'lesionado';
}

const STATUS_PRIORITY = ['lesionado', 'en_recuperacion', 'kinesiologia', 'consulta'];
const PLAYER_STATUS_MAP = { lesionado: 'Lesionado', en_recuperacion: 'En recuperación', alta: 'Disponible' };

async function recalculateCurrentStatus(base44) {
  const episodes = await base44.asServiceRole.entities.MedicalEpisode.filter({ linked: true }, '-fecha_inicio_tto', 5000);

  const byPlayer = {};
  episodes.forEach((e) => {
    if (!e.player_id) return;
    if (!byPlayer[e.player_id]) byPlayer[e.player_id] = [];
    byPlayer[e.player_id].push(e);
  });

  const existingStatuses = await base44.asServiceRole.entities.MedicalCurrentStatus.list('-updated_at', 3000);
  const statusByPlayer = {};
  existingStatuses.forEach((s) => { statusByPlayer[s.player_id] = s; });

  let lesionadosCount = 0;
  let seguimientoCount = 0;

  for (const [playerId, eps] of Object.entries(byPlayer)) {
    const sorted = [...eps].sort((a, b) => (b.fecha_inicio_tto || '').localeCompare(a.fecha_inicio_tto || ''));
    const active = sorted.filter((e) => !e.fecha_final_tto && e.medical_status !== 'alta');

    let currentStatus = 'alta';
    let activeEpisode = null;
    for (const key of STATUS_PRIORITY) {
      const found = active.find((e) => e.medical_status === key);
      if (found) {
        currentStatus = key === 'consulta' ? 'seguimiento' : key;
        activeEpisode = found;
        break;
      }
    }
    if (!activeEpisode && active.length > 0) { currentStatus = 'seguimiento'; activeEpisode = active[0]; }
    if (!activeEpisode) { currentStatus = 'alta'; activeEpisode = sorted[0] || null; }

    if (currentStatus === 'lesionado') lesionadosCount++;
    if (currentStatus === 'en_recuperacion' || currentStatus === 'seguimiento') seguimientoCount++;

    const payload = {
      player_id: playerId,
      current_status: currentStatus,
      active_episode_id: activeEpisode ? activeEpisode.id : '',
      updated_at: new Date().toISOString(),
    };

    const existing = statusByPlayer[playerId];
    if (existing) {
      await base44.asServiceRole.entities.MedicalCurrentStatus.update(existing.id, payload);
    } else {
      await base44.asServiceRole.entities.MedicalCurrentStatus.create(payload);
    }

    const playerStatusUpdate = PLAYER_STATUS_MAP[currentStatus];
    if (playerStatusUpdate) {
      await base44.asServiceRole.entities.Player.update(playerId, { status: playerStatusUpdate });
    }
  }

  return { lesionados_actuales: lesionadosCount, en_seguimiento: seguimientoCount };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');
    const range = 'A:J';
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}`;
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!resp.ok) {
      const errText = await resp.text();
      return Response.json({ error: `Google Sheets error: ${errText}` }, { status: 500 });
    }
    const sheetData = await resp.json();
    const rows = sheetData.values || [];
    if (rows.length < 2) {
      return Response.json({ success: true, rows_read: 0, created: 0, updated: 0, linked: 0, unlinked: 0 });
    }
    // Fila 1 = título ("RESERVA 2026"), fila 2 = encabezados reales, fila 3+ = datos
    const dataRows = rows.slice(2);

    const [players, aliases, existingEpisodes] = await Promise.all([
      base44.asServiceRole.entities.Player.list('-created_date', 2000),
      base44.asServiceRole.entities.PlayerAlias.list('-created_date', 3000),
      base44.asServiceRole.entities.MedicalEpisode.filter({}, '-created_date', 3000),
    ]);

    const byNormalizedName = {};
    const byTokenKey = {};
    players.forEach((p) => {
      byNormalizedName[normalize(p.full_name)] = p;
      byTokenKey[tokenKey(p.full_name)] = p;
    });
    const byAlias = {};
    aliases.forEach((a) => { if (a.normalized_alias) byAlias[a.normalized_alias] = a.player_id; });
    const playerById = {};
    players.forEach((p) => { playerById[p.id] = p; });

    const episodeByKey = {};
    existingEpisodes.forEach((e) => { if (e.medical_episode_key) episodeByKey[e.medical_episode_key] = e; });

    let created = 0;
    let updated = 0;
    let linked = 0;
    let unlinked = 0;

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const playerNameOriginal = (row[0] || '').trim();
      const lesionConsulta = row[2] || '';
      if (!playerNameOriginal || !lesionConsulta) continue;

      const normName = normalize(playerNameOriginal);
      let playerId = byAlias[normName] || '';
      if (!playerId && byNormalizedName[normName]) playerId = byNormalizedName[normName].id;
      if (!playerId && byTokenKey[tokenKey(playerNameOriginal)]) playerId = byTokenKey[tokenKey(playerNameOriginal)].id;
      const isLinked = !!(playerId && playerById[playerId]);
      if (isLinked) linked++; else unlinked++;

      const fechaInicio = parseDate(row[4]);
      const fechaFinal = parseDate(row[5]);
      const mmiiAfectado = row[3] || '';
      const etapaRhb = row[7] || '';
      const medicalStatus = classifyEpisode(lesionConsulta, etapaRhb, fechaFinal);

      const keyPart = isLinked ? playerId : normName;
      const episodeKey = `${keyPart}|${fechaInicio || ''}|${normalize(lesionConsulta)}|${normalize(mmiiAfectado)}`;

      const payload = {
        player_id: isLinked ? playerId : '',
        player_name_original: playerNameOriginal,
        categoria_division: row[1] || '',
        lesion_consulta: lesionConsulta,
        mmii_afectado: mmiiAfectado,
        fecha_inicio_tto: fechaInicio,
        fecha_final_tto: fechaFinal,
        perdida_dias: parseDays(row[6]),
        etapa_rhb: etapaRhb,
        observaciones: row[8] || '',
        medical_status: medicalStatus,
        medical_episode_key: episodeKey,
        linked: isLinked,
        source_sheet_row_id: String(i + 2),
        source: 'google_sheets',
        last_synced_at: new Date().toISOString(),
      };
      Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

      const existing = episodeByKey[episodeKey];
      if (existing) {
        await base44.asServiceRole.entities.MedicalEpisode.update(existing.id, payload);
        updated++;
      } else {
        const createdEp = await base44.asServiceRole.entities.MedicalEpisode.create(payload);
        episodeByKey[episodeKey] = createdEp;
        created++;
      }
    }

    const statusSummary = await recalculateCurrentStatus(base44);

    return Response.json({
      success: true,
      rows_read: dataRows.length,
      created,
      updated,
      linked,
      unlinked,
      ...statusSummary,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const MICRO_DAYS = ['MD-4', 'MD-3', 'MD-2', 'MD-1', 'MD', 'MD+1', 'MD+2'];
const EXCLUDED_GROUPS = new Set(['diferenciado', 'kinesiologia', 'reintegro', 'individual']);
const EXCLUDED_REASONS = new Set(['diferenciado', 'kinesiologia', 'reintegro', 'carga_parcial', 'lesion', 'error_gps']);
const BAD_ATTENDANCE = new Set(['ausente', 'diferenciado', 'kinesiologia', 'no_entrena']);
const BAD_STATUS = new Set(['diferenciado', 'lesionado', 'ausente', 'reintegro']);

function avgOf(rows, key) {
  const vals = rows.map((r) => Number(r[key])).filter((v) => Number.isFinite(v) && v > 0);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

async function upsert(base44, entityName, query, data) {
  const existing = await base44.asServiceRole.entities[entityName].filter(query, '-created_date', 1);
  if (existing.length > 0) {
    await base44.asServiceRole.entities[entityName].update(existing[0].id, data);
  } else {
    await base44.asServiceRole.entities[entityName].create({ ...query, ...data });
  }
}

function seasonMatches(record, seasonId) {
  if (!seasonId) return true;
  if (!record) return false;
  if (!record.season_id) return true;
  return record.season_id === seasonId;
}

function isNormalGpsRow(row, sessionPlayer) {
  if (!row.session_id || row.include_in_session_average === false || row.visible_in_report === false) return false;
  if (row.gps_group && EXCLUDED_GROUPS.has(row.gps_group)) return false;
  if (row.exclusion_reason && EXCLUDED_REASONS.has(row.exclusion_reason)) return false;
  if (sessionPlayer) {
    if (BAD_ATTENDANCE.has(sessionPlayer.attendance)) return false;
    if (BAD_STATUS.has(sessionPlayer.status_at_session)) return false;
  }
  return true;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const squadId = body.squad_id || body.active_squad_id || '';
    const seasonId = body.season_id || body.active_season_id || '';
    if (!squadId) return Response.json({ error: 'Falta el plantel activo' }, { status: 400 });

    const [sessions, matches, minutes, matchGpsRows, sessionGpsRows, sessionPlayers, memberships] = await Promise.all([
      base44.asServiceRole.entities.TrainingSession.list('-date', 5000),
      base44.asServiceRole.entities.MatchReport.list('-date', 2000),
      base44.asServiceRole.entities.MinutesRecord.list('-match_date', 10000),
      base44.asServiceRole.entities.CatapultReport.list('-date', 10000),
      base44.asServiceRole.entities.SessionGPSData.list('-created_date', 10000),
      base44.asServiceRole.entities.SessionPlayer.list('-created_date', 10000),
      base44.asServiceRole.entities.SquadMembership.filter({ squad_id: squadId }, '-created_date', 1000),
    ]);

    const activePlayerIds = new Set(memberships.filter((m) => m.status !== 'fuera_del_plantel' && m.status !== 'inactivo' && !m.effective_to).map((m) => m.player_id).filter(Boolean));
    const sessionMap = {};
    sessions.filter((s) => s.squad_id === squadId && seasonMatches(s, seasonId)).forEach((s) => { sessionMap[s.id] = s; });
    const validMatchMap = {};
    matches.filter((m) => m.squad_id === squadId && m.status !== 'archivado' && seasonMatches(m, seasonId)).forEach((m) => { validMatchMap[m.id] = m; });

    const playerIds = new Set(activePlayerIds);
    minutes.forEach((m) => { if (m.squad_id === squadId && m.player_id) playerIds.add(m.player_id); });
    sessionGpsRows.forEach((r) => { if (r.player_id && sessionMap[r.session_id]) playerIds.add(r.player_id); });

    const sessionPlayerMap = {};
    sessionPlayers.forEach((sp) => { sessionPlayerMap[`${sp.session_id}:${sp.player_id}`] = sp; });

    const scopeQuery = seasonId ? { squad_id: squadId, season_id: seasonId } : { squad_id: squadId };
    await base44.asServiceRole.entities.PlayerCompetitionProfile.deleteMany(scopeQuery);
    await base44.asServiceRole.entities.PlayerMicrocycleGPSProfile.deleteMany(scopeQuery);

    let competitionProfilesUpdated = 0;
    let microcycleProfilesUpdated = 0;

    for (const playerId of playerIds) {
      const eligibleMatchIds = new Set(minutes
        .filter((m) => m.player_id === playerId && Number(m.minutes) >= 80 && !m.hidden_from_reports && validMatchMap[m.match_id])
        .map((m) => m.match_id));

      const competitionRows = matchGpsRows.filter((r) => r.player_id === playerId && eligibleMatchIds.has(r.session_id));
      if (competitionRows.length) {
        await upsert(base44, 'PlayerCompetitionProfile', { player_id: playerId, squad_id: squadId, season_id: seasonId }, {
          matches_used: eligibleMatchIds.size,
          avg_total_distance: avgOf(competitionRows, 'total_distance'),
          avg_m_min: avgOf(competitionRows, 'meters_per_minute'),
          avg_distance_14_19_8: avgOf(competitionRows, 'distance_14_19_8'),
          avg_distance_19_8: avgOf(competitionRows, 'distance_hsr'),
          avg_distance_25: avgOf(competitionRows, 'sprint_distance'),
          avg_sprints: avgOf(competitionRows, 'sprint_efforts'),
          avg_acc_3: avgOf(competitionRows, 'accelerations'),
          avg_dec_3: avgOf(competitionRows, 'decelerations'),
          avg_player_load: avgOf(competitionRows, 'player_load'),
          avg_smax: avgOf(competitionRows, 'max_velocity'),
          updated_at: new Date().toISOString(),
        });
        competitionProfilesUpdated++;
      }

      for (const day of MICRO_DAYS) {
        const rows = sessionGpsRows.filter((r) => {
          const session = sessionMap[r.session_id];
          const microDay = session?.microcycle_day || session?.match_day_code;
          const sessionPlayer = sessionPlayerMap[`${r.session_id}:${playerId}`];
          return r.player_id === playerId && session && microDay === day && isNormalGpsRow(r, sessionPlayer);
        });
        if (!rows.length) continue;
        await upsert(base44, 'PlayerMicrocycleGPSProfile', { player_id: playerId, squad_id: squadId, season_id: seasonId, microcycle_day: day }, {
          sessions_used: new Set(rows.map((r) => r.session_id)).size,
          avg_total_distance: avgOf(rows, 'total_distance'),
          avg_m_min: avgOf(rows, 'm_min'),
          avg_distance_14_19_8: avgOf(rows, 'distance_14_19_8'),
          avg_distance_19_8: avgOf(rows, 'distance_19_8'),
          avg_distance_25: avgOf(rows, 'distance_25'),
          avg_sprints: avgOf(rows, 'sprints'),
          avg_acc_3: avgOf(rows, 'acc_3'),
          avg_dec_3: avgOf(rows, 'dec_3'),
          avg_player_load: avgOf(rows, 'player_load'),
          avg_smax: avgOf(rows, 'smax'),
          updated_at: new Date().toISOString(),
        });
        microcycleProfilesUpdated++;
      }
    }

    return Response.json({ success: true, players_processed: playerIds.size, competitionProfilesUpdated, microcycleProfilesUpdated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const GK_ALIASES = new Set(['arquero', 'arq', 'gk', 'goalkeeper', 'portero', 'golero', 'guardameta', 'arqueros']);
const EXCLUDED_GROUPS = new Set(['diferenciado', 'kinesiologia', 'reintegro', 'individual']);
const EXCLUDED_REASONS = new Set(['diferenciado', 'kinesiologia', 'reintegro', 'carga_parcial', 'lesion', 'error_gps']);

function resolvePlayerType(player) {
  if (!player) return 'jugador_campo';
  if (player.player_type === 'arquero') return 'arquero';
  const pos = (player.position || '').toLowerCase().trim();
  return GK_ALIASES.has(pos) ? 'arquero' : 'jugador_campo';
}

function avgOf(rows, key) {
  const vals = rows.map((r) => Number(r[key])).filter((v) => Number.isFinite(v) && v > 0);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

function maxOf(rows, key) {
  const vals = rows.map((r) => Number(r[key])).filter((v) => Number.isFinite(v));
  return vals.length ? Math.max(...vals) : 0;
}

function seasonMatches(record, seasonId) {
  if (!seasonId) return true;
  if (!record?.season_id) return true;
  return record.season_id === seasonId;
}

async function upsert(base44, entityName, query, data) {
  const existing = await base44.asServiceRole.entities[entityName].filter(query, '-created_date', 1);
  if (existing.length > 0) await base44.asServiceRole.entities[entityName].update(existing[0].id, data);
  else await base44.asServiceRole.entities[entityName].create({ ...query, ...data });
}

function buildProfileData(rows) {
  return {
    total_sessions: new Set(rows.map((r) => r.session_id)).size,
    avg_total_distance: avgOf(rows, 'total_distance'),
    avg_m_min: avgOf(rows, 'm_min'),
    avg_distance_19_8: avgOf(rows, 'distance_19_8'),
    avg_distance_25: avgOf(rows, 'distance_25'),
    avg_sprints: avgOf(rows, 'sprints'),
    avg_acc_3: avgOf(rows, 'acc_3'),
    avg_dec_3: avgOf(rows, 'dec_3'),
    avg_player_load: avgOf(rows, 'player_load'),
    avg_player_load_per_min: avgOf(rows, 'player_load_per_min'),
    avg_smax: avgOf(rows, 'smax'),
    avg_rhie: avgOf(rows, 'rhie_bouts'),
    max_smax: maxOf(rows, 'smax'),
    updated_at: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const squadIds = body.full ? (await base44.asServiceRole.entities.Squad.list('-created_date', 200)).map((s) => s.id) : body.squad_id ? [body.squad_id] : [];
    const seasonId = body.season_id || '';
    if (!squadIds.length) return Response.json({ error: 'No se proporcionó squad_id' }, { status: 400 });

    const players = await base44.asServiceRole.entities.Player.list('-created_date', 2000);
    const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));
    const allGps = await base44.asServiceRole.entities.SessionGPSData.list('-created_date', 10000);

    let profilesUpdated = 0;
    let microcycleProfilesUpdated = 0;

    for (const squadId of squadIds) {
      const sessions = (await base44.asServiceRole.entities.TrainingSession.filter({ squad_id: squadId }, '-date', 3000)).filter((s) => seasonMatches(s, seasonId));
      const sessionMap = Object.fromEntries(sessions.map((s) => [s.id, s]));
      const scope = seasonId ? { squad_id: squadId, season_id: seasonId } : { squad_id: squadId };
      await base44.asServiceRole.entities.TeamGPSProfile.deleteMany(scope);
      await base44.asServiceRole.entities.TeamGPSMicrocycleProfile.deleteMany(scope);

      const normalRows = allGps
        .filter((r) => sessionMap[r.session_id] && r.include_in_session_average !== false && r.visible_in_report !== false)
        .filter((r) => !EXCLUDED_GROUPS.has(r.gps_group) && !EXCLUDED_REASONS.has(r.exclusion_reason))
        .map((r) => {
          const s = sessionMap[r.session_id];
          const player = playerMap[r.player_id];
          return { ...r, md: s.microcycle_day || s.match_day_code || 'Otro', player_type: resolvePlayerType(player), player_load_per_min: r.player_load_per_min || (r.player_load && r.m_min ? r.player_load / Math.max(1, r.total_distance / r.m_min) : 0) };
        });

      const groups = [
        { type: 'campo', rows: normalRows.filter((r) => r.player_type !== 'arquero') },
        { type: 'arqueros', rows: normalRows.filter((r) => r.player_type === 'arquero') },
        { type: 'total', rows: normalRows },
      ];

      for (const g of groups) {
        if (!g.rows.length) continue;
        const data = buildProfileData(g.rows);
        await upsert(base44, 'TeamGPSProfile', { squad_id: squadId, season_id: seasonId, player_type: g.type }, data);
        profilesUpdated++;
        const mdGroups = {};
        g.rows.forEach((r) => { (mdGroups[r.md] ||= []).push(r); });
        for (const [md, mdRows] of Object.entries(mdGroups)) {
          const mdData = buildProfileData(mdRows);
          await upsert(base44, 'TeamGPSMicrocycleProfile', { squad_id: squadId, season_id: seasonId, md, player_type: g.type }, { ...mdData, sessions_count: mdData.total_sessions });
          microcycleProfilesUpdated++;
        }
      }
    }

    return Response.json({ success: true, squads_processed: squadIds.length, profilesUpdated, microcycleProfilesUpdated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function avgOf(rows, key) {
  const vals = rows.map((r) => r[key]).filter((v) => typeof v === 'number' && v > 0);
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    const matches = await base44.asServiceRole.entities.MatchReport.list('-date', 1000);
    const matchIds = new Set(matches.map((m) => m.id));
    const matchMap = {};
    matches.forEach((m) => { matchMap[m.id] = m; });

    let playerIds = [];
    if (body.full) {
      const allReports = await base44.asServiceRole.entities.CatapultReport.list('-created_date', 10000);
      playerIds = [...new Set(allReports.filter((r) => matchIds.has(r.session_id)).map((r) => r.player_id).filter(Boolean))];
    } else if (Array.isArray(body.player_ids)) {
      playerIds = [...new Set(body.player_ids.filter(Boolean))];
    } else if (body.player_id) {
      playerIds = [body.player_id];
    }

    if (playerIds.length === 0) {
      return Response.json({ error: 'No se proporcionaron player_ids' }, { status: 400 });
    }

    let profilesUpdated = 0;

    for (const playerId of playerIds) {
      const rows = await base44.asServiceRole.entities.CatapultReport.filter({ player_id: playerId }, '-date', 500);
      const matchRows = rows.filter((r) => matchIds.has(r.session_id) && (r.total_duration || 0) >= 80);

      if (matchRows.length === 0) continue;

      const sortedByDate = [...matchRows].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      const latestSquadId = matchMap[sortedByDate[0]?.session_id]?.squad_id || '';

      await upsert(base44, 'PlayerCompetitionProfile', { player_id: playerId }, {
        squad_id: latestSquadId,
        matches_used: matchRows.length,
        avg_total_distance: avgOf(matchRows, 'total_distance'),
        avg_m_min: avgOf(matchRows, 'meters_per_minute'),
        avg_distance_19_8: avgOf(matchRows, 'distance_hsr'),
        avg_distance_25: avgOf(matchRows, 'sprint_distance'),
        avg_sprints: avgOf(matchRows, 'sprint_efforts'),
        avg_acc_3: avgOf(matchRows, 'accelerations'),
        avg_dec_3: avgOf(matchRows, 'decelerations'),
        avg_player_load: avgOf(matchRows, 'player_load'),
        avg_smax: avgOf(matchRows, 'max_velocity'),
        updated_at: new Date().toISOString(),
      });
      profilesUpdated++;
    }

    return Response.json({ success: true, players_processed: playerIds.length, profilesUpdated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
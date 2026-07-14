import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function durationToMinutes(str) {
  if (!str) return 0;
  const parts = String(str).split(':').map(Number);
  if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 60;
  if (parts.length === 2) return parts[0] + parts[1] / 60;
  return 0;
}

function avgOf(rows, key) {
  const vals = rows.map((r) => r[key]).filter((v) => typeof v === 'number' && v > 0);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

function maxOf(rows, key) {
  const vals = rows.map((r) => r[key]).filter((v) => typeof v === 'number');
  return vals.length ? Math.max(...vals) : 0;
}

function daysAgo(dateStr) {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / 86400000);
}

function isoWeekKey(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return `${d.getFullYear()}-W${weekNum}`;
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

    let playerIds = [];
    if (body.full) {
      const allGps = await base44.asServiceRole.entities.SessionGPSData.list('-created_date', 5000);
      playerIds = [...new Set(allGps.map((r) => r.player_id).filter(Boolean))];
    } else if (Array.isArray(body.player_ids)) {
      playerIds = [...new Set(body.player_ids.filter(Boolean))];
    } else if (body.player_id) {
      playerIds = [body.player_id];
    }

    if (playerIds.length === 0) {
      return Response.json({ error: 'No se proporcionaron player_ids' }, { status: 400 });
    }

    const sessions = await base44.asServiceRole.entities.TrainingSession.list('-date', 3000);
    const sessionMap = {};
    sessions.forEach((s) => { sessionMap[s.id] = s; });

    let profilesUpdated = 0;
    let microcycleProfilesUpdated = 0;

    for (const playerId of playerIds) {
      const rows = await base44.asServiceRole.entities.SessionGPSData.filter({ player_id: playerId }, '-created_date', 2000);

      const enriched = rows
        .map((r) => {
          const s = sessionMap[r.session_id];
          if (!s) return null;
          return { ...r, date: s.date, md: s.match_day_code || 'Otro', squad_id: s.squad_id };
        })
        .filter(Boolean);

      const normalRows = enriched.filter((r) => r.include_in_session_average !== false);
      if (normalRows.length === 0 && enriched.length === 0) continue;

      const totalSessions = new Set(normalRows.map((r) => r.session_id)).size;
      const sortedByDate = [...normalRows].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      const latestSquadId = sortedByDate[0]?.squad_id || '';

      const load7 = normalRows.filter((r) => daysAgo(r.date) <= 7).reduce((a, r) => a + (r.total_distance || 0), 0);
      const load14 = normalRows.filter((r) => daysAgo(r.date) <= 14).reduce((a, r) => a + (r.total_distance || 0), 0);
      const load28 = normalRows.filter((r) => daysAgo(r.date) <= 28).reduce((a, r) => a + (r.total_distance || 0), 0);
      const prevLoad7 = normalRows.filter((r) => daysAgo(r.date) > 7 && daysAgo(r.date) <= 14).reduce((a, r) => a + (r.total_distance || 0), 0);

      const weekTotals = {};
      normalRows.forEach((r) => {
        if (!r.date) return;
        const wk = isoWeekKey(r.date);
        weekTotals[wk] = (weekTotals[wk] || 0) + (r.total_distance || 0);
      });
      const weekValues = Object.values(weekTotals);
      const weeklyAvg = weekValues.length ? weekValues.reduce((a, b) => a + b, 0) / weekValues.length : 0;

      let trend = 'estable';
      if (prevLoad7 > 0) {
        const diffPct = ((load7 - prevLoad7) / prevLoad7) * 100;
        if (diffPct > 10) trend = 'subiendo';
        else if (diffPct < -10) trend = 'bajando';
      }

      const plMinVals = normalRows
        .map((r) => {
          const mins = durationToMinutes(r.duration);
          return mins > 0 && r.player_load > 0 ? r.player_load / mins : null;
        })
        .filter((v) => v !== null);
      const avgPlMin = plMinVals.length ? plMinVals.reduce((a, b) => a + b, 0) / plMinVals.length : 0;

      await upsert(base44, 'PlayerGPSProfile', { player_id: playerId }, {
        squad_id: latestSquadId,
        total_sessions: totalSessions,
        avg_total_distance: avgOf(normalRows, 'total_distance'),
        avg_m_min: avgOf(normalRows, 'm_min'),
        avg_distance_19_8: avgOf(normalRows, 'distance_19_8'),
        avg_distance_25: avgOf(normalRows, 'distance_25'),
        avg_sprints: avgOf(normalRows, 'sprints'),
        avg_acc_3: avgOf(normalRows, 'acc_3'),
        avg_dec_3: avgOf(normalRows, 'dec_3'),
        avg_player_load: avgOf(normalRows, 'player_load'),
        avg_pl_min: avgPlMin,
        max_smax: maxOf(normalRows, 'smax'),
        load_7d: load7,
        load_14d: load14,
        load_28d: load28,
        weekly_avg: weeklyAvg,
        trend,
        updated_at: new Date().toISOString(),
      });
      profilesUpdated++;

      const mdGroups = {};
      normalRows.forEach((r) => {
        const md = r.md || 'Otro';
        if (!mdGroups[md]) mdGroups[md] = [];
        mdGroups[md].push(r);
      });

      for (const [md, mdRows] of Object.entries(mdGroups)) {
        await upsert(base44, 'PlayerGPSMicrocycleProfile', { player_id: playerId, md }, {
          squad_id: latestSquadId,
          sessions_count: new Set(mdRows.map((r) => r.session_id)).size,
          avg_total_distance: avgOf(mdRows, 'total_distance'),
          avg_m_min: avgOf(mdRows, 'm_min'),
          avg_distance_19_8: avgOf(mdRows, 'distance_19_8'),
          avg_distance_25: avgOf(mdRows, 'distance_25'),
          avg_sprints: avgOf(mdRows, 'sprints'),
          avg_acc_3: avgOf(mdRows, 'acc_3'),
          avg_dec_3: avgOf(mdRows, 'dec_3'),
          avg_player_load: avgOf(mdRows, 'player_load'),
          max_smax: maxOf(mdRows, 'smax'),
          updated_at: new Date().toISOString(),
        });
        microcycleProfilesUpdated++;
      }
    }

    return Response.json({ success: true, players_processed: playerIds.length, profilesUpdated, microcycleProfilesUpdated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
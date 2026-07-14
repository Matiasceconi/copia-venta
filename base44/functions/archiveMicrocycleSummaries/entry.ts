import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const METRICS = [
  ['total_distance', 'Distancia total', 'avg'], ['m_min', 'm/min', 'avg'], ['distance_19_8', 'D >19.8', 'avg'],
  ['distance_25', 'D >25', 'avg'], ['sprints', 'Sprints', 'avg'], ['acc_3', 'ACC +3', 'avg'],
  ['dec_3', 'DEC +3', 'avg'], ['player_load', 'Player Load', 'avg'], ['smax', 'Smax', 'max']
];

function isoDate(d) { return d.toISOString().slice(0, 10); }
function addDays(date, days) { const d = new Date(date + 'T00:00:00'); d.setDate(d.getDate() + days); return isoDate(d); }
function inRange(date, start, end) { return date && date >= start && date <= end; }
function values(rows, key) { return rows.map((r) => Number(r[key])).filter((v) => Number.isFinite(v) && v > 0); }
function aggregate(rows, key, mode) { const vals = values(rows, key); if (!vals.length) return 0; if (mode === 'max') return Math.max(...vals); return vals.reduce((a, b) => a + b, 0) / vals.length; }
function buildMetricSet(rows) { return Object.fromEntries(METRICS.map(([key, label, mode]) => [key, { label, value: aggregate(rows, key, mode), mode }])); }
function topPlayers(rows, key, mode) {
  const grouped = {};
  rows.forEach((r) => { if (!grouped[r.player_id]) grouped[r.player_id] = { player_id: r.player_id, name: r.player_name || 'Jugador', values: [] }; const v = Number(r[key]); if (Number.isFinite(v) && v > 0) grouped[r.player_id].values.push(v); });
  return Object.values(grouped).map((p) => ({ ...p, value: mode === 'max' ? Math.max(...p.values) : p.values.reduce((a, b) => a + b, 0) })).filter((p) => Number.isFinite(p.value)).sort((a, b) => b.value - a.value).slice(0, 3);
}
function buildDaily(days, sessions, gpsBySession) {
  return days.map((day) => {
    const daySessions = sessions.filter((s) => s.date === day.date);
    const rows = daySessions.flatMap((s) => gpsBySession[s.id] || []).filter((r) => r.include_in_session_average !== false && (!r.gps_group || r.gps_group === 'principal'));
    return { date: day.date, md: day.md || day.match_day_code || '', sessions: daySessions.map((s) => s.title), players: new Set(rows.map((r) => r.player_id)).size, metrics: buildMetricSet(rows) };
  });
}
function buildSnapshot({ plan, squad, sessions, matches, rows, teamProfile, previousSummary }) {
  const days = Array.isArray(plan.days_data) && plan.days_data.length ? plan.days_data : Array.from({ length: 7 }, (_, i) => ({ date: addDays(plan.week_start, i), md: '' }));
  const gpsBySession = {};
  rows.forEach((r) => { (gpsBySession[r.session_id] ||= []).push(r); });
  const variables = buildMetricSet(rows.filter((r) => r.include_in_session_average !== false && (!r.gps_group || r.gps_group === 'principal')));
  const rankings = Object.fromEntries(METRICS.map(([key, label, mode]) => [key, { label, top3: topPlayers(rows, key, mode === 'max' ? 'max' : 'sum') }]));
  const daily = buildDaily(days, sessions, gpsBySession);
  const previousMetrics = previousSummary?.gps_variables_snapshot || {};
  const comparison = Object.fromEntries(METRICS.map(([key, label]) => {
    const current = variables[key]?.value || 0;
    const previous = previousMetrics[key]?.value || 0;
    return [key, { label, current, previous, diff_pct: previous ? ((current - previous) / previous) * 100 : null }];
  }));
  return { resumen_semanal: { sessions: sessions.length, matches: matches.length, gps_players: new Set(rows.map((r) => r.player_id)).size, daily }, graficos: { daily, season_metrics: variables }, rankings, variables_gps: variables, perfil_equipo: teamProfile || {}, comparacion_semanal: comparison, pdf_generado: { pdf_url: '', generated_at: '' }, observations: plan.notes || '', conclusions: '' };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // ── Autorización multi-tenant ──────────────────────────────────────────
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const activeOrgId = user.active_organization_id;
    if (!activeOrgId) return Response.json({ error: 'No hay organización activa.' }, { status: 403 });
    const myMemberships = await base44.entities.OrganizationMember.filter({ user_id: user.id, organization_id: activeOrgId, status: 'active' }, '-created_date', 1).catch(() => []);
    if (myMemberships.length === 0 && user.role !== 'admin') {
      return Response.json({ error: 'Sin membresía activa en la organización.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const today = body.today || isoDate(new Date());
    const force = !!body.force_recalculate;
    const dryRun = !!body.dry_run;

    // ── Todas las consultas se filtran por organization_id ─────────────────
    const orgFilter = { organization_id: activeOrgId };
    const weeklyPlans = await base44.asServiceRole.entities.WeeklyPlan.filter(orgFilter, '-week_start', 1000);
    const summaries = await base44.asServiceRole.entities.MicrocycleSummary.filter(orgFilter, '-fecha_inicio', 2000).catch(() => []);
    const squads = await base44.asServiceRole.entities.Squad.filter(orgFilter, '-created_date', 300);
    const sessions = await base44.asServiceRole.entities.TrainingSession.filter(orgFilter, '-date', 5000);
    const matches = await base44.asServiceRole.entities.MatchReport.filter(orgFilter, '-date', 1000).catch(() => []);
    const gpsRows = await base44.asServiceRole.entities.SessionGPSData.filter(orgFilter, '-created_date', 10000);
    const teamProfiles = await base44.asServiceRole.entities.TeamGPSProfile.filter(orgFilter, '-updated_at', 1000).catch(() => []);

    const squadMap = Object.fromEntries(squads.map((s) => [s.id, s]));
    const plans = weeklyPlans.filter((p) => p.week_start && addDays(p.week_start, 6) < today)
      .filter((p) => !body.squad_id || p.squad_id === body.squad_id)
      .filter((p) => !body.weekly_plan_id || p.id === body.weekly_plan_id);
    const created = [], updated = [], skipped = [];

    for (const plan of plans) {
      const start = plan.week_start;
      const end = addDays(start, 6);
      const existing = summaries.find((s) => s.source_weekly_plan_id === plan.id || (s.squad_id === plan.squad_id && s.fecha_inicio === start));
      if (existing && existing.snapshot_locked !== false && !force) { skipped.push(existing.id); continue; }
      const squad = squadMap[plan.squad_id] || {};
      const weekSessions = sessions.filter((s) => s.squad_id === plan.squad_id && inRange(s.date, start, end));
      const sessionIds = new Set(weekSessions.map((s) => s.id));
      const weekRows = gpsRows.filter((r) => sessionIds.has(r.session_id));
      const weekMatches = matches.filter((m) => m.squad_id === plan.squad_id && inRange(m.date, start, end));
      const mainMatch = weekMatches[0] || {};
      const teamProfile = teamProfiles.find((p) => p.squad_id === plan.squad_id && (!squad.season || p.season_id === squad.season) && p.player_type === 'campo');
      const previousSummary = summaries.filter((s) => s.squad_id === plan.squad_id && s.fecha_inicio < start).sort((a, b) => (b.fecha_inicio || '').localeCompare(a.fecha_inicio || ''))[0];
      const snapshot = buildSnapshot({ plan, squad, sessions: weekSessions, matches: weekMatches, rows: weekRows, teamProfile, previousSummary });
      const data = {
        organization_id: activeOrgId,
        squad_id: plan.squad_id, squad_name: plan.squad_name || squad.name || '', season_id: squad.season || plan.season_id || '',
        microcycle_name: plan.microcycle_name || `Microciclo ${start}`, nombre_microciclo: plan.microcycle_name || `Microciclo ${start}`, fecha_inicio: start, fecha_fin: end,
        rival: mainMatch.rival || '', partido_asociado: mainMatch.rival || mainMatch.title || '', resultado: mainMatch.our_score != null && mainMatch.rival_score != null ? `${mainMatch.our_score}-${mainMatch.rival_score}` : '',
        cantidad_sesiones: weekSessions.length, cantidad_partidos: weekMatches.length, estado: force ? 'recalculado' : 'cerrado',
        entrenador: plan.coach || '', competencia: mainMatch.competition || '', created_at: existing?.created_at || new Date().toISOString(), updated_at: new Date().toISOString(),
        source_weekly_plan_id: plan.id, snapshot_locked: !force, snapshot, summary_snapshot: snapshot.resumen_semanal, charts_snapshot: snapshot.graficos,
        rankings_snapshot: snapshot.rankings, gps_variables_snapshot: snapshot.variables_gps, promedios_snapshot: snapshot.variables_gps, highlighted_players_snapshot: snapshot.rankings, team_profile_snapshot: snapshot.perfil_equipo,
        weekly_comparison_snapshot: snapshot.comparacion_semanal, observations: snapshot.observations, conclusions: snapshot.conclusions, recalculated_at: force ? new Date().toISOString() : existing?.recalculated_at || ''
      };
      if (dryRun) { (existing ? updated : created).push(plan.id); continue; }
      if (existing) { await base44.asServiceRole.entities.MicrocycleSummary.update(existing.id, data); updated.push(existing.id); }
      else { const createdRecord = await base44.asServiceRole.entities.MicrocycleSummary.create(data); created.push(createdRecord.id); }
    }
    return Response.json({ success: true, organization_id: activeOrgId, processed: plans.length, created: created.length, updated: updated.length, skipped: skipped.length, dry_run: dryRun });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
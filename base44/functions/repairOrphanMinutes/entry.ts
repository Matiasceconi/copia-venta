import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const [records, matches] = await Promise.all([
      base44.asServiceRole.entities.MinutesRecord.list('-created_date', 3000),
      base44.asServiceRole.entities.MatchReport.list('-date', 1000),
    ]);

    const matchMap = {};
    matches.forEach((m) => { matchMap[m.id] = m; });

    let autoRepaired = 0;
    const orphans = [];
    const seenDuplicateKey = new Set();

    for (const r of records) {
      if (r.hidden_from_reports) continue;

      const match = r.match_id ? matchMap[r.match_id] : null;

      // Caso válido: partido existe, no está archivado, mismo plantel
      if (match && match.status !== 'archivado' && (!r.squad_id || r.squad_id === match.squad_id)) {
        // Chequeo de duplicados (mismo jugador + mismo partido)
        const dupKey = `${r.match_id}|${r.player_id || r.player_name}`;
        if (seenDuplicateKey.has(dupKey)) {
          orphans.push({
            id: r.id, player_id: r.player_id || null, player_name: r.player_name || '',
            match_label: r.match_label || (r.rival ? `vs ${r.rival}` : ''), match_date: r.match_date || null,
            minutes: r.minutes || 0, tournament: r.tournament || '', reason: 'registro duplicado (mismo jugador y partido)',
          });
          continue;
        }
        seenDuplicateKey.add(dupKey);
        continue;
      }

      // Intentar auto-reparar por fecha + rival (coincidencia confiable) si no hay match_id
      if (!match && r.match_date && r.rival) {
        const candidate = matches.find(
          (m) => m.status !== 'archivado' && m.date === r.match_date && (m.rival || '').trim().toLowerCase() === (r.rival || '').trim().toLowerCase()
        );
        if (candidate) {
          await base44.asServiceRole.entities.MinutesRecord.update(r.id, { match_id: candidate.id, squad_id: candidate.squad_id });
          autoRepaired++;
          continue;
        }
      }

      let reason = 'sin match_id';
      if (match && match.status === 'archivado') reason = 'partido archivado';
      else if (match && r.squad_id && r.squad_id !== match.squad_id) reason = 'plantel distinto al del partido';
      else if (r.match_id && !match) reason = 'match_id inexistente (partido eliminado)';
      else if (!r.match_id) reason = 'sin match_id';

      orphans.push({
        id: r.id,
        player_id: r.player_id || null,
        player_name: r.player_name || '',
        match_label: r.match_label || (r.rival ? `vs ${r.rival}` : ''),
        match_date: r.match_date || null,
        minutes: r.minutes || 0,
        tournament: r.tournament || '',
        reason,
      });
    }

    return Response.json({ orphans, autoRepaired, totalScanned: records.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
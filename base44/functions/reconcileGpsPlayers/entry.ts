import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action, assignments } = body;

    const normalizeName = (name) =>
      (name || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ");

    const wordScore = (csvName, playerName) => {
      const csvWords = normalizeName(csvName).split(" ").filter(w => w.length > 2);
      const playerWords = normalizeName(playerName).split(" ").filter(w => w.length > 2);
      if (!csvWords.length || !playerWords.length) return 0;
      const matches = csvWords.filter(w => playerWords.includes(w)).length;
      return matches / Math.max(csvWords.length, playerWords.length);
    };

    const [players, mappings] = await Promise.all([
      base44.asServiceRole.entities.Player.list('', 500),
      base44.asServiceRole.entities.PlayerNameMapping.list('', 500),
    ]);

    // Build alias → player_id index
    const aliasToPlayerId = {};
    mappings.forEach(m => {
      (m.aliases || []).forEach(alias => {
        aliasToPlayerId[normalizeName(alias)] = m.player_id;
      });
      aliasToPlayerId[normalizeName(m.player_name)] = m.player_id;
    });

    // ── APPLY manual assignments ──────────────────────────────────────────────
    if (action === 'apply' && Array.isArray(assignments) && assignments.length > 0) {
      const updated = [];
      const matchReports = await base44.asServiceRole.entities.MatchReport.list('-date', 200);
      const matchIdSet = new Set(matchReports.map(m => m.id));

      for (const { csvName, player_id } of assignments) {
        const player = players.find(p => p.id === player_id);
        if (!player) continue;

        // Update all CatapultReport records with this csv name
        const reports = await base44.asServiceRole.entities.CatapultReport.filter({ player_name: csvName }, '', 200);
        for (const r of reports) {
          await base44.asServiceRole.entities.CatapultReport.update(r.id, {
            player_id: player.id,
            player_name: player.full_name || player.name,
            session_id: r.session_id || (matchIdSet.has(r.session_id) ? r.session_id : r.session_id),
          });
        }

        // Persist alias mapping
        const existingMapping = mappings.find(m => m.player_id === player_id);
        if (existingMapping) {
          const aliasSet = new Set(existingMapping.aliases || []);
          aliasSet.add(csvName);
          await base44.asServiceRole.entities.PlayerNameMapping.update(existingMapping.id, {
            aliases: Array.from(aliasSet),
          });
        } else {
          await base44.asServiceRole.entities.PlayerNameMapping.create({
            player_id: player.id,
            player_name: player.full_name || player.name,
            aliases: [csvName],
            sources: ['Reconciliación manual'],
          });
        }

        updated.push({ csvName, player: player.full_name || player.name, count: reports.length });
      }

      return Response.json({ action: 'applied', updated });
    }

    // ── ANALYZE: scan all CatapultReport records ──────────────────────────────
    const allReports = await base44.asServiceRole.entities.CatapultReport.list('-date', 2000);

    // Group by raw player_name from CSV
    const byRawName = {};
    for (const r of allReports) {
      const rawName = r.player_name || "(sin nombre)";
      if (!byRawName[rawName]) {
        byRawName[rawName] = {
          csvName: rawName,
          player_id: r.player_id || null,
          recordCount: 0,
          dates: [],
          isMatched: !!r.player_id,
        };
      }
      byRawName[rawName].recordCount++;
      if (r.date && !byRawName[rawName].dates.includes(r.date)) {
        byRawName[rawName].dates.push(r.date);
      }
      // If any record has player_id, mark as matched
      if (r.player_id) {
        byRawName[rawName].isMatched = true;
        byRawName[rawName].player_id = r.player_id;
      }
    }

    // For each raw name, find suggestions from players
    const results = Object.values(byRawName).map(entry => {
      const suggestions = players
        .map(p => ({
          player_id: p.id,
          full_name: p.full_name || p.name || '',
          position: p.position || '',
          score: wordScore(entry.csvName, p.full_name || p.name || ''),
        }))
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      const matchedPlayer = entry.player_id
        ? players.find(p => p.id === entry.player_id)
        : null;

      return {
        csvName: entry.csvName,
        isMatched: entry.isMatched,
        player_id: entry.player_id || null,
        playerName: matchedPlayer ? (matchedPlayer.full_name || matchedPlayer.name) : null,
        recordCount: entry.recordCount,
        dates: entry.dates.sort().slice(-5),
        suggestions,
        needsReview: !entry.isMatched || (entry.isMatched && suggestions.length > 0 && suggestions[0].score < 1.0 && !matchedPlayer),
      };
    });

    const matched = results.filter(r => r.isMatched);
    const unmatched = results.filter(r => !r.isMatched);

    return Response.json({
      action: 'analyze',
      summary: {
        total: results.length,
        matched: matched.length,
        unmatched: unmatched.length,
        totalRecords: allReports.length,
      },
      matched,
      unmatched,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
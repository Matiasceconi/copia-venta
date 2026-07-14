import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const players = await base44.asServiceRole.entities.Player.list('', 500);
    const gpsReports = await base44.asServiceRole.entities.CatapultReport.list('', 1000);

    const normalizeName = (name) => {
      return name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ");
    };

    const getNameWords = (name) => {
      return normalizeName(name).split(" ").filter(w => w.length > 2);
    };

    // Para cada reporte GPS, encontrar el mejor jugador coincidente
    const updated = [];
    const notMatched = [];

    for (const report of gpsReports) {
      const gpsPlayerName = report.data?.player_name || report.player_name;
      if (!gpsPlayerName) continue;

      const gpsWords = getNameWords(gpsPlayerName);
      if (gpsWords.length === 0) continue;

      let bestMatch = null;
      let bestScore = 0;

      for (const player of players) {
        const playerFullName = player.full_name || player.name;
        if (!playerFullName) continue;

        const playerWords = getNameWords(playerFullName);
        if (playerWords.length === 0) continue;

        const matches = gpsWords.filter(w => playerWords.includes(w)).length;
        const score = matches / Math.max(gpsWords.length, playerWords.length);

        if (score > bestScore) {
          bestScore = score;
          bestMatch = player;
        }
      }

      if (bestScore >= 0.5 && bestMatch) {
        await base44.asServiceRole.entities.CatapultReport.update(report.id, {
          player_id: bestMatch.id,
          player_name: bestMatch.full_name || bestMatch.name,
        });
        updated.push({ gpsName: gpsPlayerName, playerName: bestMatch.full_name || bestMatch.name, score: bestScore });
      } else {
        notMatched.push(gpsPlayerName);
      }
    }

    return Response.json({
      updated: updated.length,
      notMatched: notMatched.length,
      details: { updated, notMatched },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Obtener todos los jugadores, reportes GPS y tabla maestra
    const players = await base44.asServiceRole.entities.Player.list('', 500);
    const gpsReports = await base44.asServiceRole.entities.CatapultReport.list('', 500);
    const mappings = await base44.asServiceRole.entities.PlayerNameMapping.list('', 500);

    // Función normalizar nombre
    const normalizeName = (name) => {
      return name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ");
    };

    // Función para obtener palabras significativas
    const getNameWords = (name) => {
      return normalizeName(name).split(" ").filter(w => w.length > 2);
    };

    // Función para buscar jugador: primero por mapping, luego por fuzzy match
    const findPlayerByName = (gpsName) => {
      const normalizedGpsName = normalizeName(gpsName);

      // 1. Buscar en la tabla maestra de mappings
      for (const mapping of mappings) {
        if (mapping.aliases) {
          for (const alias of mapping.aliases) {
            if (normalizeName(alias) === normalizedGpsName) {
              return players.find(p => p.id === mapping.player_id);
            }
          }
        }
      }

      // 2. Si no encuentra, buscar por fuzzy matching en nombres de jugadores
      const gpsWords = getNameWords(gpsName);
      if (gpsWords.length === 0) return null;

      let bestMatch = null;
      let bestScore = 0;

      for (const player of players) {
         const playerFullName = player.full_name || player.name;
         const playerWords = getNameWords(playerFullName);
         if (playerWords.length === 0) continue;

         // Contar coincidencias de palabras
         const matches = gpsWords.filter(w => playerWords.includes(w)).length;
         const score = matches / Math.max(gpsWords.length, playerWords.length);

         if (score > bestScore) {
           bestScore = score;
           bestMatch = player;
         }
       }

      // Retornar si hay al menos 1 palabra coincidiendo
      return bestScore >= 0.5 ? bestMatch : null;
    };

    // Procesar cada reporte GPS
    const updated = [];
    const notMatched = [];

    for (const report of gpsReports) {
      if (report.player_id) continue; // Ya tiene player_id, saltar

      const gpsPlayerName = report.data?.player_name || report.player_name;
      const player = findPlayerByName(gpsPlayerName);
      if (player) {
        // Actualizar el reporte con el player_id
        await base44.asServiceRole.entities.CatapultReport.update(report.id, {
          player_id: player.id,
        });
        updated.push({ gpsName: gpsPlayerName, playerName: player.name, playerId: player.id });
      } else {
        notMatched.push(gpsPlayerName);
      }
    }

    return Response.json({ 
      updated: updated.length, 
      notMatched: notMatched.length,
      details: { updated, notMatched }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
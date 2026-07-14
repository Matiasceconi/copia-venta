import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Obtener jugadores, reportes GPS y mappings existentes
    const players = await base44.asServiceRole.entities.Player.list('', 500);
    const gpsReports = await base44.asServiceRole.entities.CatapultReport.filter({ player_id: { $exists: true } }, '', 500);
    const existingMappings = await base44.asServiceRole.entities.PlayerNameMapping.list('', 500);

    // Crear mapa de mappings por player_id
    const mappingsByPlayerId = {};
    existingMappings.forEach(m => {
      mappingsByPlayerId[m.player_id] = m;
    });

    // Agrupar reportes GPS por player_id
    const gpsNamesByPlayerId = {};
    gpsReports.forEach(r => {
      if (r.player_id) {
        if (!gpsNamesByPlayerId[r.player_id]) {
          gpsNamesByPlayerId[r.player_id] = new Set();
        }
        if (r.player_name) {
          gpsNamesByPlayerId[r.player_id].add(r.player_name);
        }
      }
    });

    // Crear o actualizar mappings
    const created = [];
    const updated = [];

    for (const [playerId, gpsNames] of Object.entries(gpsNamesByPlayerId)) {
      const player = players.find(p => p.id === playerId);
      if (!player) continue;

      const aliases = Array.from(gpsNames);
      
      if (mappingsByPlayerId[playerId]) {
        // Actualizar: agregar nuevas aliases
        const existingAliases = new Set(mappingsByPlayerId[playerId].aliases || []);
        aliases.forEach(a => existingAliases.add(a));
        
        await base44.asServiceRole.entities.PlayerNameMapping.update(mappingsByPlayerId[playerId].id, {
          aliases: Array.from(existingAliases),
        });
        updated.push({ playerId, player: player.name, aliasCount: existingAliases.size });
      } else {
        // Crear nuevo mapping
        await base44.asServiceRole.entities.PlayerNameMapping.create({
          player_id: playerId,
          player_name: player.name,
          aliases: aliases,
          sources: ['Catapult'],
        });
        created.push({ playerId, player: player.name, aliasCount: aliases.length });
      }
    }

    return Response.json({
      created: created.length,
      updated: updated.length,
      details: { created, updated },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Obtener todos los jugadores y reportes GPS
    const players = await base44.asServiceRole.entities.Player.list('', 500);
    const gpsReports = await base44.asServiceRole.entities.CatapultReport.list('', 1000);

    // Crear mapa de player_id -> full_name desde jugadores
    const playerIdToName = {};
    players.forEach(p => {
      if (p.id) playerIdToName[p.id] = p.full_name || p.name;
    });

    // Actualizar player_name en todos los reportes que tengan player_id
    const updated = [];
    for (const report of gpsReports) {
      const playerId = report.player_id || report.data?.player_id;
      if (playerId && playerIdToName[playerId]) {
        const newName = playerIdToName[playerId];
        const currentName = report.player_name || report.data?.player_name;
        
        if (currentName !== newName) {
          await base44.asServiceRole.entities.CatapultReport.update(report.id, {
            player_name: newName,
          });
          updated.push({ id: report.id, oldName: currentName, newName: newName });
        }
      }
    }

    return Response.json({ 
      updated: updated.length,
      details: updated
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
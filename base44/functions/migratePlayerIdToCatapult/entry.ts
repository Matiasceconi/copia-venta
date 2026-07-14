import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Obtener todos los registros de CatapultReport
    const allReports = await base44.asServiceRole.entities.CatapultReport.list('-date', 500);
    
    const updates = [];
    for (const report of allReports) {
      if (!report.player_id && report.data?.player_id) {
        // Si player_id está en data pero no en raíz, copiarlo
        updates.push({ id: report.id, player_id: report.data.player_id });
      } else if (!report.player_id && report.data?.player_name) {
        // Si no hay player_id pero hay player_name en data, buscar el jugador
        const players = await base44.asServiceRole.entities.Player.filter({ name: report.data.player_name }, null, 1);
        if (players.length > 0) {
          updates.push({ id: report.id, player_id: players[0].id });
        }
      }
    }

    // Actualizar todos los registros
    if (updates.length > 0) {
      await base44.asServiceRole.entities.CatapultReport.bulkUpdate(updates);
    }

    return Response.json({ 
      updated: updates.length,
      total: allReports.length,
      message: `Se actualizaron ${updates.length} registros con player_id`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
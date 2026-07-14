import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const players = await base44.entities.Player.list('-created_date', 500);
    const withoutDivision = players.filter((p) => !p.division);

    for (const player of withoutDivision) {
      await base44.entities.Player.update(player.id, { division: "Reserva" });
    }

    return Response.json({
      success: true,
      updated: withoutDivision.length,
      message: `${withoutDivision.length} jugadores asignados a Reserva`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
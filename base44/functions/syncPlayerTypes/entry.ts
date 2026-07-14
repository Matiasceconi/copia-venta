import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const GK_ALIASES = new Set(["arquero", "arq", "gk", "goalkeeper", "portero", "golero", "guardameta", "arqueros"]);

function resolvePlayerType(position) {
  const pos = (position || "").toLowerCase().trim();
  return GK_ALIASES.has(pos) ? "arquero" : "jugador_campo";
}

function resolvePositionGroup(position) {
  const pos = (position || "").toLowerCase().trim();
  if (GK_ALIASES.has(pos)) return "Arqueros";
  const groups = {
    "Defensores": ["defensor central", "lateral derecho", "lateral izquierdo"],
    "Mediocampistas": ["mediocampista central", "volante interno"],
    "Extremos": ["extremo"],
    "Delanteros": ["delantero centro"],
  };
  for (const [group, positions] of Object.entries(groups)) {
    if (positions.includes(pos)) return group;
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Load all players
    const players = await base44.asServiceRole.entities.Player.list('-created_date', 1000);

    let updated = 0;
    let skipped = 0;
    const errors = [];

    for (const player of players) {
      const correctType = resolvePlayerType(player.position);
      const correctGroup = resolvePositionGroup(player.position);

      const needsUpdate = player.player_type !== correctType || player.position_group !== correctGroup;

      if (!needsUpdate) { skipped++; continue; }

      try {
        await base44.asServiceRole.entities.Player.update(player.id, {
          player_type: correctType,
          position_group: correctGroup,
        });
        updated++;
      } catch (e) {
        errors.push(`${player.full_name || player.id}: ${e.message}`);
      }
    }

    return Response.json({
      success: true,
      total: players.length,
      updated,
      skipped,
      errors,
      summary: `${updated} jugadores actualizados, ${skipped} sin cambios`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
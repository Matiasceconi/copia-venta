import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function removeAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeString(str) {
  if (!str) return '';
  return removeAccents(str.trim().toLowerCase()).replace(/\s+/g, ' ');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const players = await base44.entities.Player.list('-created_date', 500);
    const updates = [];
    const duplicates = [];
    
    // Rastrear nombres normalizados para detectar duplicados
    const normalizedMap = new Map();

    for (const player of players) {
      const firstName = player.first_name || '';
      const lastName = player.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim();
      const normalizedName = normalizeString(fullName);

      // Detectar duplicados
      if (normalizedName && normalizedMap.has(normalizedName)) {
        duplicates.push({
          playerId: player.id,
          fullName,
          normalizedName,
          existingId: normalizedMap.get(normalizedName),
        });
      } else if (normalizedName) {
        normalizedMap.set(normalizedName, player.id);
      }

      // Preparar actualización si falta información
      if (!player.full_name || !player.normalized_name) {
        updates.push({
          id: player.id,
          full_name: fullName,
          normalized_name: normalizedName,
        });
      }
    }

    // Ejecutar actualizaciones
    for (const update of updates) {
      await base44.entities.Player.update(update.id, {
        full_name: update.full_name,
        normalized_name: update.normalized_name,
      });
    }

    return Response.json({
      success: true,
      updated: updates.length,
      duplicates: duplicates.length,
      duplicatesList: duplicates,
      message: `${updates.length} jugadores actualizados, ${duplicates.length} posibles duplicados detectados`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
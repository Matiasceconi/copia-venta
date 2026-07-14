import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { photoMappings } = await req.json();

    if (!photoMappings || !Array.isArray(photoMappings)) {
      return Response.json({ error: 'photoMappings must be an array' }, { status: 400 });
    }

    // Get all players
    const allPlayers = await base44.asServiceRole.entities.Player.list('', 500);

    const results = {
      updated: 0,
      failed: 0,
      notFound: [],
    };

    // Process each photo mapping
    for (const mapping of photoMappings) {
      const { number, firstName, lastName, photoUrl } = mapping;

      // Find player by number and name
      const player = allPlayers.find(p => {
        const playerFirstName = p.first_name?.toLowerCase().trim() || '';
        const playerLastName = p.last_name?.toLowerCase().trim() || '';
        const targetFirstName = firstName?.toLowerCase().trim() || '';
        const targetLastName = lastName?.toLowerCase().trim() || '';

        return p.number === number || 
               (playerFirstName === targetFirstName && playerLastName === targetLastName);
      });

      if (player) {
        try {
          await base44.asServiceRole.entities.Player.update(player.id, { photo_url: photoUrl });
          results.updated++;
        } catch (e) {
          results.failed++;
          results.notFound.push(`${number} - ${firstName} ${lastName}`);
        }
      } else {
        results.failed++;
        results.notFound.push(`${number} - ${firstName} ${lastName}`);
      }
    }

    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
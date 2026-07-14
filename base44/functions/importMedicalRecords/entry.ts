import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url } = await req.json();
    if (!file_url) return Response.json({ error: 'file_url required' }, { status: 400 });

    // Extraer datos del archivo
    const extractRes = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: 'object',
        properties: {
          player_name: { type: 'string' },
          category_division: { type: 'string' },
          diagnosis: { type: 'string' },
          affected_limb: { type: 'string' },
          injury_date: { type: 'string' },
          expected_return: { type: 'string' },
          days_lost: { type: 'number' },
          rehab_stage: { type: 'string' },
          treatment: { type: 'string' },
          notes: { type: 'string' }
        }
      }
    });

    if (extractRes.status !== 'success' || !extractRes.output) {
      return Response.json({ error: 'Failed to extract data', details: extractRes.details }, { status: 400 });
    }

    const rows = Array.isArray(extractRes.output) ? extractRes.output : [extractRes.output];

    // Obtener todos los jugadores y mapeos
    const players = await base44.asServiceRole.entities.Player.list();
    const mappings = await base44.asServiceRole.entities.PlayerNameMapping.list();

    // Crear índice de búsqueda
    const playersByName = {};
    const playersByNormalized = {};
    players.forEach(p => {
      const normalizedFull = (p.full_name || '').toLowerCase().trim();
      playersByName[normalizedFull] = p;
      playersByNormalized[normalizedFull] = p;
    });

    // Crear índice de mapeos
    const mappingsByAlias = {};
    mappings.forEach(m => {
      if (m.aliases) {
        m.aliases.forEach(alias => {
          const normalized = alias.toLowerCase().trim();
          mappingsByAlias[normalized] = m.player_id;
        });
      }
    });

    // Procesar filas
    const created = [];
    const failed = [];

    for (const row of rows) {
      if (!row.player_name || !row.diagnosis) continue;

      let player_id = null;
      const normalizedName = row.player_name.toLowerCase().trim();

      // Buscar en mapeos primero
      if (mappingsByAlias[normalizedName]) {
        player_id = mappingsByAlias[normalizedName];
      } else if (playersByName[normalizedName]) {
        player_id = playersByName[normalizedName].id;
      }

      if (!player_id) {
        failed.push({ name: row.player_name, reason: 'Jugador no encontrado en el sistema' });
        continue;
      }

      try {
        const medicalData = {
          player_id,
          player_name: row.player_name,
          category_division: row.category_division || '',
          diagnosis: row.diagnosis,
          affected_limb: row.affected_limb || '',
          status: 'Lesionado',
          injury_date: row.injury_date || undefined,
          expected_return: row.expected_return || undefined,
          days_lost: row.days_lost || 0,
          rehab_stage: row.rehab_stage || '',
          treatment: row.treatment || '',
          notes: row.notes || '',
          record_type: 'Lesión'
        };

        // Filtrar campos vacíos
        Object.keys(medicalData).forEach(k => {
          if (medicalData[k] === '' || medicalData[k] === undefined) {
            delete medicalData[k];
          }
        });

        const result = await base44.asServiceRole.entities.MedicalRecord.create(medicalData);
        created.push({ id: result.id, player_name: row.player_name });
      } catch (error) {
        failed.push({ name: row.player_name, reason: error.message });
      }
    }

    return Response.json({
      success: true,
      created: created.length,
      failed: failed.length,
      details: { created, failed }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
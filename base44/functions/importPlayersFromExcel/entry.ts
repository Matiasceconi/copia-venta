import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function normalize(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s/g, '');
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  let day, month, year;

  // Intenta DD.MM.YYYY o DD/MM/YYYY
  if (str.includes('.') || str.includes('/')) {
    const sep = str.includes('.') ? '.' : '/';
    const parts = str.split(sep);
    if (parts.length === 3) {
      [day, month, year] = parts.map(p => p.trim());
      let y = parseInt(year);
      if (y < 100) y = y < 50 ? 2000 + y : 1900 + y;
      return `${y}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url } = await req.json();
    if (!file_url) return Response.json({ error: 'file_url required' }, { status: 400 });

    const jsonSchema = {
      type: 'object',
      properties: {
        TIPO_DOCUMENTO: { type: 'string' },
        DNI: { type: ['number', 'string'] },
        APELLIDO: { type: 'string' },
        NOMBRE: { type: 'string' },
        'FECHA DE NACIMIENTO (DD.MM.AAAA)': { type: 'string' }
      }
    };

    const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: jsonSchema
    });

    if (result.status !== 'success' || !result.output) {
      return Response.json({ error: 'Error extracting data from file' }, { status: 400 });
    }

    const rows = Array.isArray(result.output) ? result.output : [result.output];
    const existingPlayers = await base44.entities.Player.list('-created_date', 500);

    const duplicatesByDni = {};
    const invalidDates = [];
    const created = [];
    const updated = [];

    const playerMap = new Map(
      existingPlayers.map(p => [p.document_number || normalize(p.full_name), p])
    );

    for (const row of rows) {
      const dni = row.DNI ? String(row.DNI).trim() : null;
      const lastName = (row.APELLIDO || '').trim();
      const firstName = (row.NOMBRE || '').trim();
      const fullName = `${firstName} ${lastName}`.trim();
      const normalizedName = normalize(fullName);
      const birthDate = parseDate(row['FECHA DE NACIMIENTO (DD.MM.AAAA)']);

      if (!firstName || !lastName) continue;

      // Detectar duplicados por DNI
      if (dni && duplicatesByDni[dni]) {
        duplicatesByDni[dni]++;
        continue;
      }
      if (dni) duplicatesByDni[dni] = 1;

      // Detectar fechas inválidas
      if (row['FECHA DE NACIMIENTO (DD.MM.AAAA)'] && !birthDate) {
        invalidDates.push({ name: fullName, value: row['FECHA DE NACIMIENTO (DD.MM.AAAA)'] });
        continue;
      }

      const payload = {
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        normalized_name: normalizedName,
        birth_date: birthDate,
        document_number: dni,
        position: 'Defensor Central',
        category: 'Reserva',
        status: 'Disponible',
        division: 'Reserva'
      };

      const key = dni || normalizedName;
      const existing = playerMap.get(key);

      if (existing) {
        await base44.entities.Player.update(existing.id, payload);
        updated.push(fullName);
      } else {
        await base44.entities.Player.create(payload);
        created.push(fullName);
        playerMap.set(key, payload);
      }
    }

    const duplicateCount = Object.values(duplicatesByDni).filter(c => c > 1).length;

    return Response.json({
      success: true,
      created: created.length,
      updated: updated.length,
      duplicates: duplicateCount,
      invalid_dates: invalidDates.length,
      details: {
        created_names: created.slice(0, 10),
        updated_names: updated.slice(0, 10),
        invalid_dates: invalidDates.slice(0, 5)
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
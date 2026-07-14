import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── Normalización canónica ──────────────────────────────────────────────────
function normalize(str) {
  if (!str) return "";
  return str
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[,\.]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCSVName(raw) {
  const s = (raw || "").trim();
  if (s.includes(",")) {
    const [last, first] = s.split(",").map(p => p.trim());
    return normalize(`${first} ${last}`);
  }
  return normalize(s);
}

function wordScore(a, b) {
  const wa = normalize(a).split(" ").filter(w => w.length > 1);
  const wb = normalize(b).split(" ").filter(w => w.length > 1);
  if (!wa.length || !wb.length) return 0;
  const shared = wa.filter(w => wb.includes(w)).length;
  return shared / Math.max(wa.length, wb.length);
}

function diceScore(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const bigrams = (s) => {
    const arr = [];
    for (let i = 0; i < s.length - 1; i++) arr.push(s[i] + s[i+1]);
    return arr;
  };
  const ba = bigrams(na);
  const bb = bigrams(nb);
  if (!ba.length || !bb.length) return 0;
  const setB = new Set(bb);
  const shared = ba.filter(g => setB.has(g)).length;
  return (2 * shared) / (ba.length + bb.length);
}

function combinedScore(csvName, playerName) {
  const ws = wordScore(csvName, playerName);
  const ds = diceScore(csvName, playerName);
  const exact = normalize(csvName) === normalize(playerName) ? 1 :
    (normalizeCSVName(csvName) === normalize(playerName) ? 1 : 0);
  if (exact) return 1;
  return Math.max(ws, ds * 0.9);
}

// ── Reasignar todos los registros de una tabla ─────────────────────────────
async function migrateEntity(svc, entityName, discard_id, keep_id, limit = 500) {
  let migrated = 0;
  const records = await svc.entities[entityName].filter({ player_id: discard_id }, '', limit);
  for (const r of records) {
    await svc.entities[entityName].update(r.id, { player_id: keep_id });
    migrated++;
  }
  return migrated;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action, names, assignments, source } = body;
    const svc = base44.asServiceRole;

    // ── Cargar datos base ──────────────────────────────────────────────────
    const [players, aliases] = await Promise.all([
      svc.entities.Player.list('', 500),
      svc.entities.PlayerAlias.list('', 2000),
    ]);

    const aliasIndex = {};
    aliases.forEach(a => { aliasIndex[a.normalized_alias] = a.player_id; });

    // ═══════════════════════════════════════════════════════════════════════
    // ACTION: resolve
    // ═══════════════════════════════════════════════════════════════════════
    if (action === 'resolve' && Array.isArray(names)) {
      const results = names.map(rawName => {
        const normalized = normalizeCSVName(rawName);

        if (aliasIndex[normalized]) {
          const player = players.find(p => p.id === aliasIndex[normalized]);
          return { csv_name: rawName, normalized, player_id: player?.id || null, player_name: player?.full_name || null, confidence: 1.0, status: 'linked', match_source: 'alias_exact' };
        }

        const exactPlayer = players.find(p => normalize(p.full_name || `${p.first_name} ${p.last_name}`) === normalized);
        if (exactPlayer) {
          return { csv_name: rawName, normalized, player_id: exactPlayer.id, player_name: exactPlayer.full_name, confidence: 1.0, status: 'linked', match_source: 'name_exact' };
        }

        const candidates = players
          .map(p => {
            const fn = p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim();
            return { player_id: p.id, player_name: fn, position: p.position || '', division: p.division || '', confidence: Math.round(combinedScore(rawName, fn) * 100) / 100 };
          })
          .filter(c => c.confidence > 0.3)
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 5);

        const best = candidates[0];
        if (best && best.confidence >= 0.90) {
          return { csv_name: rawName, normalized, player_id: best.player_id, player_name: best.player_name, confidence: best.confidence, status: 'linked', match_source: 'fuzzy_auto', candidates };
        }
        return { csv_name: rawName, normalized, player_id: null, player_name: null, confidence: best?.confidence || 0, status: best && best.confidence >= 0.6 ? 'review' : 'unrecognized', match_source: 'fuzzy_low', candidates: candidates.slice(0, 5) };
      });

      return Response.json({ action: 'resolve', results });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ACTION: confirm — guardar alias + backfill en TODAS las tablas
    // ═══════════════════════════════════════════════════════════════════════
    if (action === 'confirm' && Array.isArray(assignments)) {
      const saved = [];
      for (const { csv_name, player_id, confidence } of assignments) {
        const player = players.find(p => p.id === player_id);
        if (!player) continue;

        const normalized = normalizeCSVName(csv_name);

        // Crear alias si no existe
        const existing = aliases.find(a => a.normalized_alias === normalized && a.player_id === player_id);
        if (!existing) {
          await svc.entities.PlayerAlias.create({
            player_id,
            player_name: player.full_name || `${player.first_name} ${player.last_name}`,
            alias_name: csv_name,
            normalized_alias: normalized,
            source: source || 'Manual',
            confidence_score: confidence || 1.0,
          });
        }

        saved.push({ csv_name, player_id, player_name: player.full_name });
      }

      // Backfill en todas las tablas relevantes
      const TABLES = ['CatapultReport', 'MinutesRecord', 'MedicalRecord', 'NutritionRecord', 'GPSRecord'];
      for (const { csv_name, player_id } of assignments) {
        for (const table of TABLES) {
          try {
            const records = await svc.entities[table].filter({ player_name: csv_name }, '', 300);
            for (const r of records) {
              if (!r.player_id) await svc.entities[table].update(r.id, { player_id });
            }
          } catch (_) { /* tabla puede no existir */ }
        }
      }

      return Response.json({ action: 'confirm', saved });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ACTION: analyze_all — cobertura de CatapultReport por nombre
    // ═══════════════════════════════════════════════════════════════════════
    if (action === 'analyze_all') {
      const allReports = await svc.entities.CatapultReport.list('-date', 3000);

      const byName = {};
      for (const r of allReports) {
        const key = r.player_name || '(sin nombre)';
        if (!byName[key]) byName[key] = { csv_name: key, player_id: r.player_id || null, count: 0, dates: [] };
        byName[key].count++;
        if (r.date && !byName[key].dates.includes(r.date)) byName[key].dates.push(r.date);
        if (r.player_id) byName[key].player_id = r.player_id;
      }

      const entries = Object.values(byName).map(entry => {
        const normalized = normalizeCSVName(entry.csv_name);
        const matchedPlayer = entry.player_id ? players.find(p => p.id === entry.player_id) : null;
        if (matchedPlayer) {
          return { ...entry, normalized, status: 'linked', player_name: matchedPlayer.full_name, confidence: 1.0, candidates: [] };
        }
        if (aliasIndex[normalized]) {
          const p = players.find(pl => pl.id === aliasIndex[normalized]);
          return { ...entry, normalized, status: 'linked', player_id: aliasIndex[normalized], player_name: p?.full_name || null, confidence: 1.0, candidates: [] };
        }

        const candidates = players
          .map(p => {
            const fn = p.full_name || `${p.first_name} ${p.last_name}`.trim();
            return { player_id: p.id, player_name: fn, position: p.position || '', confidence: Math.round(combinedScore(entry.csv_name, fn) * 100) / 100 };
          })
          .filter(c => c.confidence > 0.3)
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 5);

        const best = candidates[0];
        const status = !best ? 'unrecognized' : best.confidence >= 0.90 ? 'review' : best.confidence >= 0.6 ? 'review' : 'unrecognized';
        return { ...entry, normalized, status, player_name: null, confidence: best?.confidence || 0, candidates };
      });

      const linked = entries.filter(e => e.status === 'linked').length;
      const review = entries.filter(e => e.status === 'review').length;
      const unrecognized = entries.filter(e => e.status === 'unrecognized').length;

      return Response.json({ action: 'analyze_all', summary: { total: entries.length, linked, review, unrecognized, totalRecords: allReports.length }, entries });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ACTION: coverage — cobertura de player_id en todas las tablas
    // ═══════════════════════════════════════════════════════════════════════
    if (action === 'coverage') {
      const TABLES = [
        { name: 'CatapultReport', label: 'GPS / Catapult' },
        { name: 'MinutesRecord', label: 'Minutos' },
        { name: 'MedicalRecord', label: 'Médico' },
        { name: 'NutritionRecord', label: 'Nutrición' },
        { name: 'GPSRecord', label: 'GPS (legacy)' },
      ];

      const coverage = [];
      for (const { name, label } of TABLES) {
        try {
          const all = await svc.entities[name].list('', 500);
          const withId = all.filter(r => r.player_id);
          coverage.push({
            table: name,
            label,
            total: all.length,
            linked: withId.length,
            missing: all.length - withId.length,
            pct: all.length > 0 ? Math.round(withId.length / all.length * 100) : 100,
          });
        } catch (_) {
          coverage.push({ table: name, label, total: 0, linked: 0, missing: 0, pct: 100 });
        }
      }

      return Response.json({ action: 'coverage', coverage });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ACTION: detect_duplicates
    // ═══════════════════════════════════════════════════════════════════════
    if (action === 'detect_duplicates') {
      const duplicates = [];
      for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
          const nameA = players[i].full_name || '';
          const nameB = players[j].full_name || '';
          const score = combinedScore(nameA, nameB);
          if (score >= 0.75) {
            duplicates.push({
              playerA: { id: players[i].id, full_name: nameA, division: players[i].division, category: players[i].category, jersey_number: players[i].jersey_number },
              playerB: { id: players[j].id, full_name: nameB, division: players[j].division, category: players[j].category, jersey_number: players[j].jersey_number },
              score: Math.round(score * 100) / 100,
            });
          }
        }
      }
      duplicates.sort((a, b) => b.score - a.score);
      return Response.json({ action: 'detect_duplicates', duplicates });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ACTION: merge — fusionar dos jugadores, migrar TODAS las tablas
    // ═══════════════════════════════════════════════════════════════════════
    if (action === 'merge') {
      const { keep_id, discard_id } = body;
      if (!keep_id || !discard_id) return Response.json({ error: 'keep_id y discard_id requeridos' }, { status: 400 });

      const keepPlayer = players.find(p => p.id === keep_id);
      if (!keepPlayer) return Response.json({ error: 'Jugador a conservar no encontrado' }, { status: 400 });
      const discardPlayer = players.find(p => p.id === discard_id);
      const discardName = discardPlayer?.full_name || '';

      // Migrar todas las tablas
      const ENTITY_TABLES = ['CatapultReport', 'MinutesRecord', 'MedicalRecord', 'NutritionRecord', 'GPSRecord', 'PlayerExerciseLog'];
      const migration = {};
      for (const tbl of ENTITY_TABLES) {
        try {
          migration[tbl] = await migrateEntity(svc, tbl, discard_id, keep_id);
        } catch (_) { migration[tbl] = 0; }
      }

      // Mover aliases del descartado al conservado
      const discardAliases = aliases.filter(a => a.player_id === discard_id);
      for (const a of discardAliases) {
        await svc.entities.PlayerAlias.update(a.id, { player_id: keep_id, player_name: keepPlayer.full_name });
      }

      // Agregar nombre del descartado como alias
      if (discardName) {
        const norm = normalize(discardName);
        const existingAlias = aliases.find(a => a.normalized_alias === norm && a.player_id === keep_id);
        if (!existingAlias) {
          await svc.entities.PlayerAlias.create({
            player_id: keep_id,
            player_name: keepPlayer.full_name,
            alias_name: discardName,
            normalized_alias: norm,
            source: 'Manual',
            confidence_score: 1.0,
          });
        }
      }

      await svc.entities.Player.delete(discard_id);

      return Response.json({ action: 'merge', kept: keep_id, discarded: discard_id, migration });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ACTION: backfill_all — re-aplicar todos los aliases a todas las tablas
    // ═══════════════════════════════════════════════════════════════════════
    if (action === 'backfill_all') {
      const TABLES = ['CatapultReport', 'MinutesRecord', 'MedicalRecord', 'NutritionRecord', 'GPSRecord'];
      let totalFixed = 0;

      for (const table of TABLES) {
        try {
          const records = await svc.entities[table].list('', 1000);
          const orphans = records.filter(r => !r.player_id && r.player_name);
          for (const r of orphans) {
            const norm = normalizeCSVName(r.player_name);
            let pid = aliasIndex[norm];
            if (!pid) {
              const exact = players.find(p => normalize(p.full_name || `${p.first_name} ${p.last_name}`) === norm);
              if (exact) pid = exact.id;
            }
            if (!pid) {
              let best = null, bestScore = 0;
              for (const p of players) {
                const fn = p.full_name || `${p.first_name} ${p.last_name}`.trim();
                const score = combinedScore(r.player_name, fn);
                if (score > bestScore) { bestScore = score; best = p; }
              }
              if (best && bestScore >= 0.90) pid = best.id;
            }
            if (pid) {
              await svc.entities[table].update(r.id, { player_id: pid });
              totalFixed++;
            }
          }
        } catch (_) {}
      }

      return Response.json({ action: 'backfill_all', fixed: totalFixed });
    }

    return Response.json({ error: 'Acción no reconocida' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
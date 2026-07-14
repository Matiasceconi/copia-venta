import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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
  const na = normalize(a), nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const bigrams = (s) => { const r=[]; for (let i=0;i<s.length-1;i++) r.push(s[i]+s[i+1]); return r; };
  const ba = bigrams(na), bb = bigrams(nb);
  if (!ba.length || !bb.length) return 0;
  const setB = new Set(bb);
  return (2 * ba.filter(g => setB.has(g)).length) / (ba.length + bb.length);
}

function combinedScore(csvName, playerName) {
  if (normalize(csvName) === normalize(playerName) || normalizeCSVName(csvName) === normalize(playerName)) return 1;
  return Math.max(wordScore(csvName, playerName), diceScore(csvName, playerName) * 0.9);
}

function matchColumn(raw) {
  const h = raw.toLowerCase().replace(/^\uFEFF/, "").trim();
  if (h === "name" || h === "jugador" || h === "player" || h === "nombre" || h === "athlete") return "player_name";
  if (h === "total duration" || h === "tot dur") return "total_duration";
  if (h.includes("total distance") || h === "tot dist (m)" || h === "tot dist") return "total_distance";
  if (h.startsWith("d") && h.includes("19")) return "distance_hsr";
  if ((h.startsWith("d+") || h.startsWith("d +")) && h.includes("25")) return "sprint_distance";
  if (h === "sprint efforts" || h === "sprint effs") return "sprint_efforts";
  if (h.includes("acc") && (h.includes("3mt") || h.includes("3 m"))) return "accelerations";
  if (h.includes("dec") && (h.includes("3mt") || h.includes("3 m"))) return "decelerations";
  if (h === "total player load" || h === "tot pl" || h === "player load") return "player_load";
  if (h.includes("maximum velocity") || h === "max vel (km/h)" || h === "max velocity (km/h)") return "max_velocity";
  if (h.includes("max vel") && h.includes("%")) return "max_velocity_percentage";
  if (h === "metros x min" || h === "m/min" || h === "meters per minute") return "meters_per_minute";
  return null;
}

function parseNum(val) {
  if (val == null || val === "" || val === "-") return null;
  const str = String(val).trim();
  const hasCommaDecimal = /^\d+,\d+$/.test(str) || /^\d{1,3}(\.\d{3})*,\d+$/.test(str);
  const cleaned = hasCommaDecimal ? str.replace(/\./g, "").replace(",", ".") : str.replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function parseDuration(val) {
  if (!val) return null;
  const parts = String(val).trim().split(":").map(Number);
  if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 60;
  if (parts.length === 2) return parts[0] + parts[1] / 60;
  return parseNum(val);
}

function splitCSVLine(line, sep) {
  const result = []; let cur = "", inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === sep && !inQuotes) { result.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  result.push(cur.trim());
  return result;
}

function parseCatapultCSV(text) {
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split("\n").map(l => l.trim()).filter(Boolean);
  const firstSemi = lines[0].split(";").length, firstComma = lines[0].split(",").length;
  const sep = firstSemi > firstComma ? ";" : ",";

  let headerIdx = -1, headers = [];
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const cols = splitCSVLine(lines[i], sep);
    const firstLow = cols[0]?.replace(/^\uFEFF/, "").toLowerCase().trim();
    const mapped = cols.filter(c => matchColumn(c) !== null).length;
    if (firstLow === "name" || firstLow === "jugador" || firstLow === "athlete" || mapped >= 3) {
      headerIdx = i; headers = cols.map((c, idx) => idx === 0 ? c.replace(/^\uFEFF/, "") : c); break;
    }
  }
  if (headerIdx === -1) return { error: "No se encontró fila de encabezados válida." };

  const fieldMap = {};
  headers.forEach((h, idx) => {
    const field = matchColumn(h);
    if (field) fieldMap[idx] = field;
    else if (idx === 0) fieldMap[idx] = "player_name";
  });

  const rows = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i], sep);
    const obj = {};
    Object.entries(fieldMap).forEach(([colIdx, field]) => {
      const raw = cols[parseInt(colIdx)];
      if (field === "player_name") obj[field] = raw || "";
      else if (field === "total_duration") obj[field] = parseDuration(raw);
      else obj[field] = parseNum(raw);
    });
    const name = (obj.player_name || "").trim();
    if (!name) continue;
    if (["total", "promedio", "average", "team", "totals"].includes(name.toLowerCase())) continue;
    rows.push(obj);
  }
  return { rows };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { csv_url, session_id, session_date, file_name } = await req.json();

    const csvText = await fetch(csv_url).then(r => r.text());
    const parseResult = parseCatapultCSV(csvText);
    if (parseResult.error) return Response.json({ error: parseResult.error }, { status: 400 });

    const rows = parseResult.rows;

    // ── Fuente oficial: Players + PlayerAlias ──────────────────────────────
    const [players, aliases] = await Promise.all([
      base44.asServiceRole.entities.Player.list('', 500),
      base44.asServiceRole.entities.PlayerAlias.list('', 2000),
    ]);

    // Índice alias → player_id
    const aliasIndex = {};
    aliases.forEach(a => { aliasIndex[a.normalized_alias] = a.player_id; });

    function resolvePlayer(rawName) {
      const norm = normalizeCSVName(rawName);

      // 1. Alias exacto
      if (aliasIndex[norm]) {
        const p = players.find(pl => pl.id === aliasIndex[norm]);
        return p ? { player: p, confidence: 1.0, source: 'alias' } : null;
      }

      // 2. Nombre oficial exacto
      const exact = players.find(p => normalize(p.full_name || `${p.first_name} ${p.last_name}`) === norm);
      if (exact) return { player: exact, confidence: 1.0, source: 'exact' };

      // 3. Fuzzy
      let best = null, bestScore = 0;
      for (const p of players) {
        const score = combinedScore(rawName, p.full_name || `${p.first_name} ${p.last_name}`);
        if (score > bestScore) { bestScore = score; best = p; }
      }
      if (best && bestScore >= 0.90) return { player: best, confidence: bestScore, source: 'fuzzy' };

      return null;
    }

    // ── Procesar filas ─────────────────────────────────────────────────────
    const matched = [], unmatched = [];
    const records = [];

    for (const row of rows) {
      const gpsName = (row.player_name || "").trim();
      const resolved = resolvePlayer(gpsName);

      const record = {
        player_name: gpsName,
        date: session_date,
        session_id,
        session_label: file_name,
        file_url: csv_url,
        total_duration: row.total_duration,
        total_distance: row.total_distance,
        distance_hsr: row.distance_hsr,
        sprint_distance: row.sprint_distance,
        sprint_efforts: row.sprint_efforts,
        accelerations: row.accelerations,
        decelerations: row.decelerations,
        player_load: row.player_load,
        max_velocity: row.max_velocity,
        max_velocity_percentage: row.max_velocity_percentage,
        meters_per_minute: row.meters_per_minute,
      };

      if (resolved) {
        record.player_id = resolved.player.id;
        matched.push({ name: gpsName, playerId: resolved.player.id, playerName: resolved.player.full_name, confidence: resolved.confidence });

        // Auto-crear alias si el match fue por fuzzy
        if (resolved.source === 'fuzzy') {
          const norm = normalizeCSVName(gpsName);
          const exists = aliases.find(a => a.normalized_alias === norm && a.player_id === resolved.player.id);
          if (!exists) {
            await base44.asServiceRole.entities.PlayerAlias.create({
              player_id: resolved.player.id,
              player_name: resolved.player.full_name,
              alias_name: gpsName,
              normalized_alias: norm,
              source: 'Catapult',
              confidence_score: resolved.confidence,
            });
          }
        }
      } else {
        unmatched.push(gpsName);
      }

      records.push(record);
    }

    // Bulk insert
    await base44.asServiceRole.entities.CatapultReport.bulkCreate(records);

    return Response.json({
      success: true,
      total_imported: records.length,
      total_matched: matched.length,
      total_unmatched: unmatched.length,
      details: { matched, unmatched },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
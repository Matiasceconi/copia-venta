import { COLUMN_DEFS } from "@/components/sessions/gps/gpsColumnsConfig";

export function normalize(s) {
  return (s || "").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

export function parseNum(v) {
  if (!v || v === "-" || v === "") return undefined;
  const n = parseFloat(v.toString().trim());
  return isNaN(n) ? undefined : n;
}

// RFC-4180 CSV parser: handles commas inside double-quoted fields
export function parseCSV(text) {
  const raw = text.startsWith("\uFEFF") ? text.slice(1) : text;
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    const next = raw[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { row.push(field.trim()); field = ""; }
      else if (ch === '\n') {
        row.push(field.trim()); field = "";
        if (row.some(c => c !== "")) rows.push(row);
        row = [];
      } else if (ch === '\r') { /* skip */ }
      else { field += ch; }
    }
  }
  if (field || row.length) { row.push(field.trim()); if (row.some(c => c !== "")) rows.push(row); }
  return rows;
}

// Detecta columnas del CSV mapeándolas por NOMBRE (no por posición) contra COLUMN_DEFS.
// Devuelve: matched (colDef + header real del csv), missingMainFields (principales no encontradas), extraHeaders (columnas del csv sin mapeo conocido)
export function detectColumns(headers) {
  const matched = []; // { colDef, header }
  const usedHeaders = new Set();

  COLUMN_DEFS.forEach(colDef => {
    const found = headers.find(h => normalize(h) === normalize(colDef.csvHeader));
    if (found) {
      matched.push({ colDef, header: found });
      usedHeaders.add(found);
    }
  });

  const missingMainFields = COLUMN_DEFS.filter(c => c.main && !matched.some(m => m.colDef.field === c.field));
  const extraHeaders = headers.filter(h => h && !usedHeaders.has(h));

  return { matched, missingMainFields, extraHeaders };
}
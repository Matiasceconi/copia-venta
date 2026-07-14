import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, FileSpreadsheet, FileText, ExternalLink, Check, X, ChevronDown, ChevronUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList } from "recharts";
import CsvPreviewTable from "@/components/catapult/CsvPreviewTable";
import PlayerEvolution from "@/components/catapult/PlayerEvolution";
import SessionComparison from "@/components/catapult/SessionComparison";
import MatchImport from "@/components/catapult/MatchImport";
import TeamReport from "@/components/catapult/TeamReport";
import WeeklyDashboard from "@/components/catapult/WeeklyDashboard";

// ── Fuzzy column matcher: maps any header string to an entity field ──────────
function matchColumn(raw) {
  const h = raw.toLowerCase().replace(/^\uFEFF/, "").trim();
  if (h === "name" || h === "jugador" || h === "player" || h === "nombre" || h === "athlete") return "player_name";
  if (h === "total duration" || h === "tot dur") return "total_duration";
  if (h.includes("total distance") || h === "tot dist (m)" || h === "tot dist") return "total_distance";
  // HSR: contains "19" — covers "D 19,8-25,0 km/h (m)" and "D 19.8-25.0 km/h (m)"
  if (h.startsWith("d") && h.includes("19")) return "distance_hsr";
  // Sprint distance: "D+" or "D +" followed by 25
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
  // Handle both comma and dot as decimal separator
  const str = String(val).trim();
  // If it has a comma (e.g. "4.010,55" or "81,81"), normalize
  const hasCommaDecimal = /^\d+,\d+$/.test(str) || /^\d{1,3}(\.\d{3})*,\d+$/.test(str);
  const cleaned = hasCommaDecimal
    ? str.replace(/\./g, "").replace(",", ".")
    : str.replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

// Parse "HH:MM:SS" or "MM:SS" duration to minutes
function parseDuration(val) {
  if (!val) return null;
  const parts = String(val).trim().split(":").map(Number);
  if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 60;
  if (parts.length === 2) return parts[0] + parts[1] / 60;
  return parseNum(val);
}

// Split a CSV line respecting quoted fields
function splitCSVLine(line, sep) {
  const result = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === sep && !inQuotes) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

function parseCSVFile(text) {
  // Strip BOM
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split("\n").map((l) => l.trim()).filter(Boolean);

  // Try semicolon first; if first line has more fields with ";" use it, else ","
  const firstSemi = lines[0].split(";").length;
  const firstComma = lines[0].split(",").length;
  const sep = firstSemi > firstComma ? ";" : ",";

  // Find header row: first col matches "name"/"jugador" OR ≥3 cols map to known fields
  let headerIdx = -1;
  let headers = [];
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const cols = splitCSVLine(lines[i], sep);
    const firstLow = cols[0]?.replace(/^\uFEFF/, "").toLowerCase().trim();
    const mapped = cols.filter((c) => matchColumn(c) !== null).length;
    if (firstLow === "name" || firstLow === "jugador" || firstLow === "athlete" || mapped >= 3) {
      headerIdx = i;
      headers = cols.map((c, idx) => idx === 0 ? c.replace(/^\uFEFF/, "") : c);
      break;
    }
  }

  if (headerIdx === -1) {
    return { error: `No se encontró fila de encabezados. Primeras líneas del archivo: ${lines.slice(0, 2).join(" | ")}` };
  }

  console.log("[Catapult] Headers:", headers, "| Sep:", sep);

  // Build fieldMap: colIndex → entity field
  const fieldMap = {};
  headers.forEach((h, idx) => {
    const field = matchColumn(h);
    if (field) fieldMap[idx] = field;
    else if (idx === 0) fieldMap[idx] = "player_name";
  });

  const mappedFields = Object.values(fieldMap);
  const EXPECTED = ["player_name", "total_distance", "distance_hsr", "sprint_distance", "player_load", "max_velocity"];
  const missing = EXPECTED.filter((f) => !mappedFields.includes(f));

  const rows = [];
  const rawPreview = [];
  const totalLines = lines.length - headerIdx - 1;

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
    if (rawPreview.length < 5) rawPreview.push(obj);
  }

  console.log("[Catapult] Jugadores válidos:", rows.length, "/ Filas:", totalLines);

  return { rows, headers, rawPreview, missing, sep, totalLines };
}

const CHART_METRICS = [
  { key: "total_distance",  label: "Distancia (m)",    color: "#60a5fa" },
  { key: "sprint_distance", label: "+25 km/h (m)",     color: "#fbbf24" },
  { key: "distance_hsr",   label: "19.8-25 km/h (m)", color: "#34d399" },
  { key: "player_load",    label: "Player Load",       color: "#a78bfa" },
  { key: "max_velocity",   label: "Vel. Máx (km/h)",  color: "#f87171" },
  { key: "accelerations",  label: "Aceleraciones",     color: "#fb923c" },
];

// Calculate session averages
function calculateSessionAverages(rows) {
  const metrics = ["total_distance", "distance_hsr", "sprint_distance", "player_load", "max_velocity", "accelerations", "decelerations"];
  const averages = {};
  
  metrics.forEach(metric => {
    const values = rows.map(r => r[metric]).filter(v => v != null);
    if (values.length > 0) {
      averages[metric] = values.reduce((a, b) => a + b, 0) / values.length;
    }
  });
  
  return averages;
}

// ── Session Row with inline CSV import ─────────────────────────────────────
function SessionRow({ session, sessionReports, onImportDone }) {
  const [expanded, setExpanded] = useState(false);
  const [csvState, setCsvState] = useState(null); // { rows, rawPreview, headers, missing, file_url, error }
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null); // { count } or { error }
  const fileRef = useRef();
  const { toast } = useToast();

  const hasData = sessionReports.length > 0;
  const sessionAverages = csvState?.rows ? calculateSessionAverages(csvState.rows) : {};

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    setCsvState(null);
    setImportResult(null);
    try {
      const text = await file.text();
      console.log("[Catapult] Archivo leído:", file.name, "Tamaño:", file.size);
      const parsed = parseCSVFile(text);
      console.log("[Catapult] Resultado del parseo:", parsed);

      if (parsed.error) {
        setCsvState({ error: parsed.error });
        return;
      }

      if (parsed.rows.length === 0) {
        setCsvState({ error: "No se encontraron jugadores válidos en el archivo." });
        return;
      }

      // Upload file for storage
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setCsvState({ ...parsed, file_url });
    } catch (err) {
      console.error("[Catapult] Error al leer archivo:", err);
      setCsvState({ error: "Error al procesar el archivo: " + err.message });
    } finally {
      setUploading(false);
    }
  }

  async function confirmImport() {
    if (!csvState?.rows) return;
    setImporting(true);
    try {
      await base44.entities.CatapultReport.deleteMany({ session_id: session.id });

      // Resolver player_ids via aliases oficiales
      const [players, aliases] = await Promise.all([
        base44.entities.Player.list("", 500),
        base44.entities.PlayerAlias.list("", 2000),
      ]);
      const aliasIndex = {};
      aliases.forEach(a => { aliasIndex[a.normalized_alias] = a.player_id; });

      function normName(s) {
        const str = (s || "").trim();
        if (str.includes(",")) { const [l,f]=str.split(",").map(p=>p.trim()); return `${f} ${l}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[,.]/g,"").replace(/\s+/g," ").trim(); }
        return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[,.]/g,"").replace(/\s+/g," ").trim();
      }
      function wordScore(a,b){const wa=normName(a).split(" ").filter(w=>w.length>1);const wb=normName(b).split(" ").filter(w=>w.length>1);if(!wa.length||!wb.length)return 0;return wa.filter(w=>wb.includes(w)).length/Math.max(wa.length,wb.length);}

      function resolvePlayer(rawName) {
        const norm = normName(rawName);
        if (aliasIndex[norm]) return { id: aliasIndex[norm] };
        const exact = players.find(p => normName(p.full_name || `${p.first_name} ${p.last_name}`) === norm);
        if (exact) return { id: exact.id };
        let best = null, bestScore = 0;
        for (const p of players) {
          const score = wordScore(rawName, p.full_name || `${p.first_name} ${p.last_name}`);
          if (score > bestScore) { bestScore = score; best = p; }
        }
        return best && bestScore >= 0.90 ? { id: best.id } : null;
      }

      const records = csvState.rows.map((r) => {
        const resolved = resolvePlayer(r.player_name || "");
        return { ...r, date: session.date, session_id: session.id, session_label: session.title, file_url: csvState.file_url, ...(resolved ? { player_id: resolved.id } : {}) };
      });
      const matched = records.filter(r => r.player_id).length;
      await base44.entities.CatapultReport.bulkCreate(records);
      setImportResult({ count: records.length });
      setCsvState(null);
      const unmatchedCount = records.length - matched;
      toast({ title: `✓ ${records.length} jugadores importados — ${matched} vinculados${unmatchedCount > 0 ? `, ${unmatchedCount} sin vincular (revisar en Cruce de datos)` : ""}` });
      onImportDone();
    } catch (err) {
      setImportResult({ error: err.message });
      toast({ title: "Error al importar", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Session header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-zinc-800/40 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm truncate">{session.title}</p>
            <p className="text-zinc-500 text-xs mt-0.5">
              {moment(session.date).format("DD/MM/YYYY")}
              {session.match_day_code && <span className="ml-2 text-yellow-500">{session.match_day_code}</span>}
              {session.session_type && <span className="ml-2 text-zinc-600">· {session.session_type}</span>}
            </p>
          </div>
          {hasData && (
            <span className="shrink-0 text-xs bg-green-900/40 text-green-400 border border-green-800/50 px-2 py-0.5 rounded-full">
              {sessionReports.length} jugadores
            </span>
          )}
          {importResult?.count && (
            <span className="shrink-0 text-xs bg-blue-900/40 text-blue-400 border border-blue-800/50 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 size={10} /> {importResult.count} importados
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 ml-3">
          {/* CSV upload button */}
          <label onClick={(e) => e.stopPropagation()} className="cursor-pointer">
            <span
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                uploading ? "bg-zinc-700 text-zinc-400" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
              }`}
            >
              {uploading ? (
                <div className="w-3 h-3 border border-zinc-500 border-t-white rounded-full animate-spin" />
              ) : (
                <Upload size={12} />
              )}
              {uploading ? "Leyendo..." : hasData ? "Reimportar GPS" : "Cargar GPS"}
            </span>
            <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" disabled={uploading} />
          </label>
          {expanded ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-zinc-800">
          {/* CSV parse error */}
          {csvState?.error && (
            <div className="mx-4 my-3 flex items-start gap-2 bg-red-900/20 border border-red-800/40 rounded-lg p-3">
              <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-red-300 text-xs font-medium">Error al leer el archivo</p>
                <p className="text-red-400/80 text-xs mt-0.5">{csvState.error}</p>
              </div>
            </div>
          )}

          {/* Preview panel */}
          {csvState && !csvState.error && (
            <div className="p-4 space-y-3">
              {/* Header info */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-yellow-300 font-semibold text-sm">Vista previa — {csvState.rows.length} jugadores detectados</p>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    Separador: <code className="text-zinc-400 bg-zinc-800 px-1 rounded">{csvState.sep === ";" ? ";" : ","}</code>
                    &nbsp;·&nbsp; Filas leídas: <span className="text-zinc-400">{csvState.totalLines}</span>
                    &nbsp;·&nbsp; Jugadores válidos: <span className="text-green-400">{csvState.rows.length}</span>
                  </p>
                  <p className="text-zinc-600 text-xs mt-1">
                    Columnas detectadas: {csvState.headers.join(", ")}
                  </p>
                  {csvState.missing?.length > 0 && (
                    <p className="text-orange-400 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle size={11} /> Columnas no mapeadas: {csvState.missing.join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setCsvState(null)} className="border-zinc-600 text-zinc-300 hover:bg-zinc-800">
                    <X size={13} className="mr-1" /> Cancelar
                  </Button>
                  <Button size="sm" onClick={confirmImport} disabled={importing} className="bg-green-600 hover:bg-green-700 text-white">
                    {importing ? (
                      <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin mr-1.5" />
                    ) : (
                      <Check size={13} className="mr-1" />
                    )}
                    Confirmar importación
                  </Button>
                </div>
              </div>

              {/* Averages and charts */}
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3">
                <p className="text-white font-semibold text-xs mb-3">Promedios de la sesión:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { key: "total_distance", label: "Distancia (m)", format: (v) => Math.round(v) },
                    { key: "distance_hsr", label: "19.8-25 km/h (m)", format: (v) => Math.round(v) },
                    { key: "sprint_distance", label: "+25 km/h (m)", format: (v) => Math.round(v) },
                    { key: "player_load", label: "Player Load", format: (v) => v.toFixed(0) },
                    { key: "max_velocity", label: "Vel. Máx (km/h)", format: (v) => v.toFixed(1) },
                    { key: "accelerations", label: "Aceleraciones", format: (v) => Math.round(v) },
                  ].map(({ key, label, format }) => (
                    sessionAverages[key] && (
                      <div key={key} className="bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-center">
                        <p className="text-zinc-500 text-xs">{label}</p>
                        <p className="text-white font-bold text-sm mt-0.5">{format(sessionAverages[key])}</p>
                      </div>
                    )
                  ))}
                </div>
              </div>

              {/* Preview table (first 5 rows) */}
              <div>
                <p className="text-zinc-500 text-xs mb-2">Primeras {csvState.rawPreview.length} filas:</p>
                <CsvPreviewTable rows={csvState.rawPreview} />
              </div>
            </div>
          )}

          {/* Existing GPS data */}
          {!csvState && sessionReports.length > 0 && (
            <div className="p-4 space-y-4">
              <div>
                <p className="text-zinc-500 text-xs mb-3">Datos GPS cargados — {sessionReports.length} jugadores</p>
              </div>

              {/* Session averages */}
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3">
                <p className="text-white font-semibold text-xs mb-3">Promedios de la sesión:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { key: "total_distance", label: "Distancia (m)", format: (v) => Math.round(v) },
                    { key: "distance_hsr", label: "19.8-25 km/h (m)", format: (v) => Math.round(v) },
                    { key: "sprint_distance", label: "+25 km/h (m)", format: (v) => Math.round(v) },
                    { key: "player_load", label: "Player Load", format: (v) => v.toFixed(0) },
                    { key: "max_velocity", label: "Vel. Máx (km/h)", format: (v) => v.toFixed(1) },
                    { key: "accelerations", label: "Aceleraciones", format: (v) => Math.round(v) },
                  ].map(({ key, label, format }) => {
                    const avg = calculateSessionAverages(sessionReports)[key];
                    return avg ? (
                      <div key={key} className="bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-center">
                        <p className="text-zinc-500 text-xs">{label}</p>
                        <p className="text-white font-bold text-sm mt-0.5">{format(avg)}</p>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>

              {/* Chart for loaded data */}
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3">
                <p className="text-white font-semibold text-xs mb-3">Distancia total por jugador:</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={sessionReports.filter(r => r.total_distance != null).sort((a, b) => (b.total_distance || 0) - (a.total_distance || 0)).map(r => ({ name: r.player_name?.split(" ").slice(-1)[0] || "—", value: r.total_distance || 0 }))} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis type="number" tick={{ fill: "#71717a", fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" tick={{ fill: "#a1a1aa", fontSize: 10 }} width={80} />
                    <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, color: "#fff", fontSize: 11 }} />
                    <Bar dataKey="value" fill="#60a5fa" radius={[0, 4, 4, 0]}>
                      <LabelList dataKey="value" position="right" style={{ fill: "#e4e4e7", fontSize: 10, fontWeight: 600 }} formatter={(v) => Math.round(v)} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <CsvPreviewTable rows={sessionReports} />
            </div>
          )}

          {/* No data and no preview */}
          {!csvState && sessionReports.length === 0 && (
            <div className="p-6 text-center">
              <FileSpreadsheet size={28} className="text-zinc-700 mx-auto mb-2" />
              <p className="text-zinc-600 text-xs">Sin datos GPS para esta sesión. Cargá el CSV de Catapult.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Training CSV Upload (global, top-level) ─────────────────────────────────
function TrainingUploadBar({ sessions, reports, onImportDone }) {
  const [csvState, setCsvState] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedSession, setSelectedSession] = useState("");
  const fileRef = useRef();
  const { toast } = useToast();

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    setCsvState(null);
    try {
      const text = await file.text();
      const parsed = parseCSVFile(text);
      if (parsed.error) { setCsvState({ error: parsed.error }); return; }
      if (parsed.rows.length === 0) { setCsvState({ error: "No se encontraron jugadores válidos." }); return; }
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setCsvState({ ...parsed, file_url });
    } catch (err) {
      setCsvState({ error: "Error: " + err.message });
    } finally {
      setUploading(false);
    }
  }

  async function confirmImport() {
    if (!csvState?.rows || !selectedSession) return;
    const session = sessions.find(s => s.id === selectedSession);
    if (!session) return;
    setImporting(true);
    try {
      await base44.entities.CatapultReport.deleteMany({ session_id: session.id });

      // Resolver player_ids via aliases oficiales
      const [players, aliases] = await Promise.all([
        base44.entities.Player.list("", 500),
        base44.entities.PlayerAlias.list("", 2000),
      ]);
      const aliasIndex = {};
      aliases.forEach(a => { aliasIndex[a.normalized_alias] = a.player_id; });
      function normName(s) {
        const str = (s || "").trim();
        if (str.includes(",")) { const [l,f]=str.split(",").map(p=>p.trim()); return `${f} ${l}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[,.]/g,"").replace(/\s+/g," ").trim(); }
        return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[,.]/g,"").replace(/\s+/g," ").trim();
      }
      function wordScore(a,b){const wa=normName(a).split(" ").filter(w=>w.length>1);const wb=normName(b).split(" ").filter(w=>w.length>1);if(!wa.length||!wb.length)return 0;return wa.filter(w=>wb.includes(w)).length/Math.max(wa.length,wb.length);}
      function resolvePlayer(rawName) {
        const norm = normName(rawName);
        if (aliasIndex[norm]) return { id: aliasIndex[norm] };
        const exact = players.find(p => normName(p.full_name || `${p.first_name} ${p.last_name}`) === norm);
        if (exact) return { id: exact.id };
        let best = null, bestScore = 0;
        for (const p of players) { const score = wordScore(rawName, p.full_name || `${p.first_name} ${p.last_name}`); if (score > bestScore) { bestScore = score; best = p; } }
        return best && bestScore >= 0.90 ? { id: best.id } : null;
      }

      const records = csvState.rows.map(r => {
        const resolved = resolvePlayer(r.player_name || "");
        return { ...r, date: session.date, session_id: session.id, session_label: session.title, file_url: csvState.file_url, ...(resolved ? { player_id: resolved.id } : {}) };
      });
      const matched = records.filter(r => r.player_id).length;
      await base44.entities.CatapultReport.bulkCreate(records);
      toast({ title: `✓ ${records.length} importados — ${matched} vinculados${records.length - matched > 0 ? `, ${records.length - matched} sin vincular` : ""}` });
      setCsvState(null);
      setSelectedSession("");
      onImportDone();
    } catch (err) {
      toast({ title: "Error al importar", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  }

  const sessionAverages = csvState?.rows ? calculateSessionAverages(csvState.rows) : null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="cursor-pointer">
            <span className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${uploading ? "bg-zinc-700 text-zinc-400" : "bg-blue-600 hover:bg-blue-700 text-white"}`}>
              {uploading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Upload size={16} />}
              {uploading ? "Leyendo..." : "Cargar CSV Entrenamiento"}
            </span>
            <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" disabled={uploading} />
          </label>
          {csvState && !csvState.error && (
            <>
              <select
                value={selectedSession}
                onChange={e => setSelectedSession(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="">— Asignar a sesión —</option>
                {sessions.map(s => <option key={s.id} value={s.id}>{moment(s.date).format("DD/MM/YY")} · {s.title}</option>)}
              </select>
              <button
                onClick={confirmImport}
                disabled={importing || !selectedSession}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white transition-colors"
              >
                {importing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={16} />}
                Confirmar
              </button>
              <button onClick={() => setCsvState(null)} className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-white transition-colors">
                <X size={14} /> Cancelar
              </button>
            </>
          )}
        </div>
        {csvState?.error && (
          <div className="mt-3 flex items-center gap-2 text-xs text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg p-3">
            <AlertCircle size={14} className="shrink-0" /> {csvState.error}
          </div>
        )}
      </div>

      {/* Informe de Entrenamiento */}
      {csvState && !csvState.error && sessionAverages && (
        <div className="p-4 space-y-4">
          <p className="text-white font-semibold text-sm">Informe de Entrenamiento — <span className="text-zinc-400 font-normal">{csvState.rows.length} jugadores detectados</span></p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { key: "total_distance", label: "Distancia (m)", fmt: v => Math.round(v) },
              { key: "distance_hsr", label: "19.8–25 km/h (m)", fmt: v => Math.round(v) },
              { key: "sprint_distance", label: "+25 km/h (m)", fmt: v => Math.round(v) },
              { key: "player_load", label: "Player Load", fmt: v => v.toFixed(0) },
              { key: "max_velocity", label: "Vel. Máx (km/h)", fmt: v => v.toFixed(1) },
              { key: "accelerations", label: "Aceleraciones", fmt: v => Math.round(v) },
            ].map(({ key, label, fmt }) => sessionAverages[key] ? (
              <div key={key} className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-center">
                <p className="text-zinc-500 text-xs">{label}</p>
                <p className="text-white font-bold text-lg mt-0.5">{fmt(sessionAverages[key])}</p>
              </div>
            ) : null)}
          </div>
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3">
            <p className="text-zinc-400 text-xs font-semibold mb-3">Distancia total por jugador</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={csvState.rows.filter(r => r.total_distance != null).sort((a,b)=>(b.total_distance||0)-(a.total_distance||0)).map(r=>({ name: r.player_name?.split(" ").slice(-1)[0]||"—", value: r.total_distance||0 }))} layout="vertical" margin={{ left: 10, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis type="number" tick={{ fill: "#71717a", fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fill: "#a1a1aa", fontSize: 10 }} width={80} />
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, color: "#fff", fontSize: 11 }} />
                <Bar dataKey="value" fill="#60a5fa" radius={[0,4,4,0]}>
                  <LabelList dataKey="value" position="right" style={{ fill: "#e4e4e7", fontSize: 10, fontWeight: 600 }} formatter={v => Math.round(v)} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <CsvPreviewTable rows={csvState.rows} />
        </div>
      )}

      {/* Estado vacío */}
      {!csvState && (
        <div className="p-6 text-center">
          <FileSpreadsheet size={32} className="text-zinc-700 mx-auto mb-2" />
          <p className="text-zinc-600 text-xs">Cargá un CSV de Catapult OpenField para ver el informe de entrenamiento</p>
        </div>
      )}
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function Catapult() {
  const [sessions, setSessions] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("weekly");
  const { toast } = useToast();

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const [s, r] = await Promise.all([
        base44.entities.TrainingSession.list("-date", 100),
        base44.entities.CatapultReport.list("-date", 500),
      ]);
      setSessions(s);
      setReports(r);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Catapult GPS</h1>
        <p className="text-zinc-500 text-sm mt-1">Importá el CSV de OpenField para generar informes de entrenamiento y partido</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
        {[
          { key: "weekly",    label: "Dashboard Semanal" },
          { key: "training",  label: "Entrenamiento" },
          { key: "matches",   label: "Partido" },
          { key: "team",      label: "Informe de Equipo" },
          { key: "evolution", label: "Evolución" },
          { key: "comparison", label: "Comparar" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.key ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: WEEKLY DASHBOARD ─────────────────────────────────────── */}
      {activeTab === "weekly" && (
        <WeeklyDashboard sessions={sessions} reports={reports} />
      )}

      {/* ── TAB: TRAINING ─────────────────────────────────────────────── */}
      {activeTab === "training" && (
        <TrainingUploadBar sessions={sessions} reports={reports} onImportDone={loadAll} />
      )}

      {/* ── TAB: MATCHES ──────────────────────────────────────────────── */}
      {activeTab === "matches" && (
        <MatchImport reports={reports} onReportsChange={loadAll} parseCSVFile={parseCSVFile} />
      )}

      {/* ── TAB: TEAM REPORT ──────────────────────────────────────────── */}
      {activeTab === "team" && (
        <TeamReport />
      )}

      {/* ── TAB: EVOLUTION ────────────────────────────────────────────── */}
      {activeTab === "evolution" && (
        <PlayerEvolution reports={reports} />
      )}

      {/* ── TAB: COMPARISON ───────────────────────────────────────────── */}
      {activeTab === "comparison" && (
        <SessionComparison reports={reports} sessions={sessions} />
      )}
    </div>
  );
}
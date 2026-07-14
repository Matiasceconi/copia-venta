import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, FileSpreadsheet, X, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// ── CSV Parser (mismo que Catapult) ──────────────────────────────────────────
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
  const result = [];
  let cur = "", inQuotes = false;
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
  const lines = clean.split("\n").map((l) => l.trim()).filter(Boolean);
  const firstSemi = lines[0].split(";").length;
  const firstComma = lines[0].split(",").length;
  const sep = firstSemi > firstComma ? ";" : ",";

  let headerIdx = -1, headers = [];
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

const METRICS = [
  { key: "total_distance",  label: "Distancia (m)",     color: "#60a5fa", fmt: (v) => Math.round(v) },
  { key: "distance_hsr",   label: "19.8-25 km/h (m)",  color: "#34d399", fmt: (v) => Math.round(v) },
  { key: "sprint_distance", label: "+25 km/h (m)",       color: "#f59e0b", fmt: (v) => Math.round(v) },
  { key: "player_load",    label: "Player Load",         color: "#a78bfa", fmt: (v) => v.toFixed(0)  },
  { key: "max_velocity",   label: "Vel. Máx (km/h)",    color: "#f87171", fmt: (v) => v.toFixed(1)  },
  { key: "accelerations",  label: "Aceleraciones",       color: "#fb923c", fmt: (v) => Math.round(v) },
  { key: "decelerations",  label: "Desaceleraciones",    color: "#e879f9", fmt: (v) => Math.round(v) },
  { key: "sprint_efforts", label: "Sprint Efforts",      color: "#2dd4bf", fmt: (v) => Math.round(v) },
];

function CsvVisualization({ rows }) {
  const [activeMetric, setActiveMetric] = useState("total_distance");
  const metric = METRICS.find((m) => m.key === activeMetric);

  // Calcular promedios del equipo
  const avgs = {};
  METRICS.forEach(({ key }) => {
    const vals = rows.map((r) => r[key]).filter((v) => v != null);
    if (vals.length) avgs[key] = vals.reduce((a, b) => a + b, 0) / vals.length;
  });

  const chartData = rows
    .filter((r) => r[activeMetric] != null)
    .map((r) => ({ name: r.player_name?.split(" ")[0] || r.player_name, value: r[activeMetric], fullName: r.player_name }))
    .sort((a, b) => b.value - a.value);

  const activeMetrics = METRICS.filter(({ key }) => rows.some((r) => r[key] != null));

  return (
    <div className="space-y-5 mt-4">
      {/* Tarjetas de promedios */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {activeMetrics.map(({ key, label, fmt, color }) =>
          avgs[key] != null ? (
            <div key={key} className="bg-zinc-800/60 border border-zinc-700 rounded-lg p-3 text-center">
              <p className="text-zinc-500 text-xs truncate">{label}</p>
              <p className="font-bold text-sm mt-0.5" style={{ color }}>{fmt(avgs[key])}</p>
            </div>
          ) : null
        )}
      </div>

      {/* Selector de métrica para el gráfico */}
      <div className="flex flex-wrap gap-1.5">
        {activeMetrics.map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => setActiveMetric(key)}
            className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
              activeMetric === key
                ? "border-transparent text-zinc-900"
                : "bg-zinc-800 text-zinc-500 border-zinc-700 hover:border-zinc-500"
            }`}
            style={activeMetric === key ? { backgroundColor: color } : {}}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Gráfico de barras por jugador */}
      {chartData.length > 0 && (
        <div className="bg-zinc-800/40 rounded-xl p-4">
          <p className="text-xs text-zinc-400 font-semibold mb-3">{metric?.label} — por jugador</p>
          <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 28)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 40, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10, fill: "#d4d4d8" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }}
                formatter={(val) => [metric?.fmt(val), metric?.label]}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ""}
              />
              <Bar dataKey="value" fill={metric?.color || "#60a5fa"} radius={[0, 4, 4, 0]} label={{ position: "right", fontSize: 10, fill: "#a1a1aa", formatter: (v) => metric?.fmt(v) }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabla completa por jugador */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-zinc-800/80">
              <th className="px-3 py-2.5 text-left text-zinc-400 font-semibold whitespace-nowrap">Jugador</th>
              {activeMetrics.map(({ key, label }) => (
                <th key={key} className="px-3 py-2.5 text-right text-zinc-400 font-semibold whitespace-nowrap">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? "bg-zinc-900" : "bg-zinc-800/30"}>
                <td className="px-3 py-2 text-zinc-200 font-medium whitespace-nowrap">{row.player_name}</td>
                {activeMetrics.map(({ key, fmt, color }) => (
                  <td key={key} className="px-3 py-2 text-right whitespace-nowrap font-mono" style={{ color: row[key] != null ? color : undefined }}>
                    {row[key] != null ? fmt(row[key]) : <span className="text-zinc-700">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SessionCsvPanel({ session }) {
  const [csvUrl, setCsvUrl] = useState(session.csv_url || null);
  const [csvLabel, setCsvLabel] = useState(session.csv_label || null);
  const [uploading, setUploading] = useState(false);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importLog, setImportLog] = useState(null);
  const fileRef = useRef();
  const { toast } = useToast();

  useEffect(() => {
    if (csvUrl) fetchAndParse(csvUrl);
  }, [csvUrl]);

  async function fetchAndParse(url) {
    setLoading(true);
    setError(null);
    try {
      const text = await fetch(url).then((r) => r.text());
      const result = parseCatapultCSV(text);
      if (result.error) setError(result.error);
      else setRows(result.rows);
    } catch {
      setError("Error al cargar el archivo CSV.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.TrainingSession.update(session.id, {
        csv_url: file_url,
        csv_label: file.name,
      });
      setCsvUrl(file_url);
      setCsvLabel(file.name);
      toast({ title: "CSV cargado correctamente" });
    } catch {
      toast({ title: "Error al cargar el CSV", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  async function removeCsv() {
    await base44.entities.TrainingSession.update(session.id, { csv_url: null, csv_label: null });
    setCsvUrl(null);
    setCsvLabel(null);
    setRows(null);
    setImportLog(null);
    toast({ title: "CSV eliminado" });
  }

  async function handleImportCatapult() {
    if (!csvUrl || !rows || rows.length === 0) return;
    setImporting(true);
    try {
      const result = await base44.functions.invoke('importCatapultCSV', {
        csv_url: csvUrl,
        session_id: session.id,
        session_date: session.date,
        file_name: csvLabel,
      });
      setImportLog(result.data);
      toast({ title: `✓ ${result.data.total_imported} registros importados` });
    } catch (err) {
      toast({ title: "Error en la importación", variant: "destructive" });
      console.error(err);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-white">Datos GPS / Catapult</p>
          <p className="text-xs text-zinc-500 mt-0.5">Cargá el CSV de la sesión para ver el análisis completo</p>
        </div>
        {csvUrl && (
          <div className="flex items-center gap-2">
            <a href={csvUrl} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-zinc-800">
              <ExternalLink size={14} />
            </a>
            <button onClick={removeCsv} className="text-zinc-600 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-zinc-800">
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {!csvUrl ? (
        <label className="cursor-pointer block">
          <div className={`flex items-center justify-center gap-2 border border-dashed border-zinc-700 rounded-xl px-4 py-8 text-sm text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-colors ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
            {uploading
              ? <div className="w-4 h-4 border border-zinc-500 border-t-white rounded-full animate-spin" />
              : <Upload size={18} />}
            {uploading ? "Subiendo CSV..." : "Cargar CSV de la sesión"}
          </div>
          <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleUpload} className="hidden" disabled={uploading} />
        </label>
      ) : (
        <>
          <div className="flex items-center gap-2 bg-zinc-800/50 rounded-lg px-3 py-2">
            <FileSpreadsheet size={14} className="text-green-400 shrink-0" />
            <span className="text-xs text-zinc-300 flex-1 truncate">{csvLabel || "Archivo CSV"}</span>
            <label className="cursor-pointer">
              <span className={`text-xs text-zinc-500 hover:text-white transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                {uploading ? "Subiendo..." : "Reemplazar"}
              </span>
              <input type="file" accept=".csv,.txt" onChange={handleUpload} className="hidden" disabled={uploading} />
            </label>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8 gap-2 text-zinc-500 text-sm">
              <div className="w-4 h-4 border border-zinc-600 border-t-white rounded-full animate-spin" />
              Analizando datos...
            </div>
          )}
          {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
          {rows && rows.length > 0 && (
            <>
              {!importLog && (
                <button
                  onClick={handleImportCatapult}
                  disabled={importing}
                  className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  {importing ? (
                    <>
                      <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                      Importando...
                    </>
                  ) : (
                    "Importar a CatapultReport"
                  )}
                </button>
              )}
              {importLog && (
                <div className="mt-4 bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span><strong>Total importados:</strong> {importLog.total_imported}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-400 font-bold">●</span>
                    <span><strong>Vinculados a jugador:</strong> {importLog.total_matched}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-400 font-bold">!</span>
                    <span><strong>No vinculados:</strong> {importLog.total_unmatched}</span>
                  </div>
                  {importLog.details?.unmatched && importLog.details.unmatched.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-zinc-700">
                      <p className="text-zinc-400 mb-2">Jugadores GPS sin vinculación:</p>
                      <div className="space-y-1 text-zinc-500">
                        {importLog.details.unmatched.map((name, i) => (
                          <div key={i}>• {name}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <CsvVisualization rows={rows} />
            </>
          )}
        </>
      )}
    </div>
  );
}
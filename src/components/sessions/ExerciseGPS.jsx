import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, AlertCircle, X, Eye, Link } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { fmtMetric, fmtSmax } from "@/utils";
import { updateFieldLibraryGpsSummary } from "@/components/sessions/exerciseLibrarySync";

// ── helpers ────────────────────────────────────────────────────────────────
function normalize(s) {
  return (s || "").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}
function parseNum(v) {
  if (!v || v === "-" || v === "") return undefined;
  const n = parseFloat(v.toString().trim());
  return isNaN(n) ? undefined : n;
}
function parseCSV(text) {
  const raw = text.startsWith("\uFEFF") ? text.slice(1) : text;
  const rows = []; let row = []; let field = ""; let inQuotes = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]; const next = raw[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { row.push(field.trim()); field = ""; }
      else if (ch === '\n') {
        row.push(field.trim()); field = "";
        if (row.some(c => c !== "")) rows.push(row); row = [];
      } else if (ch === '\r') { /* skip */ }
      else { field += ch; }
    }
  }
  if (field || row.length) { row.push(field.trim()); if (row.some(c => c !== "")) rows.push(row); }
  return rows;
}

const COLUMN_MAP = {
  "Name":                     { field: "player_name_original", numeric: false },
  "Total Duration":           { field: "duration",             numeric: false },
  "Total Distance (m)":       { field: "total_distance",       numeric: true  },
  "D 19,8-25,0 km/h (m)":    { field: "distance_19_8",        numeric: true  },
  "D+ 25,0 km/h (m)":        { field: "distance_25",          numeric: true  },
  "Sprint Efforts":           { field: "sprints",              numeric: true  },
  "Acc + 3mt/s eff":          { field: "acc_3",                numeric: true  },
  "Dec +3mts/s Eff":          { field: "dec_3",                numeric: true  },
  "Total Player Load":        { field: "player_load",          numeric: true  },
  "Maximum Velocity (km/h)":  { field: "smax",                 numeric: true  },
  "Max Vel (% Max)":          { field: "max_vel_percent",      numeric: true  },
  "Metros x Min":             { field: "m_min",                numeric: true  },
};
const SUMMARY_NAMES = new Set(["total", "promedio", "average", "avg", "summary", "team total", "totals"]);

const METRICS = [
  { key: "total_distance", label: "Dist. (m)",    color: "#3b82f6" },
  { key: "m_min",          label: "m/min",         color: "#10b981" },
  { key: "distance_19_8",  label: "D >19.8",       color: "#f97316" },
  { key: "distance_25",    label: "D >25",          color: "#a855f7" },
  { key: "sprints",        label: "Sprints",        color: "#06b6d4" },
  { key: "acc_3",          label: "ACC +3",         color: "#f59e0b" },
  { key: "dec_3",          label: "DEC +3",         color: "#ec4899" },
  { key: "player_load",    label: "Player Load",    color: "#8b5cf6" },
  { key: "smax",           label: "Smax (km/h)",    color: "#ef4444" },
];

function avg(rows, key) {
  const vals = rows.map(r => r[key] || 0).filter(v => v > 0);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}
function maxVal(rows, key) {
  const vals = rows.map(r => r[key] || 0);
  return vals.length ? Math.max(...vals) : null;
}

// exercise prop: { id, name, session_id (from parent), library_exercise_id? }
// session prop: { id, title, date }
export default function ExerciseGPS({ session, exercise, sessionPlayers }) {
  const sessionId = session?.id;
  const exerciseId = exercise?.id;

  const [rows, setRows] = useState([]);
  const [unmatched, setUnmatched] = useState([]);
  const [aliasTargets, setAliasTargets] = useState({});
  const [allPlayers, setAllPlayers] = useState([]);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Current library link state (can be updated if user links)
  const [libraryExerciseId, setLibraryExerciseId] = useState(exercise?.library_exercise_id || null);
  const [linkingLibrary, setLinkingLibrary] = useState(false);
  const [libraryOptions, setLibraryOptions] = useState([]);
  const [selectedLibrary, setSelectedLibrary] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (!exerciseId) return;
    base44.entities.ExerciseGPSData.filter({ exercise_id: exerciseId }, "player_name", 200).then(setRows);
    base44.entities.Player.list("-created_date", 500).then(p => setAllPlayers(p.filter(x => x.active !== false)));
  }, [exerciseId]);

  async function openLinkLibrary() {
    const libs = await base44.entities.FieldExerciseLibrary.list("-times_used", 500);
    setLibraryOptions(libs);
    setLinkingLibrary(true);
  }

  async function confirmLinkLibrary() {
    if (!selectedLibrary) return;
    await base44.entities.SessionExercise.update(exerciseId, { library_exercise_id: selectedLibrary });
    setLibraryExerciseId(selectedLibrary);
    setLinkingLibrary(false);
    toast({ title: "✓ Ejercicio vinculado a biblioteca" });
  }

  async function handleFile(e) {
    const file = e.target.files[0]; e.target.value = "";
    if (!file) return;
    setUploading(true);
    const text = await file.text();
    const parsed = parseCSV(text);
    if (parsed.length < 2) { toast({ title: "CSV vacío o inválido", variant: "destructive" }); setUploading(false); return; }
    const headers = parsed[0];
    const detectedCols = {};
    headers.forEach((h, i) => { if (COLUMN_MAP[h]) detectedCols[h] = i; });
    const allDataRows = parsed.slice(1).map(cols => {
      const rec = {};
      Object.entries(detectedCols).forEach(([col, idx]) => { rec[col] = cols[idx] ?? ""; });
      return rec;
    }).filter(r => r["Name"] && r["Name"] !== "");
    const playerRows = allDataRows.filter(r => !SUMMARY_NAMES.has(r["Name"].toLowerCase().trim()));
    setPreview({ detectedCols, playerRows, fileName: file.name, file });
    setUploading(false);
  }

  async function confirmImport() {
    if (!preview) return;
    setImporting(true);
    const { detectedCols, playerRows, fileName } = preview;
    const aliases = await base44.entities.PlayerAlias.list("-created_date", 1000);
    const aliasMap = {};
    aliases.forEach(a => { if (a.normalized_alias) aliasMap[a.normalized_alias] = a.player_id; });
    const spMap = {};
    (sessionPlayers || []).forEach(sp => { spMap[normalize(sp.player_name)] = sp.player_id; });
    const allPlayerMap = {};
    allPlayers.forEach(p => { allPlayerMap[normalize(p.full_name || "")] = p.id; });

    const toCreate = []; const unmatchedList = [];
    playerRows.forEach(row => {
      const rawName = row["Name"] || "";
      const normName = normalize(rawName);
      const playerId = aliasMap[normName] || spMap[normName] || allPlayerMap[normName];
      const playerRecord = allPlayers.find(p => p.id === playerId);
      const record = {
        session_id: sessionId, exercise_id: exerciseId,
        player_name_original: rawName,
        player_id: playerId || "",
        player_name: playerRecord?.full_name || rawName,
        source_file: fileName,
      };
      Object.entries(detectedCols).forEach(([colName]) => {
        const { field, numeric } = COLUMN_MAP[colName];
        if (field === "player_name_original") return;
        const raw = row[colName] ?? "";
        record[field] = numeric ? parseNum(raw) : (raw || undefined);
      });
      if (playerId) toCreate.push(record);
      else unmatchedList.push({ rawName, record });
    });

    // Replace existing ExerciseGPSData for this exercise
    const existing = await base44.entities.ExerciseGPSData.filter({ exercise_id: exerciseId }, "-created_date", 500);
    await Promise.all(existing.map(r => base44.entities.ExerciseGPSData.delete(r.id)));
    let saved = [];
    if (toCreate.length > 0) saved = await base44.entities.ExerciseGPSData.bulkCreate(toCreate);

    // Auto-resolve library link if not set: search by exercise name
    let libId = libraryExerciseId;
    if (!libId && exercise?.name) {
      const libs = await base44.entities.FieldExerciseLibrary.list("-times_used", 500);
      const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      const found = libs.find(l => norm(l.name) === norm(exercise.name));
      if (found) {
        libId = found.id;
        // Persist the link so future imports are automatic
        await base44.entities.SessionExercise.update(exerciseId, { library_exercise_id: libId });
        setLibraryExerciseId(libId);
      }
    }

    // If linked to library, also copy to LibraryExerciseGPSData
    if (libId && toCreate.length > 0) {
      // Remove previous library records for this session+exercise
      const prevLib = await base44.entities.LibraryExerciseGPSData.filter({ exercise_id: exerciseId }, "-created_date", 500);
      await Promise.all(prevLib.map(r => base44.entities.LibraryExerciseGPSData.delete(r.id)));
      const libRecords = toCreate.map(r => ({
        ...r,
        library_exercise_id: libId,
        session_title: session?.title || "",
        session_date: session?.date || "",
        exercise_name: exercise?.name || "",
      }));
      await base44.entities.LibraryExerciseGPSData.bulkCreate(libRecords);
      await updateFieldLibraryGpsSummary(libId);
    }

    setRows(Array.isArray(saved) ? saved : toCreate);
    setUnmatched(unmatchedList);
    setPreview(null);
    setImporting(false);
    const libMsg = libId ? " · datos copiados a biblioteca" : "";
    toast({ title: `GPS ejercicio: ${toCreate.length} OK, ${unmatchedList.length} sin reconocer${libMsg}` });
  }

  async function saveManualAlias(rawName, playerId) {
    if (!playerId) return;
    const player = allPlayers.find(p => p.id === playerId);
    if (!player) return;
    await base44.entities.PlayerAlias.create({
      player_id: playerId, player_name: player.full_name || "",
      alias_name: rawName, normalized_alias: normalize(rawName),
      source: "Manual", confidence_score: 1,
    });
    const unmRow = unmatched.find(u => u.rawName === rawName);
    if (unmRow) {
      const record = { ...unmRow.record, player_id: playerId, player_name: player.full_name || "" };
      const created = await base44.entities.ExerciseGPSData.create(record);
      // Also copy to library if linked
      if (libraryExerciseId) {
        await base44.entities.LibraryExerciseGPSData.create({
          ...record, player_id: playerId, player_name: player.full_name || "",
          library_exercise_id: libraryExerciseId,
          session_title: session?.title || "",
          session_date: session?.date || "",
          exercise_name: exercise?.name || "",
        });
        await updateFieldLibraryGpsSummary(libraryExerciseId);
      }
      setRows(prev => [...prev, created]);
      setUnmatched(prev => prev.filter(u => u.rawName !== rawName));
    }
    toast({ title: `✓ Alias guardado para ${player.full_name}` });
  }

  // Stats
  const avgDist = avg(rows, "total_distance");
  const avgMmin = avg(rows, "m_min");
  const avgD19  = avg(rows, "distance_19_8");
  const avgD25  = avg(rows, "distance_25");
  const avgSpr  = avg(rows, "sprints");
  const avgAcc  = avg(rows, "acc_3");
  const avgDec  = avg(rows, "dec_3");
  const avgLoad = avg(rows, "player_load");
  const maxSmax = maxVal(rows, "smax");

  return (
    <div className="mt-4 border-t border-zinc-700 pt-4 space-y-4">

      {/* Library link banner */}
      {!libraryExerciseId && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg flex-wrap">
          <Link size={11} className="text-amber-400 shrink-0" />
          <p className="text-[10px] text-amber-300 flex-1">Este ejercicio no está vinculado a la biblioteca. Vincularlo para guardar carga externa histórica.</p>
          {!linkingLibrary ? (
            <button onClick={openLinkLibrary}
              className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded text-[10px] font-semibold hover:bg-amber-500/30 transition-colors whitespace-nowrap">
              Vincular a biblioteca
            </button>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              <select value={selectedLibrary} onChange={e => setSelectedLibrary(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-[10px] text-white focus:outline-none">
                <option value="">Seleccionar ejercicio...</option>
                {libraryOptions.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <button onClick={confirmLinkLibrary} disabled={!selectedLibrary}
                className="px-2.5 py-1 bg-white text-zinc-900 rounded text-[10px] font-semibold disabled:opacity-40">Confirmar</button>
              <button onClick={() => setLinkingLibrary(false)} className="text-zinc-500 hover:text-white text-[10px]">✕</button>
            </div>
          )}
        </div>
      )}

      {libraryExerciseId && (
        <p className="text-[10px] text-emerald-500 flex items-center gap-1">
          <Link size={10} /> Vinculado a biblioteca · la carga GPS se copiará automáticamente al historial.
        </p>
      )}

      {/* Upload */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className={`cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300 hover:bg-zinc-700 transition-colors ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
          <Upload size={12} />
          {uploading ? "Leyendo..." : rows.length > 0 ? "Reemplazar CSV" : "Cargar CSV del ejercicio"}
          <input type="file" accept=".csv" className="hidden" onChange={handleFile} disabled={uploading} />
        </label>
        {rows.length > 0 && (
          <span className="text-[10px] text-zinc-500">{rows.length} jugadores con GPS</span>
        )}
      </div>

      {/* Preview confirm */}
      {preview && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Eye size={12} className="text-blue-400" /> {preview.fileName} — {preview.playerRows.length} jugadores
            </p>
            <button onClick={() => setPreview(null)} className="text-zinc-500 hover:text-white"><X size={14} /></button>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setPreview(null)} className="px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded-lg text-xs hover:bg-zinc-700">Cancelar</button>
            <button onClick={confirmImport} disabled={importing}
              className="px-4 py-1.5 bg-white text-zinc-900 font-semibold rounded-lg text-xs hover:bg-zinc-200 disabled:opacity-40">
              {importing ? "Importando..." : `Confirmar e importar (${preview.playerRows.length})`}
            </button>
          </div>
        </div>
      )}

      {/* Summary cards */}
      {rows.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {[
            { label: "Dist. prom.", value: avgDist != null ? fmtMetric(avgDist) + " m" : "—", color: "#3b82f6" },
            { label: "m/min prom.", value: avgMmin != null ? fmtMetric(avgMmin) : "—", color: "#10b981" },
            { label: "D >19.8 prom.", value: avgD19 != null ? fmtMetric(avgD19) : "—", color: "#f97316" },
            { label: "D >25 prom.", value: avgD25 != null ? fmtMetric(avgD25) : "—", color: "#a855f7" },
            { label: "Sprints prom.", value: avgSpr != null ? fmtMetric(avgSpr) : "—", color: "#06b6d4" },
            { label: "ACC prom.", value: avgAcc != null ? fmtMetric(avgAcc) : "—", color: "#f59e0b" },
            { label: "DEC prom.", value: avgDec != null ? fmtMetric(avgDec) : "—", color: "#ec4899" },
            { label: "Load prom.", value: avgLoad != null ? fmtMetric(avgLoad) : "—", color: "#8b5cf6" },
            { label: "Smax máx.", value: maxSmax != null ? fmtSmax(maxSmax) : "—", color: "#ef4444" },
          ].map(s => (
            <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-center">
              <p className="text-[9px] text-zinc-500 mb-0.5 leading-tight">{s.label}</p>
              <p className="text-sm font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-2 px-2 text-zinc-400 font-medium whitespace-nowrap">Jugador</th>
                <th className="text-right py-2 px-2 text-zinc-400 font-medium whitespace-nowrap">Dur.</th>
                {METRICS.map(m => (
                  <th key={m.key} className="text-right py-2 px-2 font-medium whitespace-nowrap" style={{ color: m.color }}>{m.label}</th>
                ))}
                <th className="text-right py-2 px-2 text-zinc-400 font-medium whitespace-nowrap">% Smax</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.player_id || i} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                  <td className="py-1.5 px-2 text-white font-semibold whitespace-nowrap">{r.player_name}</td>
                  <td className="py-1.5 px-2 text-right text-zinc-400">{r.duration || "—"}</td>
                  {METRICS.map(m => (
                    <td key={m.key} className="py-1.5 px-2 text-right font-bold whitespace-nowrap" style={{ color: m.color }}>
                      {m.key === "smax" ? fmtSmax(r[m.key]) : fmtMetric(r[m.key])}
                    </td>
                  ))}
                  <td className="py-1.5 px-2 text-right text-zinc-400">{r.max_vel_percent != null ? `${Math.round(r.max_vel_percent)}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Unmatched */}
      {unmatched.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider flex items-center gap-1">
            <AlertCircle size={11} /> Sin reconocer ({unmatched.length})
          </p>
          {unmatched.map(({ rawName }) => (
            <div key={rawName} className="flex items-center gap-2 px-3 py-2 bg-red-500/5 border border-red-500/20 rounded-lg flex-wrap">
              <span className="text-xs text-red-300 flex-1 min-w-[100px]">{rawName}</span>
              <select value={aliasTargets[rawName] || ""} onChange={e => setAliasTargets(p => ({ ...p, [rawName]: e.target.value }))}
                className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:outline-none flex-1 min-w-[140px]">
                <option value="">Seleccionar jugador...</option>
                {allPlayers.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
              <button onClick={() => saveManualAlias(rawName, aliasTargets[rawName])}
                disabled={!aliasTargets[rawName]}
                className="px-3 py-1 bg-white text-zinc-900 rounded text-xs font-semibold hover:bg-zinc-200 disabled:opacity-40">
                Vincular
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
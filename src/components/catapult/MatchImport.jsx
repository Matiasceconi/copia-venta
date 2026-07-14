import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, FileSpreadsheet, Check, X, AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";
import CsvPreviewTable from "@/components/catapult/CsvPreviewTable";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList } from "recharts";

function calculateAverages(rows) {
  const metrics = ["total_distance", "distance_hsr", "sprint_distance", "player_load", "max_velocity", "accelerations"];
  const result = {};
  metrics.forEach(m => {
    const vals = rows.map(r => r[m]).filter(v => v != null);
    if (vals.length > 0) result[m] = vals.reduce((a, b) => a + b, 0) / vals.length;
  });
  return result;
}

// Reusar parsers del padre pasados como props
function MatchRow({ match, matchReports, onDelete, parseCSVFile }) {
  const [expanded, setExpanded] = useState(false);
  const [csvState, setCsvState] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileRef = useRef();
  const { toast } = useToast();

  const hasData = matchReports.length > 0;

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    setCsvState(null);
    setImportResult(null);
    try {
      const text = await file.text();
      const parsed = parseCSVFile(text);
      if (parsed.error) { setCsvState({ error: parsed.error }); return; }
      if (parsed.rows.length === 0) { setCsvState({ error: "No se encontraron jugadores válidos." }); return; }
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setCsvState({ ...parsed, file_url });
    } catch (err) {
      setCsvState({ error: "Error al procesar: " + err.message });
    } finally {
      setUploading(false);
    }
  }

  async function confirmImport() {
    if (!csvState?.rows) return;
    setImporting(true);
    try {
      await base44.entities.CatapultReport.deleteMany({ session_id: match.id });
      const records = csvState.rows.map((r) => ({
        ...r,
        date: match.date,
        session_id: match.id,
        session_label: match.label,
        file_url: csvState.file_url,
      }));
      await base44.entities.CatapultReport.bulkCreate(records);
      setImportResult({ count: records.length });
      setCsvState(null);
      toast({ title: `✓ ${records.length} jugadores importados para "${match.label}"` });
    } catch (err) {
      toast({ title: "Error al importar", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-zinc-800/40 transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm truncate">{match.label}</p>
            <p className="text-zinc-500 text-xs mt-0.5">{moment(match.date).format("DD/MM/YYYY")} · Partido oficial</p>
          </div>
          {hasData && (
            <span className="shrink-0 text-xs bg-red-900/30 text-red-400 border border-red-800/40 px-2 py-0.5 rounded-full">
              {matchReports.length} jugadores
            </span>
          )}
          {importResult?.count && (
            <span className="shrink-0 text-xs bg-blue-900/40 text-blue-400 border border-blue-800/50 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 size={10} /> {importResult.count} importados
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 ml-3">
          <label onClick={(e) => e.stopPropagation()} className="cursor-pointer">
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${uploading ? "bg-zinc-700 text-zinc-400" : "bg-red-900/40 text-red-300 hover:bg-red-900/60"}`}>
              {uploading ? <div className="w-3 h-3 border border-zinc-500 border-t-white rounded-full animate-spin" /> : <Upload size={12} />}
              {uploading ? "Leyendo..." : hasData ? "Reimportar" : "Cargar GPS"}
            </span>
            <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" disabled={uploading} />
          </label>
          <button onClick={(e) => { e.stopPropagation(); onDelete(match.id); }} className="p-1.5 rounded-lg hover:bg-red-900/30 text-zinc-600 hover:text-red-400 transition-colors" title="Eliminar partido">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-zinc-800">
          {csvState?.error && (
            <div className="mx-4 my-3 flex items-start gap-2 bg-red-900/20 border border-red-800/40 rounded-lg p-3">
              <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-red-400/80 text-xs">{csvState.error}</p>
            </div>
          )}
          {csvState && !csvState.error && (
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-yellow-300 font-semibold text-sm">{csvState.rows.length} jugadores detectados</p>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setCsvState(null)} className="border-zinc-600 text-zinc-300 hover:bg-zinc-800"><X size={13} className="mr-1" /> Cancelar</Button>
                  <Button size="sm" onClick={confirmImport} disabled={importing} className="bg-green-600 hover:bg-green-700 text-white">
                    {importing ? <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin mr-1.5" /> : <Check size={13} className="mr-1" />}
                    Confirmar
                  </Button>
                </div>
              </div>
              <CsvPreviewTable rows={csvState.rawPreview} />
            </div>
          )}
          {!csvState && matchReports.length > 0 && (
            <div className="p-4">
              <CsvPreviewTable rows={matchReports} />
            </div>
          )}
          {!csvState && matchReports.length === 0 && (
            <div className="p-6 text-center">
              <FileSpreadsheet size={28} className="text-zinc-700 mx-auto mb-2" />
              <p className="text-zinc-600 text-xs">Sin datos GPS. Cargá el CSV de Catapult del partido.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const EMPTY_MATCH = { label: "", date: "", rival: "", location: "" };

export default function MatchImport({ reports, onReportsChange, parseCSVFile }) {
  const [matches, setMatches] = useState(() => {
    try { return JSON.parse(localStorage.getItem("catapult_matches") || "[]"); } catch { return []; }
  });
  const [form, setForm] = useState(EMPTY_MATCH);
  const [showForm, setShowForm] = useState(false);
  const [csvState, setCsvState] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState("");
  const fileRef = useRef();
  const { toast } = useToast();

  function saveMatches(list) {
    setMatches(list);
    localStorage.setItem("catapult_matches", JSON.stringify(list));
  }

  function addMatch() {
    if (!form.label || !form.date) return;
    const newMatch = { ...form, id: `match_${Date.now()}` };
    saveMatches([newMatch, ...matches]);
    setForm(EMPTY_MATCH);
    setShowForm(false);
  }

  function deleteMatch(id) {
    saveMatches(matches.filter((m) => m.id !== id));
  }

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
    if (!csvState?.rows || !selectedMatch) return;
    const match = matches.find(m => m.id === selectedMatch);
    if (!match) return;
    setImporting(true);
    try {
      await base44.entities.CatapultReport.deleteMany({ session_id: match.id });
      const records = csvState.rows.map(r => ({ ...r, date: match.date, session_id: match.id, session_label: match.label, file_url: csvState.file_url }));
      await base44.entities.CatapultReport.bulkCreate(records);
      toast({ title: `✓ ${records.length} jugadores importados para "${match.label}"` });
      setCsvState(null);
      setSelectedMatch("");
      onReportsChange();
    } catch (err) {
      toast({ title: "Error al importar", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const matchAverages = csvState?.rows ? calculateAverages(csvState.rows) : null;

  return (
    <div className="space-y-4">
      {/* Barra de carga de partido */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="cursor-pointer">
              <span className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${uploading ? "bg-zinc-700 text-zinc-400" : "bg-red-600 hover:bg-red-700 text-white"}`}>
                {uploading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Upload size={16} />}
                {uploading ? "Leyendo..." : "Cargar CSV Partido"}
              </span>
              <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" disabled={uploading} />
            </label>
            {csvState && !csvState.error && (
              <>
                <select
                  value={selectedMatch}
                  onChange={e => setSelectedMatch(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-red-500"
                >
                  <option value="">— Asignar a partido —</option>
                  {matches.map(m => <option key={m.id} value={m.id}>{moment(m.date).format("DD/MM/YY")} · {m.label}</option>)}
                </select>
                <button
                  onClick={confirmImport}
                  disabled={importing || !selectedMatch}
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
            <button
              onClick={() => setShowForm(!showForm)}
              className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors"
            >
              <span className="text-lg leading-none">+</span> Nuevo partido
            </button>
          </div>
          {csvState?.error && (
            <div className="mt-3 flex items-center gap-2 text-xs text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg p-3">
              <AlertCircle size={14} className="shrink-0" /> {csvState.error}
            </div>
          )}
        </div>

        {/* Informe de Partido */}
        {csvState && !csvState.error && matchAverages && (
          <div className="p-4 space-y-4">
            <p className="text-white font-semibold text-sm">Informe de Partido — <span className="text-zinc-400 font-normal">{csvState.rows.length} jugadores detectados</span></p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { key: "total_distance", label: "Distancia (m)", fmt: v => Math.round(v) },
                { key: "distance_hsr", label: "19.8–25 km/h (m)", fmt: v => Math.round(v) },
                { key: "sprint_distance", label: "+25 km/h (m)", fmt: v => Math.round(v) },
                { key: "player_load", label: "Player Load", fmt: v => v.toFixed(0) },
                { key: "max_velocity", label: "Vel. Máx (km/h)", fmt: v => v.toFixed(1) },
                { key: "accelerations", label: "Aceleraciones", fmt: v => Math.round(v) },
              ].map(({ key, label, fmt }) => matchAverages[key] ? (
                <div key={key} className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-center">
                  <p className="text-zinc-500 text-xs">{label}</p>
                  <p className="text-white font-bold text-lg mt-0.5">{fmt(matchAverages[key])}</p>
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
                  <Bar dataKey="value" fill="#f87171" radius={[0,4,4,0]}>
                    <LabelList dataKey="value" position="right" style={{ fill: "#e4e4e7", fontSize: 10, fontWeight: 600 }} formatter={v => Math.round(v)} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <CsvPreviewTable rows={csvState.rows} />
          </div>
        )}

        {!csvState && (
          <div className="p-6 text-center">
            <FileSpreadsheet size={32} className="text-zinc-700 mx-auto mb-2" />
            <p className="text-zinc-600 text-xs">Cargá un CSV de Catapult OpenField para ver el informe del partido</p>
          </div>
        )}
      </div>

      {/* Formulario nuevo partido */}
      {showForm && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 space-y-3">
          <p className="text-white text-sm font-semibold">Registrar partido</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-zinc-400 mb-1 block">Nombre del partido *</label>
              <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500" placeholder="Ej: vs Boca Juniors" value={form.label} onChange={(e) => set("label", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Fecha *</label>
              <input type="date" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" value={form.date} onChange={(e) => set("date", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Estadio / Lugar</label>
              <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500" placeholder="Ej: Estadio Norberto Tomaghello" value={form.location} onChange={(e) => set("location", e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">Cancelar</button>
            <button onClick={addMatch} disabled={!form.label || !form.date} className="px-4 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-40 transition-colors">Guardar</button>
          </div>
        </div>
      )}

      {/* Lista de partidos registrados */}
      {matches.length > 0 && (
        <div className="space-y-3">
          <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider px-1">Partidos registrados</p>
          {matches.map((m) => (
            <MatchRow
              key={m.id}
              match={m}
              matchReports={reports.filter((r) => r.session_id === m.id)}
              onDelete={deleteMatch}
              parseCSVFile={parseCSVFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}
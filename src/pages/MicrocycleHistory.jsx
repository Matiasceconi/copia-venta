import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { Archive, CheckCircle2, Copy, Download, FileText, GitCompare, Search, Tag, X } from "lucide-react";
import { jsPDF } from "jspdf";
import { MICRO_METRICS, fmt } from "@/components/performance/dashboard/gpsMicrocycleReportUtils";

const STATUS_STYLE = {
  borrador: "bg-zinc-500/10 text-zinc-300 border-zinc-500/30",
  en_curso: "bg-blue-500/10 text-blue-300 border-blue-500/30",
  finalizado: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  archivado: "bg-amber-500/10 text-amber-300 border-amber-500/30",
};
const SUGGESTED_TAGS = ["Pretemporada", "Playoffs", "Final", "Semana corta", "Semana larga", "Viaje", "Triple competencia"];
const COMPARE_KEYS = ["total_distance", "player_load", "acc_3", "dec_3", "sprints", "distance_19_8", "distance_25", "smax"];

function metricValue(summary, key) {
  return Number(summary.gps_variables_snapshot?.[key]?.value ?? summary.load_summary_snapshot?.[key]?.value ?? summary.snapshot?.loadSummary?.[key]?.value ?? 0);
}
function displayName(summary) {
  return summary.nombre_microciclo || summary.microcycle_name || `Microciclo ${summary.microcycle_number || "—"}`;
}
function dateRange(summary) {
  return `${summary.fecha_inicio || "—"} - ${summary.fecha_fin || "—"}`;
}
function stateLabel(state) {
  if (state === "en_curso") return "En curso";
  if (state === "finalizado" || state === "cerrado" || state === "congelado") return "Guardado";
  if (state === "archivado") return "Archivado";
  return "Borrador";
}

function Filters({ filters, setFilters, squads, seasons }) {
  const update = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2 text-white font-bold"><Search size={16} />Buscador</div>
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <input value={filters.query || ""} onChange={(e) => update("query", e.target.value)} placeholder="Rival, número, competencia..." className="xl:col-span-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white" />
        <input type="date" value={filters.fecha || ""} onChange={(e) => update("fecha", e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white" />
        <select value={filters.season || ""} onChange={(e) => update("season", e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white"><option value="">Temporada</option>{seasons.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <select value={filters.squad || ""} onChange={(e) => update("squad", e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white"><option value="">Plantel</option>{squads.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <input value={filters.tag || ""} onChange={(e) => update("tag", e.target.value)} placeholder="Etiqueta" className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white" />
      </div>
      <button onClick={() => setFilters({})} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold">Limpiar filtros</button>
    </div>
  );
}

function MicrocycleCard({ summary, selected, onOpen, onDuplicate, onExport }) {
  const objective = summary.physical_objectives_snapshot?.[0]?.objective || summary.summary_snapshot?.daily?.[0]?.objetivo || "Volumen";
  const style = STATUS_STYLE[summary.estado] || STATUS_STYLE.borrador;
  return (
    <button onClick={() => onOpen(summary)} className="text-left bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 rounded-2xl p-4 space-y-3 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-emerald-400 text-xs font-bold uppercase">Microciclo {summary.microcycle_number || "—"}</p><h3 className="text-white font-bold text-lg">{displayName(summary)}</h3></div>
        <span className={`px-2 py-1 rounded-full border text-xs font-bold ${style}`}>{stateLabel(summary.estado)}</span>
      </div>
      <div className="text-sm text-zinc-400 space-y-1"><p>{dateRange(summary)}</p><p>vs {summary.rival || summary.partido_asociado || "—"}</p><p>{summary.squad_name || "Plantel"} · {objective}</p><p className="text-emerald-300 font-bold">{summary.cantidad_sesiones || 0} sesiones</p></div>
      <div className="flex flex-wrap gap-1">{(summary.tags || []).slice(0, 4).map((tag) => <span key={tag} className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px] border border-zinc-700">{tag}</span>)}</div>
      <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => onOpen(summary)} className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold ${selected ? "bg-emerald-600 text-white" : "bg-zinc-800 hover:bg-zinc-700 text-white"}`}>Abrir</button>
        <button onClick={() => onDuplicate(summary)} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white"><Copy size={13} /></button>
        <button onClick={() => onExport(summary)} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"><Download size={13} /></button>
      </div>
    </button>
  );
}

function ComparisonPanel({ summaries }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const one = summaries.find((s) => s.id === a);
  const two = summaries.find((s) => s.id === b);
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2 text-white font-bold"><GitCompare size={16} />Comparar microciclos</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <select value={a} onChange={(e) => setA(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white text-sm"><option value="">Microciclo A</option>{summaries.map((s) => <option key={s.id} value={s.id}>{displayName(s)}</option>)}</select>
        <select value={b} onChange={(e) => setB(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white text-sm"><option value="">Microciclo B</option>{summaries.map((s) => <option key={s.id} value={s.id}>{displayName(s)}</option>)}</select>
      </div>
      {one && two && <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">{COMPARE_KEYS.map((key) => {
        const metric = MICRO_METRICS.find((m) => m.key === key);
        const first = metricValue(one, key), second = metricValue(two, key);
        const abs = second - first, pct = first ? (abs / first) * 100 : null;
        return <div key={key} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3"><p className="text-zinc-500 text-xs font-bold">{metric?.label || key}</p><p className="text-white text-sm mt-1">{fmt(first, metric?.unit)} → {fmt(second, metric?.unit)}</p><p className={abs >= 0 ? "text-emerald-300 text-xs font-bold" : "text-red-300 text-xs font-bold"}>{abs >= 0 ? "+" : ""}{fmt(abs, metric?.unit)} {pct != null ? `(${pct.toFixed(1)}%)` : ""}</p></div>;
      })}</div>}
    </div>
  );
}

function DetailPanel({ summary, tagDraft, setTagDraft, onClose, onTag, onStatus, onExport }) {
  if (!summary) return null;
  return <div className="fixed inset-0 bg-black/70 z-50 flex justify-end"><div className="w-full max-w-4xl h-full bg-zinc-950 border-l border-zinc-800 overflow-y-auto p-6 space-y-5"><div className="flex items-start justify-between"><div><p className="text-emerald-400 text-xs font-bold uppercase">Snapshot congelado</p><h2 className="text-white text-2xl font-bold">{displayName(summary)}</h2><p className="text-zinc-400">{dateRange(summary)} · {summary.rival || "Sin rival"}</p></div><button onClick={onClose} className="p-2 text-zinc-400 hover:text-white"><X size={18} /></button></div><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{COMPARE_KEYS.map((key) => { const metric = MICRO_METRICS.find((m) => m.key === key); return <div key={key} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3"><p className="text-zinc-500 text-xs">{metric?.label || key}</p><p className="text-white font-bold text-lg">{fmt(metricValue(summary, key), metric?.unit)}</p></div>; })}</div><div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3"><h3 className="text-white font-bold flex items-center gap-2"><Tag size={16} />Etiquetas</h3><div className="flex flex-wrap gap-2">{(summary.tags || []).map((tag) => <button key={tag} onClick={() => onTag(summary, tag, true)} className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs">{tag} ×</button>)}{SUGGESTED_TAGS.map((tag) => <button key={tag} onClick={() => onTag(summary, tag)} className="px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs">+ {tag}</button>)}</div><div className="flex gap-2"><input value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} placeholder="Nueva etiqueta" className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white" /><button onClick={() => onTag(summary, tagDraft)} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold">Agregar</button></div></div><div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"><h3 className="text-white font-bold mb-3">Sesiones guardadas</h3>{(summary.sessions_snapshot || []).length ? <div className="space-y-2">{summary.sessions_snapshot.map((s) => <div key={s.id || s.title} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm"><p className="text-white font-bold">{s.title}</p><p className="text-zinc-500">{s.date} · {s.session_type || "Sesión"} · {s.match_day_code || s.microcycle_day || "—"}</p></div>)}</div> : <p className="text-zinc-500 text-sm">Sin sesiones congeladas en este registro.</p>}</div><div className="flex flex-wrap gap-2"><button onClick={() => onExport(summary)} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold"><FileText size={16} />Exportar / descargar PDF</button>{["borrador", "en_curso", "finalizado", "archivado"].map((state) => <button key={state} onClick={() => onStatus(summary, state)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-bold">{stateLabel(state)}</button>)}</div></div></div>;
}

export default function MicrocycleHistory() {
  const { activeSquadId } = useWorkspace();
  const [summaries, setSummaries] = useState([]);
  const [squads, setSquads] = useState([]);
  const [filters, setFilters] = useState({});
  const [selected, setSelected] = useState(null);
  const [tagDraft, setTagDraft] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [rows, squadRows] = await Promise.all([base44.entities.MicrocycleSummary.list("-updated_at", 500), base44.entities.Squad.list("name", 200)]);
    setSummaries(rows);
    setSquads(squadRows);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const seasons = useMemo(() => [...new Set(summaries.map((s) => s.season_id).filter(Boolean))].sort().reverse(), [summaries]);
  const filtered = useMemo(() => summaries.filter((s) => {
    const q = String(filters.query || "").toLowerCase();
    const text = `${displayName(s)} ${s.microcycle_number || ""} ${s.rival || ""} ${s.competencia || ""} ${s.squad_name || ""}`.toLowerCase();
    if (activeSquadId && s.squad_id !== activeSquadId) return false;
    if (q && !text.includes(q)) return false;
    if (filters.fecha && s.fecha_inicio !== filters.fecha && s.fecha_fin !== filters.fecha && !(s.fecha_inicio <= filters.fecha && s.fecha_fin >= filters.fecha)) return false;
    if (filters.season && s.season_id !== filters.season) return false;
    if (filters.squad && s.squad_id !== filters.squad) return false;
    if (filters.tag && !(s.tags || []).some((t) => t.toLowerCase().includes(filters.tag.toLowerCase()))) return false;
    return true;
  }), [summaries, filters, activeSquadId]);

  async function duplicate(summary) {
    const { id, created_date, updated_date, created_by_id, ...copy } = summary;
    await base44.entities.MicrocycleSummary.create({ ...copy, microcycle_name: `${displayName(summary)} (copia)`, nombre_microciclo: `${displayName(summary)} (copia)`, estado: "borrador", snapshot_locked: false, duplicated_from_id: id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    await load();
  }
  async function updateStatus(summary, estado) {
    await base44.entities.MicrocycleSummary.update(summary.id, { estado, snapshot_locked: estado === "finalizado" || estado === "archivado", updated_at: new Date().toISOString() });
    await load();
    setSelected((prev) => prev ? { ...prev, estado } : prev);
  }
  async function updateTag(summary, tag, remove = false) {
    const clean = String(tag || "").trim();
    if (!clean) return;
    const tags = remove ? (summary.tags || []).filter((t) => t !== clean) : [...new Set([...(summary.tags || []), clean])];
    await base44.entities.MicrocycleSummary.update(summary.id, { tags, updated_at: new Date().toISOString() });
    setTagDraft("");
    await load();
    setSelected((prev) => prev ? { ...prev, tags } : prev);
  }
  async function exportPdf(summary) {
    if (summary.pdf_url) { window.open(summary.pdf_url, "_blank"); return; }
    const doc = new jsPDF();
    doc.setFillColor(5, 150, 105); doc.rect(0, 0, 210, 20, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(14); doc.text(displayName(summary), 12, 13);
    doc.setTextColor(30, 30, 30); doc.setFontSize(10); doc.text(`${dateRange(summary)} · ${summary.squad_name || ""} · ${summary.rival || "Sin rival"}`, 12, 30);
    let y = 44; COMPARE_KEYS.forEach((key) => { const metric = MICRO_METRICS.find((m) => m.key === key); doc.text(`${metric?.label || key}: ${fmt(metricValue(summary, key), metric?.unit)}`, 12, y); y += 8; });
    doc.text("Sesiones:", 12, y + 6); y += 14;
    (summary.sessions_snapshot || []).slice(0, 18).forEach((s) => { doc.text(`• ${s.date || ""} ${s.title || "Sesión"} (${s.session_type || ""})`, 14, y); y += 7; });
    const fileName = `microciclo-${summary.microcycle_number || summary.fecha_inicio}.pdf`;
    const file = new File([doc.output("blob")], fileName, { type: "application/pdf" });
    const uploaded = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.MicrocycleSummary.update(summary.id, { pdf_url: uploaded.file_url, pdf_generated_at: new Date().toISOString(), exports_snapshot: { ...(summary.exports_snapshot || {}), pdf_url: uploaded.file_url } });
    doc.save(fileName);
    await load();
  }

  if (loading) return <div className="h-64 flex items-center justify-center"><div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" /></div>;
  return <div className="space-y-5"><div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"><div><p className="text-emerald-400 text-xs font-bold uppercase">Biblioteca histórica</p><h1 className="text-white text-3xl font-bold">Historial de Microciclos</h1><p className="text-zinc-400 text-sm">Consultá, compará, duplicá y exportá cualquier semana de la temporada.</p></div><div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3"><p className="text-zinc-500 text-xs">Microciclos visibles</p><p className="text-white text-2xl font-bold">{filtered.length}</p></div></div><Filters filters={filters} setFilters={setFilters} squads={squads} seasons={seasons} /><ComparisonPanel summaries={filtered} /><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{filtered.map((s) => <MicrocycleCard key={s.id} summary={s} selected={selected?.id === s.id} onOpen={setSelected} onDuplicate={duplicate} onExport={exportPdf} />)}{!filtered.length && <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-500 md:col-span-2 xl:col-span-3">No hay microciclos para esos filtros.</div>}</div><DetailPanel summary={selected} tagDraft={tagDraft} setTagDraft={setTagDraft} onClose={() => setSelected(null)} onTag={updateTag} onStatus={updateStatus} onExport={exportPdf} /></div>;
}
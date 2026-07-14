import React, { useMemo, useState } from "react";
import moment from "moment";
import { Check, Pencil, Search, Trash2, X } from "lucide-react";

export default function GpsMicrocycleHistoryPanel({ summaries, selectedSummaryId, onSelect, onUpdate, onDelete, onClose }) {
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [season, setSeason] = useState("");
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState({});

  const seasons = useMemo(() => [...new Set((summaries || []).map((s) => s.season_id).filter(Boolean))].sort().reverse(), [summaries]);
  const filtered = useMemo(() => (summaries || []).filter((s) => {
    const text = `${s.nombre_microciclo || ""} ${s.microcycle_name || ""} ${s.rival || ""} ${s.partido_asociado || ""}`.toLowerCase();
    if (query && !text.includes(query.toLowerCase())) return false;
    if (season && s.season_id !== season) return false;
    if (dateFrom && s.fecha_fin < dateFrom) return false;
    if (dateTo && s.fecha_inicio > dateTo) return false;
    return true;
  }), [summaries, query, season, dateFrom, dateTo]);

  function startEdit(summary) {
    setEditingId(summary.id);
    setDraft({ nombre_microciclo: summary.nombre_microciclo || summary.microcycle_name || "", fecha_inicio: summary.fecha_inicio || "", fecha_fin: summary.fecha_fin || "", rival: summary.rival || "", season_id: summary.season_id || "", estado: summary.estado || "abierto" });
  }

  async function saveEdit() {
    await onUpdate(editingId, { ...draft, microcycle_name: draft.nombre_microciclo });
    setEditingId("");
    setDraft({});
  }

  return <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3"><div className="flex items-start justify-between gap-3"><div><h3 className="text-white font-bold text-lg">Historial de microciclos</h3><p className="text-zinc-500 text-sm">Buscá, abrí, editá o eliminá resúmenes guardados.</p></div><button onClick={onClose} className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white"><X size={16} /></button></div><div className="grid grid-cols-1 md:grid-cols-5 gap-2"><label className="md:col-span-2 relative"><Search size={14} className="absolute left-3 top-3 text-zinc-500" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Microciclo o rival..." className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white" /></label><input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white" /><input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white" /><select value={season} onChange={(e) => setSeason(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white"><option value="">Todas las temporadas</option>{seasons.map((s) => <option key={s} value={s}>{s}</option>)}</select></div><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 max-h-80 overflow-y-auto">{filtered.map((s) => <div key={s.id} className={`rounded-xl border p-3 transition-colors ${selectedSummaryId === s.id ? "bg-emerald-500/10 border-emerald-500/40" : "bg-zinc-950 border-zinc-800"}`}>{editingId === s.id ? <div className="space-y-2"><input value={draft.nombre_microciclo || ""} onChange={(e) => setDraft((p) => ({ ...p, nombre_microciclo: e.target.value }))} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-sm text-white" placeholder="Nombre" /><div className="grid grid-cols-2 gap-2"><input type="date" value={draft.fecha_inicio || ""} onChange={(e) => setDraft((p) => ({ ...p, fecha_inicio: e.target.value }))} className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white" /><input type="date" value={draft.fecha_fin || ""} onChange={(e) => setDraft((p) => ({ ...p, fecha_fin: e.target.value }))} className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white" /></div><input value={draft.rival || ""} onChange={(e) => setDraft((p) => ({ ...p, rival: e.target.value }))} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-sm text-white" placeholder="Rival" /><div className="grid grid-cols-2 gap-2"><input value={draft.season_id || ""} onChange={(e) => setDraft((p) => ({ ...p, season_id: e.target.value }))} className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white" placeholder="Temporada" /><select value={draft.estado || "abierto"} onChange={(e) => setDraft((p) => ({ ...p, estado: e.target.value }))} className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white"><option value="abierto">Abierto</option><option value="cerrado">Cerrado</option><option value="archivado">Archivado</option><option value="borrador">Borrador</option></select></div><div className="flex gap-2"><button onClick={saveEdit} className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold text-white"><Check size={13} />Guardar</button><button onClick={() => setEditingId("")} className="flex-1 px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-bold text-zinc-200">Cancelar</button></div></div> : <><button onClick={() => onSelect(s.id)} className="w-full text-left"><p className="text-white text-sm font-bold truncate">{s.nombre_microciclo || s.microcycle_name || "Microciclo"}</p><p className="text-xs text-zinc-500">{moment(s.fecha_inicio).format("DD/MM/YYYY")} - {moment(s.fecha_fin).format("DD/MM/YYYY")}</p><p className="text-xs text-zinc-400 mt-1">{s.rival || s.partido_asociado || "Sin rival"} · {s.season_id || "—"}</p></button><div className="flex gap-2 mt-3"><button onClick={() => startEdit(s)} className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-bold text-zinc-200"><Pencil size={12} />Editar</button><button onClick={() => window.confirm("¿Eliminar este microciclo del historial?") && onDelete(s.id)} className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-xs font-bold text-red-300"><Trash2 size={12} />Eliminar</button></div></>}</div>)}{!filtered.length && <p className="text-sm text-zinc-500 p-3">No hay microciclos guardados con esos filtros.</p>}</div></div>;
}
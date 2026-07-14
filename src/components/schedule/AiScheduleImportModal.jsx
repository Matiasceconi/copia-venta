import React, { useState } from "react";
import { Upload, X, Trash2, Plus, Sparkles, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { analyzeScheduleFile, emptyPreviewEvent, EVENT_TYPES, upsertImportedEvents } from "./scheduleImportUtils";

function Field({ value, onChange, type = "text", placeholder = "", className = "" }) {
  return <input type={type} value={value || ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={`bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 ${className}`} />;
}

export default function AiScheduleImportModal({ open, onClose, activeSquad, activeSquadId, activeSeasonId, onImported }) {
  const [file, setFile] = useState(null);
  const [previewEvents, setPreviewEvents] = useState([]);
  const [source, setSource] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  if (!open) return null;
  const setEvent = (idx, key, value) => setPreviewEvents((prev) => prev.map((ev, i) => i === idx ? { ...ev, [key]: value } : ev));
  const removeEvent = (idx) => setPreviewEvents((prev) => prev.filter((_, i) => i !== idx));
  const addEvent = () => setPreviewEvents((prev) => [...prev, emptyPreviewEvent(prev[0]?.date)]);

  async function analyze() {
    if (!file) return;
    setLoading(true);
    try {
      const result = await analyzeScheduleFile({ file, activeSquad });
      setPreviewEvents(result.events);
      setSource({ file_url: result.source_file, file_name: result.source_file_name, detected_squad: result.squad_name });
      toast({ title: `IA detectó ${result.events.length} eventos` });
    } catch (error) {
      toast({ title: error.message || "No se pudo leer el archivo", variant: "destructive" });
    } finally { setLoading(false); }
  }

  async function confirmImport() {
    const validEvents = previewEvents.filter((ev) => ev.title && ev.date);
    if (!validEvents.length) {
      toast({ title: "No hay eventos válidos para importar", variant: "destructive" });
      return;
    }
    if (!activeSquadId) {
      toast({ title: "Seleccioná un plantel antes de importar", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await upsertImportedEvents({ previewEvents: validEvents, activeSquad, activeSquadId, activeSeasonId, sourceFile: source?.file_url || "", sourceFileName: source?.file_name || file?.name || "" });
      toast({ title: `✓ ${validEvents.length} eventos importados y Plan Semanal actualizado` });
      onImported?.();
      onClose();
    } catch (error) {
      toast({ title: error.message || "No se pudo importar", variant: "destructive" });
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-6xl my-4 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between gap-4">
          <div><p className="text-white font-bold flex items-center gap-2"><Sparkles size={18} className="text-emerald-400" />Importar cronograma con IA</p><p className="text-zinc-500 text-xs mt-1">La IA genera una vista previa editable. Nada se guarda hasta confirmar.</p></div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-3">
            <label className="flex-1 border border-dashed border-zinc-700 rounded-xl px-4 py-4 text-sm text-zinc-400 hover:border-emerald-500/60 cursor-pointer transition-colors"><input type="file" accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} /><Upload size={16} className="inline mr-2" />{file ? file.name : "Seleccionar PDF, imagen o Excel"}</label>
            <button onClick={analyze} disabled={!file || loading || !activeSquadId} className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 text-white text-sm font-bold transition-colors">{loading ? "Leyendo..." : "Leer con IA"}</button>
          </div>
          {previewEvents.length > 0 && <div className="space-y-3"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-bold text-white">Vista previa editable</p><p className="text-xs text-zinc-500 mt-0.5">Plantel detectado: {source?.detected_squad || "—"} · Se importará en: {activeSquad?.name || "plantel activo"}</p></div><button onClick={addEvent} className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs"><Plus size={13} /> Agregar evento</button></div><div className="overflow-x-auto border border-zinc-800 rounded-xl"><table className="w-full text-xs min-w-[980px]"><thead><tr className="bg-zinc-950 text-zinc-400"><th className="p-2 text-left">Fecha</th><th className="p-2 text-left">Inicio</th><th className="p-2 text-left">Fin</th><th className="p-2 text-left">Actividad</th><th className="p-2 text-left">Tipo</th><th className="p-2 text-left">Lugar</th><th className="p-2 text-left">Rival</th><th className="p-2 text-left">Condición</th><th className="p-2" /></tr></thead><tbody>{previewEvents.map((ev, idx) => <tr key={idx} className="border-t border-zinc-800"><td className="p-2"><Field type="date" value={ev.date} onChange={(v) => setEvent(idx, "date", v)} /></td><td className="p-2"><Field type="time" value={ev.start_time} onChange={(v) => setEvent(idx, "start_time", v)} /></td><td className="p-2"><Field type="time" value={ev.end_time} onChange={(v) => setEvent(idx, "end_time", v)} /></td><td className="p-2"><Field value={ev.title} onChange={(v) => setEvent(idx, "title", v)} className="w-44" /></td><td className="p-2"><select value={ev.event_type} onChange={(e) => setEvent(idx, "event_type", e.target.value)} className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none">{EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></td><td className="p-2"><Field value={ev.location} onChange={(v) => setEvent(idx, "location", v)} className="w-36" /></td><td className="p-2"><Field value={ev.rival} onChange={(v) => setEvent(idx, "rival", v)} className="w-32" /></td><td className="p-2"><select value={ev.home_away || ""} onChange={(e) => setEvent(idx, "home_away", e.target.value)} className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"><option value="">—</option><option>Local</option><option>Visitante</option><option>Neutral</option></select></td><td className="p-2 text-center"><button onClick={() => removeEvent(idx)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/15"><Trash2 size={13} /></button></td></tr>)}</tbody></table></div><div className="flex justify-end gap-2"><button onClick={onClose} className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm">Cancelar</button><button onClick={confirmImport} disabled={saving || !activeSquadId || !previewEvents.some(e => e.title && e.date)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 text-white text-sm font-bold"><Check size={15} />{saving ? "Importando..." : "Confirmar importación"}</button></div></div>}
        </div>
      </div>
    </div>
  );
}
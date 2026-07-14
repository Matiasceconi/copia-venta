import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Save, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const DEFAULT_READING_STATUSES = [
  { name: "Óptimo", color: "#16a34a", order: 1, active: true },
  { name: "Muy bueno", color: "#22c55e", order: 2, active: true },
  { name: "Adecuado", color: "#eab308", order: 3, active: true },
  { name: "A mejorar", color: "#f97316", order: 4, active: true },
  { name: "Prioritario", color: "#ef4444", order: 5, active: true },
];

const DEFAULT_REFERENCES = ["Excelente", "Muy bueno", "Adecuado", "Elevado", "Muy elevado"];

function TextInput(props) {
  return <input {...props} className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-emerald-600" />;
}

export default function NutritionSettingsPanel({ readingStatuses = [], referenceRanges = [], onReload }) {
  const [statuses, setStatuses] = useState(readingStatuses.length ? readingStatuses : DEFAULT_READING_STATUSES);
  const [references, setReferences] = useState(referenceRanges.length ? referenceRanges : ["field", "goalkeeper"].flatMap((type) => DEFAULT_REFERENCES.map((label, index) => ({ player_type: type, metric_key: "sumatoria_6p", label, min_value: index * 10, max_value: (index + 1) * 10, color: ["#22c55e", "#84cc16", "#eab308", "#f97316", "#ef4444"][index], order: index + 1, active: true }))));
  const { toast } = useToast();

  async function saveStatuses() {
    await Promise.all(statuses.map((status, index) => status.id ? base44.entities.NutritionReadingStatus.update(status.id, { ...status, order: index + 1 }) : base44.entities.NutritionReadingStatus.create({ ...status, order: index + 1, active: status.active !== false })));
    toast({ title: "Etiquetas guardadas" });
    onReload?.();
  }

  async function saveReferences() {
    await Promise.all(references.map((ref, index) => ref.id ? base44.entities.NutritionReferenceRange.update(ref.id, { ...ref, order: index + 1 }) : base44.entities.NutritionReferenceRange.create({ ...ref, order: index + 1, active: ref.active !== false })));
    toast({ title: "Referencias guardadas" });
    onReload?.();
  }

  return <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between"><div><h3 className="text-white font-bold">Etiquetas de lectura</h3><p className="text-xs text-zinc-500">Colores configurables para Informe de una Lectura.</p></div><button onClick={() => setStatuses([...statuses, { name: "Nueva etiqueta", color: "#22c55e", active: true }])} className="px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-xs flex items-center gap-1"><Plus size={12} />Agregar</button></div>
      <div className="space-y-2">{statuses.map((status, index) => <div key={status.id || index} className="grid grid-cols-[1fr_110px_auto] gap-2 items-center"><TextInput value={status.name || ""} onChange={(e) => setStatuses((rows) => rows.map((row, i) => i === index ? { ...row, name: e.target.value } : row))} /><TextInput type="color" value={status.color || "#22c55e"} onChange={(e) => setStatuses((rows) => rows.map((row, i) => i === index ? { ...row, color: e.target.value } : row))} /><button onClick={() => setStatuses((rows) => rows.filter((_, i) => i !== index))} className="p-2 text-zinc-500 hover:text-red-400"><Trash2 size={14} /></button></div>)}</div>
      <button onClick={saveStatuses} className="w-full inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl py-2 text-sm font-semibold"><Save size={14} />Guardar etiquetas</button>
    </section>

    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between"><div><h3 className="text-white font-bold">Referencias antropométricas</h3><p className="text-xs text-zinc-500">Rangos por arquero/jugador de campo y métrica.</p></div><button onClick={() => setReferences([...references, { player_type: "field", metric_key: "sumatoria_6p", label: "Nueva referencia", min_value: 0, max_value: 0, color: "#22c55e", active: true }])} className="px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-xs flex items-center gap-1"><Plus size={12} />Agregar</button></div>
      <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">{references.map((ref, index) => <div key={ref.id || index} className="grid grid-cols-2 md:grid-cols-[110px_140px_1fr_70px_70px_60px_auto] gap-2 items-center bg-zinc-950 border border-zinc-800 rounded-xl p-2"><select value={ref.player_type || "field"} onChange={(e) => setReferences((rows) => rows.map((row, i) => i === index ? { ...row, player_type: e.target.value } : row))} className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-2 text-xs text-white"><option value="field">Campo</option><option value="goalkeeper">Arquero</option></select><select value={ref.metric_key || "sumatoria_6p"} onChange={(e) => setReferences((rows) => rows.map((row, i) => i === index ? { ...row, metric_key: e.target.value } : row))} className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-2 text-xs text-white"><option value="sumatoria_6p">Sum. 6P</option><option value="porcentaje_grasa">% Grasa</option><option value="peso">Peso</option><option value="kg_grasa">Kg grasa</option><option value="kg_masa_muscular">Masa muscular</option><option value="imo">IMO</option></select><TextInput value={ref.label || ""} onChange={(e) => setReferences((rows) => rows.map((row, i) => i === index ? { ...row, label: e.target.value } : row))} /><TextInput type="number" value={ref.min_value ?? ""} onChange={(e) => setReferences((rows) => rows.map((row, i) => i === index ? { ...row, min_value: Number(e.target.value) } : row))} /><TextInput type="number" value={ref.max_value ?? ""} onChange={(e) => setReferences((rows) => rows.map((row, i) => i === index ? { ...row, max_value: Number(e.target.value) } : row))} /><TextInput type="color" value={ref.color || "#22c55e"} onChange={(e) => setReferences((rows) => rows.map((row, i) => i === index ? { ...row, color: e.target.value } : row))} /><button onClick={() => setReferences((rows) => rows.filter((_, i) => i !== index))} className="p-2 text-zinc-500 hover:text-red-400"><Trash2 size={14} /></button></div>)}</div>
      <button onClick={saveReferences} className="w-full inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl py-2 text-sm font-semibold"><Save size={14} />Guardar referencias</button>
    </section>
  </div>;
}
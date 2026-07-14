import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Upload, Loader, Sparkles, Trash2, Check, Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { METHOD_OPTIONS, TYPE_OPTIONS } from "@/components/sessions/strength/strengthOptions";
import { syncToStrengthLibrary } from "@/components/sessions/exerciseLibrarySync";

const DEFAULT_COLORS = ["#ef4444", "#22c55e", "#38bdf8", "#f59e0b", "#a855f7", "#14b8a6"];
const DEFAULT_ICONS = ["rotate", "activity", "zap", "shield", "target", "users"];

function normalizeName(value = "") {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

export default function StrengthImageImportModal({ session, hasExisting, onClose, onImported }) {
  const [step, setStep] = useState("upload");
  const [imageUrl, setImageUrl] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({});
  const [replaceMode, setReplaceMode] = useState(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStep("analyzing");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImageUrl(file_url);
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analizá esta imagen de una planificación de fuerza de fútbol. Detectá automáticamente todos los CUADROS DE TRABAJO visibles: columnas, bloques, grupos o secciones principales. No limites los nombres a Restaura/Compensa. Extraé cada ejercicio dentro del cuadro correcto. Si hay dos columnas, creá dos cuadros; si hay tres, tres cuadros; si hay más, todos los que correspondan. Para método intentá mapear a: ${METHOD_OPTIONS.join(", ")}. Para tipo intentá mapear a: ${TYPE_OPTIONS.join(", ")}.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            strength_purpose: { type: "string" },
            strength_session_type: { type: "string" },
            strength_vector_pattern: { type: "string" },
            work_blocks: { type: "array", items: { type: "object", properties: { name: { type: "string" }, description: { type: "string" } } } },
            exercises: { type: "array", items: { type: "object", properties: { work_block_name: { type: "string" }, method: { type: "string" }, exercise_type: { type: "string" }, exercise_name: { type: "string" }, volume: { type: "string" }, sets: { type: "string" }, reps: { type: "string" }, time: { type: "string" }, rest_time: { type: "string" }, notes: { type: "string" } } } },
          },
          required: ["exercises"],
        },
      });

      const detectedNames = result.work_blocks?.length ? result.work_blocks.map(b => b.name).filter(Boolean) : [...new Set((result.exercises || []).map(r => r.work_block_name || "Cuadro 1"))];
      const nextBlocks = detectedNames.map((name, i) => ({ tempId: `block-${i}`, name: name || `Cuadro ${i + 1}`, description: result.work_blocks?.[i]?.description || "", color: DEFAULT_COLORS[i % DEFAULT_COLORS.length], icon: DEFAULT_ICONS[i % DEFAULT_ICONS.length] }));
      const fallback = nextBlocks[0]?.name || "Cuadro 1";
      setBlocks(nextBlocks.length ? nextBlocks : [{ tempId: "block-0", name: fallback, description: "", color: DEFAULT_COLORS[0], icon: DEFAULT_ICONS[0] }]);
      setRows((result.exercises || []).map((r, i) => ({ tempId: `import-${i}`, work_block_name: r.work_block_name || fallback, method: r.method || "", exercise_type: r.exercise_type || "", exercise_name: r.exercise_name || "", volume: r.volume || "", sets: r.sets || "", reps: r.reps || "", time: r.time || "", rest_time: r.rest_time || "", notes: r.notes || "" })));
      setMeta({ strength_purpose: result.strength_purpose || "", strength_session_type: result.strength_session_type || "", strength_vector_pattern: result.strength_vector_pattern || "" });
      setReplaceMode(hasExisting ? null : "add");
      setStep("review");
    } catch (err) {
      toast({ title: "Error al analizar la imagen: " + err.message, variant: "destructive" });
      setStep("upload");
    }
  }

  function updateRow(tempId, field, value) { setRows(prev => prev.map(r => r.tempId === tempId ? { ...r, [field]: value } : r)); }
  function updateBlock(tempId, field, value) {
    const current = blocks.find(b => b.tempId === tempId);
    setBlocks(prev => prev.map(b => b.tempId === tempId ? { ...b, [field]: value } : b));
    if (field === "name" && current?.name) {
      setRows(prev => prev.map(row => row.work_block_name === current.name ? { ...row, work_block_name: value } : row));
    }
  }
  function deleteRow(tempId) { setRows(prev => prev.filter(r => r.tempId !== tempId)); }
  function addBlock() { setBlocks(prev => [...prev, { tempId: `block-${Date.now()}`, name: `Cuadro ${prev.length + 1}`, description: "", color: DEFAULT_COLORS[prev.length % DEFAULT_COLORS.length], icon: DEFAULT_ICONS[prev.length % DEFAULT_ICONS.length] }]); }

  async function confirmImport() {
    if (hasExisting && !replaceMode) return;
    setSaving(true);
    try {
      if (replaceMode === "replace") {
        const existingRows = await base44.entities.StrengthStation.filter({ session_id: session.id }, "order", 300);
        const existingBlocks = await base44.entities.StrengthWorkBlock.filter({ session_id: session.id }, "order", 100);
        for (const row of existingRows) {
          await base44.entities.StrengthStation.delete(row.id);
        }
        for (const block of existingBlocks) {
          await base44.entities.StrengthWorkBlock.delete(block.id);
        }
      }
      const existingCount = replaceMode === "replace" ? 0 : (await base44.entities.StrengthWorkBlock.filter({ session_id: session.id }, "order", 100)).length;
      const createdBlocks = [];
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        createdBlocks.push(await base44.entities.StrengthWorkBlock.create({ session_id: session.id, name: b.name || `Cuadro ${i + 1}`, description: b.description || "", color: b.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length], icon: b.icon || DEFAULT_ICONS[i % DEFAULT_ICONS.length], order: existingCount + i + 1, hidden: false }));
      }
      const byName = Object.fromEntries(createdBlocks.map(block => [String(block.name || "").toLowerCase().trim(), block]));
      const library = await base44.entities.StrengthExerciseLibrary.list("name", 500);
      const libraryByName = Object.fromEntries(library.map(ex => [normalizeName(ex.name), ex]));
      const created = [];
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const block = byName[String(r.work_block_name || "").toLowerCase().trim()] || createdBlocks[0];
        const order = rows.filter((item, idx) => idx <= i && String(item.work_block_name || "").toLowerCase().trim() === String(r.work_block_name || "").toLowerCase().trim()).length;
        const linked = libraryByName[normalizeName(r.exercise_name)];
        const createdStation = await base44.entities.StrengthStation.create({
          session_id: session.id,
          work_block_id: block.id,
          strength_group: block.name,
          order,
          station_number: order,
          method: r.method || linked?.method || "",
          exercise_type: r.exercise_type || linked?.exercise_type || "",
          exercise_name: linked?.name || r.exercise_name || "",
          volume: r.volume || linked?.volume || "",
          sets: r.sets || linked?.sets || "",
          reps: r.reps || linked?.reps || "",
          time: r.time || linked?.time || "",
          rest_time: r.rest_time || linked?.rest_time || "",
          notes: r.notes || linked?.notes || "",
          image_url: linked?.image_url || "",
          video_url: linked?.video_url || "",
          library_exercise_id: linked?.id || "",
          library_strength_exercise_id: linked?.id || "",
        });
        const libraryId = await syncToStrengthLibrary(createdStation, session.id, session.squad_id, session.squad_name, { updateExistingId: linked?.id || undefined, session });
        const stationWithLibrary = libraryId ? await base44.entities.StrengthStation.update(createdStation.id, { library_exercise_id: libraryId, library_strength_exercise_id: libraryId }) : createdStation;
        created.push(stationWithLibrary);
      }
      const sessionUpdate = { strength_purpose: meta.strength_purpose || session.strength_purpose, strength_session_type: meta.strength_session_type || session.strength_session_type, strength_vector_pattern: meta.strength_vector_pattern || session.strength_vector_pattern };
      await base44.entities.TrainingSession.update(session.id, sessionUpdate);
      await base44.entities.SessionVideoLink.create({ session_id: session.id, title: "Planificación de fuerza (imagen original)", video_url: imageUrl, source: "Otro", video_type: "Fuerza" }).catch(() => {});
      toast({ title: `✓ ${createdBlocks.length} cuadros y ${created.length} ejercicios importados` });
      onImported({ ...session, ...sessionUpdate });
    } catch (err) {
      toast({ title: "Error al guardar la importación: " + err.message, variant: "destructive" });
    } finally { setSaving(false); }
  }

  return <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"><div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto"><div className="flex items-center justify-between p-4 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10"><div className="flex items-center gap-2"><Sparkles size={15} className="text-purple-400" /><p className="text-sm font-semibold text-white">Importar fuerza desde imagen</p></div><button onClick={onClose} disabled={saving} className="text-zinc-500 hover:text-white"><X size={16} /></button></div><div className="p-5 space-y-4">{step === "upload" && <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-zinc-700 rounded-xl py-10 cursor-pointer hover:border-zinc-500"><Upload size={22} className="text-zinc-500" /><p className="text-sm text-zinc-400">Subí una imagen de la planificación de fuerza</p><input type="file" accept="image/*" className="hidden" onChange={handleFile} /></label>}{step === "analyzing" && <div className="flex flex-col items-center justify-center gap-3 py-14"><Loader size={24} className="animate-spin text-purple-400" /><p className="text-sm text-zinc-400">Detectando cuadros y ejercicios con IA...</p></div>}{step === "review" && <div className="space-y-4"><div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{[{ key: "strength_purpose", label: "Propósito mecánico" }, { key: "strength_session_type", label: "Tipo de sesión" }, { key: "strength_vector_pattern", label: "Patrón vectorial" }].map(field => <div key={field.key}><label className="text-[10px] text-zinc-500 mb-1 block">{field.label}</label><input value={meta[field.key] || ""} onChange={e => setMeta(m => ({ ...m, [field.key]: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none" /></div>)}</div>{hasExisting && <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 space-y-2"><p className="text-xs text-amber-300">¿Querés reemplazar la fuerza actual o agregar esta estructura debajo?</p><div className="flex gap-2"><button onClick={() => setReplaceMode("replace")} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${replaceMode === "replace" ? "bg-white text-zinc-900" : "bg-zinc-800 text-zinc-300 border border-zinc-700"}`}>Reemplazar actual</button><button onClick={() => setReplaceMode("add")} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${replaceMode === "add" ? "bg-white text-zinc-900" : "bg-zinc-800 text-zinc-300 border border-zinc-700"}`}>Agregar debajo</button></div></div>}<div className="border border-zinc-800 rounded-xl p-3"><div className="flex items-center justify-between mb-3"><p className="text-xs font-bold text-white">Cuadros detectados</p><button onClick={addBlock} className="flex items-center gap-1 text-xs text-emerald-300"><Plus size={12} /> Agregar cuadro</button></div><div className="grid grid-cols-1 md:grid-cols-2 gap-2">{blocks.map(block => <div key={block.tempId} className="grid grid-cols-[1fr_44px] gap-2"><input value={block.name} onChange={e => updateBlock(block.tempId, "name", e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white" /><input type="color" value={block.color} onChange={e => updateBlock(block.tempId, "color", e.target.value)} className="h-8 bg-transparent border border-zinc-700 rounded" /></div>)}</div></div><div className="border border-zinc-800 rounded-xl overflow-x-auto"><table className="w-full text-xs border-collapse"><thead><tr className="border-b border-zinc-800 bg-zinc-900/80"><th className="text-center py-2 px-2 text-zinc-500 font-medium w-8">N°</th><th className="text-left py-2 px-2 text-zinc-500 font-medium">Cuadro</th><th className="text-left py-2 px-2 text-zinc-500 font-medium">Método</th><th className="text-left py-2 px-2 text-zinc-500 font-medium">Tipo</th><th className="text-left py-2 px-2 text-zinc-500 font-medium">Ejercicio</th><th className="text-left py-2 px-2 text-zinc-500 font-medium">Volumen</th><th className="text-left py-2 px-2 text-zinc-500 font-medium">Obs.</th><th></th></tr></thead><tbody>{rows.map((r, i) => <tr key={r.tempId} className="border-b border-zinc-800/60"><td className="py-1.5 px-2 text-center text-white font-bold">{i + 1}</td><td className="py-1.5 px-2"><select value={r.work_block_name} onChange={e => updateRow(r.tempId, "work_block_name", e.target.value)} className="w-32 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white">{blocks.map(block => <option key={block.tempId} value={block.name}>{block.name}</option>)}</select></td>{["method", "exercise_type", "exercise_name", "volume", "notes"].map(key => <td key={key} className="py-1.5 px-2"><input value={r[key]} onChange={e => updateRow(r.tempId, key, e.target.value)} className={`${key === "exercise_name" || key === "notes" ? "w-44" : "w-28"} bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white`} /></td>)}<td className="py-1.5 px-2"><button onClick={() => deleteRow(r.tempId)} className="text-zinc-600 hover:text-red-400"><Trash2 size={12} /></button></td></tr>)}{rows.length === 0 && <tr><td colSpan={8} className="text-center text-zinc-600 py-4">Sin ejercicios detectados</td></tr>}</tbody></table></div><div className="flex justify-end gap-2"><button onClick={onClose} disabled={saving} className="px-3 py-2 text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg">Cancelar</button><button onClick={confirmImport} disabled={saving || rows.length === 0 || blocks.length === 0 || (hasExisting && !replaceMode)} className="flex items-center gap-1.5 px-4 py-2 text-xs bg-white text-zinc-900 font-semibold rounded-lg disabled:opacity-50">{saving ? <Loader size={13} className="animate-spin" /> : <Check size={13} />}{saving ? "Guardando..." : "Confirmar importación"}</button></div></div>}</div></div></div>;
}
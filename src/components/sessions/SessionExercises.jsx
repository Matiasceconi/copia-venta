import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Edit2, X, Image, ChevronDown, ChevronUp, BookOpen, Search, Sparkles, Loader2, Play } from "lucide-react";
import ExerciseGPS from "@/components/sessions/ExerciseGPS";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";
import { fieldImportantChanged, syncToFieldLibrary, getVideoThumbnailUrl } from "@/components/sessions/exerciseLibrarySync";
import ExerciseTypeSelector from "@/components/sessions/ExerciseTypeSelector";
import { DEFAULT_FIELD_EXERCISE_TYPES, addFieldExerciseType, deleteFieldExerciseType, loadFieldExerciseTypes, renameFieldExerciseType } from "@/components/sessions/exerciseTypeOptions";
import VideoUploadSection from "@/components/sessions/VideoUploadSection";
import VideoPreviewModal from "@/components/sessions/VideoPreviewModal";

const TYPE_COLORS = {
  "Activación": "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  "Técnico": "bg-blue-500/15 text-blue-300 border-blue-500/30",
  "Táctico": "bg-purple-500/15 text-purple-300 border-purple-500/30",
  "Reducido": "bg-orange-500/15 text-orange-300 border-orange-500/30",
  "Posesión": "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  "Finalización": "bg-red-500/15 text-red-300 border-red-500/30",
  "Fuerza": "bg-pink-500/15 text-pink-300 border-pink-500/30",
  "Regenerativo": "bg-sky-500/15 text-sky-300 border-sky-500/30",
  "Otro": "bg-zinc-500/15 text-zinc-300 border-zinc-600",
};

const EMPTY_FORM = {
  name: "", type: "Técnico", duration_min: "", blocks: "", work_time: "", rest_time: "",
  length_m: "", width_m: "", players_count: "", objective: "", description: "",
  image_url: "", video_url: "", notes: "", tags: "", library_exercise_id: "",
};

// Extrae el primer número de un texto tipo "4 min" o "4'"
function parseMinutes(str) {
  if (!str) return 0;
  const m = String(str).match(/(\d+(\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

function calcDerived(f) {
  const l = parseFloat(f.length_m) || 0;
  const w = parseFloat(f.width_m) || 0;
  const p = parseFloat(f.players_count) || 0;
  const total_area = l && w ? parseFloat((l * w).toFixed(1)) : undefined;
  const eii = total_area && p ? parseFloat((total_area / p).toFixed(2)) : undefined;

  // Tiempo total = bloques x trabajo + pausas entre bloques (bloques - 1)
  const blocks = parseFloat(f.blocks) || 0;
  const work = parseMinutes(f.work_time);
  const rest = parseMinutes(f.rest_time);
  const totalTime = (blocks && work) ? (blocks * work + Math.max(blocks - 1, 0) * rest) : undefined;

  return { total_area, eii, totalTime };
}

function eiiInterpretation(eii) {
  if (eii == null) return null;
  if (eii < 8) return { label: "EII bajo", color: "text-red-300 bg-red-500/10 border-red-500/30" };
  if (eii <= 15) return { label: "EII medio", color: "text-amber-300 bg-amber-500/10 border-amber-500/30" };
  return { label: "EII alto", color: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30" };
}

function num(v) { const n = parseFloat(v); return isNaN(n) ? undefined : n; }

export default function SessionExercises({ session, sessionPlayers }) {
  const sessionId = session?.id;
  const [exercises, setExercises] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryExercises, setLibraryExercises] = useState([]);
  const [libSearch, setLibSearch] = useState("");
  const [libTypeFilter, setLibTypeFilter] = useState("");
  const [exerciseTypes, setExerciseTypes] = useState(DEFAULT_FIELD_EXERCISE_TYPES);
  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [aiLoading, setAiLoading] = useState({ name: false, description: false, objective: false });
  const [updateLibraryToo, setUpdateLibraryToo] = useState(false);
  const [originalExercise, setOriginalExercise] = useState(null);
  const [videoModalId, setVideoModalId] = useState(null);
  const { toast } = useToast();

  async function handleImageUpload(file) {
    if (!file) return;
    setUploadingImg(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setF("image_url", file_url);
    setUploadingImg(false);
  }

  useEffect(() => {
    base44.entities.SessionExercise.filter({ session_id: sessionId }, "order", 100).then(exs => {
      setExercises(exs.sort((a, b) => (a.order || 0) - (b.order || 0)));
    });
  }, [sessionId]);

  useEffect(() => { refreshExerciseTypes(); }, []);

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function refreshExerciseTypes() {
    const labels = await loadFieldExerciseTypes();
    setExerciseTypes(labels);
  }

  async function handleAddType() {
    const label = window.prompt("Nuevo tipo de ejercicio");
    if (!label?.trim()) return;
    await addFieldExerciseType(label);
    await refreshExerciseTypes();
    setF("type", label.trim());
    toast({ title: "Tipo agregado" });
  }

  async function handleEditType(label) {
    const next = window.prompt("Editar tipo de ejercicio", label || "");
    if (!next?.trim() || next.trim() === label) return;
    await renameFieldExerciseType(label, next);
    await refreshExerciseTypes();
    setF("type", next.trim());
    setExercises(prev => prev.map(ex => ex.type === label ? { ...ex, type: next.trim() } : ex));
    toast({ title: "Tipo actualizado" });
  }

  async function handleDeleteType(label) {
    if (!label || !window.confirm(`¿Eliminar el tipo "${label}" de la lista?`)) return;
    await deleteFieldExerciseType(label);
    const labels = await loadFieldExerciseTypes();
    setExerciseTypes(labels);
    if (form.type === label) setF("type", labels[0] || "");
    toast({ title: "Tipo eliminado" });
  }

  function openNew() { setForm(EMPTY_FORM); setEditId(null); setShowAdvanced(false); setNameSuggestions([]); setUpdateLibraryToo(false); setOriginalExercise(null); setShowForm(true); }

  function openEdit(ex) {
    setForm({
      name: ex.name || "", type: ex.type || "Técnico",
      duration_min: ex.duration_min ?? "", blocks: ex.blocks ?? "",
      work_time: ex.work_time || "", rest_time: ex.rest_time || "",
      length_m: ex.length_m ?? "", width_m: ex.width_m ?? "",
      players_count: ex.players_count ?? "", objective: ex.objective || "",
      description: ex.description || "", image_url: ex.image_url || "",
      video_url: ex.video_url || "", notes: ex.notes || "", tags: (ex.tags || []).join(", "),
      library_exercise_id: ex.library_exercise_id || "",
    });
    setEditId(ex.id);
    setOriginalExercise(ex);
    setUpdateLibraryToo(false);
    setShowAdvanced(!!ex.notes);
    setNameSuggestions([]);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    const { total_area, eii, totalTime } = calcDerived(form);
    const payload = {
      session_id: sessionId,
      name: form.name,
      type: form.type,
      duration_min: num(form.duration_min) ?? totalTime,
      blocks: num(form.blocks),
      work_time: form.work_time || undefined,
      rest_time: form.rest_time || undefined,
      length_m: num(form.length_m),
      width_m: num(form.width_m),
      players_count: num(form.players_count),
      total_area,
      eii,
      objective: form.objective || undefined,
      description: form.description || undefined,
      image_url: form.image_url || undefined,
      video_url: form.video_url || null,
      notes: form.notes || undefined,
      tags: String(form.tags || "").split(",").map(t => t.trim()).filter(Boolean),
      library_exercise_id: form.library_exercise_id || undefined,
    };

    if (editId) {
      const linkedId = originalExercise?.library_exercise_id || form.library_exercise_id;
      let shouldUpdateLibrary = updateLibraryToo;
      if (linkedId && !shouldUpdateLibrary && fieldImportantChanged(originalExercise, form)) {
        shouldUpdateLibrary = window.confirm("Este ejercicio está vinculado a la biblioteca. ¿Querés actualizar la plantilla original?");
      }
      if (linkedId && shouldUpdateLibrary) {
        await syncToFieldLibrary(form, sessionId, session?.squad_id, session?.squad_name, { updateExistingId: linkedId, incrementUsage: false });
      }
      const updated = await base44.entities.SessionExercise.update(editId, payload);
      setExercises(prev => prev.map(e => e.id === editId ? { ...e, ...updated } : e));
      toast({ title: shouldUpdateLibrary ? "✓ Ejercicio y biblioteca actualizados" : "✓ Ejercicio actualizado" });
    } else {
      payload.order = exercises.length + 1;
      const created = await base44.entities.SessionExercise.create(payload);
      let libId = form.library_exercise_id;
      if (libId) {
        let shouldUpdateLibrary = updateLibraryToo;
        if (!shouldUpdateLibrary && fieldImportantChanged(originalExercise, form)) {
          shouldUpdateLibrary = window.confirm("Este ejercicio está vinculado a la biblioteca. ¿Querés actualizar la plantilla original?");
        }
        if (shouldUpdateLibrary) await syncToFieldLibrary(form, sessionId, session?.squad_id, session?.squad_name, { updateExistingId: libId, incrementUsage: false });
      } else {
        libId = await syncToFieldLibrary(form, sessionId, session?.squad_id, session?.squad_name);
      }
      if (libId && !created.library_exercise_id) {
        await base44.entities.SessionExercise.update(created.id, { library_exercise_id: libId });
        created.library_exercise_id = libId;
      }
      setExercises(prev => [...prev, created]);
      toast({ title: "✓ Ejercicio agregado" });
    }
    setShowForm(false);
    setEditId(null);
    setOriginalExercise(null);
    setUpdateLibraryToo(false);
    setForm(EMPTY_FORM);
    setSaving(false);
  }

  async function removeExercise(id) {
    if (!window.confirm("¿Eliminar ejercicio?")) return;
    await base44.entities.SessionExercise.delete(id);
    setExercises(prev => prev.filter(e => e.id !== id));
  }

  async function openLibrary() {
    const data = await base44.entities.FieldExerciseLibrary.list("-times_used", 300);
    const visible = data.filter(e => e.global === true || e.squad_id === session?.squad_id);
    setLibraryExercises(visible);
    setLibTypeFilter("");
    setShowLibrary(true);
  }

  function addFromLibrary(ex) {
    setForm({
      name: ex.name || "", type: ex.type || "Técnico",
      duration_min: ex.duration_min ?? "", blocks: ex.blocks ?? "",
      work_time: ex.work_time || "", rest_time: ex.rest_time || "",
      length_m: ex.length_m ?? "", width_m: ex.width_m ?? "",
      players_count: ex.players_count ?? "", objective: ex.objective || "",
      description: ex.description || "", image_url: ex.image_url || "",
      video_url: ex.video_url || "", notes: ex.notes || "", tags: (ex.tags || []).join(", "),
      library_exercise_id: ex.id,
    });
    setEditId(null);
    setOriginalExercise(ex);
    setUpdateLibraryToo(false);
    setShowAdvanced(!!ex.notes);
    setShowLibrary(false);
    setShowForm(true);
    // Update library usage
    base44.entities.FieldExerciseLibrary.update(ex.id, {
      times_used: (ex.times_used || 1) + 1,
      last_used_at: moment().format("YYYY-MM-DD"),
    });
  }

  async function moveUp(idx) {
    if (idx === 0) return;
    const list = [...exercises];
    [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]];
    const updated = list.map((e, i) => ({ ...e, order: i + 1 }));
    setExercises(updated);
    await Promise.all(updated.map(e => base44.entities.SessionExercise.update(e.id, { order: e.order })));
  }

  async function moveDown(idx) {
    if (idx === exercises.length - 1) return;
    const list = [...exercises];
    [list[idx], list[idx + 1]] = [list[idx + 1], list[idx]];
    const updated = list.map((e, i) => ({ ...e, order: i + 1 }));
    setExercises(updated);
    await Promise.all(updated.map(e => base44.entities.SessionExercise.update(e.id, { order: e.order })));
  }

  function toggleExpand(id) { setExpanded(p => ({ ...p, [id]: !p[id] })); }

  // ── IA: sugerencias ────────────────────────────────────────────────────
  async function aiSuggestName() {
    setAiLoading(s => ({ ...s, name: true }));
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Sos un preparador físico/entrenador de fútbol. Sugerí 3 nombres breves y profesionales para un ejercicio de entrenamiento con estas características:
Tipo: ${form.type || "no especificado"}
Objetivo: ${form.objective || "no especificado"}
Cantidad de jugadores: ${form.players_count || "no especificado"}
Espacio: ${form.length_m || "?"}x${form.width_m || "?"} m
Duración: ${form.duration_min || "no especificada"} min
Devolvé solo los nombres, sin numeración.`,
        response_json_schema: { type: "object", properties: { names: { type: "array", items: { type: "string" } } }, required: ["names"] },
      });
      setNameSuggestions(res.names || []);
    } finally {
      setAiLoading(s => ({ ...s, name: false }));
    }
  }

  async function aiSuggestDescription() {
    setAiLoading(s => ({ ...s, description: true }));
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Generá una descripción corta (máximo 2 líneas, en español) para este ejercicio de entrenamiento de fútbol:
Nombre: ${form.name || "sin nombre"}
Tipo: ${form.type}
Jugadores: ${form.players_count || "?"}
Espacio: ${form.length_m || "?"}x${form.width_m || "?"} m
Objetivo: ${form.objective || "no especificado"}
Respondé solo con la descripción, sin introducciones ni comillas.`,
      });
      setF("description", (res || "").trim());
    } finally {
      setAiLoading(s => ({ ...s, description: false }));
    }
  }

  async function aiSuggestObjective() {
    setAiLoading(s => ({ ...s, objective: true }));
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Según estos datos de un ejercicio de entrenamiento de fútbol, sugerí en una sola línea breve el objetivo táctico, el objetivo físico y la intensidad esperada:
Tipo: ${form.type}
Jugadores: ${form.players_count || "?"}
Espacio: ${form.length_m || "?"}x${form.width_m || "?"} m
Duración: ${form.duration_min || "?"} min
Formato de respuesta: "Objetivo táctico · Objetivo físico · Intensidad: Baja/Media/Alta". Sin comillas.`,
      });
      setF("objective", (res || "").trim());
    } finally {
      setAiLoading(s => ({ ...s, objective: false }));
    }
  }

  const derived = calcDerived(form);
  const eiiInterp = eiiInterpretation(derived.eii);

  return (
    <div className="space-y-4">
      {exercises.length === 0 && !showForm && (
        <p className="text-zinc-600 text-sm text-center py-6">Sin ejercicios cargados</p>
      )}

      {/* Exercise cards — vista compacta */}
      {exercises.map((ex, i) => {
        const tc = TYPE_COLORS[ex.type] || TYPE_COLORS["Otro"];
        const isExpanded = expanded[ex.id];
        const exEii = eiiInterpretation(ex.eii);
        const videoThumb = ex.video_url ? getVideoThumbnailUrl(ex.video_url) : null;
        return (
          <div key={ex.id} className="bg-zinc-800/50 border border-zinc-700 rounded-xl overflow-hidden">
            {/* Card header — compacto */}
            <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => toggleExpand(ex.id)}>
              {/* Order controls */}
              <div className="flex flex-col gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                <button onClick={() => moveUp(i)} className="text-zinc-600 hover:text-zinc-300 transition-colors">
                  <ChevronUp size={13} />
                </button>
                <span className="text-[11px] font-bold text-zinc-500 text-center">{i + 1}</span>
                <button onClick={() => moveDown(i)} className="text-zinc-600 hover:text-zinc-300 transition-colors">
                  <ChevronDown size={13} />
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="text-sm font-semibold text-white">{ex.name}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${tc}`}>{ex.type}</span>
                  {ex.video_url && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-300 uppercase">Video</span>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-wrap text-[10px] text-zinc-400">
                  {ex.blocks != null && <span>Bloques: <strong className="text-zinc-200">{ex.blocks}</strong></span>}
                  {ex.work_time && <span>Trabajo: <strong className="text-zinc-200">{ex.work_time}</strong></span>}
                  {ex.rest_time && <span>Pausa: <strong className="text-zinc-200">{ex.rest_time}</strong></span>}
                  {ex.duration_min != null && <span>Total: <strong className="text-zinc-200">{ex.duration_min}'</strong></span>}
                  {ex.eii != null && (
                    <span className={`px-1.5 py-0.5 rounded-full border ${exEii?.color}`}>{exEii?.label} ({ex.eii})</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                {ex.video_url && (
                  <button onClick={() => setVideoModalId(ex.id)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-400 transition-colors"
                    title="Reproducir video">
                    <Play size={13} />
                  </button>
                )}
                <button onClick={() => toggleExpand(ex.id)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-white transition-colors">
                  {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
                <button onClick={() => openEdit(ex)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-white transition-colors">
                  <Edit2 size={13} />
                </button>
                <button onClick={() => removeExercise(ex.id)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Expanded details — detalle avanzado */}
            {isExpanded && (
              <div className="border-t border-zinc-700 p-4 space-y-3">
                {/* Media: video > imagen > placeholder */}
                {ex.video_url ? (
                  <div
                    className="relative rounded-lg overflow-hidden border border-zinc-700 group cursor-pointer"
                    onClick={() => setVideoModalId(ex.id)}
                  >
                    {videoThumb ? (
                      <img src={videoThumb} alt="miniatura de video" className="w-full max-h-48 object-cover" />
                    ) : (
                      <div className="w-full h-28 flex items-center justify-center bg-zinc-700">
                        <Play size={24} className="text-zinc-500" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                      <div className="w-11 h-11 rounded-full bg-white/20 border-2 border-white/50 flex items-center justify-center backdrop-blur-sm">
                        <Play size={18} className="text-white fill-white ml-0.5" />
                      </div>
                    </div>
                    <span className="absolute top-2 left-2 bg-blue-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">Video</span>
                  </div>
                ) : ex.image_url ? (
                  <img src={ex.image_url} alt={ex.name} className="w-full max-h-56 object-cover rounded-lg" />
                ) : null}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {ex.length_m && <div><p className="text-zinc-500">Largo</p><p className="text-white font-medium">{ex.length_m} m</p></div>}
                  {ex.width_m && <div><p className="text-zinc-500">Ancho</p><p className="text-white font-medium">{ex.width_m} m</p></div>}
                  {ex.players_count && <div><p className="text-zinc-500">Jugadores</p><p className="text-white font-medium">{ex.players_count}</p></div>}
                  {ex.total_area && <div><p className="text-zinc-500">Superficie</p><p className="text-white font-medium">{ex.total_area} m²</p></div>}
                </div>
                {ex.objective && <div><p className="text-zinc-500 text-xs">Objetivo</p><p className="text-xs text-zinc-300">{ex.objective}</p></div>}
                {ex.description && <div><p className="text-zinc-500 text-xs">Descripción</p><p className="text-xs text-zinc-400">{ex.description}</p></div>}
                {ex.notes && <div><p className="text-zinc-500 text-xs">Observaciones avanzadas</p><p className="text-xs text-zinc-500 italic">{ex.notes}</p></div>}
                {/* GPS por ejercicio */}
                <ExerciseGPS session={session} exercise={ex} sessionPlayers={sessionPlayers || []} />
              </div>
            )}
          </div>
        );
      })}

      {/* Video modal for exercise cards */}
      {videoModalId && (() => {
        const ex = exercises.find(e => e.id === videoModalId);
        return ex?.video_url ? (
          <VideoPreviewModal url={ex.video_url} title={ex.name} onClose={() => setVideoModalId(null)} />
        ) : null;
      })()}

      {/* Form */}
      {showForm ? (
        <form onSubmit={handleSubmit} className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <p className="text-sm font-semibold text-white">{editId ? "Editar ejercicio" : "Nuevo ejercicio"}</p>
            {form.library_exercise_id && (
              <label className="flex items-center gap-2 text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1.5">
                <input type="checkbox" checked={updateLibraryToo} onChange={e => setUpdateLibraryToo(e.target.checked)} />
                Actualizar también en biblioteca
              </label>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-zinc-400 block">Nombre *</label>
                <button type="button" onClick={aiSuggestName} disabled={aiLoading.name}
                  className="flex items-center gap-1 text-[10px] text-violet-300 hover:text-violet-200 transition-colors disabled:opacity-50">
                  {aiLoading.name ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                  Sugerir con IA
                </button>
              </div>
              <input required value={form.name} onChange={e => setF("name", e.target.value)}
                placeholder="Nombre del ejercicio"
                className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
              {nameSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {nameSuggestions.map((n, idx) => (
                    <button key={idx} type="button" onClick={() => { setF("name", n); setNameSuggestions([]); }}
                      className="px-2 py-1 rounded-lg text-[10px] bg-violet-500/15 border border-violet-500/30 text-violet-300 hover:bg-violet-500/25 transition-colors">
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <ExerciseTypeSelector
              value={form.type}
              options={exerciseTypes}
              onChange={(value) => setF("type", value)}
              onAdd={handleAddType}
              onEdit={handleEditType}
              onDelete={handleDeleteType}
            />
            <div>
              <label className="text-[10px] text-zinc-400 mb-1 block">N° jugadores</label>
              <input type="number" value={form.players_count} onChange={e => setF("players_count", e.target.value)}
                className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
            </div>

            {/* Tiempos */}
            <div>
              <label className="text-[10px] text-zinc-400 mb-1 block">Bloques</label>
              <input type="number" value={form.blocks} onChange={e => setF("blocks", e.target.value)}
                className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 mb-1 block">Tiempo trabajo</label>
              <input value={form.work_time} onChange={e => setF("work_time", e.target.value)} placeholder="ej: 4 min"
                className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 mb-1 block">Pausa</label>
              <input value={form.rest_time} onChange={e => setF("rest_time", e.target.value)} placeholder="ej: 1 min"
                className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 mb-1 block">Duración manual (min, opcional)</label>
              <input type="number" value={form.duration_min} onChange={e => setF("duration_min", e.target.value)}
                placeholder="Auto si se deja vacío"
                className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
            </div>

            {/* Tiempo total calculado */}
            {derived.totalTime != null && (
              <div className="col-span-2 flex items-center gap-4 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs">
                <span className="text-zinc-300">
                  Tiempo total calculado: <strong className="text-emerald-300">{derived.totalTime}'</strong>
                </span>
                <span className="text-zinc-500 text-[10px]">
                  ({form.blocks} bloques × {parseMinutes(form.work_time)}' + {Math.max((parseFloat(form.blocks) || 0) - 1, 0)} pausas × {parseMinutes(form.rest_time)}')
                </span>
              </div>
            )}

            {/* Space */}
            <div>
              <label className="text-[10px] text-zinc-400 mb-1 block">Largo (m)</label>
              <input type="number" value={form.length_m} onChange={e => setF("length_m", e.target.value)}
                className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 mb-1 block">Ancho (m)</label>
              <input type="number" value={form.width_m} onChange={e => setF("width_m", e.target.value)}
                className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
            </div>

            {/* Auto-calculated superficie / EII */}
            {(derived.total_area || derived.eii) && (
              <div className="flex items-center gap-4 col-span-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs flex-wrap">
                {derived.total_area && <span className="text-zinc-300">Superficie: <strong className="text-white">{derived.total_area} m²</strong></span>}
                {derived.eii && (
                  <span className="text-zinc-300 flex items-center gap-1.5">
                    EII: <strong className="text-amber-300">{derived.eii} m²/jug</strong>
                    {eiiInterp && <span className={`px-1.5 py-0.5 rounded-full border text-[10px] ${eiiInterp.color}`}>{eiiInterp.label}</span>}
                  </span>
                )}
              </div>
            )}

            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-zinc-400 block">Objetivo</label>
                <button type="button" onClick={aiSuggestObjective} disabled={aiLoading.objective}
                  className="flex items-center gap-1 text-[10px] text-violet-300 hover:text-violet-200 transition-colors disabled:opacity-50">
                  {aiLoading.objective ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                  Sugerir con IA
                </button>
              </div>
              <input value={form.objective} onChange={e => setF("objective", e.target.value)}
                className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
            </div>
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-zinc-400 block">Descripción corta</label>
                <button type="button" onClick={aiSuggestDescription} disabled={aiLoading.description}
                  className="flex items-center gap-1 text-[10px] text-violet-300 hover:text-violet-200 transition-colors disabled:opacity-50">
                  {aiLoading.description ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                  Generar con IA
                </button>
              </div>
              <textarea value={form.description} onChange={e => setF("description", e.target.value)}
                rows={2} className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none resize-none" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 mb-1 block">Imagen del ejercicio</label>
              {form.image_url ? (
                <div className="relative">
                  <img src={form.image_url} alt="preview" className="w-full max-h-40 object-cover rounded-lg border border-zinc-600" />
                  <button type="button" onClick={() => setF("image_url", "")}
                    className="absolute top-1 right-1 bg-zinc-900/80 text-zinc-300 hover:text-red-400 rounded-full p-1 transition-colors">
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <label className={`flex items-center gap-2 px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-xs text-zinc-300 cursor-pointer hover:bg-zinc-600 transition-colors ${uploadingImg ? "opacity-60 pointer-events-none" : ""}`}>
                  <Image size={13} />
                  {uploadingImg ? "Subiendo..." : "Subir imagen"}
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => handleImageUpload(e.target.files[0])} />
                </label>
              )}
            </div>
            <VideoUploadSection
              videoUrl={form.video_url}
              onVideoUrl={(url) => setF("video_url", url || "")}
            />

            {/* Observaciones avanzadas — oculto por defecto */}
            <div className="col-span-2">
              <button type="button" onClick={() => setShowAdvanced(s => !s)}
                className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors">
                {showAdvanced ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                Observaciones avanzadas {form.notes && !showAdvanced ? "(con contenido)" : ""}
              </button>
              {showAdvanced && (
                <div className="mt-1.5 grid gap-2">
                  <input value={form.notes} onChange={e => setF("notes", e.target.value)}
                    placeholder="Observaciones adicionales (opcional)"
                    className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
                  <input value={form.tags} onChange={e => setF("tags", e.target.value)}
                    placeholder="Etiquetas separadas por coma"
                    className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); }}
              className="px-3 py-1.5 rounded-lg bg-zinc-700 text-zinc-300 text-xs hover:bg-zinc-600 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-1.5 rounded-lg bg-white text-zinc-900 font-semibold text-xs hover:bg-zinc-200 transition-colors disabled:opacity-50">
              {saving ? "Guardando..." : editId ? "Actualizar" : "Agregar"}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-zinc-900 font-semibold text-sm hover:bg-zinc-200 transition-colors">
            <Plus size={14} /> Nuevo ejercicio
          </button>
          <button onClick={openLibrary}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors">
            <BookOpen size={14} /> Desde Biblioteca
          </button>
        </div>
      )}

      {/* Library modal */}
      {showLibrary && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <p className="text-sm font-semibold text-white">Biblioteca de Ejercicios de Campo</p>
              <button onClick={() => setShowLibrary(false)} className="text-zinc-500 hover:text-white"><X size={16} /></button>
            </div>
            <div className="p-3 border-b border-zinc-800 flex gap-2">
              <div className="relative flex-1">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input value={libSearch} onChange={e => setLibSearch(e.target.value)} placeholder="Buscar ejercicio..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-8 pr-3 py-2 text-xs text-white focus:outline-none" />
              </div>
              <select value={libTypeFilter} onChange={e => setLibTypeFilter(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-xs text-zinc-300 focus:outline-none">
                <option value="">Todos los tipos</option>
                {exerciseTypes.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div className="overflow-y-auto flex-1 p-3 space-y-2">
              {libraryExercises
                .filter(e => {
                  const q = libSearch.toLowerCase();
                  const matchSearch = !libSearch || (e.name || "").toLowerCase().includes(q) || (e.type || "").toLowerCase().includes(q);
                  const matchType = !libTypeFilter || e.type === libTypeFilter;
                  return matchSearch && matchType;
                })
                .map(ex => (
                <div key={ex.id}
                  className="flex items-center gap-3 p-3 bg-zinc-800 border border-zinc-700 rounded-lg hover:border-zinc-500 cursor-pointer transition-colors"
                  onClick={() => addFromLibrary(ex)}>
                  {ex.image_url && <img src={ex.image_url} alt="" className="w-10 h-10 object-cover rounded shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {ex.type && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-700 text-zinc-300 border border-zinc-600">{ex.type}</span>}
                      <p className="text-xs font-semibold text-white truncate">{ex.name}</p>
                    </div>
                    {ex.objective && <p className="text-[10px] text-zinc-400 truncate">{ex.objective}</p>}
                    <p className="text-[10px] text-zinc-600">✓ {ex.times_used || 1} usos</p>
                  </div>
                  <div className="text-[10px] text-zinc-500 shrink-0 text-right">
                    {ex.length_m && ex.width_m && <p>{ex.length_m}×{ex.width_m}m</p>}
                    {ex.players_count && <p>{ex.players_count} jug.</p>}
                    {ex.eii && <p className="text-amber-400">EII {ex.eii}</p>}
                  </div>
                </div>
              ))}
              {libraryExercises.length === 0 && (
                <p className="text-zinc-600 text-sm text-center py-4">La biblioteca se construye al crear ejercicios nuevos.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
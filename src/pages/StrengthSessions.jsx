import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Dumbbell, Clock, ChevronDown, ChevronUp, Trash2, Image, Upload, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";
import "moment/locale/es";

moment.locale("es");

const intensities = ["Baja", "Media", "Alta", "Muy alta"];
const intensityColors = {
  "Baja":     "bg-blue-500/15 text-blue-400",
  "Media":    "bg-yellow-500/15 text-yellow-400",
  "Alta":     "bg-orange-500/15 text-orange-400",
  "Muy alta": "bg-red-500/15 text-red-400",
};
const intensityBorder = {
  "Baja":     "border-blue-400",
  "Media":    "border-yellow-400",
  "Alta":     "border-orange-400",
  "Muy alta": "border-red-400",
};

function ExerciseRow({ ex, onDelete }) {
  return (
    <div className="py-2 border-b border-zinc-800/50 last:border-0">
      <div className="flex items-start gap-3">
        {ex.image_url && (
          <a href={ex.image_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
            <img src={ex.image_url} alt={ex.name} className="w-14 h-14 object-cover rounded-lg border border-zinc-700" onError={(e) => e.target.style.display='none'} />
          </a>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium">{ex.name}</p>
          <div className="flex flex-wrap gap-3 mt-0.5 text-xs text-zinc-500">
            {ex.sets && <span>{ex.sets} series</span>}
            {ex.reps && <span>× {ex.reps}</span>}
            {ex.load && <span className="text-zinc-400 font-medium">{ex.load}</span>}
            {ex.rest_seconds && <span>Desc: {ex.rest_seconds}s</span>}
          </div>
          {ex.notes && <p className="text-xs text-zinc-600 mt-0.5">{ex.notes}</p>}
        </div>
        <button onClick={() => onDelete(ex.id)} className="text-zinc-700 hover:text-red-400 transition-colors shrink-0">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function SessionBlock({ s, onDelete, onEdit }) {
  const [open, setOpen]       = useState(false);
  const [exercises, setExercises] = useState([]);
  const [loadingEx, setLoadingEx] = useState(false);
  const [showExForm, setShowExForm] = useState(false);
  const [exForm, setExForm] = useState({ name: "", sets: "", reps: "", load: "", rest_seconds: "", notes: "", image_url: "" });
  const [uploadingEx, setUploadingEx] = useState(false);
  const { toast } = useToast();

  async function uploadExImage(file) {
    setUploadingEx(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setExForm((f) => ({ ...f, image_url: file_url }));
    } catch {
      toast({ title: "Error al subir imagen", variant: "destructive" });
    } finally {
      setUploadingEx(false);
    }
  }

  async function loadExercises() {
    if (loadingEx) return;
    setLoadingEx(true);
    try {
      const data = await base44.entities.StrengthExercise.filter({ session_id: s.id }, "order", 50);
      setExercises(data);
    } finally {
      setLoadingEx(false);
    }
  }

  function toggle() {
    if (!open) loadExercises();
    setOpen((v) => !v);
  }

  async function saveExercise(e) {
    e.preventDefault();
    try {
      const created = await base44.entities.StrengthExercise.create({
        session_id: s.id,
        name: exForm.name,
        sets: exForm.sets ? Number(exForm.sets) : undefined,
        reps: exForm.reps || undefined,
        load: exForm.load || undefined,
        rest_seconds: exForm.rest_seconds ? Number(exForm.rest_seconds) : undefined,
        notes: exForm.notes || undefined,
        image_url: exForm.image_url || undefined,
        order: exercises.length + 1,
      });
      setExercises((prev) => [...prev, created]);
      setExForm({ name: "", sets: "", reps: "", load: "", rest_seconds: "", notes: "", image_url: "" });
      setShowExForm(false);
      toast({ title: "Ejercicio agregado" });
    } catch {
      toast({ title: "Error al guardar ejercicio", variant: "destructive" });
    }
  }

  async function deleteExercise(id) {
    await base44.entities.StrengthExercise.delete(id);
    setExercises((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className={`bg-zinc-900 border border-zinc-800 border-l-2 ${intensityBorder[s.intensity] || "border-zinc-700"} rounded-xl overflow-hidden`}>
      <button onClick={toggle} className="w-full flex items-center gap-3 p-4 hover:bg-zinc-800/30 transition-colors text-left">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-semibold text-sm">{s.title}</span>
            {s.match_day_code && (
              <span className="text-xs px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 font-mono font-bold">
                {s.match_day_code}
              </span>
            )}
            {s.intensity && (
              <span className={`text-xs px-2 py-0.5 rounded ${intensityColors[s.intensity]}`}>{s.intensity}</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
            <span>{moment(s.date).format("DD/MM/YYYY")}</span>
            {s.duration_minutes && <span className="flex items-center gap-1"><Clock size={11} /> {s.duration_minutes} min</span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {s.image_url && (
            <a href={s.image_url} target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-800 hover:bg-zinc-700 text-white p-2 rounded-lg transition-colors"
            >
              <Image size={13} />
            </a>
          )}
          <button onClick={(e) => { e.stopPropagation(); onEdit(s); }} className="text-zinc-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-zinc-800">
            <Pencil size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(s.id); }} className="text-zinc-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-zinc-800">
            <Trash2 size={14} />
          </button>
          {open ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-zinc-800 px-4 pb-4 pt-3 space-y-3">
          {s.notes && <p className="text-xs text-zinc-500">{s.notes}</p>}

          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Ejercicios</p>
            <button onClick={() => setShowExForm((v) => !v)} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors">
              <Plus size={13} /> Agregar
            </button>
          </div>

          {showExForm && (
            <form onSubmit={saveExercise} className="bg-zinc-800 rounded-lg p-3 space-y-3">
              <Input value={exForm.name} onChange={(e) => setExForm((f) => ({ ...f, name: e.target.value }))} required placeholder="Nombre del ejercicio" className="bg-zinc-700 border-zinc-600 text-white text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <Input value={exForm.sets} onChange={(e) => setExForm((f) => ({ ...f, sets: e.target.value }))} placeholder="Series" type="number" className="bg-zinc-700 border-zinc-600 text-white text-sm" />
                <Input value={exForm.reps} onChange={(e) => setExForm((f) => ({ ...f, reps: e.target.value }))} placeholder="Reps / Tiempo" className="bg-zinc-700 border-zinc-600 text-white text-sm" />
                <Input value={exForm.load} onChange={(e) => setExForm((f) => ({ ...f, load: e.target.value }))} placeholder="Carga (kg / %)" className="bg-zinc-700 border-zinc-600 text-white text-sm" />
                <Input value={exForm.rest_seconds} onChange={(e) => setExForm((f) => ({ ...f, rest_seconds: e.target.value }))} placeholder="Descanso (s)" type="number" className="bg-zinc-700 border-zinc-600 text-white text-sm" />
              </div>
              <Input value={exForm.notes} onChange={(e) => setExForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Observaciones" className="bg-zinc-700 border-zinc-600 text-white text-sm" />
              {exForm.image_url ? (
                <div className="relative w-full">
                  <img src={exForm.image_url} alt="preview" className="w-full h-24 object-cover rounded-lg border border-zinc-600" />
                  <button type="button" onClick={() => setExForm((f) => ({ ...f, image_url: "" }))} className="absolute top-1.5 right-1.5 bg-zinc-900/80 text-zinc-400 hover:text-red-400 rounded-full p-1 transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
              ) : (
                <label className={`flex items-center justify-center gap-2 w-full h-16 border border-dashed border-zinc-600 rounded-lg cursor-pointer hover:border-zinc-500 transition-colors ${uploadingEx ? "opacity-50 pointer-events-none" : ""}`}>
                  {uploadingEx ? <div className="w-4 h-4 border-2 border-zinc-600 border-t-white rounded-full animate-spin" /> : <><Upload size={14} className="text-zinc-500" /><span className="text-xs text-zinc-500">Subir imagen del ejercicio</span></>}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadExImage(e.target.files[0])} />
                </label>
              )}
              <div className="flex gap-2">
                <Button type="submit" size="sm" className="bg-white text-zinc-900 hover:bg-zinc-200">Guardar</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowExForm(false)} className="text-zinc-400">Cancelar</Button>
              </div>
            </form>
          )}

          {loadingEx ? (
            <div className="py-4 flex justify-center">
              <div className="w-4 h-4 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
            </div>
          ) : exercises.length === 0 ? (
            <p className="text-zinc-600 text-xs text-center py-4">Sin ejercicios cargados</p>
          ) : (
            <div>
              {exercises.map((ex) => <ExerciseRow key={ex.id} ex={ex} onDelete={deleteExercise} />)}
            </div>
          )}


        </div>
      )}
    </div>
  );
}

const MD_CODES = ["MD-6","MD-5","MD-4","MD-3","MD-2","MD-1","MD","MD+1","MD+2"];

export default function StrengthSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterMD, setFilterMD] = useState(null);
  const [editingSession, setEditingSession] = useState(null);
  const emptyForm = { title: "", date: moment().format("YYYY-MM-DD"), match_day_code: "", intensity: "Media", duration_minutes: "", notes: "", image_url: "" };
  const [form, setForm] = useState(emptyForm);
  const [uploadingSession, setUploadingSession] = useState(false);
  const { toast } = useToast();

  async function uploadSessionImage(file) {
    setUploadingSession(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm((f) => ({ ...f, image_url: file_url }));
    } catch {
      toast({ title: "Error al subir imagen", variant: "destructive" });
    } finally {
      setUploadingSession(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const data = await base44.entities.StrengthSession.list("-date", 100);
      setSessions(data);
    } finally {
      setLoading(false);
    }
  }

  function openEdit(s) {
    setEditingSession(s);
    setForm({
      title: s.title || "",
      date: s.date || moment().format("YYYY-MM-DD"),
      match_day_code: s.match_day_code || "",
      intensity: s.intensity || "Media",
      duration_minutes: s.duration_minutes ?? "",
      notes: s.notes || "",
      image_url: s.image_url || "",
    });
    setShowForm(true);
  }

  async function deleteSession(id) {
    if (!confirm("¿Eliminar esta sesión?")) return;
    await base44.entities.StrengthSession.delete(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    toast({ title: "Sesión eliminada" });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const payload = { ...form, duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : undefined };
      if (editingSession) {
        await base44.entities.StrengthSession.update(editingSession.id, payload);
        toast({ title: "Sesión actualizada" });
      } else {
        await base44.entities.StrengthSession.create(payload);
        toast({ title: "Sesión de fuerza guardada" });
      }
      setShowForm(false);
      setEditingSession(null);
      setForm(emptyForm);
      setLoading(true);
      load();
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Sesiones de Fuerza</h2>
          <p className="text-zinc-500 text-sm mt-0.5">Planificación de trabajo en sala de pesas</p>
        </div>
        <Button onClick={() => { setEditingSession(null); setForm(emptyForm); setShowForm(true); }} className="bg-white text-zinc-900 hover:bg-zinc-200">
          <Plus size={15} className="mr-1.5" /> Nueva sesión
        </Button>
      </div>

      {/* Filtro MD */}
      {sessions.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-zinc-500 font-medium">Código MD:</span>
          <button onClick={() => setFilterMD(null)} className={`text-xs px-2.5 py-1 rounded-full font-mono transition-colors ${filterMD === null ? "bg-violet-500/30 text-violet-300" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"}`}>Todos</button>
          {MD_CODES.map((c) => (
            <button key={c} onClick={() => setFilterMD(filterMD === c ? null : c)}
              className={`text-xs px-2.5 py-1 rounded-full font-mono transition-colors ${filterMD === c ? "bg-violet-500/30 text-violet-300" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"}`}
            >{c}</button>
          ))}
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <Dumbbell size={36} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">No hay sesiones de fuerza cargadas</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {sessions.filter((s) => !filterMD || s.match_day_code === filterMD).map((s) => <SessionBlock key={s.id} s={s} onDelete={deleteSession} onEdit={openEdit} />)}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(v) => { setShowForm(v); if (!v) { setEditingSession(null); setForm(emptyForm); } }}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">{editingSession ? "Editar sesión de fuerza" : "Nueva sesión de fuerza"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Título</label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required className="bg-zinc-800 border-zinc-700 text-white" placeholder="Ej: Fuerza máxima tren inferior" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Fecha</label>
                <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Duración (min)</label>
                <Input type="number" value={form.duration_minutes} onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))} placeholder="60" className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Código MD (días para el partido)</label>
              <Select value={form.match_day_code || "__none__"} onValueChange={(v) => setForm((f) => ({ ...f, match_day_code: v === "__none__" ? "" : v }))}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="__none__" className="text-zinc-400">Sin etiqueta</SelectItem>
                  {["MD-6","MD-5","MD-4","MD-3","MD-2","MD-1","MD","MD+1","MD+2"].map((c) => (
                    <SelectItem key={c} value={c} className="text-white">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Intensidad</label>
              <Select value={form.intensity || "__none__"} onValueChange={(v) => setForm((f) => ({ ...f, intensity: v === "__none__" ? "" : v }))}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue placeholder="Sin etiqueta" /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="__none__" className="text-zinc-400">Sin etiqueta</SelectItem>
                  {intensities.map((i) => <SelectItem key={i} value={i} className="text-white">{i}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Notas</label>
              <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} className="bg-zinc-800 border-zinc-700 text-white resize-none" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Imagen de la sesión</label>
              {form.image_url ? (
                <div className="relative w-full">
                  <img src={form.image_url} alt="preview" className="w-full h-32 object-cover rounded-lg border border-zinc-700" />
                  <button type="button" onClick={() => setForm((f) => ({ ...f, image_url: "" }))} className="absolute top-2 right-2 bg-zinc-900/80 text-zinc-400 hover:text-red-400 rounded-full p-1 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              ) : (
                <label className={`flex flex-col items-center justify-center gap-2 w-full h-24 border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer hover:border-zinc-500 transition-colors ${uploadingSession ? "opacity-50 pointer-events-none" : ""}`}>
                  {uploadingSession ? <div className="w-5 h-5 border-2 border-zinc-600 border-t-white rounded-full animate-spin" /> : <><Upload size={18} className="text-zinc-500" /><span className="text-xs text-zinc-500">Subir imagen</span></>}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadSessionImage(e.target.files[0])} />
                </label>
              )}
            </div>
            <Button type="submit" className="w-full bg-white text-zinc-900 hover:bg-zinc-200">Guardar sesión</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
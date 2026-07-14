import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp, Play, Users, FileText, FileDown, Pencil, X, ImagePlus } from "lucide-react";
import SessionCsvPanel from "@/components/staff/SessionCsvPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";

function ImageUploadButton({ value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const inputRef = useState(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(file_url);
    } catch {
      toast({ title: "Error al subir imagen", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-1">
      <label className="text-xs text-zinc-500">Imagen del ejercicio</label>
      <div className="flex items-center gap-2">
        <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-xs text-zinc-300 cursor-pointer hover:bg-zinc-700 transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
          {uploading
            ? <div className="w-3 h-3 border border-zinc-500 border-t-white rounded-full animate-spin" />
            : <ImagePlus size={14} />}
          {uploading ? "Subiendo..." : "Subir imagen"}
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </label>
        {value && (
          <div className="flex items-center gap-2">
            <img src={value} alt="preview" className="h-8 w-12 object-cover rounded border border-zinc-700" />
            <button type="button" onClick={() => onChange("")} className="text-zinc-600 hover:text-red-400 transition-colors">
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const performanceLevels = ["Muy bien", "Bien", "Regular", "Mal"];
const performanceColors = {
  "Muy bien": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "Bien":     "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Regular":  "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "Mal":      "bg-red-500/20 text-red-400 border-red-500/30",
};

function PlayerRow({ log, onChange }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-zinc-800/50 last:border-0">
      <div className="flex items-center gap-2 w-36 shrink-0">
        <span className="text-xs text-zinc-600 font-mono w-5 text-right">{log.player_number}</span>
        <span className="text-sm text-white truncate">{log.player_name}</span>
      </div>
      {/* Participated toggle */}
      <button
        onClick={() => onChange(log.player_id, { participated: !log.participated })}
        className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors shrink-0 ${
          log.participated
            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
            : "bg-zinc-800 text-zinc-600 border-zinc-700"
        }`}
      >
        {log.participated ? "Participó" : "No participó"}
      </button>
      {/* Performance select */}
      {log.participated && (
        <select
          value={log.performance || ""}
          onChange={(e) => onChange(log.player_id, { performance: e.target.value || undefined })}
          className="bg-zinc-800 border border-zinc-700 text-white text-xs rounded-md px-2 py-1 flex-shrink-0"
        >
          <option value="">Sin eval.</option>
          {performanceLevels.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      )}
      {/* Notes */}
      <input
        value={log.notes || ""}
        onChange={(e) => onChange(log.player_id, { notes: e.target.value })}
        placeholder="Observación..."
        className="flex-1 min-w-0 bg-transparent border-b border-zinc-800 focus:border-zinc-600 text-xs text-zinc-300 placeholder-zinc-700 outline-none py-0.5 transition-colors"
      />
    </div>
  );
}

function ExerciseBlock({ exercise, players, onDelete, onUpdate }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: exercise.name || "",
    description: exercise.description || "",
    space: exercise.space || "",
    blocks: exercise.blocks ?? "",
    duration_minutes: exercise.duration_minutes ?? "",
    objective: exercise.objective || "",
    width_m: exercise.width_m ?? "",
    length_m: exercise.length_m ?? "",
    num_players: exercise.num_players ?? "",
    image_url: exercise.image_url || "",
  });
  const [logs, setLogs] = useState({}); // player_id -> log data
  const [saving, setSaving] = useState({});
  const { toast } = useToast();

  async function saveEdit(e) {
    e.preventDefault();
    try {
      const updated = await base44.entities.FieldExercise.update(exercise.id, {
        name: editForm.name,
        description: editForm.description || undefined,
        space: editForm.space || undefined,
        blocks: editForm.blocks ? Number(editForm.blocks) : undefined,
        duration_minutes: editForm.duration_minutes ? Number(editForm.duration_minutes) : undefined,
        objective: editForm.objective || undefined,
        width_m: editForm.width_m ? Number(editForm.width_m) : undefined,
        length_m: editForm.length_m ? Number(editForm.length_m) : undefined,
        num_players: editForm.num_players ? Number(editForm.num_players) : undefined,
        image_url: editForm.image_url || undefined,
      });
      onUpdate(updated);
      setEditing(false);
      toast({ title: "Ejercicio actualizado" });
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    }
  }

  useEffect(() => {
    if (!open || !players.length) return;
    loadLogs();
  }, [open]);

  async function loadLogs() {
    try {
      const existing = await base44.entities.PlayerExerciseLog.filter({ exercise_id: exercise.id }, null, 100);
      const map = {};
      existing.forEach((l) => { map[l.player_id] = l; });
      // Merge with player list so every player appears
      players.forEach((p) => {
        if (!map[p.id]) {
          map[p.id] = {
            player_id: p.id,
            player_name: p.name,
            player_number: p.number,
            participated: true,
            performance: null,
            notes: "",
            _new: true,
          };
        } else {
          map[p.id].player_number = p.number;
        }
      });
      setLogs(map);
    } catch {
      toast({ title: "Error al cargar logs", variant: "destructive" });
    }
  }

  async function handleChange(playerId, patch) {
    // Optimistic update
    setLogs((prev) => ({ ...prev, [playerId]: { ...prev[playerId], ...patch } }));

    const current = { ...logs[playerId], ...patch };
    setSaving((s) => ({ ...s, [playerId]: true }));

    try {
      if (current._new || !current.id) {
        // Create
        const created = await base44.entities.PlayerExerciseLog.create({
          exercise_id: exercise.id,
          session_id: exercise.session_id,
          player_id: playerId,
          player_name: current.player_name,
          participated: current.participated ?? true,
          performance: current.performance || undefined,
          notes: current.notes || undefined,
        });
        setLogs((prev) => ({ ...prev, [playerId]: { ...prev[playerId], ...created, _new: false } }));
      } else {
        await base44.entities.PlayerExerciseLog.update(current.id, {
          participated: current.participated,
          performance: current.performance || undefined,
          notes: current.notes || undefined,
        });
      }
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    } finally {
      setSaving((s) => ({ ...s, [playerId]: false }));
    }
  }

  const playerList = players.map((p) => logs[p.id] || {
    player_id: p.id, player_name: p.name, player_number: p.number, participated: true, _new: true,
  });

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <button onClick={() => setOpen((v) => !v)} className="w-full text-left">
        {exercise.image_url && (
          <img src={exercise.image_url} alt="Ejercicio" className="w-full max-h-56 object-cover" />
        )}
        <div className="flex items-center gap-2 p-4">
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">{exercise.name}</p>
            <div className="flex flex-wrap gap-3 mt-0.5 text-xs text-zinc-500">
              {exercise.space && <span>📍 {exercise.space}</span>}
              {exercise.blocks && exercise.duration_minutes && (
                <span>🔁 {exercise.blocks} bloques × {exercise.duration_minutes} min</span>
              )}
              {exercise.blocks && !exercise.duration_minutes && (
                <span>🔁 {exercise.blocks} bloques</span>
              )}
              {!exercise.blocks && exercise.duration_minutes && (
                <span>⏱ {exercise.duration_minutes} min</span>
              )}
              {(exercise.width_m || exercise.length_m) && (
                <span>📐 {exercise.width_m ?? "—"} × {exercise.length_m ?? "—"} m</span>
              )}
              {exercise.objective && <span className="text-zinc-400">{exercise.objective}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); setEditing((v) => !v); setOpen(true); }}
              className="text-zinc-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-zinc-800"
            >
              <Pencil size={14} />
            </button>
            {open ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t border-zinc-800 px-4 pb-4 pt-3">
          {editing ? (
            <form onSubmit={saveEdit} className="space-y-3 mb-4">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Editar ejercicio</p>
              <Input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} required placeholder="Nombre" className="bg-zinc-800 border-zinc-700 text-white text-sm" />
              <div className="grid grid-cols-3 gap-2">
                <Input value={editForm.space} onChange={(e) => setEditForm((f) => ({ ...f, space: e.target.value }))} placeholder="Espacio" className="bg-zinc-800 border-zinc-700 text-white text-sm" />
                <Input value={editForm.blocks} onChange={(e) => setEditForm((f) => ({ ...f, blocks: e.target.value }))} placeholder="Bloques" type="number" className="bg-zinc-800 border-zinc-700 text-white text-sm" />
                <Input value={editForm.duration_minutes} onChange={(e) => setEditForm((f) => ({ ...f, duration_minutes: e.target.value }))} placeholder="Min/bloque" type="number" className="bg-zinc-800 border-zinc-700 text-white text-sm" />
              </div>
              <Input value={editForm.objective} onChange={(e) => setEditForm((f) => ({ ...f, objective: e.target.value }))} placeholder="Objetivo" className="bg-zinc-800 border-zinc-700 text-white text-sm" />
              <div className="grid grid-cols-3 gap-2">
                <Input value={editForm.width_m} onChange={(e) => setEditForm((f) => ({ ...f, width_m: e.target.value }))} placeholder="Ancho (m)" type="number" className="bg-zinc-800 border-zinc-700 text-white text-sm" />
                <Input value={editForm.length_m} onChange={(e) => setEditForm((f) => ({ ...f, length_m: e.target.value }))} placeholder="Largo (m)" type="number" className="bg-zinc-800 border-zinc-700 text-white text-sm" />
                <Input value={editForm.num_players} onChange={(e) => setEditForm((f) => ({ ...f, num_players: e.target.value }))} placeholder="N° jug." type="number" className="bg-zinc-800 border-zinc-700 text-white text-sm" />
              </div>
              <Textarea value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} placeholder="Descripción..." rows={2} className="bg-zinc-800 border-zinc-700 text-white text-sm resize-none" />
              <ImageUploadButton value={editForm.image_url} onChange={(url) => setEditForm((f) => ({ ...f, image_url: url }))} />
              <div className="flex gap-2">
                <Button type="submit" size="sm" className="bg-white text-zinc-900 hover:bg-zinc-200 h-7 text-xs">Guardar</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)} className="text-zinc-400 h-7 text-xs">Cancelar</Button>
              </div>
            </form>
          ) : (
            <>
              {exercise.description && (
                <p className="text-xs text-zinc-500 mb-3">{exercise.description}</p>
              )}
            </>
          )}
          <button onClick={() => onDelete(exercise.id)} className="mt-3 text-xs text-zinc-700 hover:text-red-400 transition-colors">
            Eliminar ejercicio
          </button>
        </div>
      )}
    </div>
  );
}

const focusColors = {
  "Tensión":      "bg-red-500/20 text-red-400",
  "Duración":     "bg-blue-500/20 text-blue-400",
  "Velocidad":    "bg-yellow-500/20 text-yellow-400",
  "Recuperación": "bg-green-500/20 text-green-400",
};

async function loadImageAsDataUrl(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d").drawImage(img, 0, 0);
      resolve({ dataUrl: canvas.toDataURL("image/jpeg", 0.85), w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function exportSessionPDF(session, exercises, availablePlayers) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const M = 14;
  const CONTENT_W = W - M * 2;

  // Pre-cargar todas las imágenes en paralelo
  const imageMap = {};
  await Promise.all(
    exercises.filter((ex) => ex.image_url).map(async (ex) => {
      const result = await loadImageAsDataUrl(ex.image_url);
      if (result) imageMap[ex.id] = result;
    })
  );

  function addHeader(isFirst = false) {
    doc.setFillColor(24, 24, 27);
    doc.rect(0, 0, W, 28, "F");
    doc.setFillColor(240, 200, 0);
    doc.rect(0, 28, W, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.text("SESIÓN DE CAMPO", M, 12);
    doc.setFontSize(9);
    doc.setTextColor(160, 160, 160);
    doc.text("Defensa y Justicia — Cuerpo Técnico", M, 20);
    doc.setTextColor(240, 200, 0);
    doc.text(moment(session.date).format("dddd D [de] MMMM YYYY").toUpperCase(), W - M, 12, { align: "right" });
    doc.setTextColor(160, 160, 160);
    doc.setFontSize(8);
    doc.text(`Generado: ${moment().format("DD/MM/YYYY HH:mm")}`, W - M, 20, { align: "right" });
  }

  addHeader(true);
  let y = 36;

  // Session info box
  doc.setFillColor(39, 39, 42);
  doc.roundedRect(M, y, CONTENT_W, 22, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(session.title, M + 4, y + 8);

  const tags = [session.session_type, session.focus_area, session.intensity].filter(Boolean).join("  ·  ");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(160, 160, 160);
  doc.text(tags, M + 4, y + 14);

  const meta = [
    session.duration_minutes ? `${session.duration_minutes} min` : null,
    session.match_day_code || null,
    `${availablePlayers} jugadores disponibles`,
  ].filter(Boolean).join("   ·   ");
  doc.text(meta, M + 4, y + 20);

  y += 28;

  if (session.notes) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    const lines = doc.splitTextToSize(session.notes, CONTENT_W - 8);
    doc.text(lines, M + 4, y);
    y += lines.length * 4 + 4;
  }

  // Exercises — cada uno en su propio bloque con imagen
  for (let idx = 0; idx < exercises.length; idx++) {
    const ex = exercises[idx];
    const img = imageMap[ex.id] || null;

    // Calcular altura estimada del bloque para decidir si hacer nueva página
    const imgH = img ? Math.min(75, (img.h / img.w) * CONTENT_W) : 0;
    const detailLines = [
      ex.space ? `Espacio: ${ex.space}` : null,
      ex.blocks && ex.duration_minutes ? `Bloques: ${ex.blocks} x ${ex.duration_minutes} min (Total: ${ex.blocks * ex.duration_minutes} min)` : ex.blocks ? `Bloques: ${ex.blocks}` : ex.duration_minutes ? `Duracion: ${ex.duration_minutes} min` : null,
      (ex.width_m && ex.length_m) ? `Dimensiones: ${ex.width_m} x ${ex.length_m} m` : null,
      ex.num_players ? `Jugadores: ${ex.num_players}` : null,
    ].filter(Boolean);
    const estimatedH = 10 + (detailLines.length * 5) + (ex.objective ? 10 : 0) + (ex.description ? 12 : 0) + imgH + 8;

    if (y + estimatedH > 272) {
      doc.addPage();
      addHeader();
      y = 34;
    }

    // — Cabecera del ejercicio —
    doc.setFillColor(45, 45, 50);
    doc.roundedRect(M, y, CONTENT_W, 9, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(240, 200, 0);
    doc.text(`${idx + 1}. ${ex.name}`, M + 3, y + 6.5);
    y += 11;

    // — Imagen (si existe) —
    if (img) {
      const renderedH = Math.min(75, (img.h / img.w) * CONTENT_W);
      if (y + renderedH > 272) { doc.addPage(); addHeader(); y = 34; }
      doc.addImage(img.dataUrl, "JPEG", M, y, CONTENT_W, renderedH, undefined, "FAST");
      y += renderedH + 3;
    }

    // — Detalles de tiempo y espacio —
    if (detailLines.length > 0) {
      doc.setFillColor(35, 35, 40);
      doc.roundedRect(M, y, CONTENT_W, detailLines.length * 5 + 4, 1, 1, "F");
      detailLines.forEach((line, i) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(180, 180, 180);
        doc.text(line, M + 4, y + 4 + i * 5);
      });
      y += detailLines.length * 5 + 7;
    }

    // — Objetivo —
    if (ex.objective) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(200, 200, 100);
      const lines = doc.splitTextToSize(`Objetivo: ${ex.objective}`, CONTENT_W - 6);
      doc.text(lines, M + 3, y);
      y += lines.length * 4.5 + 2;
    }

    // — Descripción —
    if (ex.description) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      const lines = doc.splitTextToSize(ex.description, CONTENT_W - 6);
      doc.text(lines, M + 3, y);
      y += lines.length * 4.5;
    }

    y += 7;
  }

  // Tiempo total al final
  const totalMin = exercises.reduce((acc, ex) => {
    if (ex.blocks && ex.duration_minutes) return acc + ex.blocks * ex.duration_minutes;
    if (ex.duration_minutes) return acc + ex.duration_minutes;
    return acc;
  }, 0);
  if (totalMin > 0) {
    if (y + 10 > 272) { doc.addPage(); addHeader(); y = 34; }
    doc.setDrawColor(80, 80, 80);
    doc.line(M, y, W - M, y);
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(240, 200, 0);
    doc.text(`Tiempo total de ejercicios: ${totalMin} min`, W - M, y, { align: "right" });
    y += 6;
  }

  // Footer en cada página
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(60, 60, 60);
    doc.line(M, 285, W - M, 285);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text("PerformancePitch — Defensa y Justicia", M, 290);
    doc.text(`Página ${p} de ${totalPages}`, W - M, 290, { align: "right" });
  }

  doc.save(`Sesion_${session.title.replace(/\s+/g, "_")}_${session.date}.pdf`);
}

export default function FieldSessionDetail({ session, onBack }) {
  const [exercises, setExercises] = useState([]);
  const [players, setPlayers]     = useState([]);
  const [availablePlayers, setAvailablePlayers] = useState(0);
  const [loading, setLoading]     = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showForm, setShowForm]   = useState(!!session._openExForm);
  const [form, setForm] = useState({ name: "", description: "", space: "", blocks: "", duration_minutes: "", objective: "", width_m: "", length_m: "", num_players: "", image_url: "" });
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      base44.entities.FieldExercise.filter({ session_id: session.id }, "order", 100),
      base44.entities.Player.list("number", 100),
      base44.entities.Player.filter({ status: "Disponible" }, "number", 100),
    ]).then(([exs, allPls, availPls]) => {
      setExercises(exs);
      setPlayers(allPls);
      setAvailablePlayers(availPls.length);
    }).finally(() => setLoading(false));
  }, [session.id]);

  async function saveExercise(e) {
    e.preventDefault();
    try {
      const created = await base44.entities.FieldExercise.create({
        session_id: session.id,
        name: form.name,
        description: form.description || undefined,
        space: form.space || undefined,
        blocks: form.blocks ? Number(form.blocks) : undefined,
        duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : undefined,
        objective: form.objective || undefined,
        width_m: form.width_m ? Number(form.width_m) : undefined,
        length_m: form.length_m ? Number(form.length_m) : undefined,
        num_players: form.num_players ? Number(form.num_players) : undefined,
        image_url: form.image_url || undefined,
        order: exercises.length + 1,
      });
      setExercises((prev) => [...prev, created]);
      setForm({ name: "", description: "", space: "", blocks: "", duration_minutes: "", objective: "", width_m: "", length_m: "", num_players: "", image_url: "" });
      setShowForm(false);
      toast({ title: "Ejercicio agregado" });
    } catch {
      toast({ title: "Error al guardar ejercicio", variant: "destructive" });
    }
  }

  async function deleteExercise(id) {
    await base44.entities.FieldExercise.delete(id);
    setExercises((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={onBack} className="mt-1 text-zinc-500 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-white tracking-tight">{session.title}</h2>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <span className="text-xs text-zinc-500">{moment(session.date).format("dddd D [de] MMMM YYYY")}</span>
            {session.intensity && <span className="text-xs text-zinc-400">{session.intensity}</span>}
            {session.focus_area && (
              <span className={`text-xs px-2 py-0.5 rounded font-semibold ${focusColors[session.focus_area] || "bg-zinc-800 text-zinc-400"}`}>
                {session.focus_area}
              </span>
            )}
            <span className="text-xs flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
              <Users size={10} /> {availablePlayers} disponibles
            </span>
          </div>
          {session.notes && <p className="text-xs text-zinc-600 mt-1">{session.notes}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={async () => {
              setGeneratingPdf(true);
              await exportSessionPDF(session, exercises, availablePlayers);
              setGeneratingPdf(false);
            }}
            disabled={generatingPdf}
            className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-zinc-900 font-semibold px-3 py-2 rounded-lg transition-colors text-xs"
          >
            {generatingPdf
              ? <div className="w-3 h-3 border border-zinc-700 border-t-zinc-900 rounded-full animate-spin" />
              : <FileDown size={14} />}
            PDF
          </button>
          {session.video_url && (
            <a href={session.video_url} target="_blank" rel="noopener noreferrer"
              className="bg-zinc-800 hover:bg-zinc-700 text-white p-2.5 rounded-lg transition-colors"
              title="Ver video"
            >
              <Play size={16} />
            </a>
          )}
          {session.gps_pdf_url && (
            <a href={session.gps_pdf_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white px-3 py-2 rounded-lg transition-colors text-xs font-medium"
              title="Ver informe GPS"
            >
              <FileText size={14} /> Informe GPS
            </a>
          )}
        </div>
      </div>

      {/* Exercises */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Ejercicios ({exercises.length})
        </p>
        <Button size="sm" onClick={() => setShowForm(true)} className="bg-white text-zinc-900 hover:bg-zinc-200 h-8 text-xs">
          <Plus size={13} className="mr-1" /> Agregar ejercicio
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
        </div>
      ) : exercises.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-10 text-center">
          <p className="text-zinc-600 text-sm">Sin ejercicios — agregá el primero</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exercises.map((ex) => (
            <ExerciseBlock
              key={ex.id}
              exercise={ex}
              players={players}
              onDelete={deleteExercise}
              onUpdate={(updated) => setExercises((prev) => prev.map((e) => e.id === updated.id ? updated : e))}
            />
          ))}
          {exercises.length > 0 && (() => {
            const totalMin = exercises.reduce((acc, ex) => {
              if (ex.blocks && ex.duration_minutes) return acc + ex.blocks * ex.duration_minutes;
              if (ex.duration_minutes) return acc + ex.duration_minutes;
              return acc;
            }, 0);
            if (!totalMin) return null;
            return (
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-zinc-800/50">
                <span className="text-xs text-zinc-500">Tiempo total de ejercicios:</span>
                <span className="text-sm font-bold text-white">{totalMin} min</span>
              </div>
            );
          })()}
        </div>
      )}

      {/* GPS CSV Panel */}
      <SessionCsvPanel session={session} />

      {/* Add exercise form */}
      {showForm && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5">
          <p className="text-sm font-semibold text-white mb-4">Nuevo ejercicio</p>
          <form onSubmit={saveExercise} className="space-y-3">
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required placeholder="Nombre del ejercicio" className="bg-zinc-800 border-zinc-700 text-white" />
            <div className="grid grid-cols-3 gap-3">
              <Input value={form.space} onChange={(e) => setForm((f) => ({ ...f, space: e.target.value }))} placeholder="Espacio (ej: Mitad de campo)" className="bg-zinc-800 border-zinc-700 text-white" />
              <Input value={form.blocks} onChange={(e) => setForm((f) => ({ ...f, blocks: e.target.value }))} placeholder="Bloques" type="number" className="bg-zinc-800 border-zinc-700 text-white" />
              <Input value={form.duration_minutes} onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))} placeholder="Min/bloque" type="number" className="bg-zinc-800 border-zinc-700 text-white" />
            </div>
            <Input value={form.objective} onChange={(e) => setForm((f) => ({ ...f, objective: e.target.value }))} placeholder="Objetivo táctico / físico" className="bg-zinc-800 border-zinc-700 text-white" />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Ancho (m)</label>
                <Input value={form.width_m} onChange={(e) => setForm((f) => ({ ...f, width_m: e.target.value }))} placeholder="Ej: 20" type="number" className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Largo (m)</label>
                <Input value={form.length_m} onChange={(e) => setForm((f) => ({ ...f, length_m: e.target.value }))} placeholder="Ej: 30" type="number" className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">N° jugadores</label>
                <Input value={form.num_players} onChange={(e) => setForm((f) => ({ ...f, num_players: e.target.value }))} placeholder="Ej: 8" type="number" className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
            </div>
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Descripción del ejercicio..." rows={2} className="bg-zinc-800 border-zinc-700 text-white resize-none" />
            <ImageUploadButton value={form.image_url} onChange={(url) => setForm((f) => ({ ...f, image_url: url }))} />
            <div className="flex gap-2">
              <Button type="submit" size="sm" className="bg-white text-zinc-900 hover:bg-zinc-200">Guardar ejercicio</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)} className="text-zinc-400">Cancelar</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
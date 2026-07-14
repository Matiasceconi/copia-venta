import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link2, Plus, Eye, Download, Copy, Trash2, X, Save } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useAuth } from "@/lib/AuthContext";
import VideoPreviewModal from "@/components/sessions/VideoPreviewModal";
import moment from "moment";

const SOURCES = ["Hudl", "YouTube", "Google Drive", "Vimeo", "Otro"];
const VIDEO_TYPES = ["Sesión completa", "Ejercicio", "Fuerza", "Análisis", "Clip"];

const SOURCE_COLORS = {
  "Hudl": "bg-orange-500/15 text-orange-300 border-orange-500/30",
  "YouTube": "bg-red-500/15 text-red-300 border-red-500/30",
  "Google Drive": "bg-blue-500/15 text-blue-300 border-blue-500/30",
  "Vimeo": "bg-sky-500/15 text-sky-300 border-sky-500/30",
  "Otro": "bg-zinc-500/15 text-zinc-300 border-zinc-600",
};

const EMPTY = { title: "", video_url: "", source: "Hudl", video_type: "Sesión completa", notes: "" };

export default function SessionVideoLinks({ session }) {
  const { toast } = useToast();
  const { can } = useWorkspace();
  const { user } = useAuth();
  const canEdit = can("edit");

  const [links, setLinks] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [previewLink, setPreviewLink] = useState(null);

  useEffect(() => { load(); }, [session.id]);

  async function load() {
    setLoading(true);
    const [rows, exs] = await Promise.all([
      base44.entities.SessionVideoLink.filter({ session_id: session.id }, "-created_date", 200),
      base44.entities.SessionExercise.filter({ session_id: session.id }, "order", 100),
    ]);
    setLinks(rows);
    setExercises(exs);
    setLoading(false);
  }

  function openNew() {
    setForm(EMPTY);
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(link) {
    setForm({
      title: link.title || "", video_url: link.video_url || "",
      source: link.source || "Hudl", video_type: link.video_type || "Sesión completa",
      notes: link.notes || "", exercise_id: link.exercise_id || "",
    });
    setEditing(link);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.title || !form.video_url) return;
    setSaving(true);
    try {
      if (editing) {
        const updated = await base44.entities.SessionVideoLink.update(editing.id, form);
        setLinks(prev => prev.map(l => l.id === editing.id ? updated : l));
        toast({ title: "✓ Link actualizado" });
      } else {
        const created = await base44.entities.SessionVideoLink.create({
          ...form,
          session_id: session.id,
          created_by: user?.full_name || user?.email || "",
        });
        setLinks(prev => [created, ...prev]);
        toast({ title: "✓ Link agregado" });
      }
      setShowForm(false);
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(link) {
    if (!confirm(`¿Eliminar el link "${link.title}"?`)) return;
    await base44.entities.SessionVideoLink.delete(link.id);
    setLinks(prev => prev.filter(l => l.id !== link.id));
    toast({ title: "Link eliminado" });
  }

  function handleCopy(url) {
    navigator.clipboard.writeText(url);
    toast({ title: "✓ Link copiado al portapapeles" });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white flex items-center gap-2">
          <Link2 size={14} className="text-blue-400" /> Videos de la sesión
        </p>
        {canEdit && (
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-500/15 border border-blue-500/30 text-blue-300 hover:bg-blue-500/25 rounded-lg transition-colors"
          >
            <Plus size={12} /> Agregar link
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-white">{editing ? "Editar link" : "Nuevo link de video"}</p>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Título *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Link del video *</label>
            <input value={form.video_url} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))}
              placeholder="https://..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Fuente</label>
              <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500">
                {SOURCES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Tipo de video</label>
              <select value={form.video_type} onChange={e => setForm(f => ({ ...f, video_type: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500">
                {VIDEO_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          {exercises.length > 0 && (
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Asociar a un ejercicio (opcional)</label>
              <select value={form.exercise_id || ""} onChange={e => setForm(f => ({ ...f, exercise_id: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500">
                <option value="">— Ninguno —</option>
                {exercises.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Notas</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500 resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => { setShowForm(false); setEditing(null); }}
              className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors flex items-center gap-1">
              <X size={12} /> Cancelar
            </button>
            <button onClick={handleSave} disabled={saving || !form.title || !form.video_url}
              className="px-3 py-1.5 rounded-lg text-xs bg-blue-500 hover:bg-blue-400 text-white font-semibold disabled:opacity-40 transition-colors flex items-center gap-1">
              <Save size={12} /> {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
        </div>
      ) : links.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-zinc-700 rounded-xl">
          <Link2 size={24} className="text-zinc-700 mx-auto mb-2" />
          <p className="text-zinc-500 text-sm">Sin links de video cargados</p>
        </div>
      ) : (
        <div className="space-y-2">
          {links.map(link => {
            const linkedExercise = exercises.find(ex => ex.id === link.exercise_id);
            return (
              <div key={link.id} className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{link.title}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${SOURCE_COLORS[link.source] || SOURCE_COLORS["Otro"]}`}>
                        {link.source}
                      </span>
                      <span className="text-[10px] text-zinc-500">{link.video_type}</span>
                      <span className="text-[10px] text-zinc-600">{moment(link.created_date).format("DD/MM/YYYY")}</span>
                      {linkedExercise && (
                        <span className="text-[10px] text-zinc-500">· {linkedExercise.name}</span>
                      )}
                    </div>
                    {link.notes && <p className="text-xs text-zinc-500 mt-1">{link.notes}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => setPreviewLink(link)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-blue-500/15 border border-blue-500/30 text-blue-300 hover:bg-blue-500/25 rounded-lg transition-colors">
                    <Eye size={12} /> Ver
                  </button>
                  <a href={link.video_url} download target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-zinc-700 border border-zinc-600 text-zinc-300 hover:bg-zinc-600 rounded-lg transition-colors">
                    <Download size={12} /> Descargar
                  </a>
                  <button onClick={() => handleCopy(link.video_url)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-zinc-700 border border-zinc-600 text-zinc-300 hover:bg-zinc-600 rounded-lg transition-colors">
                    <Copy size={12} /> Copiar link
                  </button>
                  {canEdit && (
                    <>
                      <button onClick={() => openEdit(link)}
                        className="px-2.5 py-1.5 text-xs bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white rounded-lg transition-colors">
                        Editar
                      </button>
                      <button onClick={() => handleDelete(link)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 rounded-lg transition-colors">
                        <Trash2 size={12} /> Eliminar
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {previewLink && <VideoPreviewModal url={previewLink.video_url} title={previewLink.title} onClose={() => setPreviewLink(null)} />}
    </div>
  );
}
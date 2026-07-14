import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Video, Save } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function SessionVideoObs({ session, onUpdate }) {
  const [videoUrl, setVideoUrl] = useState(session.video_url || "");
  const [notes, setNotes] = useState(session.notes || "");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function handleSave() {
    setSaving(true);
    const updated = await base44.entities.TrainingSession.update(session.id, {
      video_url: videoUrl || undefined,
      notes: notes || undefined,
    });
    onUpdate({ ...session, ...updated });
    toast({ title: "✓ Guardado" });
    setSaving(false);
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1.5 block">URL del video</label>
        <div className="flex gap-2">
          <input
            value={videoUrl}
            onChange={e => setVideoUrl(e.target.value)}
            placeholder="https://youtube.com/..."
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
          />
        </div>
        {videoUrl && (
          <a href={videoUrl} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 mt-2 text-xs text-blue-400 hover:text-blue-300">
            <Video size={12} /> Ver video
          </a>
        )}
      </div>

      <div>
        <label className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1.5 block">Observaciones</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={6}
          placeholder="Notas y observaciones de la sesión..."
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none resize-none"
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-white text-zinc-900 font-semibold rounded-lg text-sm hover:bg-zinc-200 transition-colors disabled:opacity-50">
          <Save size={14} /> {saving ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </div>
  );
}
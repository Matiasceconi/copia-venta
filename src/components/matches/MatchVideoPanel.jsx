import React, { useState } from "react";
import { Youtube, ExternalLink, Save, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

function getYoutubeEmbedId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|\/v\/|embed\/)([A-Za-z0-9_-]{11})/);
  return m?.[1];
}

export default function MatchVideoPanel({ match, onVideoSaved }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(match.match_video_url || "");
  const { toast } = useToast();

  async function save() {
    await base44.entities.MatchReport.update(match.id, { match_video_url: val || null });
    onVideoSaved(val || null);
    setEditing(false);
    toast({ title: "Video actualizado" });
  }

  const id = getYoutubeEmbedId(match.match_video_url);

  return (
    <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-zinc-800/80 border-b border-zinc-700/50 flex items-center justify-between">
        <p className="text-sm font-semibold text-white flex items-center gap-2">
          <Youtube size={14} className="text-red-400" /> Video del partido
        </p>
        {!editing && (
          <button onClick={() => { setVal(match.match_video_url || ""); setEditing(true); }}
            className="text-xs text-zinc-500 hover:text-white border border-zinc-700 px-2.5 py-1 rounded-lg transition-all">
            {match.match_video_url ? "Cambiar" : "Agregar"}
          </button>
        )}
      </div>

      {editing ? (
        <div className="p-4 space-y-3">
          <input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center gap-1"><X size={12} /> Cancelar</button>
            <button onClick={save} disabled={!val} className="px-3 py-1.5 rounded-lg text-xs bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 disabled:opacity-40 flex items-center gap-1"><Save size={12} /> Guardar</button>
          </div>
        </div>
      ) : id ? (
        <div className="p-4">
          <div className="relative rounded-xl overflow-hidden border border-zinc-700" style={{ paddingBottom: "56.25%" }}>
            <iframe className="absolute inset-0 w-full h-full" src={`https://www.youtube.com/embed/${id}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
          {match.match_video_url && !id && (
            <a href={match.match_video_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm underline mt-2">
              <ExternalLink size={14} /> Ver video
            </a>
          )}
        </div>
      ) : match.match_video_url ? (
        <div className="p-4">
          <a href={match.match_video_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm underline">
            <ExternalLink size={14} /> Ver video del partido
          </a>
        </div>
      ) : null}
    </div>
  );
}
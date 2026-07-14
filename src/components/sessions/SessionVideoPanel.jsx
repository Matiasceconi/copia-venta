import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Video, Download, Eye, X } from "lucide-react";

export default function SessionVideoPanel({ session, onClose }) {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.SessionExercise.filter({ session_id: session.id }, "order", 100)
      .then(exs => {
        setExercises(exs.filter(e => e.video_url));
        setLoading(false);
      });
  }, [session.id]);

  const sessionVideo = session.video_url || null;
  const hasAny = sessionVideo || exercises.length > 0;

  function VideoRow({ label, url }) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-zinc-800/60 border border-zinc-700 rounded-xl">
        <div className="flex items-center gap-3 min-w-0">
          <Video size={14} className="text-zinc-400 shrink-0" />
          <span className="text-sm text-zinc-200 truncate">{label}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-500/15 border border-blue-500/30 text-blue-300 hover:bg-blue-500/25 rounded-lg transition-colors"
          >
            <Eye size={12} /> Ver
          </a>
          <a
            href={url}
            download
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-700 border border-zinc-600 text-zinc-300 hover:bg-zinc-600 rounded-lg transition-colors"
          >
            <Download size={12} /> Descargar
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Video size={15} className="text-blue-400" />
            <p className="text-sm font-semibold text-white">Videos de la sesión</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
            </div>
          ) : !hasAny ? (
            <div className="text-center py-8">
              <Video size={28} className="text-zinc-700 mx-auto mb-2" />
              <p className="text-zinc-500 text-sm">Sin video cargado</p>
            </div>
          ) : (
            <>
              {sessionVideo && (
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-medium">Video general</p>
                  <VideoRow label="Video de la sesión" url={sessionVideo} />
                </div>
              )}
              {exercises.length > 0 && (
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-medium">
                    Videos por ejercicio ({exercises.length})
                  </p>
                  <div className="space-y-2">
                    {exercises.map((ex, i) => (
                      <VideoRow key={ex.id} label={`${i + 1}. ${ex.name}`} url={ex.video_url} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
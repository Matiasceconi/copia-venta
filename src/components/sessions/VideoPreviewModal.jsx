import React from "react";
import { X } from "lucide-react";

function getYoutubeId(url) {
  const m = url.match(/(?:youtu\.be\/|v=|\/v\/|embed\/)([A-Za-z0-9_-]{11})/);
  return m?.[1] || null;
}
function getVimeoId(url) {
  const m = url.match(/vimeo\.com\/(?:.*\/)?(\d+)/);
  return m?.[1] || null;
}

export default function VideoPreviewModal({ url, title, onClose }) {
  const ytId = getYoutubeId(url);
  const vimeoId = !ytId ? getVimeoId(url) : null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <p className="text-sm font-semibold text-white truncate">{title}</p>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors shrink-0">
            <X size={16} />
          </button>
        </div>
        <div className="p-4">
          {ytId ? (
            <div className="relative w-full rounded-xl overflow-hidden" style={{ paddingBottom: "56.25%" }}>
              <iframe className="absolute inset-0 w-full h-full" src={`https://www.youtube.com/embed/${ytId}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </div>
          ) : vimeoId ? (
            <div className="relative w-full rounded-xl overflow-hidden" style={{ paddingBottom: "56.25%" }}>
              <iframe className="absolute inset-0 w-full h-full" src={`https://player.vimeo.com/video/${vimeoId}`}
                allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
            </div>
          ) : (
            <video src={url} controls className="w-full rounded-xl max-h-[70vh]">
              Tu navegador no puede reproducir este video.
            </video>
          )}
        </div>
      </div>
    </div>
  );
}
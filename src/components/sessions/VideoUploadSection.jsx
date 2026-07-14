import React, { useState, useRef } from "react";
import { Video, Upload, Link2, X, Play, RotateCcw, Loader2, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import VideoPreviewModal from "@/components/sessions/VideoPreviewModal";

const ALLOWED_EXTENSIONS = [".mp4", ".mov", ".webm"];
const ALLOWED_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const MAX_SIZE_MB = 500;

function getYouTubeId(url) {
  if (!url) return null;
  return String(url).match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/)?.[1] || null;
}

function getVimeoId(url) {
  if (!url) return null;
  return String(url).match(/vimeo\.com\/(?:.*\/)?(\d+)/)?.[1] || null;
}

function getVideoThumbnail(url) {
  if (!url) return null;
  const ytId = getYouTubeId(url);
  if (ytId) return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  return null;
}

function isValidVideoUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * VideoUploadSection
 * Props:
 *   videoUrl  – current video URL (string | "")
 *   onVideoUrl – callback (newUrl: string | "") when video changes
 */
export default function VideoUploadSection({ videoUrl, onVideoUrl }) {
  const [mode, setMode] = useState("file");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(""); // "uploading" | "processing" | "done" | "error"
  const [fileError, setFileError] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const replaceFileRef = useRef();

  const thumbnail = getVideoThumbnail(videoUrl);

  async function uploadFile(file) {
    if (!file) return;

    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
    const validExt = ALLOWED_EXTENSIONS.includes(ext);
    const validType = ALLOWED_TYPES.includes(file.type);
    if (!validExt && !validType) {
      setFileError("Formato no permitido. Usá MP4, MOV o WebM.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setFileError(`El archivo supera el límite de ${MAX_SIZE_MB} MB.`);
      return;
    }

    setFileError("");
    setUploading(true);
    setUploadProgress(0);
    setUploadStatus("uploading");

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => (prev < 80 ? prev + 6 : prev));
    }, 400);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      clearInterval(progressInterval);
      setUploadProgress(95);
      setUploadStatus("processing");
      await new Promise((r) => setTimeout(r, 700));
      setUploadProgress(100);
      setUploadStatus("done");
      onVideoUrl(file_url);
    } catch {
      clearInterval(progressInterval);
      setUploadStatus("error");
      setFileError("Error al subir el video. Intentá de nuevo.");
    } finally {
      setUploading(false);
    }
  }

  function handleFileInput(e) {
    uploadFile(e.target.files?.[0]);
    e.target.value = "";
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    uploadFile(e.dataTransfer.files?.[0]);
  }

  function handleUrlSubmit() {
    setUrlError("");
    const trimmed = urlInput.trim();
    if (!isValidVideoUrl(trimmed)) {
      setUrlError("URL inválida. Ingresá un enlace de YouTube, Vimeo o video directo.");
      return;
    }
    onVideoUrl(trimmed);
    setUrlInput("");
  }

  function handleDelete() {
    if (!window.confirm("¿Querés eliminar este video? La imagen del ejercicio volverá a mostrarse como portada.")) return;
    onVideoUrl("");
    setUploadStatus("");
    setFileError("");
  }

  // ── Preview mode (video exists) ──────────────────────────────────────────
  if (videoUrl) {
    return (
      <div className="space-y-2 col-span-2">
        <label className="text-[10px] text-zinc-400 block">Video del ejercicio</label>

        {/* Thumbnail / player preview */}
        <div
          className="relative rounded-lg overflow-hidden border border-zinc-600 bg-zinc-800 group cursor-pointer"
          onClick={() => setShowModal(true)}
        >
          {thumbnail ? (
            <img src={thumbnail} alt="miniatura de video" className="w-full max-h-40 object-cover" />
          ) : (
            <div className="w-full h-28 flex items-center justify-center bg-zinc-700">
              <Video size={28} className="text-zinc-500" />
            </div>
          )}
          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
            <div className="w-11 h-11 rounded-full bg-white/20 border-2 border-white/50 flex items-center justify-center backdrop-blur-sm">
              <Play size={18} className="text-white fill-white ml-0.5" />
            </div>
          </div>
          {/* Badge */}
          <span className="absolute top-2 left-2 bg-blue-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
            Video
          </span>
        </div>

        {/* Upload progress when replacing */}
        {uploading && (
          <div className="space-y-1 px-1">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Loader2 size={12} className="animate-spin text-blue-400" />
              {uploadStatus === "processing" ? "Procesando video..." : `Subiendo... ${uploadProgress}%`}
            </div>
            <div className="w-full bg-zinc-700 rounded-full h-1.5">
              <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <label className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-600 text-xs text-zinc-400 hover:text-white hover:border-zinc-500 cursor-pointer transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
            <RotateCcw size={11} />
            Reemplazar video
            <input
              ref={replaceFileRef}
              type="file"
              accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm"
              className="hidden"
              onChange={handleFileInput}
              disabled={uploading}
            />
          </label>
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 text-xs text-zinc-500 hover:text-red-400 hover:border-red-500/30 transition-colors"
          >
            <X size={11} />
            Eliminar video
          </button>
        </div>

        {fileError && (
          <div className="flex items-center gap-1.5 text-xs text-red-400">
            <AlertCircle size={12} /> {fileError}
          </div>
        )}

        {showModal && (
          <VideoPreviewModal url={videoUrl} title="Video del ejercicio" onClose={() => setShowModal(false)} />
        )}
      </div>
    );
  }

  // ── Upload mode (no video yet) ───────────────────────────────────────────
  return (
    <div className="space-y-2 col-span-2">
      <label className="text-[10px] text-zinc-400 block">Video del ejercicio</label>

      {/* Mode tabs */}
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => setMode("file")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors ${mode === "file" ? "bg-zinc-700 border-zinc-500 text-white" : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300"}`}
        >
          <Upload size={11} /> Subir archivo
        </button>
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors ${mode === "url" ? "bg-zinc-700 border-zinc-500 text-white" : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300"}`}
        >
          <Link2 size={11} /> Agregar enlace
        </button>
      </div>

      {mode === "file" ? (
        <div>
          {uploading ? (
            <div className="border border-zinc-700 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                <Loader2 size={13} className="animate-spin text-blue-400 shrink-0" />
                {uploadStatus === "processing"
                  ? "Procesando video..."
                  : uploadStatus === "done"
                  ? "¡Video cargado correctamente!"
                  : `Subiendo archivo... ${uploadProgress}%`}
              </div>
              {uploadStatus !== "done" && (
                <div className="w-full bg-zinc-700 rounded-full h-1.5">
                  <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}
            </div>
          ) : (
            <label
              className={`flex flex-col items-center gap-2 border border-dashed rounded-lg p-5 cursor-pointer transition-colors ${dragOver ? "border-blue-500/60 bg-blue-500/10 text-blue-300" : "border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/40 text-zinc-500 hover:text-zinc-300"}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <Video size={20} />
              <div className="text-center">
                <p className="text-xs">Arrastrá o hacé clic para subir video</p>
                <p className="text-[10px] text-zinc-600 mt-0.5">MP4, MOV, WebM · Máx. {MAX_SIZE_MB} MB</p>
              </div>
              <input
                type="file"
                accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm"
                className="hidden"
                onChange={handleFileInput}
              />
            </label>
          )}
          {fileError && (
            <div className="flex items-center gap-1.5 text-xs text-red-400 mt-1.5">
              <AlertCircle size={12} /> {fileError}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <input
              value={urlInput}
              onChange={(e) => { setUrlInput(e.target.value); setUrlError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleUrlSubmit(); } }}
              placeholder="https://youtube.com/... o enlace directo a video"
              className="flex-1 bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500"
            />
            <button
              type="button"
              onClick={handleUrlSubmit}
              disabled={!urlInput.trim()}
              className="px-3 py-2 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs hover:bg-blue-600/30 disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              Agregar
            </button>
          </div>
          {urlError && (
            <div className="flex items-center gap-1.5 text-xs text-red-400">
              <AlertCircle size={12} /> {urlError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

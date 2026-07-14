import React, { useState } from "react";
import { FileText, ExternalLink, Save, X, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

export default function MatchPlanPdfPanel({ match, onPdfSaved }) {
  const [uploading, setUploading] = useState(false);
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState(match.match_plan_pdf_url || "");
  const { toast } = useToast();

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.MatchReport.update(match.id, { match_plan_pdf_url: file_url, match_plan_pdf_label: file.name });
      onPdfSaved(file_url, file.name);
      toast({ title: "Plan de partido cargado" });
    } catch {
      toast({ title: "Error al cargar", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  async function saveUrl() {
    await base44.entities.MatchReport.update(match.id, { match_plan_pdf_url: urlInput || null });
    onPdfSaved(urlInput || null, urlInput ? urlInput.split("/").pop() : null);
    setEditingUrl(false);
    toast({ title: "Plan de partido actualizado" });
  }

  async function remove() {
    await base44.entities.MatchReport.update(match.id, { match_plan_pdf_url: null, match_plan_pdf_label: null });
    onPdfSaved(null, null);
    toast({ title: "Plan de partido eliminado" });
  }

  const pdfUrl = match.match_plan_pdf_url;

  return (
    <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-zinc-800/80 border-b border-zinc-700/50 flex items-center justify-between">
        <p className="text-sm font-semibold text-white flex items-center gap-2">
          <FileText size={14} className="text-orange-400" /> Plan de partido
        </p>
        {pdfUrl && (
          <div className="flex items-center gap-1">
            <button onClick={remove} className="text-zinc-600 hover:text-red-400 p-1.5 rounded hover:bg-zinc-700 transition-colors">
              <X size={13} />
            </button>
          </div>
        )}
      </div>

      {editingUrl ? (
        <div className="p-4 space-y-3">
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://...pdf"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditingUrl(false)} className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center gap-1"><X size={12} /> Cancelar</button>
            <button onClick={saveUrl} disabled={!urlInput} className="px-3 py-1.5 rounded-lg text-xs bg-orange-500/20 border border-orange-500/30 text-orange-300 hover:bg-orange-500/30 disabled:opacity-40 flex items-center gap-1"><Save size={12} /> Guardar</button>
          </div>
        </div>
      ) : pdfUrl ? (
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-orange-400 shrink-0" />
            <span className="text-xs text-zinc-300 truncate max-w-[200px]">{match.match_plan_pdf_label || "Plan de partido.pdf"}</span>
          </div>
          <div className="flex items-center gap-2">
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-500 hover:text-white border border-zinc-700 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1">
              <ExternalLink size={12} /> Abrir
            </a>
            <button onClick={() => { setUrlInput(pdfUrl); setEditingUrl(true); }} className="text-xs text-zinc-500 hover:text-white border border-zinc-700 px-2.5 py-1 rounded-lg transition-all">
              Cambiar
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 flex flex-wrap gap-2">
          <label className="flex-1 cursor-pointer">
            <div className={`flex items-center justify-center gap-2 border border-dashed border-zinc-700 rounded-lg px-4 py-3 text-xs text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-colors ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
              {uploading ? <div className="w-3 h-3 border border-zinc-500 border-t-white rounded-full animate-spin" /> : <Upload size={14} />}
              {uploading ? "Subiendo..." : "Subir PDF"}
            </div>
            <input type="file" accept=".pdf" onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
          <button onClick={() => { setUrlInput(""); setEditingUrl(true); }}
            className="px-3 py-3 border border-dashed border-zinc-700 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-colors">
            Pegar URL
          </button>
        </div>
      )}
    </div>
  );
}
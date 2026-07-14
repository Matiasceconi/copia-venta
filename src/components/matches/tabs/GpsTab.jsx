import React, { useEffect, useState } from "react";
import { ExternalLink, FileSpreadsheet, Upload, X } from "lucide-react";

import { base44 } from "@/api/base44Client";
import MatchGpsReport from "@/components/matches/MatchGpsReport";
import { useToast } from "@/components/ui/use-toast";

function MatchCsvPanel({ match, onMatchUpdated }) {
  const { toast } = useToast();
  const [csvUrl, setCsvUrl] = useState(match.csv_url || null);
  const [csvLabel, setCsvLabel] = useState(match.csv_label || null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setCsvUrl(match.csv_url || null);
    setCsvLabel(match.csv_label || null);
  }, [match.csv_label, match.csv_url]);

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.MatchReport.update(match.id, { csv_url: file_url, csv_label: file.name });
      setCsvUrl(file_url);
      setCsvLabel(file.name);
      onMatchUpdated?.({ csv_url: file_url, csv_label: file.name });
      toast({ title: "CSV cargado correctamente" });
    } catch {
      toast({ title: "Error al cargar el CSV", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  async function removeCsv() {
    try {
      await base44.entities.MatchReport.update(match.id, { csv_url: null, csv_label: null });
      setCsvUrl(null);
      setCsvLabel(null);
      onMatchUpdated?.({ csv_url: null, csv_label: null });
      toast({ title: "CSV eliminado" });
    } catch {
      toast({ title: "No se pudo eliminar el CSV", variant: "destructive" });
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><FileSpreadsheet size={16} className="text-green-400" /> Archivo GPS del partido</h2>
          <p className="mt-1 text-xs text-zinc-500">Subí el CSV de Catapult para procesar el informe GPS.</p>
        </div>
        {csvUrl && (
          <div className="flex items-center gap-2">
            <a href={csvUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-zinc-400 transition hover:text-white"><ExternalLink size={14} /></a>
            <button onClick={removeCsv} className="rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-zinc-400 transition hover:border-red-500/40 hover:text-red-400"><X size={14} /></button>
          </div>
        )}
      </div>
      {!csvUrl ? (
        <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 px-4 py-8 text-sm text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200 ${uploading ? "pointer-events-none opacity-60" : ""}`}>
          <Upload size={16} /> {uploading ? "Subiendo..." : "Cargar CSV"}
          <input type="file" accept=".csv,.txt" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      ) : (
        <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm text-white">{csvLabel || "Archivo CSV"}</p>
            <p className="text-xs text-zinc-500">El informe se recalcula sin bloquear otras pestañas.</p>
          </div>
          <label className="cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 transition hover:bg-zinc-800">
            {uploading ? "Subiendo..." : "Reemplazar"}
            <input type="file" accept=".csv,.txt" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      )}
    </div>
  );
}

export default function GpsTab({ match, onMatchUpdated, onRegisterSave }) {
  useEffect(() => {
    onRegisterSave?.({ action: null, disabled: true, pending: false, label: "gps" });
  }, [onRegisterSave]);

  return (
    <div className="space-y-4">
      <MatchCsvPanel match={match} onMatchUpdated={onMatchUpdated} />
      <MatchGpsReport match={match} />
    </div>
  );
}

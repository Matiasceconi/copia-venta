import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, UploadCloud, CheckCircle2, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function ImportHistoricalGPSModal({ onClose }) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const { toast } = useToast();

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    setError("");
    setResult(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const res = await base44.functions.invoke("importHistoricalGPS", { file_url });
      if (res.data?.error) {
        setError(res.data.error);
      } else {
        setResult(res.data);
        toast({ title: "✓ Importación completada" });
      }
    } catch (e) {
      setError(e.message || "Error al importar el archivo");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h3 className="text-white font-bold text-sm">Importar historial GPS desde Excel</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-zinc-400 text-xs leading-relaxed">
            Sube el Excel ordenado por fecha (solo Reserva). Se detectarán las fechas únicas, se creará o
            actualizará una sesión por cada fecha y se cargará el GPS de cada jugador vinculado.
          </p>

          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-zinc-700 rounded-lg py-8 cursor-pointer hover:border-zinc-500 transition-colors">
            <UploadCloud size={22} className="text-zinc-500" />
            <span className="text-zinc-400 text-xs">{file ? file.name : "Seleccionar archivo .xlsx"}</span>
            <input type="file" accept=".xlsx,.xls" className="hidden"
              onChange={(e) => { setFile(e.target.files?.[0] || null); setResult(null); setError(""); }} />
          </label>

          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-300 text-xs">{error}</p>
            </div>
          )}

          {result && (
            <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                <CheckCircle2 size={14} /> Resumen de la importación
              </div>
              <ul className="text-zinc-300 text-xs space-y-1">
                <li>Fechas detectadas: <b>{result.fechas_detectadas}</b></li>
                <li>Sesiones creadas: <b>{result.sesiones_creadas}</b></li>
                <li>Sesiones actualizadas: <b>{result.sesiones_actualizadas}</b></li>
                <li>Registros GPS cargados: <b>{result.registros_gps_cargados}</b></li>
                <li>Jugadores vinculados: <b>{result.jugadores_vinculados}</b></li>
                <li>Jugadores sin reconocer: <b>{result.jugadores_sin_reconocer?.length || 0}</b></li>
              </ul>
              {result.jugadores_sin_reconocer?.length > 0 && (
                <div className="pt-1">
                  <p className="text-amber-400 text-[11px] font-semibold mb-1">Sin vincular:</p>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">{result.jugadores_sin_reconocer.join(", ")}</p>
                </div>
              )}
              {result.errores?.length > 0 && (
                <div className="pt-1">
                  <p className="text-red-400 text-[11px] font-semibold mb-1">Errores:</p>
                  <p className="text-red-300 text-[11px] leading-relaxed">{result.errores.join(" | ")}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-zinc-800">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors">
            Cerrar
          </button>
          <button onClick={handleImport} disabled={!file || importing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors disabled:opacity-50">
            {importing && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {importing ? "Importando..." : "Importar"}
          </button>
        </div>
      </div>
    </div>
  );
}
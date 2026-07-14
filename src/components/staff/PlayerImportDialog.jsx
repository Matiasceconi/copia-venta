import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, AlertCircle, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

export default function PlayerImportDialog({ open, onOpenChange, onSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const { toast } = useToast();

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const response = await base44.functions.invoke('importPlayersFromExcel', { file_url });
      
      setResult(response.data);
      toast({ title: "Importación completada" });
      
      if (onSuccess) onSuccess();
    } catch (error) {
      toast({ title: "Error en la importación", description: error.message, variant: "destructive" });
      setResult(null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Importar jugadores desde Excel</DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">
              Carga un archivo Excel con las columnas: DNI, APELLIDO, NOMBRE, FECHA DE NACIMIENTO
            </p>
            <label className="flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors cursor-pointer">
              <Upload size={18} className="text-zinc-500" />
              <span className="text-sm text-zinc-400">{uploading ? "Cargando..." : "Selecciona archivo"}</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          <div className="space-y-3">
            {result.success ? (
              <>
                <div className="flex items-start gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <CheckCircle size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-emerald-300">Importación exitosa</p>
                    <p className="text-xs text-emerald-300/70 mt-1">
                      {result.created} creados · {result.updated} actualizados
                    </p>
                  </div>
                </div>

                {result.duplicates > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <AlertCircle size={18} className="text-yellow-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-300">{result.duplicates} DNI duplicados ignorados</p>
                  </div>
                )}

                {result.invalid_dates > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                    <AlertCircle size={18} className="text-orange-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-orange-300 font-semibold">Fechas inválidas: {result.invalid_dates}</p>
                      {result.details?.invalid_dates?.length > 0 && (
                        <ul className="text-xs text-orange-300/70 mt-1 list-disc list-inside">
                          {result.details.invalid_dates.map((d, i) => (
                            <li key={i}>{d.name}: {d.value}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                <div className="text-xs text-zinc-500 py-2 space-y-1">
                  {result.details?.created_names?.length > 0 && (
                    <>
                      <p className="font-semibold text-zinc-400">Primeros creados:</p>
                      <ul className="list-disc list-inside">
                        {result.details.created_names.slice(0, 5).map((name, i) => (
                          <li key={i}>{name}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>

                <Button
                  onClick={() => {
                    setResult(null);
                    onOpenChange(false);
                  }}
                  className="w-full bg-white text-zinc-900 hover:bg-zinc-200">
                  Cerrar
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300">{result.error || "Error en la importación"}</p>
                </div>
                <Button
                  onClick={() => setResult(null)}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white">
                  Reintentar
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RefreshCw, FileSpreadsheet, CheckCircle2, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function NutritionImportModal({ onClose, onImported }) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState(null);
  const { toast } = useToast();

  async function handleSync() {
    setSyncing(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke("syncNutritionFromSheet", {});
      const data = res.data || res;
      setResult({ success: true, data });
      toast({ title: "Importación completada" });
    } catch (e) {
      setResult({ success: false, error: e.message });
      toast({ title: "Error al importar", description: e.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  }

  function handleClose() {
    if (result?.success) {
      onImported?.();
    }
    onClose();
  }

  function handleDone() {
    onImported?.();
    onClose();
  }

  return (
    <Dialog open onOpenChange={handleClose}>
      <DialogContent className="bg-zinc-900 border border-zinc-800 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-emerald-400" />
            Importar datos nutricionales
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 space-y-2 text-sm text-zinc-400">
            <p className="text-zinc-300 font-medium">Fuente de datos</p>
            <p>Los datos se importan desde la planilla configurada en el sistema.</p>
            <p>Se procesan las hojas:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><span className="text-zinc-200 font-medium">Sumatoria de 6 pliegues</span> → Evaluaciones antropométricas</li>
              <li><span className="text-zinc-200 font-medium">Informe 1 / Lectura</span> → Lecturas nutricionales</li>
            </ul>
            <p className="text-xs mt-2">
              La importación realiza upsert. Los jugadores no se crean automáticamente — se vinculan por player_id, DNI, alias guardado o nombre normalizado.
              Los registros no reconocidos quedan en "Registros sin vincular".
            </p>
          </div>

          {/* Matching priority info */}
          <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-3 text-xs text-zinc-500">
            <p className="text-zinc-400 font-medium mb-1">Prioridad de vinculación de jugadores:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>player_id directo</li>
              <li>DNI / documento</li>
              <li>Alias guardado</li>
              <li>Nombre normalizado</li>
            </ol>
          </div>

          {/* Result */}
          {result && (
            <div className={`rounded-xl p-4 border text-sm ${result.success ? "bg-emerald-900/20 border-emerald-700/40 text-emerald-300" : "bg-red-900/20 border-red-700/40 text-red-300"}`}>
              {result.success ? (
                <div className="space-y-2">
                  <p className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 size={16} /> Importación completada
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-emerald-300/80">
                    <span>Filas leídas:</span><span className="font-medium">{result.data.rows_read ?? "—"}</span>
                    <span>Evaluaciones creadas:</span><span className="font-medium">{result.data.assessments_created ?? 0}</span>
                    <span>Evaluaciones actualizadas:</span><span className="font-medium">{result.data.assessments_updated ?? 0}</span>
                    <span>Lecturas creadas:</span><span className="font-medium">{result.data.interpretations_created ?? 0}</span>
                    <span>Lecturas actualizadas:</span><span className="font-medium">{result.data.interpretations_updated ?? 0}</span>
                    {(result.data.unresolved_assessments || 0) > 0 && (
                      <>
                        <span className="text-amber-400">Sin vincular:</span>
                        <span className="font-medium text-amber-400">{result.data.unresolved_assessments}</span>
                      </>
                    )}
                    {result.data.errors > 0 && (
                      <>
                        <span className="text-red-400">Errores:</span>
                        <span className="font-medium text-red-400">{result.data.errors}</span>
                      </>
                    )}
                  </div>
                  {result.data.unresolved_samples?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-amber-400 font-medium mb-1 flex items-center gap-1">
                        <AlertTriangle size={12} /> Registros sin vincular (muestra):
                      </p>
                      <ul className="text-xs text-amber-300/70 space-y-0.5">
                        {result.data.unresolved_samples.slice(0, 5).map((s, i) => (
                          <li key={i}>· {s.name} ({s.sheet}, fila {s.row})</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="flex items-center gap-2">
                  <AlertTriangle size={16} /> {result.error}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleSync}
              disabled={syncing}
              className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold disabled:opacity-60"
            >
              <RefreshCw size={15} className={`mr-2 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Importando..." : "Importar desde planilla"}
            </Button>
            {result?.success && (
              <Button onClick={handleDone} className="bg-zinc-700 hover:bg-zinc-600 text-white">
                Listo
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

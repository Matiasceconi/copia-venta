import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { AlertCircle, CheckCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function PlantilDiagnostic() {
  const [loading, setLoading] = useState(true);
  const [diagnostics, setDiagnostics] = useState({
    playersNoFullName: [],
    playersNoNormalizedName: [],
    duplicates: [],
    catapultNoPlayerId: [],
    totalPlayers: 0,
    totalCatapult: 0,
  });
  const [running, setRunning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    runDiagnostic();
  }, []);

  async function runDiagnostic() {
    setLoading(true);
    try {
      const [players, catapult] = await Promise.all([
        base44.entities.Player.list('-created_date', 500),
        base44.entities.CatapultReport.list('-created_date', 500),
      ]);

      const normalizedMap = new Map();
      const playersNoFullName = [];
      const playersNoNormalizedName = [];
      const duplicates = [];

      for (const p of players) {
        if (!p.full_name) playersNoFullName.push(p);
        if (!p.normalized_name) playersNoNormalizedName.push(p);

        const normalized = (p.normalized_name || '').toLowerCase().trim();
        if (normalized) {
          if (normalizedMap.has(normalized)) {
            duplicates.push({
              player1: p,
              player2: normalizedMap.get(normalized),
              normalizedName: normalized,
            });
          } else {
            normalizedMap.set(normalized, p);
          }
        }
      }

      const catapultNoPlayerId = catapult.filter((c) => !c.player_id);

      setDiagnostics({
        playersNoFullName,
        playersNoNormalizedName,
        duplicates,
        catapultNoPlayerId,
        totalPlayers: players.length,
        totalCatapult: catapult.length,
      });
    } catch (error) {
      toast({ title: 'Error en diagnóstico', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function fixNames() {
    setRunning(true);
    try {
      const response = await base44.functions.invoke('normalizePlayerNames', {});
      toast({ title: response.data.message });
      await runDiagnostic();
    } catch (error) {
      toast({ title: 'Error al normalizar', variant: 'destructive' });
    } finally {
      setRunning(false);
    }
  }

  async function assignMissingDivisions() {
    setRunning(true);
    try {
      const response = await base44.functions.invoke('assignMissingDivisions', {});
      toast({ title: response.data.message });
      await runDiagnostic();
    } catch (error) {
      toast({ title: 'Error al asignar divisiones', variant: 'destructive' });
    } finally {
      setRunning(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const issueCount =
    diagnostics.playersNoFullName.length +
    diagnostics.playersNoNormalizedName.length +
    diagnostics.catapultNoPlayerId.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Control de Plantel</h1>
          <p className="text-zinc-500 text-sm mt-1">Diagnóstico de integridad de datos</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={assignMissingDivisions}
            disabled={running}
            className="bg-blue-600 hover:bg-blue-700 text-white">
            {running ? 'Procesando...' : 'Asignar divisiones'}
          </Button>
          <Button
            onClick={fixNames}
            disabled={running || issueCount === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {running ? 'Corrigiendo...' : 'Normalizar nombres'}
          </Button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-white">{diagnostics.totalPlayers}</p>
          <p className="text-xs text-zinc-500 mt-1">Total jugadores</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-white">{diagnostics.totalCatapult}</p>
          <p className="text-xs text-zinc-500 mt-1">Reportes GPS</p>
        </div>
        <div className={`border rounded-xl p-4 ${issueCount === 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
          <p className={`text-2xl font-bold ${issueCount === 0 ? 'text-emerald-400' : 'text-red-400'}`}>{issueCount}</p>
          <p className={`text-xs mt-1 ${issueCount === 0 ? 'text-emerald-300' : 'text-red-300'}`}>Problemas detectados</p>
        </div>
      </div>

      {/* Problemas */}
      <div className="space-y-4">
        {diagnostics.playersNoFullName.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={18} className="text-red-400" />
              <p className="font-semibold text-red-300">Jugadores sin nombre completo ({diagnostics.playersNoFullName.length})</p>
            </div>
            <div className="space-y-1 text-sm text-red-200">
              {diagnostics.playersNoFullName.slice(0, 5).map((p) => (
                <p key={p.id}>{p.first_name} {p.last_name}</p>
              ))}
              {diagnostics.playersNoFullName.length > 5 && <p>... y {diagnostics.playersNoFullName.length - 5} más</p>}
            </div>
          </div>
        )}

        {diagnostics.playersNoNormalizedName.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={18} className="text-yellow-400" />
              <p className="font-semibold text-yellow-300">Jugadores sin nombre normalizado ({diagnostics.playersNoNormalizedName.length})</p>
            </div>
          </div>
        )}

        {diagnostics.duplicates.length > 0 && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={18} className="text-orange-400" />
              <p className="font-semibold text-orange-300">Posibles duplicados ({diagnostics.duplicates.length})</p>
            </div>
            <div className="space-y-2 text-sm text-orange-200">
              {diagnostics.duplicates.slice(0, 3).map((d, i) => (
                <p key={i}>{d.player1.full_name} ≈ {d.player2.full_name}</p>
              ))}
            </div>
          </div>
        )}

        {diagnostics.catapultNoPlayerId.length > 0 && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={18} className="text-blue-400" />
              <p className="font-semibold text-blue-300">Reportes GPS sin player_id ({diagnostics.catapultNoPlayerId.length})</p>
            </div>
            <p className="text-xs text-blue-200">Necesitan ser vinculados manualmente</p>
          </div>
        )}

        {issueCount === 0 && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle size={20} className="text-emerald-400" />
            <p className="text-emerald-300">✓ Todos los datos están en orden</p>
          </div>
        )}
      </div>
    </div>
  );
}
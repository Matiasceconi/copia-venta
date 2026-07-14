import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart2, RefreshCw, CheckCircle2, AlertTriangle, Zap } from "lucide-react";

export default function IdentityCoverageTab({ players, toast }) {
  const [coverage, setCoverage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

  async function loadCoverage() {
    setLoading(true);
    const res = await base44.functions.invoke("resolvePlayerNames", { action: "coverage" });
    setCoverage(res.data.coverage || []);
    setLoading(false);
  }

  async function handleBackfill() {
    if (!confirm("¿Re-aplicar todos los alias a todas las tablas?\nEsto asignará player_id a registros huérfanos usando los alias registrados y el motor de matching.")) return;
    setBackfilling(true);
    const res = await base44.functions.invoke("resolvePlayerNames", { action: "backfill_all" });
    toast({ title: `Backfill completado · ${res.data.fixed} registros actualizados` });
    setBackfilling(false);
    await loadCoverage();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-white font-semibold">Cobertura de player_id por tabla</p>
          <p className="text-xs text-zinc-500 mt-0.5">Porcentaje de registros que tienen un player_id oficial asignado en cada módulo del sistema.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleBackfill} disabled={backfilling}
            className="flex items-center gap-1.5 px-3 py-2 bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 rounded-lg text-sm hover:bg-yellow-500/30 transition-colors disabled:opacity-50">
            {backfilling ? <div className="w-3 h-3 border border-yellow-400 border-t-transparent rounded-full animate-spin" /> : <Zap size={14} />}
            Re-aplicar todos los alias
          </button>
          <button onClick={loadCoverage} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm hover:bg-zinc-700 transition-colors disabled:opacity-50">
            {loading ? <div className="w-3 h-3 border border-zinc-500 border-t-white rounded-full animate-spin" /> : <RefreshCw size={14} />}
            Ver cobertura
          </button>
        </div>
      </div>

      {coverage === null && !loading && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <BarChart2 size={28} className="text-zinc-700 mx-auto mb-2" />
          <p className="text-zinc-500 text-sm">Hacé clic en "Ver cobertura" para analizar cada tabla</p>
        </div>
      )}

      {coverage && (
        <div className="space-y-3">
          {/* Resumen global */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{players.length}</p>
              <p className="text-xs text-zinc-500 mt-1">Jugadores registrados</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">
                {coverage.filter(c => c.pct === 100).length}/{coverage.length}
              </p>
              <p className="text-xs text-zinc-500 mt-1">Tablas al 100%</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-yellow-400">
                {coverage.reduce((a, c) => a + c.missing, 0)}
              </p>
              <p className="text-xs text-zinc-500 mt-1">Registros sin player_id</p>
            </div>
          </div>

          {/* Tabla por módulo */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Cobertura por módulo</p>
            </div>
            <div className="divide-y divide-zinc-800">
              {coverage.map(row => (
                <div key={row.table} className="px-4 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {row.pct === 100
                        ? <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                        : <AlertTriangle size={13} className="text-yellow-400 shrink-0" />
                      }
                      <span className="text-sm font-medium text-white">{row.label}</span>
                      <span className="text-xs text-zinc-600 font-mono">({row.table})</span>
                    </div>
                    <div className="mt-1.5 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${row.pct === 100 ? "bg-emerald-500" : row.pct >= 80 ? "bg-yellow-500" : "bg-red-500"}`}
                        style={{ width: `${row.pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-lg font-bold ${row.pct === 100 ? "text-emerald-400" : row.pct >= 80 ? "text-yellow-400" : "text-red-400"}`}>{row.pct}%</p>
                    <p className="text-xs text-zinc-600">{row.linked}/{row.total}</p>
                    {row.missing > 0 && <p className="text-xs text-red-400">{row.missing} huérfanos</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-xs font-semibold text-zinc-400 mb-2">¿Cómo funciona el backfill?</p>
            <ul className="text-xs text-zinc-500 space-y-1 list-disc list-inside">
              <li>Para cada registro sin player_id, normaliza el nombre del jugador.</li>
              <li>Busca primero en los alias registrados (coincidencia exacta).</li>
              <li>Si no hay alias, busca por nombre oficial normalizado.</li>
              <li>Si tampoco, aplica matching fuzzy con score ≥ 90% para asignar automáticamente.</li>
              <li>Los casos con score bajo quedan huérfanos y deben resolverse en el tab "Alias".</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
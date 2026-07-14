import React, { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileDown, RotateCcw, Upload, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { applyExcelImport, buildImportPlan, buildSimulationSummary, downloadConflictsCsv, loadImportContext, simulateExcelImport, undoLastExcelImport } from "@/components/performance/minutes/excelMinutesImportUtils";

const POLICY_OPTIONS = [
  { value: "review", label: "Revisar diferencias una por una" },
  { value: "empty", label: "Completar solamente datos vacíos" },
  { value: "update", label: "Actualizar con Excel" },
];

export default function ExcelMinutesImportModal({ open, onClose, filters, onImported }) {
  const { toast } = useToast();
  const [context, setContext] = useState(null);
  const [simulation, setSimulation] = useState(null);
  const [policy, setPolicy] = useState("review");
  const [conflictActions, setConflictActions] = useState({});
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  const plan = useMemo(() => simulation && context ? buildImportPlan(simulation, context, policy, conflictActions) : null, [simulation, context, policy, conflictActions]);
  const summary = useMemo(() => simulation && plan ? buildSimulationSummary(simulation, plan) : null, [simulation, plan]);

  if (!open) return null;

  async function handleFile(file) {
    if (!file) return;
    setLoading(true);
    try {
      const loadedContext = await loadImportContext();
      const sim = await simulateExcelImport(file, loadedContext, filters);
      setContext(loadedContext);
      setSimulation(sim);
      setConflictActions({});
    } finally {
      setLoading(false);
    }
  }

  async function confirmImport() {
    if (!plan || !context) return;
    setApplying(true);
    try {
      const result = await applyExcelImport(plan, context);
      toast({ title: `Importación confirmada: ${result.minuteCreates} creados, ${result.minuteUpdates} actualizados.` });
      onImported?.();
      onClose?.();
    } catch (error) {
      toast({ title: error.message || "No se pudo confirmar la importación", variant: "destructive" });
    } finally {
      setApplying(false);
    }
  }

  async function undoImport() {
    setApplying(true);
    try {
      const result = await undoLastExcelImport();
      toast({ title: result.restored ? "Última importación deshecha" : result.message });
      onImported?.();
    } catch (error) {
      toast({ title: error.message || "No se pudo deshacer la importación", variant: "destructive" });
    } finally {
      setApplying(false);
    }
  }

  function updateMatch(round, matchId) {
    setSimulation((current) => ({ ...current, matchMappings: current.matchMappings.map((item) => item.round === round ? { ...item, selectedMatchId: matchId, status: matchId ? "review" : "missing" } : item) }));
  }

  function updatePlayer(excelName, playerId) {
    setSimulation((current) => ({ ...current, playerMappings: current.playerMappings.map((item) => item.excelName === excelName ? { ...item, selectedPlayerId: playerId, status: playerId ? "review" : "missing" } : item) }));
  }

  const allMatches = context?.matches || [];
  const allPlayers = context?.players || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="max-h-[92vh] w-full max-w-7xl overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl shadow-black/50">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/95 px-5 py-4 backdrop-blur">
          <div>
            <h2 className="text-lg font-semibold text-white">Importar minutos desde Excel</h2>
            <p className="text-xs text-zinc-500">Primero se simula y revisa. Nada se guarda hasta confirmar.</p>
          </div>
          <button onClick={onClose} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-900">Cerrar</button>
        </div>

        <div className="space-y-5 p-5">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm font-semibold text-yellow-200 transition hover:bg-yellow-500/20">
              <Upload size={16} /> {loading ? "Leyendo archivo…" : "Subir .xlsx / .xls"}
              <input type="file" accept=".xlsx,.xls" disabled={loading || applying} className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />
            </label>
            <button onClick={undoImport} disabled={applying} className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50">
              <RotateCcw size={15} /> Deshacer última importación
            </button>
            <select value={policy} onChange={(event) => setPolicy(event.target.value)} className="h-10 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-yellow-500">
              {POLICY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>

          {!simulation && <EmptyState loading={loading} />}

          {summary && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
              <Metric label="Partidos detectados" value={summary.partidosDetectados} />
              <Metric label="Relacionados" value={summary.partidosRelacionados} />
              <Metric label="Partidos pendientes" value={summary.partidosPendientes} />
              <Metric label="Jugadores OK" value={summary.jugadoresReconocidos} />
              <Metric label="Jugadores pendientes" value={summary.jugadoresPendientes} />
              <Metric label="Minutos a crear" value={summary.registrosCrear} />
              <Metric label="Minutos a actualizar" value={summary.registrosActualizar} />
              <Metric label="Conflictos" value={summary.conflictos} danger={summary.conflictos > 0} />
            </div>
          )}

          {simulation && (
            <>
              <ReviewMatches simulation={simulation} matches={allMatches} updateMatch={updateMatch} />
              <ReviewPlayers simulation={simulation} players={allPlayers} updatePlayer={updatePlayer} />
              <ConflictsPanel plan={plan} conflictActions={conflictActions} setConflictActions={setConflictActions} />
              <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-zinc-800 bg-zinc-950/95 py-4 backdrop-blur">
                <button onClick={onClose} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900">Cancelar</button>
                <button onClick={() => downloadConflictsCsv(plan?.conflicts || [])} className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"><FileDown size={15} /> Descargar reporte de conflictos</button>
                <button onClick={confirmImport} disabled={applying || !plan || summary?.partidosDetectados !== 18} className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50">{applying ? "Importando…" : "Confirmar importación"}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ loading }) {
  return <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 px-4 py-10 text-center text-sm text-zinc-500">{loading ? "Procesando la simulación…" : "Subí la planilla para ver la previsualización de partidos, jugadores y conflictos."}</div>;
}

function Metric({ label, value, danger }) {
  return <div className={`rounded-2xl border p-3 ${danger ? "border-red-500/30 bg-red-500/10" : "border-zinc-800 bg-zinc-900"}`}><p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{label}</p><p className="mt-2 text-xl font-bold text-white">{value}</p></div>;
}

function StatusBadge({ status }) {
  if (status === "safe") return <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300"><CheckCircle2 size={12} /> segura</span>;
  if (status === "missing") return <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-300"><XCircle size={12} /> sin relación</span>;
  return <span className="inline-flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-1 text-xs text-yellow-300"><AlertTriangle size={12} /> revisar</span>;
}

function ReviewMatches({ simulation, matches, updateMatch }) {
  return <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4"><h3 className="text-sm font-semibold text-white">Previsualización de partidos</h3><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="text-xs uppercase tracking-wide text-zinc-500"><tr><th className="p-2">Excel</th><th className="p-2">Fecha Excel</th><th className="p-2">Partido encontrado</th><th className="p-2">Condición</th><th className="p-2">Duración</th><th className="p-2">Estado</th></tr></thead><tbody className="divide-y divide-zinc-800">{simulation.matchMappings.map((item) => <tr key={item.round}><td className="p-2 text-white">Partido {item.round} ({item.roleColumn}:{item.minutesColumn})</td><td className="p-2 text-zinc-300">{item.date || "—"}</td><td className="p-2"><select value={item.selectedMatchId} onChange={(event) => updateMatch(item.round, event.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-white"><option value="">Seleccionar partido</option>{matches.map((match) => <option key={match.id} value={match.id}>{match.matchday_number ? `F${match.matchday_number}` : "—"} · {match.date} · {match.rival}</option>)}</select></td><td className="p-2 text-zinc-300">{item.condition || "—"}</td><td className="p-2 text-zinc-300">{item.duration || "—"}'</td><td className="p-2"><StatusBadge status={item.status} /></td></tr>)}</tbody></table></div></section>;
}

function ReviewPlayers({ simulation, players, updatePlayer }) {
  return <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4"><h3 className="text-sm font-semibold text-white">Reconocimiento de jugadores</h3><div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">{simulation.playerMappings.map((item) => <div key={item.excelName} className="grid grid-cols-[1fr_1.4fr_90px] items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-3"><div><p className="text-sm font-medium text-white">{item.excelName}</p><StatusBadge status={item.status} /></div><select value={item.selectedPlayerId} onChange={(event) => updatePlayer(item.excelName, event.target.value)} className="min-w-0 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-white"><option value="">Seleccionar jugador</option>{players.map((player) => <option key={player.id} value={player.id}>{player.full_name || `${player.first_name || ""} ${player.last_name || ""}`} · {player.squad_name || player.position || ""}</option>)}</select><span className="text-right text-xs text-zinc-400">{Math.round((item.confidence || 0) * 100)}%</span></div>)}</div></section>;
}

function ConflictsPanel({ plan, conflictActions, setConflictActions }) {
  const conflicts = plan?.conflicts || [];
  return <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4"><h3 className="text-sm font-semibold text-white">Diferencias y validaciones</h3><div className="mt-3 space-y-2">{conflicts.length === 0 && <p className="text-sm text-zinc-500">Sin conflictos detectados.</p>}{conflicts.slice(0, 120).map((conflict) => <div key={conflict.id} className="grid grid-cols-[120px_1.3fr_1fr_1fr_180px] items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm"><span className="text-yellow-300">{conflict.type}</span><span className="text-white">{conflict.label}</span><span className="text-zinc-400">Actual: {conflict.current}</span><span className="text-zinc-300">Excel: {conflict.excel}</span><select value={conflictActions[conflict.id] || conflict.defaultAction || "skip"} onChange={(event) => setConflictActions((current) => ({ ...current, [conflict.id]: event.target.value }))} className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-white"><option value="skip">Mantener actual</option><option value="excel">Usar Excel</option></select></div>)}</div></section>;
}
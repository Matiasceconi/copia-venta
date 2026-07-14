import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import moment from "moment";
import { RefreshCw, AlertTriangle, Trash2, EyeOff, Link2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

function fmtDate(d) { return d ? moment(d).format("DD/MM/YYYY") : "—"; }

export default function OrphanMinutesRepair() {
  const { toast } = useToast();
  const [orphans, setOrphans] = useState(null);
  const [autoRepaired, setAutoRepaired] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [matches, setMatches] = useState([]);
  const [reassignTarget, setReassignTarget] = useState({});

  async function scan() {
    setScanning(true);
    try {
      const [res, allMatches] = await Promise.all([
        base44.functions.invoke("repairOrphanMinutes", {}),
        base44.entities.MatchReport.list("-date", 500),
      ]);
      setOrphans(res.data.orphans);
      setAutoRepaired(res.data.autoRepaired);
      setMatches(allMatches);
      toast({ title: `Escaneo completo — ${res.data.orphans.length} huérfanos, ${res.data.autoRepaired} auto-reparados` });
    } catch (e) {
      toast({ title: "Error al escanear", description: e.message, variant: "destructive" });
    } finally {
      setScanning(false);
    }
  }

  async function deleteRecord(id) {
    await base44.entities.MinutesRecord.delete(id);
    setOrphans(prev => prev.filter(o => o.id !== id));
    toast({ title: "Registro eliminado" });
  }

  async function hideRecord(id) {
    await base44.entities.MinutesRecord.update(id, { hidden_from_reports: true });
    setOrphans(prev => prev.filter(o => o.id !== id));
    toast({ title: "Registro oculto de reportes" });
  }

  async function reassign(id) {
    const matchId = reassignTarget[id];
    if (!matchId) return;
    const match = matches.find(m => m.id === matchId);
    await base44.entities.MinutesRecord.update(id, { match_id: matchId, squad_id: match?.squad_id });
    setOrphans(prev => prev.filter(o => o.id !== id));
    toast({ title: "Registro reasignado" });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><AlertTriangle size={16} className="text-amber-400" /> Reparar minutos huérfanos</h2>
          <p className="text-zinc-500 text-xs mt-0.5">Detecta minutos sin partido válido en el módulo Partidos</p>
        </div>
        <button onClick={scan} disabled={scanning}
          className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors disabled:opacity-50">
          <RefreshCw size={13} className={scanning ? "animate-spin" : ""} /> {scanning ? "Escaneando..." : "Escanear"}
        </button>
      </div>

      {orphans === null ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-10 text-center">
          <p className="text-zinc-500 text-sm">Ejecutá el escaneo para detectar minutos huérfanos</p>
        </div>
      ) : orphans.length === 0 ? (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center">
          <p className="text-emerald-300 text-sm">Sin registros huérfanos {autoRepaired > 0 && `· ${autoRepaired} auto-reparados en este escaneo`}</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {autoRepaired > 0 && (
            <p className="text-xs text-emerald-400 px-4 py-2 border-b border-zinc-800">{autoRepaired} registros se vincularon automáticamente a su partido real</p>
          )}
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="text-left px-3 py-2">Jugador</th>
                <th className="text-left px-3 py-2">Partido original</th>
                <th className="text-left px-3 py-2">Fecha</th>
                <th className="text-right px-3 py-2">Min</th>
                <th className="text-left px-3 py-2">Error</th>
                <th className="text-left px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {orphans.map(o => (
                <tr key={o.id} className="border-b border-zinc-800/50 last:border-0">
                  <td className="px-3 py-2 text-white">{o.player_name}</td>
                  <td className="px-3 py-2 text-zinc-400">{o.match_label || "—"}</td>
                  <td className="px-3 py-2 text-zinc-400">{fmtDate(o.match_date)}</td>
                  <td className="px-3 py-2 text-right text-yellow-400">{o.minutes}'</td>
                  <td className="px-3 py-2 text-amber-400">{o.reason}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <select value={reassignTarget[o.id] || ""} onChange={e => setReassignTarget(prev => ({ ...prev, [o.id]: e.target.value }))}
                        className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-1 text-[11px] text-white focus:outline-none max-w-[110px]">
                        <option value="">Reasignar...</option>
                        {matches.map(m => <option key={m.id} value={m.id}>{fmtDate(m.date)} vs {m.rival}</option>)}
                      </select>
                      <button onClick={() => reassign(o.id)} disabled={!reassignTarget[o.id]} title="Reasignar"
                        className="p-1 rounded text-zinc-500 hover:text-blue-400 disabled:opacity-30 transition-colors"><Link2 size={13} /></button>
                      <button onClick={() => hideRecord(o.id)} title="Ocultar de reportes"
                        className="p-1 rounded text-zinc-500 hover:text-amber-400 transition-colors"><EyeOff size={13} /></button>
                      <button onClick={() => deleteRecord(o.id)} title="Eliminar registro"
                        className="p-1 rounded text-zinc-500 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Activity, Filter, RefreshCw } from "lucide-react";
import { fmtMetric, fmtSmax } from "@/utils";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";
import { updateFieldLibraryGpsSummary } from "@/components/sessions/exerciseLibrarySync";

const METRICS = [
  { key: "total_distance", label: "Dist. (m)",   color: "#3b82f6" },
  { key: "m_min",          label: "m/min",        color: "#10b981" },
  { key: "distance_19_8",  label: "D >19.8",      color: "#f97316" },
  { key: "distance_25",    label: "D >25",         color: "#a855f7" },
  { key: "sprints",        label: "Sprints",       color: "#06b6d4" },
  { key: "acc_3",          label: "ACC +3",        color: "#f59e0b" },
  { key: "dec_3",          label: "DEC +3",        color: "#ec4899" },
  { key: "player_load",    label: "Player Load",   color: "#8b5cf6" },
  { key: "smax",           label: "Smax",          color: "#ef4444" },
];

function avgOf(rows, key) {
  const vals = rows.map(r => r[key] || 0).filter(v => v > 0);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}
function maxOf(rows, key) {
  const vals = rows.map(r => r[key] || 0).filter(v => v > 0);
  return vals.length ? Math.max(...vals) : null;
}

export default function LibraryExerciseGPS({ libraryExerciseId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filterPlayer, setFilterPlayer] = useState("");
  const [filterSession, setFilterSession] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await base44.entities.LibraryExerciseGPSData
      .filter({ library_exercise_id: libraryExerciseId }, "-session_date", 1000);
    setRows(data);
    setLoading(false);
  }, [libraryExerciseId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Sync: busca todos los ExerciseGPSData de SessionExercises vinculados a este library_exercise_id
  // y los copia a LibraryExerciseGPSData si no existen aún
  async function handleSync() {
    setSyncing(true);
    try {
      // 1. Buscar SessionExercises vinculados a este library_exercise_id
      const sessionExercises = await base44.entities.SessionExercise
        .filter({ library_exercise_id: libraryExerciseId }, "-created_date", 500);

      if (sessionExercises.length === 0) {
        toast({ title: "No hay ejercicios de sesión vinculados a esta biblioteca." });
        setSyncing(false);
        return;
      }

      // 2. Para cada SessionExercise, buscar sus ExerciseGPSData
      const allGpsData = [];
      for (const se of sessionExercises) {
        const gps = await base44.entities.ExerciseGPSData
          .filter({ exercise_id: se.id }, "player_name", 200);
        // Buscar la TrainingSession para obtener title y date
        let sessionTitle = "";
        let sessionDate = "";
        if (se.session_id) {
          const sessions = await base44.entities.TrainingSession
            .filter({ id: se.session_id }, "-created_date", 1);
          if (sessions.length > 0) {
            sessionTitle = sessions[0].title || "";
            sessionDate = sessions[0].date || "";
          }
        }
        gps.forEach(g => allGpsData.push({
          ...g,
          library_exercise_id: libraryExerciseId,
          session_title: sessionTitle,
          session_date: sessionDate,
          exercise_name: se.name || "",
        }));
      }

      if (allGpsData.length === 0) {
        toast({ title: "No hay datos GPS en los ejercicios vinculados." });
        setSyncing(false);
        return;
      }

      // 3. Borrar LibraryExerciseGPSData existentes para este library_exercise_id
      const existing = await base44.entities.LibraryExerciseGPSData
        .filter({ library_exercise_id: libraryExerciseId }, "-created_date", 1000);
      await Promise.all(existing.map(r => base44.entities.LibraryExerciseGPSData.delete(r.id)));

      // 4. Crear los nuevos registros
      // Eliminar campos que no pertenecen a LibraryExerciseGPSData
      const toCreate = allGpsData.map(({ id, created_date, updated_date, created_by_id, ...rest }) => rest);
      await base44.entities.LibraryExerciseGPSData.bulkCreate(toCreate);
      await updateFieldLibraryGpsSummary(libraryExerciseId);

      toast({ title: `✓ Sincronizados ${toCreate.length} registros GPS a la biblioteca.` });
      await loadData();
    } catch (err) {
      toast({ title: "Error al sincronizar: " + err.message, variant: "destructive" });
    }
    setSyncing(false);
  }

  if (loading) return (
    <div className="flex justify-center py-4">
      <div className="w-4 h-4 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
    </div>
  );

  const uniqueSessions = [...new Set(rows.map(r => r.session_id))].length;

  if (rows.length === 0) {
    return (
      <div className="py-6 text-center space-y-3">
        <Activity size={20} className="text-zinc-700 mx-auto" />
        <p className="text-xs text-zinc-500">Sin carga externa histórica para este ejercicio.</p>
        <p className="text-[10px] text-zinc-600">Cargá un CSV en un ejercicio de sesión vinculado a esta biblioteca, o usá el botón para sincronizar.</p>
        <button onClick={handleSync} disabled={syncing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300 hover:bg-zinc-700 transition-colors disabled:opacity-50">
          <RefreshCw size={11} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Sincronizando..." : "Sincronizar carga externa histórica"}
        </button>
      </div>
    );
  }

  // Filtros
  const allPlayers = [...new Map(rows.map(r => [r.player_id, r.player_name])).entries()]
    .map(([id, name]) => ({ id, name }));
  const allSessions = [...new Map(rows.map(r => [r.session_id, `${r.session_title || "Sesión"} (${r.session_date ? moment(r.session_date).format("DD/MM") : ""})`])).entries()]
    .map(([id, label]) => ({ id, label }));

  const filtered = rows.filter(r => {
    if (filterPlayer && r.player_id !== filterPlayer) return false;
    if (filterSession && r.session_id !== filterSession) return false;
    if (filterFrom && r.session_date && r.session_date < filterFrom) return false;
    if (filterTo && r.session_date && r.session_date > filterTo) return false;
    return true;
  });

  const loadKeys = [...new Set(filtered.map(r => `${r.session_id}__${r.exercise_id}`))];

  return (
    <div className="space-y-4">
      {/* Sync button */}
      <div className="flex justify-end">
        <button onClick={handleSync} disabled={syncing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300 hover:bg-zinc-700 transition-colors disabled:opacity-50">
          <RefreshCw size={11} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Sincronizando..." : "Sincronizar carga externa histórica"}
        </button>
      </div>

      {/* Summary header */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-center">
          <p className="text-base font-bold text-blue-400">{loadKeys.length}</p>
          <p className="text-[9px] text-zinc-500">Cargas GPS</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-center">
          <p className="text-base font-bold text-emerald-400">{uniqueSessions}</p>
          <p className="text-[9px] text-zinc-500">Sesiones</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-center">
          <p className="text-base font-bold text-purple-400">{new Set(filtered.map(r => r.player_id)).size}</p>
          <p className="text-[9px] text-zinc-500">Jugadores</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-center">
          <p className="text-base font-bold text-amber-400">{filtered.length}</p>
          <p className="text-[9px] text-zinc-500">Registros</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter size={11} className="text-zinc-500 shrink-0" />
        <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-[10px] text-zinc-300 focus:outline-none" />
        <span className="text-[10px] text-zinc-600">–</span>
        <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-[10px] text-zinc-300 focus:outline-none" />
        <select value={filterSession} onChange={e => setFilterSession(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-[10px] text-zinc-300 focus:outline-none">
          <option value="">Todas las sesiones</option>
          {allSessions.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <select value={filterPlayer} onChange={e => setFilterPlayer(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-[10px] text-zinc-300 focus:outline-none">
          <option value="">Todos los jugadores</option>
          {allPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {(filterFrom || filterTo || filterPlayer || filterSession) && (
          <button onClick={() => { setFilterFrom(""); setFilterTo(""); setFilterPlayer(""); setFilterSession(""); }}
            className="text-[10px] text-zinc-500 hover:text-white transition-colors">✕ limpiar</button>
        )}
      </div>

      {/* Avg + Max cards */}
      <div>
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mb-2">Promedios históricos</p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {METRICS.map(m => {
            const a = avgOf(filtered, m.key);
            const mx = maxOf(filtered, m.key);
            return (
              <div key={m.key} className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-center">
                <p className="text-[9px] text-zinc-500 mb-0.5 leading-tight">{m.label}</p>
                <p className="text-sm font-bold" style={{ color: m.color }}>
                  {a != null ? (m.key === "smax" ? fmtSmax(a) : fmtMetric(a)) : "—"}
                </p>
                {mx != null && (
                  <p className="text-[8px] text-zinc-600 mt-0.5">
                    máx {m.key === "smax" ? fmtSmax(mx) : fmtMetric(mx)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Historical table */}
      <div>
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mb-2">Historial por jugador</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-1.5 px-2 text-zinc-400 font-medium whitespace-nowrap">Fecha</th>
                <th className="text-left py-1.5 px-2 text-zinc-400 font-medium whitespace-nowrap">Sesión</th>
                <th className="text-left py-1.5 px-2 text-zinc-400 font-medium whitespace-nowrap">Jugador</th>
                <th className="text-right py-1.5 px-2 text-zinc-400 font-medium whitespace-nowrap">Dur.</th>
                {METRICS.map(m => (
                  <th key={m.key} className="text-right py-1.5 px-2 font-medium whitespace-nowrap" style={{ color: m.color }}>{m.label}</th>
                ))}
                <th className="text-right py-1.5 px-2 text-zinc-400 font-medium whitespace-nowrap">% Smax</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={i} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                  <td className="py-1.5 px-2 text-zinc-400 whitespace-nowrap">{r.session_date ? moment(r.session_date).format("DD/MM/YY") : "—"}</td>
                  <td className="py-1.5 px-2 text-zinc-300 whitespace-nowrap max-w-[100px] truncate">{r.session_title || "—"}</td>
                  <td className="py-1.5 px-2 text-white font-semibold whitespace-nowrap">{r.player_name || r.player_name_original}</td>
                  <td className="py-1.5 px-2 text-right text-zinc-400 whitespace-nowrap">{r.duration || "—"}</td>
                  {METRICS.map(m => (
                    <td key={m.key} className="py-1.5 px-2 text-right font-bold whitespace-nowrap" style={{ color: m.color }}>
                      {r[m.key] != null ? (m.key === "smax" ? fmtSmax(r[m.key]) : fmtMetric(r[m.key])) : "—"}
                    </td>
                  ))}
                  <td className="py-1.5 px-2 text-right text-zinc-400">{r.max_vel_percent != null ? `${Math.round(r.max_vel_percent)}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { isGoalkeeper } from "@/components/squad/squadConstants";
import { RefreshCw, AlertTriangle, Users, Shield } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import { fmtMetric, fmtSmax } from "@/utils";
import moment from "moment";
import "moment/locale/es";

moment.locale("es");
const MD_ORDER = ["MD-6", "MD-5", "MD-4", "MD-3", "MD-2", "MD-1", "MD", "MD+1", "MD+2", "MD+3", "MD+4", "Otro"];

function fmt(v) { return v != null && v !== 0 ? fmtMetric(v) : (v === 0 ? "0" : "—"); }

function MiniStat({ label, value, color = "text-white", sub }) {
  return (
    <div className="bg-zinc-800/60 rounded-xl p-3 text-center">
      <p className={`text-lg font-bold ${color}`}>{value ?? "—"}</p>
      <p className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{label}</p>
      {sub && <p className="text-[9px] text-zinc-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function semaphoreColor(diffPct) {
  const abs = Math.abs(diffPct);
  if (abs <= 10) return { cls: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30", label: "Dentro de rango normal" };
  if (abs <= 20) return { cls: "text-yellow-400 bg-yellow-500/15 border-yellow-500/30", label: "Atención" };
  return { cls: "text-red-400 bg-red-500/15 border-red-500/30", label: "Fuera de rango" };
}

function isoWeekKey(dateStr) {
  const d = moment(dateStr);
  return `${d.isoWeekYear()}-W${d.isoWeek()}`;
}

export default function TeamGPSProfileSection() {
  const { activeSquadId, activeSquad } = useWorkspace();
  const [profiles, setProfiles] = useState({ campo: null, arqueros: null, total: null });
  const [mdProfiles, setMdProfiles] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [groupView, setGroupView] = useState("campo");

  async function load() {
    if (!activeSquadId) { setLoading(false); return; }
    setLoading(true);
    const [teamProfiles, mds, sessions, players, allGps] = await Promise.all([
      base44.entities.TeamGPSProfile.filter({ squad_id: activeSquadId }, "-created_date", 10),
      base44.entities.TeamGPSMicrocycleProfile.filter({ squad_id: activeSquadId }, "-created_date", 100),
      base44.entities.TrainingSession.filter({ squad_id: activeSquadId }, "-date", 500),
      base44.entities.Player.list("-created_date", 500),
      base44.entities.SessionGPSData.list("-created_date", 5000),
    ]);

    const playerMap = {};
    players.forEach((p) => { playerMap[p.id] = p; });
    const sessionMap = {};
    sessions.forEach((s) => { sessionMap[s.id] = s; });

    const enriched = allGps
      .filter((r) => sessionMap[r.session_id] && r.include_in_session_average !== false)
      .map((r) => {
        const s = sessionMap[r.session_id];
        const player = playerMap[r.player_id];
        return {
          ...r,
          date: s.date,
          md: s.match_day_code || "Otro",
          session_title: s.title,
          player_type: isGoalkeeper(player) ? "arquero" : "jugador_campo",
        };
      })
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    const byType = {};
    teamProfiles.forEach((p) => { byType[p.player_type] = p; });
    setProfiles({ campo: byType.campo || null, arqueros: byType.arqueros || null, total: byType.total || null });
    setMdProfiles(mds);
    setRows(enriched);
    setLoading(false);
  }

  useEffect(() => { load(); }, [activeSquadId]);

  async function recalculate() {
    if (!activeSquadId) return;
    setRecalculating(true);
    await base44.functions.invoke("recalculateTeamGPSProfile", { squad_id: activeSquadId });
    await load();
    setRecalculating(false);
  }

  const groupRows = useMemo(() => {
    if (groupView === "arqueros") return rows.filter((r) => r.player_type === "arquero");
    if (groupView === "total") return rows;
    return rows.filter((r) => r.player_type !== "arquero");
  }, [rows, groupView]);

  const profile = profiles[groupView];
  const mdProfilesGroup = useMemo(() =>
    [...mdProfiles].filter((m) => m.player_type === groupView).sort((a, b) => MD_ORDER.indexOf(a.md) - MD_ORDER.indexOf(b.md)),
    [mdProfiles, groupView]
  );

  // Evolución semanal (últimas 10 semanas con datos)
  const weeklyData = useMemo(() => {
    const weekTotals = {};
    groupRows.forEach((r) => {
      if (!r.date) return;
      const wk = isoWeekKey(r.date);
      if (!weekTotals[wk]) weekTotals[wk] = { distance: [], player_load: [], m_min: [], distance_25: [], sprints: [] };
      weekTotals[wk].distance.push(r.total_distance || 0);
      weekTotals[wk].player_load.push(r.player_load || 0);
      weekTotals[wk].m_min.push(r.m_min || 0);
      weekTotals[wk].distance_25.push(r.distance_25 || 0);
      weekTotals[wk].sprints.push(r.sprints || 0);
    });
    const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    return Object.entries(weekTotals)
      .map(([wk, v]) => ({
        week: wk.split("-W")[1] ? `S${wk.split("-W")[1]}` : wk,
        distance: avg(v.distance), player_load: avg(v.player_load), m_min: avg(v.m_min),
        distance_25: avg(v.distance_25), sprints: avg(v.sprints),
      }))
      .sort((a, b) => a.week.localeCompare(b.week, undefined, { numeric: true }))
      .slice(-10);
  }, [groupRows]);

  // Comparativa: última sesión vs perfil de su MD
  const lastSession = groupRows[0];
  const lastMdProfile = lastSession ? mdProfilesGroup.find((m) => m.md === lastSession.md) : null;
  const sessionSemaphore = useMemo(() => {
    if (!lastSession || !lastMdProfile || !lastMdProfile.avg_total_distance) return null;
    const diffPct = ((lastSession.total_distance - lastMdProfile.avg_total_distance) / lastMdProfile.avg_total_distance) * 100;
    return { diffPct, ...semaphoreColor(diffPct) };
  }, [lastSession, lastMdProfile]);

  // Comparativa: semana actual vs promedio histórico
  const currentWeekKey = isoWeekKey(moment().format("YYYY-MM-DD"));
  const currentWeekRows = groupRows.filter((r) => r.date && isoWeekKey(r.date) === currentWeekKey);
  const currentWeekAvgDistance = currentWeekRows.length
    ? currentWeekRows.reduce((a, r) => a + (r.total_distance || 0), 0) / currentWeekRows.length : null;
  const weekSemaphore = useMemo(() => {
    if (currentWeekAvgDistance == null || !profile?.avg_total_distance) return null;
    const diffPct = ((currentWeekAvgDistance - profile.avg_total_distance) / profile.avg_total_distance) * 100;
    return { diffPct, ...semaphoreColor(diffPct) };
  }, [currentWeekAvgDistance, profile]);

  // Alertas del equipo
  const alerts = useMemo(() => {
    if (!profile) return [];
    const list = [];
    const recent5 = groupRows.slice(0, 5);
    if (weekSemaphore && Math.abs(weekSemaphore.diffPct) > 15) {
      list.push({ label: weekSemaphore.diffPct > 0 ? "Carga semanal por encima del perfil habitual" : "Carga semanal por debajo del perfil habitual", detail: `${weekSemaphore.diffPct > 0 ? "+" : ""}${weekSemaphore.diffPct.toFixed(1)}% vs. perfil histórico` });
    }
    if (recent5.length >= 3 && profile.avg_distance_25 > 0) {
      const recentD25 = recent5.reduce((a, r) => a + (r.distance_25 || 0), 0) / recent5.length;
      if (recentD25 < profile.avg_distance_25 * 0.5) list.push({ label: "Falta de exposición a alta velocidad", detail: "D+25km/h reciente muy por debajo del perfil habitual" });
    }
    if (recent5.length >= 3 && (profile.avg_acc_3 + profile.avg_dec_3) > 0) {
      const recentAccDec = recent5.reduce((a, r) => a + (r.acc_3 || 0) + (r.dec_3 || 0), 0) / recent5.length;
      if (recentAccDec > (profile.avg_acc_3 + profile.avg_dec_3) * 1.3) list.push({ label: "Exceso de aceleraciones/deceleraciones", detail: "Carga neuromuscular reciente por encima del perfil habitual" });
    }
    if (recent5.length >= 3 && profile.avg_sprints > 0) {
      const recentSprints = recent5.reduce((a, r) => a + (r.sprints || 0), 0) / recent5.length;
      if (recentSprints < profile.avg_sprints * 0.5) list.push({ label: "Baja cantidad de sprints", detail: "Sprints recientes muy por debajo del perfil habitual" });
    }
    if (sessionSemaphore && Math.abs(sessionSemaphore.diffPct) > 20) {
      list.push({ label: `Sesión fuera del patrón esperado (${lastSession.md})`, detail: `${sessionSemaphore.diffPct > 0 ? "+" : ""}${sessionSemaphore.diffPct.toFixed(1)}% vs. perfil ${lastSession.md}` });
    }
    return list;
  }, [profile, groupRows, weekSemaphore, sessionSemaphore, lastSession]);

  const comparisonData = useMemo(() => {
    const campo = profiles.campo, gk = profiles.arqueros;
    if (!campo && !gk) return [];
    return [
      { metric: "Distancia", campo: campo?.avg_total_distance || 0, arqueros: gk?.avg_total_distance || 0 },
      { metric: "Player Load", campo: campo?.avg_player_load || 0, arqueros: gk?.avg_player_load || 0 },
      { metric: "Sprints", campo: campo?.avg_sprints || 0, arqueros: gk?.avg_sprints || 0 },
    ];
  }, [profiles]);

  if (!activeSquadId) return <p className="text-zinc-500 text-sm text-center py-10">Seleccioná un plantel activo</p>;
  if (loading) return <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          {[
            { key: "campo", label: "Jugadores de campo", icon: Users },
            { key: "arqueros", label: "Arqueros", icon: Shield },
            { key: "total", label: "Total equipo", icon: Users },
          ].map((opt) => (
            <button key={opt.key} onClick={() => setGroupView(opt.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all ${groupView === opt.key ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"}`}>
              <opt.icon size={12} /> {opt.label}
            </button>
          ))}
        </div>
        <button onClick={recalculate} disabled={recalculating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs hover:bg-zinc-700 transition-colors disabled:opacity-50">
          <RefreshCw size={12} className={recalculating ? "animate-spin" : ""} /> Recalcular perfil GPS del equipo
        </button>
      </div>

      {!profile ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-10 text-center">
          <p className="text-zinc-500 text-sm">Sin perfil GPS del equipo aún para este grupo</p>
        </div>
      ) : (
        <>
          {/* Resumen general */}
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Resumen general — {activeSquad?.name}</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              <MiniStat label="Sesiones analizadas" value={profile.total_sessions} color="text-blue-400" />
              <MiniStat label="Distancia prom." value={fmt(profile.avg_total_distance)} sub="m" />
              <MiniStat label="m/min prom." value={fmt(profile.avg_m_min)} />
              <MiniStat label="Player Load prom." value={fmt(profile.avg_player_load)} color="text-purple-400" />
              <MiniStat label="D >19.8 prom." value={fmt(profile.avg_distance_19_8)} sub="m" />
              <MiniStat label="D >25 prom." value={fmt(profile.avg_distance_25)} sub="m" />
              <MiniStat label="Sprints prom." value={fmt(profile.avg_sprints)} color="text-cyan-400" />
              <MiniStat label="ACC / DEC prom." value={`${fmt(profile.avg_acc_3)} / ${fmt(profile.avg_dec_3)}`} color="text-orange-400 text-sm" />
              <MiniStat label="Smax máxima" value={fmtSmax(profile.max_smax)} color="text-red-400" />
            </div>
          </div>

          {/* Comparativas */}
          <div className="grid sm:grid-cols-2 gap-3">
            {sessionSemaphore && lastSession && (
              <div className={`rounded-xl border p-4 ${sessionSemaphore.cls}`}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1">Última sesión vs perfil ({lastSession.md})</p>
                <p className="text-sm">Hoy: <strong>{fmtMetric(lastSession.total_distance)} m</strong> · Perfil {lastSession.md}: <strong>{fmtMetric(lastMdProfile.avg_total_distance)} m</strong></p>
                <p className="text-xs mt-1">Diferencia: {sessionSemaphore.diffPct > 0 ? "+" : ""}{sessionSemaphore.diffPct.toFixed(1)}% — {sessionSemaphore.label}</p>
              </div>
            )}
            {weekSemaphore && (
              <div className={`rounded-xl border p-4 ${weekSemaphore.cls}`}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1">Semana actual vs promedio histórico</p>
                <p className="text-sm">Esta semana: <strong>{fmtMetric(currentWeekAvgDistance)} m</strong> · Histórico: <strong>{fmtMetric(profile.avg_total_distance)} m</strong></p>
                <p className="text-xs mt-1">Diferencia: {weekSemaphore.diffPct > 0 ? "+" : ""}{weekSemaphore.diffPct.toFixed(1)}% — {weekSemaphore.label}</p>
              </div>
            )}
          </div>

          {/* Alertas */}
          {alerts.length > 0 && (
            <div>
              <p className="text-xs text-amber-400 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
                <AlertTriangle size={12} /> Alertas del equipo
              </p>
              <div className="space-y-2">
                {alerts.map((a, i) => (
                  <div key={i} className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                    <p className="text-sm text-amber-300 font-medium">{a.label}</p>
                    <p className="text-xs text-zinc-500">{a.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Perfil por MD */}
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Perfil por día del microciclo</p>
            {mdProfilesGroup.length === 0 ? (
              <p className="text-zinc-600 text-sm text-center py-4">Sin datos suficientes</p>
            ) : (
              <div className="overflow-x-auto bg-zinc-900 rounded-xl">
                <table className="w-full text-xs min-w-max">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left px-3 py-2 text-zinc-500 font-medium">MD</th>
                      <th className="text-right px-2 py-2 text-zinc-500 font-medium">Sesiones</th>
                      <th className="text-right px-2 py-2 text-zinc-500 font-medium">Distancia</th>
                      <th className="text-right px-2 py-2 text-zinc-500 font-medium">m/min</th>
                      <th className="text-right px-2 py-2 text-zinc-500 font-medium">D&gt;19.8</th>
                      <th className="text-right px-2 py-2 text-zinc-500 font-medium">D&gt;25</th>
                      <th className="text-right px-2 py-2 text-zinc-500 font-medium">Sprints</th>
                      <th className="text-right px-2 py-2 text-zinc-500 font-medium">ACC</th>
                      <th className="text-right px-2 py-2 text-zinc-500 font-medium">DEC</th>
                      <th className="text-right px-2 py-2 text-zinc-500 font-medium">P.Load</th>
                      <th className="text-right px-3 py-2 text-zinc-500 font-medium">Smax</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mdProfilesGroup.map((m) => (
                      <tr key={m.md} className="border-b border-zinc-800/40 last:border-0">
                        <td className="px-3 py-2 text-white font-semibold whitespace-nowrap">{m.md}</td>
                        <td className="px-2 py-2 text-right text-zinc-300">{m.sessions_count}</td>
                        <td className="px-2 py-2 text-right text-white">{fmt(m.avg_total_distance)}</td>
                        <td className="px-2 py-2 text-right text-white">{fmt(m.avg_m_min)}</td>
                        <td className="px-2 py-2 text-right text-white">{fmt(m.avg_distance_19_8)}</td>
                        <td className="px-2 py-2 text-right text-white">{fmt(m.avg_distance_25)}</td>
                        <td className="px-2 py-2 text-right text-white">{fmt(m.avg_sprints)}</td>
                        <td className="px-2 py-2 text-right text-white">{fmt(m.avg_acc_3)}</td>
                        <td className="px-2 py-2 text-right text-white">{fmt(m.avg_dec_3)}</td>
                        <td className="px-2 py-2 text-right text-white">{fmt(m.avg_player_load)}</td>
                        <td className="px-3 py-2 text-right text-white">{fmtSmax(m.max_smax)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Evolución semanal */}
          {weeklyData.length > 1 && (
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Evolución semanal (últimas {weeklyData.length} semanas)</p>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { key: "distance", label: "Distancia (m)", color: "#3b82f6" },
                  { key: "player_load", label: "Player Load", color: "#a855f7" },
                  { key: "m_min", label: "m/min", color: "#10b981" },
                  { key: "distance_25", label: "D >25 (m)", color: "#f97316" },
                  { key: "sprints", label: "Sprints", color: "#06b6d4" },
                ].map((chart) => (
                  <div key={chart.key} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                    <p className="text-[10px] text-zinc-500 mb-1">{chart.label}</p>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={weeklyData} margin={{ top: 14, left: 0, right: 0, bottom: 0 }}>
                        <XAxis dataKey="week" tick={{ fill: "#71717a", fontSize: 9 }} />
                        <YAxis hide />
                        <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }} />
                        <Bar dataKey={chart.key} fill={chart.color} radius={[3, 3, 0, 0]}>
                          <LabelList dataKey={chart.key} position="top" formatter={(v) => fmt(v)} fill="#d4d4d8" fontSize={9} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Campo vs Arqueros */}
          {comparisonData.length > 0 && (profiles.campo || profiles.arqueros) && (
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Jugadores de campo vs. arqueros</p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={comparisonData} margin={{ top: 16, left: 0, right: 0, bottom: 0 }}>
                    <XAxis dataKey="metric" tick={{ fill: "#a1a1aa", fontSize: 10 }} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }} />
                    <Bar dataKey="campo" name="Campo" fill="#3b82f6" radius={[3, 3, 0, 0]}>
                      <LabelList dataKey="campo" position="top" formatter={(v) => fmt(v)} fill="#d4d4d8" fontSize={10} />
                    </Bar>
                    <Bar dataKey="arqueros" name="Arqueros" fill="#f0c800" radius={[3, 3, 0, 0]}>
                      <LabelList dataKey="arqueros" position="top" formatter={(v) => fmt(v)} fill="#d4d4d8" fontSize={10} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
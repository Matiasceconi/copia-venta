import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import moment from "moment";
import "moment/locale/es";
import { RefreshCw, TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { fmtMetric, fmtSmax } from "@/utils";
import { EXCLUSION_REASON_LABELS } from "@/components/performance/externalGpsLoadUtils";

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

function TrendBadge({ trend }) {
  const map = {
    subiendo: { icon: TrendingUp, cls: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30", label: "Carga en aumento" },
    bajando: { icon: TrendingDown, cls: "text-red-400 bg-red-500/15 border-red-500/30", label: "Carga en descenso" },
    estable: { icon: Minus, cls: "text-zinc-300 bg-zinc-700/30 border-zinc-600", label: "Carga estable" },
  };
  const m = map[trend] || map.estable;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${m.cls}`}>
      <Icon size={12} /> {m.label}
    </span>
  );
}

function semaphoreColor(diffPct) {
  const abs = Math.abs(diffPct);
  if (abs <= 10) return { cls: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30", label: "Dentro de rango normal" };
  if (abs <= 20) return { cls: "text-yellow-400 bg-yellow-500/15 border-yellow-500/30", label: "Atención" };
  return { cls: "text-red-400 bg-red-500/15 border-red-500/30", label: "Fuera de rango" };
}

export default function PlayerGPSProfileTab({ playerId }) {
  const [profile, setProfile] = useState(null);
  const [competitionProfile, setCompetitionProfile] = useState(null);
  const [mdProfiles, setMdProfiles] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [recalculatingCompetition, setRecalculatingCompetition] = useState(false);

  async function load() {
    setLoading(true);
    const [profiles, competitionProfiles, mds, gpsRows, sessions] = await Promise.all([
      base44.entities.PlayerGPSProfile.filter({ player_id: playerId }, "-created_date", 1),
      base44.entities.PlayerCompetitionProfile.filter({ player_id: playerId }, "-created_date", 1),
      base44.entities.PlayerGPSMicrocycleProfile.filter({ player_id: playerId }, "-created_date", 20),
      base44.entities.SessionGPSData.filter({ player_id: playerId }, "-created_date", 300),
      base44.entities.TrainingSession.list("-date", 1000),
    ]);
    setCompetitionProfile(competitionProfiles[0] || null);
    const sessionMap = {};
    sessions.forEach((s) => { sessionMap[s.id] = s; });
    const enriched = gpsRows
      .map((r) => {
        const s = sessionMap[r.session_id];
        if (!s) return null;
        return { ...r, date: s.date, md: s.match_day_code || "Otro", session_title: s.title };
      })
      .filter(Boolean)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    setProfile(profiles[0] || null);
    setMdProfiles(mds);
    setRows(enriched);
    setLoading(false);
  }

  useEffect(() => { if (playerId) load(); }, [playerId]);

  async function recalculate() {
    setRecalculating(true);
    await base44.functions.invoke("recalculatePlayerGPSProfiles", { player_ids: [playerId] });
    await load();
    setRecalculating(false);
  }

  async function recalculateCompetition() {
    setRecalculatingCompetition(true);
    await base44.functions.invoke("recalculatePlayerCompetitionProfile", { player_ids: [playerId] });
    await load();
    setRecalculatingCompetition(false);
  }

  const normalRows = useMemo(() => rows.filter((r) => r.include_in_session_average !== false), [rows]);
  const specialRows = useMemo(() => rows.filter((r) => r.include_in_session_average === false), [rows]);

  const evolutionData = useMemo(() => {
    return [...normalRows].reverse().slice(-15).map((r) => ({
      label: moment(r.date).format("DD/MM"),
      total_distance: r.total_distance || 0,
      player_load: r.player_load || 0,
      m_min: r.m_min || 0,
      smax: r.smax || 0,
    }));
  }, [normalRows]);

  const mdProfilesSorted = useMemo(() => {
    return [...mdProfiles].sort((a, b) => MD_ORDER.indexOf(a.md) - MD_ORDER.indexOf(b.md));
  }, [mdProfiles]);

  // Semáforo: última sesión normal vs promedio de su MD
  const lastSession = normalRows[0];
  const lastMdProfile = lastSession ? mdProfiles.find((m) => m.md === lastSession.md) : null;
  const semaphore = useMemo(() => {
    if (!lastSession || !lastMdProfile || !lastMdProfile.avg_total_distance) return null;
    const diffPct = ((lastSession.total_distance - lastMdProfile.avg_total_distance) / lastMdProfile.avg_total_distance) * 100;
    return { diffPct, ...semaphoreColor(diffPct) };
  }, [lastSession, lastMdProfile]);

  // Semáforo: última sesión de entrenamiento vs perfil competitivo (promedio de partidos +80')
  const competitionSemaphore = useMemo(() => {
    if (!lastSession || !competitionProfile || !competitionProfile.avg_total_distance) return null;
    const diffPct = ((lastSession.total_distance - competitionProfile.avg_total_distance) / competitionProfile.avg_total_distance) * 100;
    return { diffPct, ...semaphoreColor(diffPct) };
  }, [lastSession, competitionProfile]);

  // Alertas simples basadas en perfil + últimas sesiones normales
  const alerts = useMemo(() => {
    if (!profile) return [];
    const list = [];
    const recent5 = normalRows.slice(0, 5);
    if (profile.weekly_avg > 0) {
      if (profile.load_7d > profile.weekly_avg * 1.2) list.push({ label: "Carga alta esta semana", detail: `${fmtMetric(profile.load_7d)} m vs. promedio ${fmtMetric(profile.weekly_avg)} m` });
      if (profile.load_7d < profile.weekly_avg * 0.8) list.push({ label: "Carga baja esta semana", detail: `${fmtMetric(profile.load_7d)} m vs. promedio ${fmtMetric(profile.weekly_avg)} m` });
    }
    if (profile.trend === "subiendo" && profile.load_7d > profile.load_14d - profile.load_7d) {
      list.push({ label: "Incremento brusco de carga", detail: "La carga semanal subió más de 10% respecto a la semana previa" });
    }
    if (recent5.length >= 3 && profile.avg_distance_25 > 0) {
      const recentD25 = recent5.reduce((a, r) => a + (r.distance_25 || 0), 0) / recent5.length;
      if (recentD25 < profile.avg_distance_25 * 0.5) list.push({ label: "Baja exposición a velocidad", detail: "D+25km/h reciente muy por debajo de su promedio" });
    }
    if (recent5.length >= 3 && (profile.avg_acc_3 + profile.avg_dec_3) > 0) {
      const recentAccDec = recent5.reduce((a, r) => a + (r.acc_3 || 0) + (r.dec_3 || 0), 0) / recent5.length;
      if (recentAccDec > (profile.avg_acc_3 + profile.avg_dec_3) * 1.3) list.push({ label: "Exceso de aceleraciones/deceleraciones", detail: "Carga neuromuscular reciente por encima de lo habitual" });
    }
    if (recent5.length >= 3 && profile.avg_sprints > 0) {
      const recentSprints = recent5.reduce((a, r) => a + (r.sprints || 0), 0) / recent5.length;
      if (recentSprints < profile.avg_sprints * 0.5) list.push({ label: "Poco estímulo de sprint", detail: "Sprints recientes muy por debajo de su promedio" });
    }
    return list;
  }, [profile, normalRows]);

  if (loading) return (
    <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin" /></div>
  );

  if (!profile) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-zinc-500 text-sm">Sin perfil de carga externa aún</p>
        <button onClick={recalculate} disabled={recalculating}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs hover:bg-zinc-700 transition-colors disabled:opacity-50">
          <RefreshCw size={12} className={recalculating ? "animate-spin" : ""} /> Recalcular perfiles GPS
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <TrendBadge trend={profile.trend} />
        <button onClick={recalculate} disabled={recalculating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs hover:bg-zinc-700 transition-colors disabled:opacity-50">
          <RefreshCw size={12} className={recalculating ? "animate-spin" : ""} /> Recalcular perfiles GPS
        </button>
      </div>

      {/* Resumen */}
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Resumen general</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <MiniStat label="Sesiones GPS" value={profile.total_sessions} color="text-blue-400" />
          <MiniStat label="Distancia prom." value={fmt(profile.avg_total_distance)} color="text-white text-sm" sub="m" />
          <MiniStat label="Player Load prom." value={fmt(profile.avg_player_load)} color="text-purple-400 text-sm" />
          <MiniStat label="Smax máxima" value={fmtSmax(profile.max_smax)} color="text-red-400 text-sm" />
          <MiniStat label="Carga últ. 7 días" value={fmt(profile.load_7d)} color="text-emerald-400 text-sm" sub="m" />
          <MiniStat label="Carga últ. 28 días" value={fmt(profile.load_28d)} color="text-cyan-400 text-sm" sub="m" />
        </div>
      </div>

      {/* Semáforo control individual */}
      {semaphore && lastSession && (
        <div className={`rounded-xl border p-4 ${semaphore.cls}`}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1">Control individual — última sesión ({lastSession.md})</p>
          <p className="text-sm">
            Hoy: <strong>{fmtMetric(lastSession.total_distance)} m</strong> · Promedio {lastSession.md}: <strong>{fmtMetric(lastMdProfile.avg_total_distance)} m</strong>
          </p>
          <p className="text-xs mt-1">Diferencia: {semaphore.diffPct > 0 ? "+" : ""}{semaphore.diffPct.toFixed(1)}% — {semaphore.label}</p>
        </div>
      )}

      {/* Perfil competitivo */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Perfil competitivo (partidos +80')</p>
          <button onClick={recalculateCompetition} disabled={recalculatingCompetition}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-[11px] hover:bg-zinc-700 transition-colors disabled:opacity-50">
            <RefreshCw size={11} className={recalculatingCompetition ? "animate-spin" : ""} /> Recalcular perfil competitivo
          </button>
        </div>
        {!competitionProfile ? (
          <p className="text-zinc-600 text-sm text-center py-4 bg-zinc-900 rounded-xl">Sin perfil competitivo aún (requiere partidos con +80' jugados y GPS cargado)</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <MiniStat label="Partidos usados" value={competitionProfile.matches_used} color="text-blue-400" />
              <MiniStat label="Distancia prom." value={fmt(competitionProfile.avg_total_distance)} color="text-white text-sm" sub="m" />
              <MiniStat label="m/min prom." value={fmt(competitionProfile.avg_m_min)} color="text-white text-sm" />
              <MiniStat label="Player Load prom." value={fmt(competitionProfile.avg_player_load)} color="text-purple-400 text-sm" />
              <MiniStat label="Sprints prom." value={fmt(competitionProfile.avg_sprints)} color="text-cyan-400 text-sm" />
              <MiniStat label="Smax prom." value={fmtSmax(competitionProfile.avg_smax)} color="text-red-400 text-sm" />
            </div>
            {competitionSemaphore && lastSession && (
              <div className={`rounded-xl border p-4 ${competitionSemaphore.cls}`}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1">Última sesión vs. perfil competitivo</p>
                <p className="text-sm">
                  Última sesión: <strong>{fmtMetric(lastSession.total_distance)} m</strong> · Promedio en partidos: <strong>{fmtMetric(competitionProfile.avg_total_distance)} m</strong>
                </p>
                <p className="text-xs mt-1">Diferencia: {competitionSemaphore.diffPct > 0 ? "+" : ""}{competitionSemaphore.diffPct.toFixed(1)}% — {competitionSemaphore.label}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Alertas */}
      {alerts.length > 0 && (
        <div>
          <p className="text-xs text-amber-400 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
            <AlertTriangle size={12} /> Alertas de carga
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

      {/* Por microciclo */}
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Perfil por día del microciclo</p>
        {mdProfilesSorted.length === 0 ? (
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
                {mdProfilesSorted.map((m) => (
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

      {/* Evolución */}
      {evolutionData.length > 1 && (
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Evolución (últimas {evolutionData.length} sesiones)</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { key: "total_distance", label: "Distancia (m)", color: "#3b82f6" },
              { key: "player_load", label: "Player Load", color: "#a855f7" },
              { key: "m_min", label: "m/min", color: "#10b981" },
              { key: "smax", label: "Smax (km/h)", color: "#ef4444" },
            ].map((chart) => (
              <div key={chart.key} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                <p className="text-[10px] text-zinc-500 mb-1">{chart.label}</p>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={evolutionData}>
                    <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 9 }} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }} />
                    <Line type="monotone" dataKey={chart.key} stroke={chart.color} strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial de sesiones */}
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Historial de sesiones (carga normal)</p>
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {normalRows.slice(0, 30).map((r) => (
            <div key={r.id} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 gap-3">
              <div className="min-w-0">
                <p className="text-sm text-white truncate">{r.session_title}</p>
                <p className="text-xs text-zinc-500">{moment(r.date).format("DD/MM/YYYY")} · {r.md}</p>
              </div>
              <div className="text-right shrink-0 text-xs text-zinc-400">
                <p>{fmtMetric(r.total_distance)} m</p>
                <p>{fmtMetric(r.player_load)} PL</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Excluidos / carga especial */}
      {specialRows.length > 0 && (
        <div>
          <p className="text-xs text-amber-400 uppercase tracking-wider font-semibold mb-2">Carga especial (no afecta el promedio)</p>
          <div className="space-y-1.5">
            {specialRows.slice(0, 20).map((r) => (
              <div key={r.id} className="flex items-center justify-between bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2 gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{r.session_title}</p>
                  <p className="text-xs text-zinc-500">{moment(r.date).format("DD/MM/YYYY")} · {r.md}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-amber-300">{EXCLUSION_REASON_LABELS[r.exclusion_reason] || r.exclusion_reason || "—"}</p>
                  <p className="text-xs text-zinc-500">{fmtMetric(r.total_distance)} m</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
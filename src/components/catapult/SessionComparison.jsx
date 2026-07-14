import React, { useState, useMemo } from "react";
import moment from "moment";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";

const METRICS = [
  { key: "total_distance",   label: "Distancia",      short: "Dist.",      color_a: "#60a5fa", color_b: "#f87171" },
  { key: "distance_hsr",     label: "19.8-25 km/h",   short: "HSR",        color_a: "#60a5fa", color_b: "#f87171" },
  { key: "sprint_distance",  label: "+25 km/h",        short: "Sprint",     color_a: "#60a5fa", color_b: "#f87171" },
  { key: "player_load",      label: "Player Load",     short: "PL",         color_a: "#60a5fa", color_b: "#f87171" },
  { key: "max_velocity",     label: "Vel. Máx",        short: "V.Máx",      color_a: "#60a5fa", color_b: "#f87171" },
  { key: "accelerations",    label: "Acel.",           short: "Acel.",      color_a: "#60a5fa", color_b: "#f87171" },
  { key: "decelerations",    label: "Decel.",          short: "Decel.",     color_a: "#60a5fa", color_b: "#f87171" },
  { key: "meters_per_minute",label: "m/min",           short: "m/min",      color_a: "#60a5fa", color_b: "#f87171" },
];

const NO_DECIMALS = new Set(["total_distance", "distance_hsr", "sprint_distance", "accelerations", "decelerations"]);

function fmt(key, v) {
  if (v == null || v === "") return "—";
  const n = parseFloat(v);
  if (isNaN(n)) return "—";
  return NO_DECIMALS.has(key) ? Math.round(n).toString() : n.toFixed(1);
}

function teamAvg(rows, key) {
  const vals = rows.map((r) => parseFloat(r[key])).filter((v) => !isNaN(v));
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// Normalize 0-100 relative to max across both sessions for radar
function normalize(valA, valB) {
  const max = Math.max(valA || 0, valB || 0);
  if (!max) return [0, 0];
  return [(valA / max) * 100, (valB / max) * 100];
}

function DeltaBadge({ a, b, metricKey }) {
  if (a == null || b == null) return <span className="text-zinc-600 text-xs">—</span>;
  const diff = a - b;
  const pct = b !== 0 ? ((diff / b) * 100).toFixed(1) : null;
  const up = diff > 0;
  const zero = Math.abs(diff) < 0.01;
  if (zero) return <span className="text-zinc-500 text-xs">= igual</span>;
  return (
    <span className={`text-xs font-semibold ${up ? "text-green-400" : "text-red-400"}`}>
      {up ? "▲" : "▼"} {fmt(metricKey, Math.abs(diff))}{pct != null ? ` (${up ? "+" : ""}${pct}%)` : ""}
    </span>
  );
}

export default function SessionComparison({ reports, sessions }) {
  // Get unique session ids that have reports
  const sessionIds = useMemo(
    () => [...new Set(reports.map((r) => r.session_id).filter(Boolean))],
    [reports]
  );

  // Map session id → session info
  const sessionMap = useMemo(() => {
    const m = {};
    sessions.forEach((s) => { m[s.id] = s; });
    return m;
  }, [sessions]);

  const sessionOptions = sessionIds
    .map((id) => ({ id, session: sessionMap[id] }))
    .filter((x) => x.session)
    .sort((a, b) => b.session.date.localeCompare(a.session.date));

  const [sessionA, setSessionA] = useState(sessionOptions[0]?.id || "");
  const [sessionB, setSessionB] = useState(sessionOptions[1]?.id || "");

  const reportsA = useMemo(() => reports.filter((r) => r.session_id === sessionA), [reports, sessionA]);
  const reportsB = useMemo(() => reports.filter((r) => r.session_id === sessionB), [reports, sessionB]);

  const avgA = useMemo(() => Object.fromEntries(METRICS.map((m) => [m.key, teamAvg(reportsA, m.key)])), [reportsA]);
  const avgB = useMemo(() => Object.fromEntries(METRICS.map((m) => [m.key, teamAvg(reportsB, m.key)])), [reportsB]);

  const radarData = useMemo(() => METRICS.map((m) => {
    const [nA, nB] = normalize(avgA[m.key], avgB[m.key]);
    return { metric: m.short, A: parseFloat(nA.toFixed(1)), B: parseFloat(nB.toFixed(1)) };
  }), [avgA, avgB]);

  const infoA = sessionMap[sessionA];
  const infoB = sessionMap[sessionB];

  if (sessionOptions.length < 2) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
        <p className="text-zinc-500 text-sm">Necesitás al menos 2 sesiones con datos GPS para comparar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Session selectors */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Sesión A", color: "#60a5fa", value: sessionA, set: setSessionA, info: infoA, avg: avgA, reports: reportsA },
          { label: "Sesión B", color: "#f87171", value: sessionB, set: setSessionB, info: infoB, avg: avgB, reports: reportsB },
        ].map(({ label, color, value, set, info, avg, reports: reps }) => (
          <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full inline-block" style={{ background: color }} />
              <span className="text-white font-semibold text-sm">{label}</span>
            </div>
            <select
              value={value}
              onChange={(e) => set(e.target.value)}
              className="w-full bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:outline-none focus:border-zinc-500"
            >
              {sessionOptions.map(({ id, session: s }) => (
                <option key={id} value={id}>
                  {moment(s.date).format("DD/MM/YY")} — {s.title}
                </option>
              ))}
            </select>
            {info && (
              <div className="text-xs text-zinc-500 space-y-0.5">
                <p>{moment(info.date).format("DD [de] MMMM YYYY")}{info.match_day_code ? ` · ${info.match_day_code}` : ""}</p>
                <p>{reps.length} jugadores · {info.session_type || "Entrenamiento"}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Radar chart */}
      {reportsA.length > 0 && reportsB.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-1">Comparación global (promedio equipo)</h3>
          <p className="text-zinc-500 text-xs mb-4">Valores normalizados — el mayor de cada métrica = 100</p>
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#27272a" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, color: "#fff", fontSize: 12 }}
                formatter={(v, name) => [`${v}`, name === "A" ? infoA?.title : infoB?.title]}
              />
              <Legend formatter={(v) => v === "A" ? infoA?.title : infoB?.title} />
              <Radar name="A" dataKey="A" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.25} strokeWidth={2} />
              <Radar name="B" dataKey="B" stroke="#f87171" fill="#f87171" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Metric-by-metric comparison table */}
      {reportsA.length > 0 && reportsB.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800 grid grid-cols-4 text-xs font-semibold text-zinc-400">
            <span>Métrica</span>
            <span className="text-center flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> {infoA?.title || "Sesión A"}
            </span>
            <span className="text-center flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> {infoB?.title || "Sesión B"}
            </span>
            <span className="text-center">Diferencia (A vs B)</span>
          </div>
          {METRICS.map((m) => {
            const a = avgA[m.key];
            const b = avgB[m.key];
            return (
              <div key={m.key} className="grid grid-cols-4 border-b border-zinc-800/60 hover:bg-zinc-800/20 transition-colors px-4 py-3 items-center">
                <span className="text-zinc-300 text-xs font-medium">{m.label}</span>
                <span className="text-center text-white text-sm font-bold">{fmt(m.key, a)}</span>
                <span className="text-center text-white text-sm font-bold">{fmt(m.key, b)}</span>
                <span className="text-center"><DeltaBadge a={a} b={b} metricKey={m.key} /></span>
              </div>
            );
          })}
          <div className="p-3 text-center text-zinc-600 text-xs">Promedios del equipo por sesión</div>
        </div>
      )}

      {/* Per-player comparison */}
      {reportsA.length > 0 && reportsB.length > 0 && (() => {
        const playersA = new Set(reportsA.map((r) => r.player_name));
        const playersB = new Set(reportsB.map((r) => r.player_name));
        const common = [...playersA].filter((p) => playersB.has(p)).sort();
        if (!common.length) return null;
        return (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800">
              <h3 className="text-sm font-semibold text-white">Comparación individual ({common.length} jugadores en ambas sesiones)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-800 text-zinc-400">
                    <th className="px-3 py-2.5 text-left whitespace-nowrap border-b border-zinc-700 sticky left-0 bg-zinc-800 z-10">Jugador</th>
                    {METRICS.slice(0, 6).map((m) => (
                      <th key={m.key} className="px-3 py-2.5 text-center whitespace-nowrap border-b border-zinc-700" colSpan={2}>
                        {m.short}
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-zinc-800/50 text-zinc-500">
                    <th className="px-3 py-1.5 text-left sticky left-0 bg-zinc-800/50 z-10 border-b border-zinc-700">—</th>
                    {METRICS.slice(0, 6).map((m) => (
                      <React.Fragment key={m.key}>
                        <th className="px-2 py-1.5 text-center border-b border-zinc-700 text-blue-400">A</th>
                        <th className="px-2 py-1.5 text-center border-b border-zinc-700 text-red-400">B</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {common.map((player) => {
                    const rA = reportsA.find((r) => r.player_name === player);
                    const rB = reportsB.find((r) => r.player_name === player);
                    return (
                      <tr key={player} className="border-b border-zinc-800/60 hover:bg-zinc-800/20 transition-colors">
                        <td className="px-3 py-2.5 font-medium text-white whitespace-nowrap sticky left-0 bg-zinc-900 z-10">{player}</td>
                        {METRICS.slice(0, 6).map((m) => {
                          const va = rA?.[m.key];
                          const vb = rB?.[m.key];
                          const aHigher = va != null && vb != null && va > vb;
                          const bHigher = va != null && vb != null && vb > va;
                          return (
                            <React.Fragment key={m.key}>
                              <td className={`px-2 py-2.5 text-center font-semibold whitespace-nowrap ${aHigher ? "text-blue-300" : "text-zinc-300"}`}>
                                {fmt(m.key, va)}
                              </td>
                              <td className={`px-2 py-2.5 text-center font-semibold whitespace-nowrap ${bHigher ? "text-red-300" : "text-zinc-300"}`}>
                                {fmt(m.key, vb)}
                              </td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
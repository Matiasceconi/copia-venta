import React, { useMemo, useState } from "react";
import { Clock, Users, Activity } from "lucide-react";
import moment from "moment";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";

const METRICS = [
  { key: "total_distance",   label: "Distancia (m)",      color: "#60a5fa", fmt: (v) => Math.round(v) },
  { key: "distance_hsr",    label: "19.8-25 km/h (m)",   color: "#34d399", fmt: (v) => Math.round(v) },
  { key: "sprint_distance", label: "+25 km/h (m)",        color: "#fbbf24", fmt: (v) => Math.round(v) },
  { key: "player_load",     label: "Player Load",         color: "#a78bfa", fmt: (v) => parseFloat(v).toFixed(0) },
  { key: "max_velocity",    label: "Vel. Máx (km/h)",    color: "#f87171", fmt: (v) => parseFloat(v).toFixed(1) },
  { key: "accelerations",   label: "Aceleraciones",       color: "#fb923c", fmt: (v) => Math.round(v) },
  { key: "decelerations",   label: "Desaceleraciones",    color: "#e879f9", fmt: (v) => Math.round(v) },
  { key: "sprint_efforts",  label: "Sprint Efforts",      color: "#2dd4bf", fmt: (v) => Math.round(v) },
];

function avg(arr) {
  const v = arr.filter((x) => x != null && !isNaN(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

// Semáforo: rojo >90% del promedio, amarillo 60-90%, verde <60%
function getTrafficLight(value, teamAvg) {
  if (value == null || teamAvg == null || teamAvg === 0) return null;
  const pct = (value / teamAvg) * 100;
  if (pct > 90) return { color: "#ef4444", label: "Alto", bg: "bg-red-500/20 border-red-500/40", dot: "bg-red-500" };
  if (pct >= 60) return { color: "#f59e0b", label: "Medio", bg: "bg-yellow-500/20 border-yellow-500/40", dot: "bg-yellow-500" };
  return { color: "#22c55e", label: "Bajo", bg: "bg-green-500/20 border-green-500/40", dot: "bg-green-500" };
}

const CustomTooltip = ({ active, payload, label, metric, teamAvg }) => {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  const light = getTrafficLight(val, teamAvg);
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-zinc-300 font-semibold mb-1">{label}</p>
      <p style={{ color: metric.color }} className="font-bold">{metric.fmt(val)} {metric.label}</p>
      {light && (
        <p className="mt-1 flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full inline-block ${light.dot}`} />
          <span className="text-zinc-400">{((val / teamAvg) * 100).toFixed(0)}% del promedio</span>
        </p>
      )}
    </div>
  );
};

export default function LastSessionDashboard({ session, rows }) {
  const [activeMetric, setActiveMetric] = useState("total_distance");

  const metric = METRICS.find((m) => m.key === activeMetric);

  // Promedio del equipo por métrica
  const teamAvgs = useMemo(() => {
    const out = {};
    METRICS.forEach(({ key }) => { out[key] = avg(rows.map((r) => r[key])); });
    return out;
  }, [rows]);

  // Datos por jugador (un registro por jugador en la sesión)
  const playerData = useMemo(() => {
    const byPlayer = {};
    rows.forEach((r) => {
      if (!r.player_name) return;
      if (!byPlayer[r.player_name]) byPlayer[r.player_name] = [];
      byPlayer[r.player_name].push(r);
    });
    return Object.entries(byPlayer).map(([name, prows]) => {
      const out = { player_name: name, shortName: name.split(" ").slice(-1)[0] };
      METRICS.forEach(({ key }) => { out[key] = avg(prows.map((r) => r[key])); });
      return out;
    });
  }, [rows]);

  // Datos del gráfico activo, ordenados desc
  const chartData = useMemo(() =>
    playerData
      .filter((p) => p[activeMetric] != null)
      .sort((a, b) => (b[activeMetric] || 0) - (a[activeMetric] || 0))
      .map((p) => ({ ...p, value: p[activeMetric] })),
    [playerData, activeMetric]
  );

  // Tabla: todos los jugadores ordenados por distancia desc
  const tableData = useMemo(() =>
    [...playerData].sort((a, b) => (b.total_distance || 0) - (a.total_distance || 0)),
    [playerData]
  );

  if (!session || !rows || rows.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
        <p className="text-zinc-500 text-sm">Sin datos de sesión para mostrar.</p>
      </div>
    );
  }

  const teamAvg = teamAvgs[activeMetric];

  return (
    <div className="space-y-5">
      {/* Header de la sesión */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">{session.title}</h2>
            <div className="flex items-center gap-3 text-zinc-400 text-sm flex-wrap">
              <div className="flex items-center gap-1.5">
                <Clock size={13} />
                <span>{moment(session.date).format("dddd DD [de] MMMM YYYY")}</span>
              </div>
              {session.match_day_code && (
                <span className="px-2.5 py-0.5 bg-blue-900/50 text-blue-300 rounded-full text-xs font-semibold border border-blue-800/60">
                  {session.match_day_code}
                </span>
              )}
              {session.session_type && (
                <span className="px-2.5 py-0.5 bg-zinc-800 text-zinc-300 rounded-full text-xs border border-zinc-700">
                  {session.session_type}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 bg-zinc-800/60 rounded-lg px-4 py-2 border border-zinc-700/50">
            <Users size={15} className="text-zinc-400" />
            <div>
              <p className="text-white font-bold text-lg leading-tight">{new Set(rows.map((r) => r.player_name)).size}</p>
              <p className="text-zinc-500 text-xs">jugadores</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs promedio equipo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {METRICS.filter(({ key }) => teamAvgs[key] != null).slice(0, 4).map(({ key, label, color, fmt }) => (
          <div key={key} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 text-center">
            <p className="text-zinc-500 text-xs mb-1">{label}</p>
            <p className="font-bold text-xl" style={{ color }}>{fmt(teamAvgs[key])}</p>
            <p className="text-zinc-600 text-[10px] mt-0.5">prom. equipo</p>
          </div>
        ))}
      </div>

      {/* Leyenda semáforo */}
      <div className="flex flex-wrap gap-3 items-center px-1">
        <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Semáforo de carga:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
          <span className="text-xs text-zinc-400">&gt;90% del promedio — <span className="text-red-400 font-semibold">Alto</span></span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" />
          <span className="text-xs text-zinc-400">60–90% — <span className="text-yellow-400 font-semibold">Medio</span></span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
          <span className="text-xs text-zinc-400">&lt;60% — <span className="text-green-400 font-semibold">Bajo</span></span>
        </div>
      </div>

      {/* Selector de métrica */}
      <div className="flex flex-wrap gap-1.5">
        {METRICS.map(({ key, label, color }) => (
          <button key={key} onClick={() => setActiveMetric(key)}
            className="text-xs px-3 py-1.5 rounded-full border font-medium transition-all"
            style={activeMetric === key
              ? { backgroundColor: color, color: "#18181b", borderColor: color }
              : { backgroundColor: "transparent", color: "#71717a", borderColor: "#3f3f46" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Gráfico de barras con semáforo */}
      {chartData.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity size={14} style={{ color: metric?.color }} />
              {metric?.label} — por jugador
            </p>
            {teamAvg != null && (
              <span className="text-xs text-zinc-400">
                Promedio equipo: <span className="font-bold" style={{ color: metric?.color }}>{metric?.fmt(teamAvg)}</span>
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 34)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 60, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="shortName" width={90} tick={{ fontSize: 10, fill: "#d4d4d8" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip metric={metric} teamAvg={teamAvg} />} />
              {teamAvg != null && (
                <ReferenceLine x={teamAvg} stroke={metric?.color} strokeDasharray="4 4" strokeOpacity={0.7}
                  label={{ value: "prom", position: "top", fill: metric?.color, fontSize: 10 }} />
              )}
              <Bar dataKey="value" radius={[0, 4, 4, 0]}
                label={{ position: "right", fontSize: 10, fill: "#a1a1aa", formatter: (v) => metric?.fmt(v) }}>
                {chartData.map((entry, i) => {
                  const light = getTrafficLight(entry.value, teamAvg);
                  return <Cell key={i} fill={light ? light.color : metric?.color} fillOpacity={0.85} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabla completa con semáforo */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-zinc-800/80">
              <th className="px-3 py-2.5 text-left text-zinc-400 font-semibold whitespace-nowrap sticky left-0 bg-zinc-800/80">Jugador</th>
              {METRICS.filter(({ key }) => tableData.some((r) => r[key] != null)).map(({ key, label }) => (
                <th key={key} className="px-3 py-2.5 text-right text-zinc-400 font-semibold whitespace-nowrap">{label}</th>
              ))}
            </tr>
            {/* Fila de promedios */}
            <tr className="bg-zinc-800/40 border-t border-zinc-700/50">
              <td className="px-3 py-2 text-zinc-500 font-bold whitespace-nowrap sticky left-0 bg-zinc-800/40 text-[10px] uppercase tracking-wider">Prom. Equipo</td>
              {METRICS.filter(({ key }) => tableData.some((r) => r[key] != null)).map(({ key, fmt, color }) => (
                <td key={key} className="px-3 py-2 text-right whitespace-nowrap font-mono font-bold text-[11px]" style={{ color }}>
                  {teamAvgs[key] != null ? fmt(teamAvgs[key]) : "—"}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? "bg-zinc-900" : "bg-zinc-800/20"}>
                <td className="px-3 py-2 text-zinc-200 font-medium whitespace-nowrap sticky left-0 bg-inherit">
                  {row.player_name}
                </td>
                {METRICS.filter(({ key }) => tableData.some((r) => r[key] != null)).map(({ key, fmt }) => {
                  const val = row[key];
                  const light = getTrafficLight(val, teamAvgs[key]);
                  return (
                    <td key={key} className="px-3 py-2 text-right whitespace-nowrap">
                      {val != null ? (
                        <span className={`inline-flex items-center gap-1.5 justify-end font-mono font-semibold text-xs px-2 py-0.5 rounded-md border ${light?.bg || ""}`}
                          style={{ color: light?.color || "#a1a1aa" }}>
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${light?.dot || "bg-zinc-500"}`} />
                          {fmt(val)}
                        </span>
                      ) : (
                        <span className="text-zinc-700">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-zinc-600 text-xs text-center">{rows.length} registros · {tableData.length} jugadores</p>
    </div>
  );
}
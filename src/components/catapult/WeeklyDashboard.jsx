import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Cell, ReferenceLine, Legend
} from "recharts";
import { Calendar, TrendingUp, Users, Zap, Activity } from "lucide-react";
import moment from "moment";
import "moment/locale/es";
moment.locale("es");

const METRICS = [
  { key: "total_distance",   label: "Distancia (m)",      color: "#60a5fa", fmt: v => Math.round(v) },
  { key: "player_load",      label: "Player Load",         color: "#a78bfa", fmt: v => Math.round(v) },
  { key: "distance_hsr",     label: "19.8-25 km/h (m)",   color: "#34d399", fmt: v => Math.round(v) },
  { key: "sprint_distance",  label: "+25 km/h (m)",        color: "#fbbf24", fmt: v => Math.round(v) },
  { key: "accelerations",    label: "Aceleraciones",       color: "#fb923c", fmt: v => Math.round(v) },
  { key: "decelerations",    label: "Desaceleraciones",    color: "#e879f9", fmt: v => Math.round(v) },
  { key: "max_velocity",     label: "Vel. Máx (km/h)",    color: "#f87171", fmt: v => v.toFixed(1) },
  { key: "sprint_efforts",   label: "Sprint Efforts",      color: "#2dd4bf", fmt: v => Math.round(v) },
];

const PLAYER_COLORS = ["#60a5fa","#34d399","#fbbf24","#a78bfa","#f87171","#fb923c","#e879f9","#2dd4bf","#94a3b8","#f472b6","#4ade80","#facc15"];

function avg(arr) {
  const v = arr.filter(x => x != null && !isNaN(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

// KPI card compacto
function KpiCard({ label, value, sub, color }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
      <p className="text-zinc-500 text-xs uppercase tracking-wider">{label}</p>
      <p className="font-bold text-2xl mt-1" style={{ color }}>{value}</p>
      {sub && <p className="text-zinc-600 text-[10px] mt-0.5">{sub}</p>}
    </div>
  );
}

export default function WeeklyDashboard({ reports: propReports, sessions: propSessions }) {
  const [sessions, setSessions] = useState(propSessions || []);
  const [reports, setReports] = useState(propReports || []);
  const [loading, setLoading] = useState(!propSessions);

  // Rango de fechas — por defecto semana actual
  const todayStr = moment().format("YYYY-MM-DD");
  const weekStartStr = moment().startOf("isoWeek").format("YYYY-MM-DD");
  const [dateFrom, setDateFrom] = useState(weekStartStr);
  const [dateTo, setDateTo]     = useState(todayStr);

  const [activeMetric, setActiveMetric] = useState("player_load");
  const [viewMode, setViewMode] = useState("team"); // "team" | "individual"

  useEffect(() => {
    if (propSessions) return; // ya recibimos los datos del padre
    Promise.all([
      base44.entities.TrainingSession.list("-date", 200),
      base44.entities.CatapultReport.list("-date", 500),
    ]).then(([s, r]) => {
      setSessions(s);
      setReports(r);
    }).finally(() => setLoading(false));
  }, []);

  // Sesiones dentro del rango
  const weekSessions = useMemo(() =>
    sessions.filter(s => s.date >= dateFrom && s.date <= dateTo)
      .sort((a, b) => a.date.localeCompare(b.date)),
    [sessions, dateFrom, dateTo]
  );

  const weekSessionIds = useMemo(() => new Set(weekSessions.map(s => s.id)), [weekSessions]);

  // Reportes del rango
  const weekReports = useMemo(() =>
    reports.filter(r => weekSessionIds.has(r.session_id)),
    [reports, weekSessionIds]
  );

  // Jugadores únicos en el rango
  const players = useMemo(() =>
    [...new Set(weekReports.map(r => r.player_name))].sort(),
    [weekReports]
  );

  const metric = METRICS.find(m => m.key === activeMetric);

  // ── KPIs del equipo en la semana ──────────────────────────────────────────
  const teamKpis = useMemo(() => {
    const out = {};
    METRICS.forEach(({ key }) => {
      const vals = weekReports.map(r => r[key]).filter(v => v != null);
      out[key] = {
        total: vals.reduce((a, b) => a + b, 0),
        avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null,
        max: vals.length ? Math.max(...vals) : null,
      };
    });
    return out;
  }, [weekReports]);

  // ── Carga acumulada por jugador (suma de la semana) ───────────────────────
  const playerAccum = useMemo(() => {
    const map = {};
    weekReports.forEach(r => {
      if (!map[r.player_name]) map[r.player_name] = {};
      METRICS.forEach(({ key }) => {
        map[r.player_name][key] = (map[r.player_name][key] || 0) + (r[key] || 0);
      });
    });
    return Object.entries(map)
      .map(([name, vals]) => ({ name, shortName: name.split(" ").slice(-1)[0], ...vals }))
      .sort((a, b) => (b[activeMetric] || 0) - (a[activeMetric] || 0));
  }, [weekReports, activeMetric]);

  // ── Evolución diaria del equipo (promedio de cada sesión) ────────────────
  const dailyTeamEvolution = useMemo(() =>
    weekSessions
      .filter(s => reports.some(r => r.session_id === s.id))
      .map(s => {
        const rows = reports.filter(r => r.session_id === s.id);
        const point = { date: moment(s.date).format("dd DD/MM"), fullDate: s.date, label: s.title, session_id: s.id };
        METRICS.forEach(({ key }) => { point[key] = avg(rows.map(r => r[key])); });
        return point;
      }),
    [weekSessions, reports]
  );

  // ── Evolución individual por sesión ──────────────────────────────────────
  const playerEvolution = useMemo(() => {
    return weekSessions
      .filter(s => reports.some(r => r.session_id === s.id))
      .map(s => {
        const point = { date: moment(s.date).format("dd DD/MM"), label: s.title };
        players.forEach(name => {
          const row = reports.find(r => r.session_id === s.id && r.player_name === name);
          point[name] = row ? (row[activeMetric] ?? null) : null;
        });
        return point;
      });
  }, [weekSessions, reports, players, activeMetric]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
    </div>
  );

  const sessionsWithData = weekSessions.filter(s => reports.some(r => r.session_id === s.id));

  return (
    <div className="space-y-5">
      {/* ── Filtro de fechas ───────────────────────────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-wrap items-end gap-4">
        <div className="flex items-center gap-2 mr-1">
          <Calendar size={14} className="text-zinc-500" />
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Semana / Período</span>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-zinc-500 text-xs">Desde</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:outline-none focus:border-zinc-500" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-zinc-500 text-xs">Hasta</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:outline-none focus:border-zinc-500" />
        </div>
        {/* Accesos rápidos */}
        <div className="flex gap-2 flex-wrap">
          {[
            { label: "Esta semana", from: moment().startOf("isoWeek").format("YYYY-MM-DD"), to: todayStr },
            { label: "Sem. pasada", from: moment().subtract(1,"week").startOf("isoWeek").format("YYYY-MM-DD"), to: moment().subtract(1,"week").endOf("isoWeek").format("YYYY-MM-DD") },
            { label: "Últimos 14d", from: moment().subtract(13,"days").format("YYYY-MM-DD"), to: todayStr },
            { label: "Últimos 30d", from: moment().subtract(29,"days").format("YYYY-MM-DD"), to: todayStr },
          ].map(({ label, from, to }) => (
            <button key={label} onClick={() => { setDateFrom(from); setDateTo(to); }}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${dateFrom === from && dateTo === to ? "bg-zinc-700 border-zinc-500 text-white" : "border-zinc-700 text-zinc-500 hover:text-zinc-300"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="ml-auto text-right">
          <p className="text-white font-semibold text-sm">{sessionsWithData.length} sesiones · {players.length} jugadores</p>
          <p className="text-zinc-600 text-xs">{weekReports.length} registros GPS</p>
        </div>
      </div>

      {weekReports.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <Activity size={36} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">Sin datos GPS en el período seleccionado</p>
          <p className="text-zinc-600 text-xs mt-1">Ajustá las fechas o importá CSVs desde la pestaña Entrenamientos</p>
        </div>
      ) : (
        <>
          {/* ── KPIs del equipo ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="Dist. total equipo" value={`${(teamKpis.total_distance?.total / 1000).toFixed(1)}km`} sub={`${metric?.fmt(teamKpis.total_distance?.avg)} prom/sesión`} color="#60a5fa" />
            <KpiCard label="Carga total equipo" value={Math.round(teamKpis.player_load?.total)} sub={`${Math.round(teamKpis.player_load?.avg)} prom/sesión`} color="#a78bfa" />
            <KpiCard label="Sprint máx equipo" value={`${teamKpis.max_velocity?.max?.toFixed(1)} km/h`} sub="velocidad máxima" color="#f87171" />
            <KpiCard label="Sesiones" value={sessionsWithData.length} sub={`${players.length} jugadores activos`} color="#34d399" />
          </div>

          {/* ── Selector de métrica ──────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-1.5">
            {METRICS.map(({ key, label, color }) => (
              <button key={key} onClick={() => setActiveMetric(key)}
                className="text-[11px] px-2.5 py-1 rounded-full border font-medium transition-all"
                style={activeMetric === key
                  ? { backgroundColor: color, color: "#18181b", borderColor: color }
                  : { backgroundColor: "transparent", color: "#71717a", borderColor: "#3f3f46" }}>
                {label}
              </button>
            ))}
          </div>

          {/* ── Toggle equipo / individual ───────────────────────────────────── */}
          <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
            <button onClick={() => setViewMode("team")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === "team" ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"}`}>
              <TrendingUp size={13} /> Vista Equipo
            </button>
            <button onClick={() => setViewMode("individual")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === "individual" ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"}`}>
              <Users size={13} /> Vista Individual
            </button>
          </div>

          {/* ══ VISTA EQUIPO ═══════════════════════════════════════════════════ */}
          {viewMode === "team" && (
            <div className="space-y-5">
              {/* Carga acumulada por jugador (ranking) */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="mb-3">
                  <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                    <Zap size={13} className="text-yellow-400" /> Carga acumulada por jugador — {metric?.label}
                  </h3>
                  <p className="text-zinc-500 text-xs mt-0.5">Suma del período seleccionado · ordenado de mayor a menor</p>
                </div>
                <ResponsiveContainer width="100%" height={Math.max(200, playerAccum.length * 28)}>
                  <BarChart data={playerAccum} layout="vertical" margin={{ left: 8, right: 60, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="shortName" width={90} tick={{ fill: "#d4d4d8", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }}
                      formatter={(v) => [metric?.fmt(v), metric?.label]}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ""}
                    />
                    <ReferenceLine x={avg(playerAccum.map(p => p[activeMetric]))} stroke={metric?.color} strokeDasharray="4 4" strokeOpacity={0.5}
                      label={{ value: "prom", position: "top", fill: metric?.color, fontSize: 9 }} />
                    <Bar dataKey={activeMetric} radius={[0, 4, 4, 0]}
                      label={{ position: "right", fontSize: 10, fill: "#a1a1aa", formatter: v => v != null ? metric?.fmt(v) : "" }}>
                      {playerAccum.map((_, i) => (
                        <Cell key={i} fill={metric?.color} fillOpacity={1 - i * (0.5 / Math.max(playerAccum.length, 1))} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Evolución diaria del equipo */}
              {dailyTeamEvolution.length > 1 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <h3 className="text-white font-semibold text-sm mb-1">Evolución del equipo — {metric?.label}</h3>
                  <p className="text-zinc-500 text-xs mb-4">Promedio por sesión en el período</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={dailyTeamEvolution} margin={{ left: 0, right: 20, top: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="date" tick={{ fill: "#a1a1aa", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }}
                        formatter={(v) => [v != null ? metric?.fmt(v) : "—", metric?.label]}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.label || ""}
                      />
                      <Line type="monotone" dataKey={activeMetric} stroke={metric?.color} strokeWidth={2.5}
                        dot={{ r: 5, fill: metric?.color, strokeWidth: 0 }} activeDot={{ r: 7 }} connectNulls={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Tabla resumen por jugador */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-800">
                  <h3 className="text-white font-semibold text-sm">Resumen por jugador — período completo</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="bg-zinc-800/60">
                        <th className="px-3 py-2 text-left text-zinc-400 font-semibold">#</th>
                        <th className="px-3 py-2 text-left text-zinc-400 font-semibold">Jugador</th>
                        <th className="px-3 py-2 text-center text-zinc-400 font-semibold">Ses.</th>
                        {METRICS.slice(0, 6).map(m => (
                          <th key={m.key} className="px-3 py-2 text-right text-zinc-400 font-semibold whitespace-nowrap">{m.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {playerAccum.map((p, i) => {
                        const sessCount = weekSessionIds.size > 0
                          ? weekReports.filter(r => r.player_name === p.name).length
                          : 0;
                        return (
                          <tr key={p.name} className={i % 2 === 0 ? "bg-zinc-900" : "bg-zinc-800/20"}>
                            <td className="px-3 py-2 text-zinc-600 font-mono">{i + 1}</td>
                            <td className="px-3 py-2 text-white font-medium whitespace-nowrap">{p.name}</td>
                            <td className="px-3 py-2 text-center text-zinc-400">{sessCount}</td>
                            {METRICS.slice(0, 6).map(m => (
                              <td key={m.key} className="px-3 py-2 text-right font-mono font-semibold whitespace-nowrap"
                                style={{ color: m.color }}>
                                {p[m.key] != null ? m.fmt(p[m.key]) : <span className="text-zinc-700">—</span>}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══ VISTA INDIVIDUAL ═══════════════════════════════════════════════ */}
          {viewMode === "individual" && (
            <div className="space-y-5">
              {/* Evolución de todos los jugadores por sesión */}
              {playerEvolution.length > 0 && players.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <h3 className="text-white font-semibold text-sm mb-1">Evolución individual — {metric?.label}</h3>
                  <p className="text-zinc-500 text-xs mb-4">Cada línea es un jugador, por sesión del período</p>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={playerEvolution} margin={{ left: 0, right: 20, top: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="date" tick={{ fill: "#a1a1aa", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }}
                        formatter={(v, name) => [v != null ? metric?.fmt(v) : "—", name]}
                      />
                      <Legend wrapperStyle={{ fontSize: 10, color: "#a1a1aa" }} />
                      {players.map((name, i) => (
                        <Line key={name} type="monotone" dataKey={name}
                          stroke={PLAYER_COLORS[i % PLAYER_COLORS.length]}
                          strokeWidth={1.5} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls={false} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Comparativa de jugadores por sesión (barras agrupadas) */}
              {sessionsWithData.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <h3 className="text-white font-semibold text-sm mb-1">Comparativa por sesión — {metric?.label}</h3>
                  <p className="text-zinc-500 text-xs mb-4">Valor de cada jugador en cada sesión del período</p>
                  <div className="space-y-4">
                    {sessionsWithData.map(s => {
                      const rows = reports
                        .filter(r => r.session_id === s.id && r[activeMetric] != null)
                        .sort((a, b) => (b[activeMetric] || 0) - (a[activeMetric] || 0))
                        .map(r => ({ name: r.player_name.split(" ").slice(-1)[0], fullName: r.player_name, value: r[activeMetric] || 0 }));
                      if (!rows.length) return null;
                      const teamAvgVal = avg(rows.map(r => r.value));
                      return (
                        <div key={s.id} className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-zinc-300">{moment(s.date).format("ddd DD/MM")} — {s.title}</p>
                            <span className="text-xs text-zinc-500">{rows.length} jugadores · prom: <span className="text-white font-semibold">{teamAvgVal != null ? metric?.fmt(teamAvgVal) : "—"}</span></span>
                          </div>
                          <ResponsiveContainer width="100%" height={Math.max(120, rows.length * 22)}>
                            <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 50, top: 0, bottom: 0 }}>
                              <XAxis type="number" tick={{ fill: "#71717a", fontSize: 9 }} axisLine={false} tickLine={false} />
                              <YAxis type="category" dataKey="name" width={80} tick={{ fill: "#d4d4d8", fontSize: 9 }} axisLine={false} tickLine={false} />
                              <Tooltip
                                contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }}
                                formatter={(v) => [metric?.fmt(v), metric?.label]}
                                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ""}
                              />
                              {teamAvgVal != null && (
                                <ReferenceLine x={teamAvgVal} stroke={metric?.color} strokeDasharray="3 3" strokeOpacity={0.6} />
                              )}
                              <Bar dataKey="value" radius={[0, 3, 3, 0]}
                                label={{ position: "right", fontSize: 9, fill: "#a1a1aa", formatter: v => metric?.fmt(v) }}>
                                {rows.map((_, i) => (
                                  <Cell key={i} fill={metric?.color} fillOpacity={0.8} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
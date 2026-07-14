import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { FileSpreadsheet, TrendingUp, BarChart2, Activity, Filter, Clock, Swords, Dumbbell } from "lucide-react";
import { useWorkspace } from "@/lib/WorkspaceContext";
import moment from "moment";
import LastSessionDashboard from "./LastSessionDashboard";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine, Cell,
} from "recharts";

// ── CSV Parser ────────────────────────────────────────────────────────────────
function matchColumn(raw) {
  const h = raw.toLowerCase().replace(/^\uFEFF/, "").trim();
  if (h === "name" || h === "jugador" || h === "player" || h === "nombre" || h === "athlete") return "player_name";
  if (h === "total duration" || h === "tot dur") return "total_duration";
  if (h.includes("total distance") || h === "tot dist (m)" || h === "tot dist") return "total_distance";
  if (h.startsWith("d") && h.includes("19")) return "distance_hsr";
  if ((h.startsWith("d+") || h.startsWith("d +")) && h.includes("25")) return "sprint_distance";
  if (h === "sprint efforts" || h === "sprint effs") return "sprint_efforts";
  if (h.includes("acc") && (h.includes("3mt") || h.includes("3 m"))) return "accelerations";
  if (h.includes("dec") && (h.includes("3mt") || h.includes("3 m"))) return "decelerations";
  if (h === "total player load" || h === "tot pl" || h === "player load") return "player_load";
  if (h.includes("maximum velocity") || h === "max vel (km/h)" || h === "max velocity (km/h)") return "max_velocity";
  if (h.includes("max vel") && h.includes("%")) return "max_velocity_percentage";
  if (h === "metros x min" || h === "m/min" || h === "meters per minute") return "meters_per_minute";
  return null;
}
function parseNum(val) {
  if (val == null || val === "" || val === "-") return null;
  const str = String(val).trim();
  const hasCommaDecimal = /^\d+,\d+$/.test(str) || /^\d{1,3}(\.\d{3})*,\d+$/.test(str);
  const cleaned = hasCommaDecimal ? str.replace(/\./g, "").replace(",", ".") : str.replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}
function parseDuration(val) {
  if (!val) return null;
  const parts = String(val).trim().split(":").map(Number);
  if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 60;
  if (parts.length === 2) return parts[0] + parts[1] / 60;
  return parseNum(val);
}
function splitCSVLine(line, sep) {
  const result = [];
  let cur = "", inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === sep && !inQuotes) { result.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  result.push(cur.trim());
  return result;
}
function parseCatapultCSV(text) {
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split("\n").map((l) => l.trim()).filter(Boolean);
  const firstSemi = lines[0].split(";").length;
  const firstComma = lines[0].split(",").length;
  const sep = firstSemi > firstComma ? ";" : ",";
  let headerIdx = -1, headers = [];
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const cols = splitCSVLine(lines[i], sep);
    const firstLow = cols[0]?.replace(/^\uFEFF/, "").toLowerCase().trim();
    const mapped = cols.filter((c) => matchColumn(c) !== null).length;
    if (firstLow === "name" || firstLow === "jugador" || firstLow === "athlete" || mapped >= 3) {
      headerIdx = i;
      headers = cols.map((c, idx) => idx === 0 ? c.replace(/^\uFEFF/, "") : c);
      break;
    }
  }
  if (headerIdx === -1) return null;
  const fieldMap = {};
  headers.forEach((h, idx) => {
    const field = matchColumn(h);
    if (field) fieldMap[idx] = field;
    else if (idx === 0) fieldMap[idx] = "player_name";
  });
  const rows = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i], sep);
    const obj = {};
    Object.entries(fieldMap).forEach(([colIdx, field]) => {
      const raw = cols[parseInt(colIdx)];
      if (field === "player_name") obj[field] = raw || "";
      else if (field === "total_duration") obj[field] = parseDuration(raw);
      else obj[field] = parseNum(raw);
    });
    const name = (obj.player_name || "").trim();
    if (!name) continue;
    if (["total", "promedio", "average", "team", "totals"].includes(name.toLowerCase())) continue;
    rows.push(obj);
  }
  return rows;
}

// ── Constantes ────────────────────────────────────────────────────────────────
const METRICS = [
  { key: "total_distance",   label: "Distancia (m)",      color: "#60a5fa", fmt: (v) => Math.round(v) },
  { key: "distance_hsr",    label: "19.8-25 km/h (m)",   color: "#34d399", fmt: (v) => Math.round(v) },
  { key: "sprint_distance", label: "+25 km/h (m)",         color: "#fbbf24", fmt: (v) => Math.round(v) },
  { key: "player_load",     label: "Player Load",          color: "#a78bfa", fmt: (v) => v.toFixed(0)  },
  { key: "max_velocity",    label: "Vel. Máx (km/h)",     color: "#f87171", fmt: (v) => v.toFixed(1)  },
  { key: "accelerations",   label: "Aceleraciones",        color: "#fb923c", fmt: (v) => Math.round(v) },
  { key: "decelerations",   label: "Desaceleraciones",     color: "#e879f9", fmt: (v) => Math.round(v) },
  { key: "sprint_efforts",  label: "Sprint Efforts",       color: "#2dd4bf", fmt: (v) => Math.round(v) },
];

const TABS = [
  { id: "last",       label: "Informe de Sesión", icon: Clock      },
  { id: "team",       label: "Equipo",    icon: BarChart2  },
  { id: "player",     label: "Jugador",   icon: TrendingUp },
  { id: "comparison", label: "Comparar",  icon: Activity   },
];

const COLORS = ["#60a5fa","#34d399","#fbbf24","#a78bfa","#f87171","#fb923c","#e879f9","#2dd4bf","#84cc16","#f97316"];

function avg(arr) {
  const v = arr.filter((x) => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

// ── Vista Equipo ──────────────────────────────────────────────────────────────
function TeamView({ allRows, dateFrom, dateTo, sessionType, seasonPeriod, matchDayCode }) {
  const [activeMetric, setActiveMetric] = useState("total_distance");

  const filtered = useMemo(() => allRows.filter((r) => {
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo && r.date > dateTo) return false;
    if (sessionType && r.session_type !== sessionType) return false;
    if (seasonPeriod && r.season_period !== seasonPeriod) return false;
    if (matchDayCode && r.match_day_code !== matchDayCode) return false;
    return true;
  }), [allRows, dateFrom, dateTo, sessionType, seasonPeriod, matchDayCode]);

  const teamAvgs = useMemo(() => {
    const out = {};
    METRICS.forEach(({ key }) => { out[key] = avg(filtered.map((r) => r[key])); });
    return out;
  }, [filtered]);

  // Agrupar por jugador y promediar
  const byPlayer = useMemo(() => {
    const map = {};
    filtered.forEach((r) => {
      if (!map[r.player_name]) map[r.player_name] = [];
      map[r.player_name].push(r);
    });
    return Object.entries(map).map(([name, rows]) => {
      const out = { player_name: name };
      METRICS.forEach(({ key }) => { out[key] = avg(rows.map((r) => r[key])); });
      return out;
    });
  }, [filtered]);

  const metric = METRICS.find((m) => m.key === activeMetric);
  const chartData = useMemo(() =>
    byPlayer
      .filter((r) => r[activeMetric] != null)
      .sort((a, b) => (b[activeMetric] || 0) - (a[activeMetric] || 0))
      .map((r) => ({
        name: r.player_name?.split(" ").slice(-1)[0] || r.player_name,
        fullName: r.player_name,
        value: r[activeMetric],
      })),
  [byPlayer, activeMetric]);

  if (filtered.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
        <p className="text-zinc-500 text-sm">Sin datos para los filtros seleccionados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* KPIs promedio equipo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {METRICS.filter(({ key }) => teamAvgs[key] != null).map(({ key, label, color, fmt }) => (
          <div key={key} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
            <p className="text-zinc-500 text-xs">{label}</p>
            <p className="font-bold text-lg mt-0.5" style={{ color }}>{fmt(teamAvgs[key])}</p>
            <p className="text-zinc-600 text-xs">prom. equipo</p>
          </div>
        ))}
      </div>

      {/* Selector de métrica */}
      <div className="flex flex-wrap gap-1.5">
        {METRICS.map(({ key, label, color }) => (
          <button key={key} onClick={() => setActiveMetric(key)}
            className="text-xs px-3 py-1.5 rounded-full border font-medium transition-colors"
            style={activeMetric === key
              ? { backgroundColor: color, color: "#18181b", borderColor: color }
              : { backgroundColor: "transparent", color: "#71717a", borderColor: "#3f3f46" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Gráfico de barras por jugador */}
      {chartData.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-sm font-semibold text-white mb-4">{metric?.label} — promedio por jugador</p>
          <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 32)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 55, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10, fill: "#d4d4d8" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }}
                formatter={(val) => [metric?.fmt(val), metric?.label]}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ""}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}
                label={{ position: "right", fontSize: 10, fill: "#a1a1aa", formatter: (v) => metric?.fmt(v) }}>
                {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabla completa */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-zinc-800/80">
              <th className="px-3 py-2.5 text-left text-zinc-400 font-semibold whitespace-nowrap sticky left-0 bg-zinc-800/80">Jugador</th>
              {METRICS.filter(({ key }) => byPlayer.some((r) => r[key] != null)).map(({ key, label }) => (
                <th key={key} className="px-3 py-2.5 text-right text-zinc-400 font-semibold whitespace-nowrap">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {byPlayer.sort((a, b) => (b.total_distance || 0) - (a.total_distance || 0)).map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? "bg-zinc-900" : "bg-zinc-800/30"}>
                <td className="px-3 py-2 text-zinc-200 font-medium whitespace-nowrap sticky left-0 bg-inherit">{row.player_name}</td>
                {METRICS.filter(({ key }) => byPlayer.some((r) => r[key] != null)).map(({ key, fmt, color }) => (
                  <td key={key} className="px-3 py-2 text-right whitespace-nowrap font-mono"
                    style={{ color: row[key] != null ? color : undefined }}>
                    {row[key] != null ? fmt(row[key]) : <span className="text-zinc-700">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-zinc-600 text-xs text-center">{filtered.length} registros · {byPlayer.length} jugadores</p>
    </div>
  );
}

// ── Vista Jugador (evolución) ─────────────────────────────────────────────────
function PlayerView({ allRows, dateFrom, dateTo, sessionType, seasonPeriod, matchDayCode }) {
  const allPlayers = useMemo(
    () => [...new Set(allRows.map((r) => r.player_name).filter(Boolean))].sort(),
    [allRows]
  );

  const [player, setPlayer] = useState(allPlayers[0] || "");
  const [activeMetrics, setActiveMetrics] = useState(["total_distance", "player_load"]);

  function toggle(key) {
    setActiveMetrics((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  }

  const chartData = useMemo(() =>
    allRows
      .filter((r) => {
        if (r.player_name !== player) return false;
        if (dateFrom && r.date < dateFrom) return false;
        if (dateTo && r.date > dateTo) return false;
        if (sessionType && r.session_type !== sessionType) return false;
        if (seasonPeriod && r.season_period !== seasonPeriod) return false;
        if (matchDayCode && r.match_day_code !== matchDayCode) return false;
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((r) => ({
        date: moment(r.date).format("DD/MM"),
        session: r.session_title || r.date,
        source: r.source,
        match_day_code: r.match_day_code,
        ...Object.fromEntries(METRICS.map((m) => [m.key, r[m.key] ?? null])),
      })),
  [allRows, player, dateFrom, dateTo, sessionType, seasonPeriod, matchDayCode]);

  if (allPlayers.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
        <p className="text-zinc-500 text-sm">No hay datos GPS disponibles.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Selector jugador + métricas */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
        <div className="flex flex-col gap-1">
          <label className="text-zinc-500 text-xs">Jugador</label>
          <select value={player} onChange={(e) => setPlayer(e.target.value)}
            className="bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:outline-none max-w-xs">
            {allPlayers.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <p className="text-zinc-500 text-xs mb-2">Métricas a mostrar</p>
          <div className="flex flex-wrap gap-1.5">
            {METRICS.map(({ key, label, color }) => {
              const on = activeMetrics.includes(key);
              return (
                <button key={key} onClick={() => toggle(key)}
                  className="text-xs px-3 py-1.5 rounded-full border font-medium transition-colors"
                  style={on ? { backgroundColor: color, color: "#18181b", borderColor: color }
                           : { backgroundColor: "transparent", color: "#71717a", borderColor: "#3f3f46" }}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-10 text-center">
          <p className="text-zinc-500 text-sm">Sin sesiones para {player} con los filtros actuales.</p>
        </div>
      ) : (
        activeMetrics.map((metricKey) => {
          const meta = METRICS.find((m) => m.key === metricKey);
          const vals = chartData.map((d) => d[metricKey]).filter((v) => v != null);
          const average = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
          return (
            <div key={metricKey} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: meta?.color }} />
                  {meta?.label}
                </h3>
                <div className="flex items-center gap-4 flex-wrap">
                  {average != null && (
                    <div className="flex gap-4 text-xs">
                      <span className="text-zinc-500">Prom: <span className="text-white font-semibold">{meta?.fmt(average)}</span></span>
                      <span className="text-green-400">Máx: <span className="font-semibold">{meta?.fmt(Math.max(...vals))}</span></span>
                      <span className="text-red-400">Mín: <span className="font-semibold">{meta?.fmt(Math.min(...vals))}</span></span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: meta?.color }} /> Entrenamiento</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full inline-block border-2 border-red-300 bg-red-500" /> Partido</span>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData} margin={{ left: 0, right: 30, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#71717a", fontSize: 11 }} width={55} tickFormatter={(v) => meta?.fmt(v)} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => [meta?.fmt(v), meta?.label]}
                    labelFormatter={(_, payload) => {
                      const p = payload?.[0]?.payload;
                      if (!p) return "";
                      const tipo = p.source === "match" ? "⚽ Partido" : `🏋️ ${p.match_day_code || "Entrenamiento"}`;
                      return `${p.session} — ${tipo}`;
                    }}
                  />
                  {average != null && (
                    <ReferenceLine y={average} stroke={meta?.color} strokeDasharray="4 4" strokeOpacity={0.5}
                      label={{ value: "prom", position: "right", fill: meta?.color, fontSize: 10 }} />
                  )}
                  <Line type="monotone" dataKey={metricKey} stroke={meta?.color} strokeWidth={2}
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      const isMatch = payload?.source === "match";
                      return (
                        <circle
                          key={`dot-${cx}-${cy}`}
                          cx={cx} cy={cy}
                          r={isMatch ? 6 : 4}
                          fill={isMatch ? "#ef4444" : meta?.color}
                          stroke={isMatch ? "#fca5a5" : "none"}
                          strokeWidth={isMatch ? 2 : 0}
                        />
                      );
                    }}
                    activeDot={{ r: 7 }}
                    connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          );
        })
      )}
    </div>
  );
}

// ── Vista Comparar: Jugadores en misma sesión ─────────────────────────────────
function PlayerComparisonView({ allRows }) {
  const sessionOptions = useMemo(() => {
    const seen = new Set();
    const out = [];
    allRows.forEach(r => {
      if (!seen.has(r.session_id)) {
        seen.add(r.session_id);
        out.push({ id: r.session_id, title: r.session_title, date: r.date, source: r.source });
      }
    });
    return out.sort((a, b) => b.date.localeCompare(a.date));
  }, [allRows]);

  const [sessionId, setSessionId] = useState(sessionOptions[0]?.id || "");

  const sessionRows = useMemo(() => allRows.filter(r => r.session_id === sessionId), [allRows, sessionId]);
  const playerNames = useMemo(() => [...new Set(sessionRows.map(r => r.player_name))].sort(), [sessionRows]);

  const [playerA, setPlayerA] = useState("");
  const [playerB, setPlayerB] = useState("");

  // Auto-seleccionar jugadores cuando cambia sesión
  useEffect(() => {
    setPlayerA(playerNames[0] || "");
    setPlayerB(playerNames[1] || "");
  }, [sessionId, playerNames.join(",")]);

  const rowA = useMemo(() => sessionRows.find(r => r.player_name === playerA), [sessionRows, playerA]);
  const rowB = useMemo(() => sessionRows.find(r => r.player_name === playerB), [sessionRows, playerB]);

  const sessionInfo = sessionOptions.find(s => s.id === sessionId);

  return (
    <div className="space-y-5">
      {/* Selector de sesión */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
        <label className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Sesión</label>
        <select value={sessionId} onChange={e => setSessionId(e.target.value)}
          className="w-full bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:outline-none focus:border-zinc-500">
          {sessionOptions.map(s => (
            <option key={s.id} value={s.id}>
              {moment(s.date).format("DD/MM/YY")} — {s.title}
            </option>
          ))}
        </select>
        {sessionInfo && (
          <p className="text-xs text-zinc-500">{moment(sessionInfo.date).format("dddd DD [de] MMMM YYYY")} · {playerNames.length} jugadores</p>
        )}
      </div>

      {/* Selectores de jugadores */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Jugador A", color: "#60a5fa", value: playerA, set: setPlayerA, row: rowA },
          { label: "Jugador B", color: "#f87171", value: playerB, set: setPlayerB, row: rowB },
        ].map(({ label, color, value, set }) => (
          <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-white font-semibold text-sm">{label}</span>
            </div>
            <select value={value} onChange={e => set(e.target.value)}
              className="w-full bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:outline-none">
              <option value="">— Seleccionar —</option>
              {playerNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        ))}
      </div>

      {/* Tabla comparativa */}
      {rowA && rowB && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 grid grid-cols-4 text-xs font-semibold text-zinc-400">
            <span>Métrica</span>
            <span className="text-center text-blue-400">{playerA}</span>
            <span className="text-center text-red-400">{playerB}</span>
            <span className="text-center">Diferencia</span>
          </div>
          {METRICS.map(({ key, label, fmt }) => {
            const a = rowA[key] ?? null;
            const b = rowB[key] ?? null;
            const diff = a != null && b != null ? a - b : null;
            const up = diff != null && diff > 0;
            return (
              <div key={key} className="grid grid-cols-4 border-b border-zinc-800/50 hover:bg-zinc-800/20 px-4 py-3 items-center">
                <span className="text-zinc-300 text-xs font-medium">{label}</span>
                <span className="text-center text-white text-sm font-bold">{a != null ? fmt(a) : "—"}</span>
                <span className="text-center text-white text-sm font-bold">{b != null ? fmt(b) : "—"}</span>
                <span className={`text-center text-xs font-semibold flex items-center justify-center gap-1 ${diff == null ? "text-zinc-600" : up ? "text-green-400" : "text-red-400"}`}>
                  {diff == null ? "—" : <><span>{up ? "▲" : "▼"}</span><span>{fmt(Math.abs(diff))}</span></>}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {(!rowA || !rowB) && playerNames.length >= 2 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
          <p className="text-zinc-500 text-sm">Seleccioná dos jugadores para ver la comparación.</p>
        </div>
      )}
      {playerNames.length < 2 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
          <p className="text-zinc-500 text-sm">Esta sesión no tiene suficientes jugadores con datos GPS.</p>
        </div>
      )}
    </div>
  );
}

// ── Vista Comparar sesiones ───────────────────────────────────────────────────
function ComparisonView({ sessions, allRows, dateFrom, dateTo, sessionType, seasonPeriod, matchDayCode }) {
  const [compareMode, setCompareMode] = useState("sessions"); // "sessions" | "players"

  const sessionOptions = useMemo(() => {
    return sessions
      .filter((s) => {
        if (!allRows.some((r) => r.session_id === s.id)) return false;
        if (dateFrom && s.date < dateFrom) return false;
        if (dateTo && s.date > dateTo) return false;
        if (sessionType && s.session_type !== sessionType) return false;
        if (seasonPeriod && s.season_period !== seasonPeriod) return false;
        if (matchDayCode && s.match_day_code !== matchDayCode) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [sessions, allRows, dateFrom, dateTo, sessionType, seasonPeriod, matchDayCode]);

  const [idA, setIdA] = useState(sessionOptions[0]?.id || "");
  const [idB, setIdB] = useState(sessionOptions[1]?.id || "");

  const reportsA = useMemo(() => allRows.filter((r) => r.session_id === idA), [allRows, idA]);
  const reportsB = useMemo(() => allRows.filter((r) => r.session_id === idB), [allRows, idB]);

  const avgA = useMemo(() => Object.fromEntries(METRICS.map(({ key }) => [key, avg(reportsA.map((r) => r[key]))])), [reportsA]);
  const avgB = useMemo(() => Object.fromEntries(METRICS.map(({ key }) => [key, avg(reportsB.map((r) => r[key]))])), [reportsB]);

  const infoA = sessions.find((s) => s.id === idA);
  const infoB = sessions.find((s) => s.id === idB);

  return (
    <div className="space-y-5">
      {/* Toggle modo */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
        <button onClick={() => setCompareMode("sessions")}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${compareMode === "sessions" ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"}`}>
          Sesión vs Sesión
        </button>
        <button onClick={() => setCompareMode("players")}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${compareMode === "players" ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"}`}>
          Jugador vs Jugador
        </button>
      </div>

      {compareMode === "players" && (
        <PlayerComparisonView allRows={allRows} />
      )}

      {compareMode === "sessions" && (
        <>
          {sessionOptions.length < 2 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
              <p className="text-zinc-500 text-sm">Necesitás al menos 2 sesiones con datos GPS para comparar.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Sesión A", color: "#60a5fa", value: idA, set: setIdA, info: infoA },
                  { label: "Sesión B", color: "#f87171", value: idB, set: setIdB, info: infoB },
                ].map(({ label, color, value, set, info }) => (
                  <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-white font-semibold text-sm">{label}</span>
                    </div>
                    <select value={value} onChange={(e) => set(e.target.value)}
                      className="w-full bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:outline-none">
                      {sessionOptions.map((s) => (
                        <option key={s.id} value={s.id}>{moment(s.date).format("DD/MM/YY")} — {s.title}</option>
                      ))}
                    </select>
                    {info && <p className="text-xs text-zinc-500">{moment(info.date).format("DD [de] MMMM YYYY")}{info.match_day_code ? ` · ${info.match_day_code}` : ""}</p>}
                  </div>
                ))}
              </div>

              {reportsA.length > 0 && reportsB.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-zinc-800 grid grid-cols-4 text-xs font-semibold text-zinc-400">
                    <span>Métrica</span>
                    <span className="text-center text-blue-400">{infoA?.title || "Sesión A"}</span>
                    <span className="text-center text-red-400">{infoB?.title || "Sesión B"}</span>
                    <span className="text-center">Diferencia</span>
                  </div>
                  {METRICS.map(({ key, label, fmt }) => {
                    const a = avgA[key], b = avgB[key];
                    const diff = a != null && b != null ? a - b : null;
                    const up = diff != null && diff > 0;
                    return (
                      <div key={key} className="grid grid-cols-4 border-b border-zinc-800/60 hover:bg-zinc-800/20 px-4 py-3 items-center">
                        <span className="text-zinc-300 text-xs font-medium">{label}</span>
                        <span className="text-center text-white text-sm font-bold">{a != null ? fmt(a) : "—"}</span>
                        <span className="text-center text-white text-sm font-bold">{b != null ? fmt(b) : "—"}</span>
                        <span className={`text-center text-xs font-semibold ${diff == null ? "text-zinc-600" : up ? "text-green-400" : "text-red-400"}`}>
                          {diff == null ? "—" : `${up ? "▲" : "▼"} ${fmt(Math.abs(diff))}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
const SESSION_TYPES = ["Entrenamiento", "Táctica", "Físico", "Regenerativo", "Partido amistoso", "Partido", "Otro"];
const SEASON_PERIODS = ["En competencia", "Pretemporada", "Transitorio"];
const MATCH_DAY_CODES = ["MD", "MD-1", "MD-2", "MD-3", "MD-4", "MD-5", "MD-6", "MD+1", "MD+2"];

// ── Selector de Sesión/Partido para el Informe ────────────────────────────────
function SessionSelector({ sessions, matches, selectedId, onSelect }) {
  const sessionOptions = sessions
    .filter(s => s.csv_url)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(s => ({ id: s.id, label: s.title, date: s.date, type: "session", match_day_code: s.match_day_code, session_type: s.session_type }));

  const matchOptions = matches
    .filter(m => m.csv_url)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(m => ({ id: m.id, label: `vs. ${m.rival}`, date: m.date, type: "match" }));

  const all = [...sessionOptions, ...matchOptions].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider shrink-0">Ver informe:</span>
      <select
        value={selectedId || ""}
        onChange={e => onSelect(e.target.value)}
        className="bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:outline-none focus:border-zinc-500 flex-1 min-w-[220px]"
      >
        <option value="">— Seleccionar —</option>
        <optgroup label="🏋️ Entrenamientos">
          {sessionOptions.map(s => (
            <option key={s.id} value={s.id}>
              {moment(s.date).format("DD/MM/YY")} · {s.label}{s.match_day_code ? ` (${s.match_day_code})` : ""}
            </option>
          ))}
        </optgroup>
        <optgroup label="⚽ Partidos">
          {matchOptions.map(m => (
            <option key={m.id} value={m.id}>
              {moment(m.date).format("DD/MM/YY")} · {m.label}
            </option>
          ))}
        </optgroup>
      </select>
      {all.length > 0 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const idx = all.findIndex(x => x.id === selectedId);
              if (idx < all.length - 1) onSelect(all[idx + 1].id);
            }}
            disabled={all.findIndex(x => x.id === selectedId) >= all.length - 1}
            className="px-2 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white rounded-lg text-xs disabled:opacity-30 transition-colors"
          >← Ant</button>
          <button
            onClick={() => {
              const idx = all.findIndex(x => x.id === selectedId);
              if (idx > 0) onSelect(all[idx - 1].id);
            }}
            disabled={all.findIndex(x => x.id === selectedId) <= 0}
            className="px-2 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white rounded-lg text-xs disabled:opacity-30 transition-colors"
          >Sig →</button>
        </div>
      )}
    </div>
  );
}

export default function GpsAnalytics({ initialTab, initialDate }) {
  const { activeSquadId } = useWorkspace();
  const [sessions, setSessions] = useState([]);
  const [matches, setMatches] = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCsvs, setLoadingCsvs] = useState(false);
  const [tab, setTab] = useState(initialTab || "last");

  // Filtros globales
  const [dateFrom, setDateFrom]         = useState("");
  const [dateTo, setDateTo]             = useState("");
  const [sessionType, setSessionType]   = useState("");
  const [seasonPeriod, setSeasonPeriod] = useState("");
  const [matchDayCode, setMatchDayCode] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all"); // "all" | "session" | "match"

  const hasFilters = dateFrom || dateTo || sessionType || seasonPeriod || matchDayCode || sourceFilter !== "all";

  // Sesión/partido seleccionado para el informe
  const [selectedReportId, setSelectedReportId] = useState(null);

  // Determinar qué sesión/partido mostrar en el informe
  const allSources = useMemo(() => {
    const s = sessions.filter(x => x.csv_url).map(x => ({ ...x, source: "session", label: x.title }));
    const m = matches.filter(x => x.csv_url).map(x => ({ ...x, source: "match", label: `vs. ${x.rival}` }));
    return [...s, ...m].sort((a, b) => b.date.localeCompare(a.date));
  }, [sessions, matches]);

  const reportSource = useMemo(() => {
    if (selectedReportId) return allSources.find(x => x.id === selectedReportId) || allSources[0];
    if (initialDate) return allSources.find(x => x.date === initialDate) || allSources[0];
    return allSources[0];
  }, [selectedReportId, allSources, initialDate]);

  const reportRows = useMemo(() =>
    reportSource ? allRows.filter(r => r.session_id === reportSource.id) : [],
    [allRows, reportSource]
  );

  // Filas filtradas por fuente (para vistas Equipo, Jugador, Comparar)
  const filteredBySource = useMemo(() => {
    if (sourceFilter === "all") return allRows;
    return allRows.filter(r => r.source === sourceFilter);
  }, [allRows, sourceFilter]);

  // 1. Carga sesiones y partidos — incluye registros legados sin squad_id
  useEffect(() => {
    setLoading(true);
    setAllRows([]);
    Promise.all([
      base44.entities.TrainingSession.list("-date", 200),
      base44.entities.MatchReport.list("-date", 100),
    ]).then(([allS, allM]) => {
      const filterFn = x => !activeSquadId || !x.squad_id || x.squad_id === activeSquadId;
      setSessions(allS.filter(filterFn));
      setMatches(allM.filter(x => filterFn(x) && x.competition !== "Juveniles"));
    }).finally(() => setLoading(false));
  }, [activeSquadId]);

  // 2. Con sesiones y partidos cargados, descarga y parsea los CSVs de ambos
  useEffect(() => {
    setAllRows([]);
    if (!sessions.length && !matches.length) return;

    const sessionSources = sessions
      .filter((s) => s.csv_url)
      .map((s) => ({ csv_url: s.csv_url, id: s.id, title: s.title, date: s.date, session_type: s.session_type, season_period: s.season_period, match_day_code: s.match_day_code, source: "session" }));

    const matchSources = matches
      .filter((m) => m.csv_url)
      .map((m) => ({ csv_url: m.csv_url, id: m.id, title: `vs. ${m.rival}`, date: m.date, session_type: "Partido", season_period: null, source: "match" }));

    const sources = [...sessionSources, ...matchSources];
    if (!sources.length) return;

    setLoadingCsvs(true);
    Promise.all(
      sources.map(async (s) => {
        try {
          const text = await fetch(s.csv_url).then((r) => r.text());
          const rows = parseCatapultCSV(text);
          if (!rows) return [];
          return rows.map((row) => ({
            ...row,
            session_id:    s.id,
            session_title: s.title,
            date:          s.date,
            session_type:  s.session_type,
            season_period: s.season_period,
            match_day_code: s.match_day_code,
            source:        s.source,
          }));
        } catch {
          return [];
        }
      })
    ).then((results) => {
      setAllRows(results.flat());
    }).finally(() => setLoadingCsvs(false));
  }, [sessions, matches]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
    </div>
  );

  const sessionsWithCsv = sessions.filter((s) => s.csv_url).length;
  const matchesWithCsv = matches.filter((m) => m.csv_url).length;
  const totalWithCsv = sessionsWithCsv + matchesWithCsv;

  if (totalWithCsv === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-14 text-center">
        <FileSpreadsheet size={40} className="text-zinc-700 mx-auto mb-3" />
        <p className="text-zinc-400 text-sm font-medium">No hay archivos GPS cargados</p>
        <p className="text-zinc-600 text-xs mt-2 max-w-sm mx-auto">Cargá el CSV de Catapult en cada sesión desde la sección <span className="text-zinc-400">Sesiones de Campo</span>. Los datos aparecerán aquí automáticamente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Panel de filtros */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
        {/* Toggle fuente + contador */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1 border border-zinc-700">
            {[
              { id: "all",     label: "Todo",           icon: null },
              { id: "session", label: "Entrenamientos", icon: Dumbbell },
              { id: "match",   label: "Partidos",       icon: Swords },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setSourceFilter(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  sourceFilter === id
                    ? id === "match"
                      ? "bg-red-500/20 text-red-300 border border-red-500/40"
                      : id === "session"
                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                      : "bg-zinc-700 text-white border border-zinc-600"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {Icon && <Icon size={11} />}
                {label}
                <span className="text-zinc-600 font-normal">
                  ({id === "session" ? sessionsWithCsv : id === "match" ? matchesWithCsv : totalWithCsv})
                </span>
              </button>
            ))}
          </div>
          {loadingCsvs && (
            <span className="flex items-center gap-1.5 text-zinc-500 text-xs">
              <div className="w-3 h-3 border border-zinc-600 border-t-white rounded-full animate-spin" />
              Cargando CSVs...
            </span>
          )}
          <span className="text-zinc-600 text-xs ml-auto">{filteredBySource.length} registros</span>
        </div>

        {/* Filtros adicionales (solo si no es vista de informe) */}
        {tab !== "last" && (
          <>
            <div className="flex items-center gap-2">
              <Filter size={12} className="text-zinc-600" />
              <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Filtros adicionales</span>
              {hasFilters && (
                <button onClick={() => { setDateFrom(""); setDateTo(""); setSessionType(""); setSeasonPeriod(""); setMatchDayCode(""); setSourceFilter("all"); }}
                  className="ml-auto text-xs text-zinc-500 hover:text-white border border-zinc-700 px-2 py-0.5 rounded-lg transition-colors">
                  Limpiar todo
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-zinc-500 text-xs">Desde</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:outline-none focus:border-zinc-500" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-zinc-500 text-xs">Hasta</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                  className="bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:outline-none focus:border-zinc-500" />
              </div>
              {sourceFilter !== "match" && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-zinc-500 text-xs">Tipo de sesión</label>
                    <select value={sessionType} onChange={(e) => setSessionType(e.target.value)}
                      className="bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:outline-none focus:border-zinc-500">
                      <option value="">Todos</option>
                      {SESSION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-zinc-500 text-xs">Período</label>
                    <select value={seasonPeriod} onChange={(e) => setSeasonPeriod(e.target.value)}
                      className="bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:outline-none focus:border-zinc-500">
                      <option value="">Todos</option>
                      {SEASON_PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-zinc-500 text-xs">Código de día</label>
                    <select value={matchDayCode} onChange={(e) => setMatchDayCode(e.target.value)}
                      className="bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:outline-none focus:border-zinc-500">
                      <option value="">Todos</option>
                      {MATCH_DAY_CODES.map((code) => <option key={code} value={code}>{code}</option>)}
                    </select>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit flex-wrap">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === id ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"
            }`}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === "last" && (
        <div className="space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <SessionSelector
              sessions={sessions}
              matches={matches}
              selectedId={reportSource?.id}
              onSelect={setSelectedReportId}
            />
            {reportSource && (
              <div className="mt-2 flex items-center gap-2">
                {reportSource.source === "match" ? (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-900/30 text-red-400 border border-red-800/40">
                    <Swords size={10} /> Partido
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-400 border border-blue-800/40">
                    <Dumbbell size={10} /> Entrenamiento
                  </span>
                )}
                {reportRows.length === 0 && !loadingCsvs && (
                  <span className="text-xs text-zinc-500">Sin datos GPS cargados para esta selección.</span>
                )}
              </div>
            )}
          </div>
          <LastSessionDashboard session={reportSource} rows={reportRows} />
        </div>
      )}
      {tab === "team" && (
        <TeamView allRows={filteredBySource} dateFrom={dateFrom} dateTo={dateTo} sessionType={sessionType} seasonPeriod={seasonPeriod} matchDayCode={matchDayCode} />
      )}
      {tab === "player" && (
        <PlayerView allRows={filteredBySource} dateFrom={dateFrom} dateTo={dateTo} sessionType={sessionType} seasonPeriod={seasonPeriod} matchDayCode={matchDayCode} />
      )}
      {tab === "comparison" && (
        <ComparisonView sessions={[...sessions, ...matches.map(m => ({ ...m, title: `vs. ${m.rival}` }))]} allRows={filteredBySource} dateFrom={dateFrom} dateTo={dateTo} sessionType={sessionType} seasonPeriod={seasonPeriod} matchDayCode={matchDayCode} />
      )}
    </div>
  );
}
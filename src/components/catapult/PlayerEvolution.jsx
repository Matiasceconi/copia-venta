import React, { useState, useMemo } from "react";
import moment from "moment";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, ReferenceLine,
} from "recharts";

const METRICS = [
  { key: "total_distance",          label: "Dist. Total (m)",    color: "#60a5fa" },
  { key: "distance_hsr",            label: "19.8-25 km/h (m)",   color: "#34d399" },
  { key: "sprint_distance",         label: "+25 km/h (m)",        color: "#fbbf24" },
  { key: "player_load",             label: "Player Load",         color: "#a78bfa" },
  { key: "max_velocity",            label: "Vel. Máx (km/h)",     color: "#f87171" },
  { key: "accelerations",           label: "Aceleraciones",       color: "#fb923c" },
  { key: "decelerations",           label: "Desaceleraciones",    color: "#e879f9" },
  { key: "meters_per_minute",       label: "m/min",               color: "#22d3ee" },
];

const NO_DECIMALS = new Set(["total_distance", "distance_hsr", "sprint_distance", "sprint_efforts", "accelerations", "decelerations"]);

function fmt(key, v) {
  if (v == null) return "—";
  return NO_DECIMALS.has(key) ? Math.round(v) : Number(v).toFixed(1);
}

const CustomTooltip = ({ active, payload, label, selectedMetrics }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-zinc-400 mb-2 font-medium">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          <span className="text-zinc-300">{p.name}:</span>
          <span className="text-white font-semibold">{fmt(p.dataKey, p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function PlayerEvolution({ reports }) {
  const allPlayers = useMemo(
    () => [...new Set(reports.map((r) => r.player_name).filter(Boolean))].sort(),
    [reports]
  );

  const allDates = useMemo(
    () => [...new Set(reports.map((r) => r.date).filter(Boolean))].sort(),
    [reports]
  );

  const [selectedPlayer, setSelectedPlayer] = useState(allPlayers[0] || "");
  const [dateFrom, setDateFrom] = useState(allDates[0] || "");
  const [dateTo, setDateTo] = useState(allDates[allDates.length - 1] || "");
  const [selectedMetrics, setSelectedMetrics] = useState(["total_distance", "player_load"]);

  function toggleMetric(key) {
    setSelectedMetrics((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  const chartData = useMemo(() => {
    if (!selectedPlayer) return [];
    return reports
      .filter(
        (r) =>
          r.player_name === selectedPlayer &&
          r.date >= (dateFrom || "") &&
          r.date <= (dateTo || "9999-99-99")
      )
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((r) => ({
        date: moment(r.date).format("DD/MM"),
        fullDate: r.date,
        session: r.session_label || r.date,
        ...Object.fromEntries(METRICS.map((m) => [m.key, r[m.key] ?? null])),
      }));
  }, [reports, selectedPlayer, dateFrom, dateTo]);

  // Stats summary
  const stats = useMemo(() => {
    if (!chartData.length) return {};
    const out = {};
    selectedMetrics.forEach((key) => {
      const vals = chartData.map((d) => d[key]).filter((v) => v != null);
      if (!vals.length) return;
      out[key] = {
        avg: vals.reduce((a, b) => a + b, 0) / vals.length,
        max: Math.max(...vals),
        min: Math.min(...vals),
      };
    });
    return out;
  }, [chartData, selectedMetrics]);

  if (allPlayers.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
        <p className="text-zinc-500 text-sm">No hay datos GPS cargados todavía.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Player selector */}
          <div className="flex flex-col gap-1">
            <label className="text-zinc-500 text-xs">Jugador</label>
            <select
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
              className="bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:outline-none focus:border-zinc-500 min-w-[180px]"
            >
              {allPlayers.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div className="flex flex-col gap-1">
            <label className="text-zinc-500 text-xs">Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:outline-none focus:border-zinc-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-zinc-500 text-xs">Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:outline-none focus:border-zinc-500"
            />
          </div>

          {/* Sessions count */}
          <div className="flex flex-col gap-1 pb-2">
            <span className="text-zinc-500 text-xs">Sesiones en rango</span>
            <span className="text-white font-bold text-lg leading-none">{chartData.length}</span>
          </div>
        </div>

        {/* Metric toggles */}
        <div>
          <p className="text-zinc-500 text-xs mb-2">Métricas a mostrar</p>
          <div className="flex flex-wrap gap-2">
            {METRICS.map((m) => {
              const active = selectedMetrics.includes(m.key);
              return (
                <button
                  key={m.key}
                  onClick={() => toggleMetric(m.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    active
                      ? "text-zinc-900 border-transparent"
                      : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white"
                  }`}
                  style={active ? { background: m.color, borderColor: m.color } : {}}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-10 text-center">
          <p className="text-zinc-500 text-sm">Sin datos para el jugador y rango seleccionados.</p>
        </div>
      ) : (
        <>
          {selectedMetrics.map((metricKey) => {
            const meta = METRICS.find((m) => m.key === metricKey);
            const s = stats[metricKey];
            return (
              <div key={metricKey} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ background: meta?.color }} />
                    {meta?.label}
                  </h3>
                  {s && (
                    <div className="flex gap-4 text-xs">
                      <span className="text-zinc-500">Prom: <span className="text-white font-semibold">{fmt(metricKey, s.avg)}</span></span>
                      <span className="text-green-400">Máx: <span className="font-semibold">{fmt(metricKey, s.max)}</span></span>
                      <span className="text-red-400">Mín: <span className="font-semibold">{fmt(metricKey, s.min)}</span></span>
                    </div>
                  )}
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData} margin={{ left: 0, right: 30, top: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#71717a", fontSize: 11 }} width={55} tickFormatter={(v) => fmt(metricKey, v)} />
                    <Tooltip content={<CustomTooltip selectedMetrics={[metricKey]} />} />
                    {s && (
                      <ReferenceLine y={s.avg} stroke={meta?.color} strokeDasharray="4 4" strokeOpacity={0.5}
                        label={{ value: "prom", position: "right", fill: meta?.color, fontSize: 10 }} />
                    )}
                    <Line
                      type="monotone"
                      dataKey={metricKey}
                      stroke={meta?.color}
                      strokeWidth={2}
                      dot={{ r: 4, fill: meta?.color, strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
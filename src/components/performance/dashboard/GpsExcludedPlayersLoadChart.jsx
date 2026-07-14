import React, { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const METRICS = [
  { key: "total_distance", label: "Distancia total", unit: "m", color: "#22c55e" },
  { key: "player_load", label: "Player Load", unit: "u", color: "#3b82f6" },
  { key: "sprints", label: "Sprints", unit: "", color: "#f59e0b" },
  { key: "m_min", label: "m/min", unit: "", color: "#60a5fa", mode: "avg" },
];

const STATUS_LABELS = {
  diferenciados: "Diferenciado",
  diferenciado: "Diferenciado",
  kinesiologia: "Kinesiología",
  excluidos: "Excluido / lesión",
};

function formatValue(value, unit) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const shown = Number(value) >= 100 ? Math.round(value).toLocaleString("es-AR") : Number(value).toFixed(1);
  return `${shown}${unit ? ` ${unit}` : ""}`;
}

function statusLabel(row) {
  const key = String(row.row_status || "excluidos").toLowerCase();
  return STATUS_LABELS[key] || "Excluido";
}

export default function GpsExcludedPlayersLoadChart({ rows = [] }) {
  const [metricKey, setMetricKey] = useState("total_distance");
  const metric = METRICS.find((item) => item.key === metricKey) || METRICS[0];

  const chartData = useMemo(() => {
    const excludedRows = rows.filter((row) => row.row_status && row.row_status !== "incluidos");
    const byPlayer = {};
    excludedRows.forEach((row) => {
      const id = row.player_id || row.player_name;
      if (!id) return;
      if (!byPlayer[id]) byPlayer[id] = { name: row.player_name || "Jugador", values: [], sessions: new Set(), statuses: new Set() };
      const value = Number(row[metric.key]);
      if (Number.isFinite(value)) byPlayer[id].values.push(value);
      if (row.session_id) byPlayer[id].sessions.add(row.session_id);
      byPlayer[id].statuses.add(statusLabel(row));
    });
    return Object.values(byPlayer)
      .map((item) => {
        const value = metric.mode === "avg"
          ? item.values.reduce((a, b) => a + b, 0) / Math.max(1, item.values.length)
          : item.values.reduce((a, b) => a + b, 0);
        return { name: item.name, value: Math.round(value * 10) / 10, sessions: item.sessions.size, status: [...item.statuses].join(" · ") };
      })
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
  }, [rows, metric]);

  return (
    <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h3 className="text-white font-bold text-lg">Cargas de jugadores excluidos</h3>
          <p className="text-zinc-500 text-sm">Diferenciados, kinesiología o lesionados fuera del promedio del microciclo.</p>
        </div>
        <select value={metricKey} onChange={(e) => setMetricKey(e.target.value)} className="bg-zinc-950 border border-zinc-800 text-white rounded-xl px-3 py-2 text-sm">
          {METRICS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
        </select>
      </div>

      {chartData.length ? (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 44, left: 96, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
              <XAxis type="number" stroke="#71717a" fontSize={10} />
              <YAxis type="category" dataKey="name" stroke="#a1a1aa" fontSize={11} width={126} />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 12, color: "#fff" }}
                formatter={(value) => [formatValue(value, metric.unit), metric.label]}
                labelFormatter={(label, payload) => `${label} · ${payload?.[0]?.payload?.status || "Excluido"} · ${payload?.[0]?.payload?.sessions || 0} sesiones`}
              />
              <Bar dataKey="value" name={metric.label} fill={metric.color} radius={[0, 8, 8, 0]}>
                <LabelList dataKey="value" position="right" fill="#e4e4e7" fontSize={10} formatter={(value) => formatValue(value, metric.unit)} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="py-10 text-center border border-dashed border-zinc-800 rounded-xl">
          <p className="text-zinc-500 text-sm">No hay jugadores excluidos con datos GPS en este microciclo.</p>
        </div>
      )}
    </div>
  );
}
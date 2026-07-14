import React, { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const POSITION_ORDER = [
  "Defensor Central",
  "Lateral Derecho",
  "Lateral Izquierdo",
  "Mediocampista Central",
  "Volante Interno",
  "Extremo",
  "Delantero Centro",
];
const POSITION_COLORS = {
  "Defensor Central": "#f59e0b",
  "Lateral Derecho": "#f97316",
  "Lateral Izquierdo": "#fb923c",
  "Mediocampista Central": "#60a5fa",
  "Volante Interno": "#38bdf8",
  "Extremo": "#22c55e",
  "Delantero Centro": "#a3e635",
};
const METRICS = [
  { key: "total_distance", label: "Distancia", unit: "m", aggregate: "sum" },
  { key: "player_load", label: "Player Load", unit: "", aggregate: "sum" },
  { key: "sprints", label: "Sprints", unit: "", aggregate: "sum" },
  { key: "m_min", label: "m/min", unit: "", aggregate: "avg" },
];

function numericValues(values) {
  return values.map((v) => Number(v)).filter(Number.isFinite);
}

function average(values) {
  const nums = numericValues(values);
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function sum(values) {
  return numericValues(values).reduce((a, b) => a + b, 0);
}

function normalizePosition(position) {
  const text = String(position || "").trim();
  const lower = text.toLowerCase();
  if (!text || lower.includes("arquero") || lower === "arq" || lower === "gk") return "";
  if (lower.includes("lateral") && lower.includes("dere")) return "Lateral Derecho";
  if (lower.includes("lateral") && lower.includes("izq")) return "Lateral Izquierdo";
  if (lower.includes("defensor") && lower.includes("central")) return "Defensor Central";
  if (lower.includes("mediocampista") && lower.includes("central")) return "Mediocampista Central";
  if (lower.includes("volante") || lower.includes("interno")) return "Volante Interno";
  if (lower.includes("extremo")) return "Extremo";
  if (lower.includes("delantero") || lower.includes("punta")) return "Delantero Centro";
  return POSITION_ORDER.includes(text) ? text : "";
}

export default function GpsPositionRadar({ rows = [] }) {
  const [analysisMode, setAnalysisMode] = useState("sum");
  const grouped = useMemo(() => {
    const map = Object.fromEntries(POSITION_ORDER.map((position) => [position, []]));
    rows.forEach((row) => {
      const position = normalizePosition(row.position);
      if (position) map[position].push(row);
    });
    return map;
  }, [rows]);

  const chartData = useMemo(() => {
    const fieldRows = rows.filter((row) => normalizePosition(row.position));
    return POSITION_ORDER.map((position) => {
      const positionRows = grouped[position];
      const item = { position, jugadores: new Set(positionRows.map((r) => r.player_id)).size };
      METRICS.forEach((metric) => {
        const useSum = analysisMode === "sum" && metric.aggregate === "sum";
        const teamValue = useSum ? sum(fieldRows.map((r) => r[metric.key])) : average(fieldRows.map((r) => r[metric.key]));
        const positionValue = useSum ? sum(positionRows.map((r) => r[metric.key])) : average(positionRows.map((r) => r[metric.key]));
        item[metric.key] = teamValue > 0 ? Math.round((positionValue / teamValue) * 100) : 0;
      });
      return item;
    });
  }, [rows, grouped, analysisMode]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h3 className="text-white font-bold text-lg">Carga por posición</h3>
          <p className="text-zinc-500 text-sm">{analysisMode === "sum" ? "Sumatoria relativa (%) de cargas del microciclo por posición." : "Promedio relativo (%) de cargas del microciclo por posición."}</p>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-1 flex text-xs">
          <button onClick={() => setAnalysisMode("sum")} className={`px-3 py-1.5 rounded-lg transition-colors ${analysisMode === "sum" ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-white"}`}>Sumatoria</button>
          <button onClick={() => setAnalysisMode("avg")} className={`px-3 py-1.5 rounded-lg transition-colors ${analysisMode === "avg" ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-white"}`}>Promedio</button>
        </div>
      </div>
      <div className="h-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 24, left: 92, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
            <XAxis type="number" stroke="#71717a" fontSize={10} />
            <YAxis type="category" dataKey="position" stroke="#a1a1aa" fontSize={11} width={120} />
            <Tooltip
              contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 12, color: "#fff" }}
              formatter={(value, key) => {
                const metric = METRICS.find((m) => m.key === key);
                return [`${value}%`, metric?.label || key];
              }}
              labelFormatter={(label, payload) => `${label} · ${payload?.[0]?.payload?.jugadores || 0} jugadores`}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {METRICS.map((metric) => (
              <Bar key={metric.key} dataKey={metric.key} name={metric.label} radius={[0, 6, 6, 0]}>
                {chartData.map((entry) => <Cell key={`${metric.key}-${entry.position}`} fill={POSITION_COLORS[entry.position]} fillOpacity={metric.key === "total_distance" ? 0.95 : 0.45} />)}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
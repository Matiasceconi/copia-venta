import React, { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import { fmtInt } from "./externalGpsLoadUtils";

const METRICS = [
  { key: "avgDistance", label: "Distancia prom. (m)", color: "#60a5fa" },
  { key: "avgPlayerLoad", label: "Player Load prom.", color: "#a78bfa" },
  { key: "avgMMin", label: "m/min prom.", color: "#34d399" },
];

export default function ExternalGpsDailyChart({ dailyData }) {
  const [metric, setMetric] = useState("avgDistance");
  const meta = METRICS.find((m) => m.key === metric);
  const hasData = dailyData.some((d) => d[metric] != null);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <h3 className="text-sm font-semibold text-white">Carga por día</h3>
        <div className="flex flex-wrap gap-1.5">
          {METRICS.map(({ key, label, color }) => (
            <button key={key} onClick={() => setMetric(key)}
              className="text-xs px-3 py-1.5 rounded-full border font-medium transition-colors"
              style={metric === key ? { backgroundColor: color, color: "#18181b", borderColor: color } : { backgroundColor: "transparent", color: "#71717a", borderColor: "#3f3f46" }}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {!hasData ? (
        <p className="text-zinc-600 text-sm text-center py-10">Sin datos GPS para esta semana</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dailyData} margin={{ left: 0, right: 10, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 11 }} />
            <YAxis tick={{ fill: "#71717a", fontSize: 11 }} width={45} />
            <Tooltip
              contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }}
              formatter={(v) => [fmtInt(v), meta?.label]}
            />
            <Bar dataKey={metric} fill={meta?.color} radius={[4, 4, 0, 0]}>
              <LabelList dataKey={metric} position="top" formatter={fmtInt} fill="#d4d4d8" fontSize={11} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
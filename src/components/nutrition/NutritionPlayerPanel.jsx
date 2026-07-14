import React, { useMemo, useState } from "react";
import moment from "moment";
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, Target } from "lucide-react";
import PlayerPhoto from "@/components/player/PlayerPhoto";

const METRICS = [
  { key: "peso", label: "Peso", unit: "kg", best: "low", color: "#60a5fa" },
  { key: "sumatoria_6p", label: "Sumatoria 6 Pliegues", unit: "mm", best: "low", color: "#fb923c" },
  { key: "imo", label: "IMO", unit: "", best: "high", color: "#34d399" },
  { key: "porcentaje_grasa", label: "% Grasa", unit: "%", best: "low", color: "#f472b6" },
  { key: "kg_grasa", label: "Kg grasa", unit: "kg", best: "low", color: "#f59e0b" },
  { key: "kg_masa_muscular", label: "Masa muscular", unit: "kg", best: "high", color: "#a78bfa" },
];

function formatValue(value, unit = "") {
  if (value === undefined || value === null || value === "" || Number.isNaN(Number(value))) return "—";
  return `${Number(value).toFixed(1)}${unit ? ` ${unit}` : ""}`;
}

function isGoalkeeper(player) {
  const text = `${player?.position || ""} ${player?.player_type || ""}`.toLowerCase();
  return text.includes("arquero") || text.includes("arq") || text.includes("goalkeeper") || text.includes("gk");
}

export default function NutritionPlayerPanel({ player, assessments = [], interpretations = [], referenceRanges = [] }) {
  const [metricKey, setMetricKey] = useState("sumatoria_6p");
  const metric = METRICS.find((item) => item.key === metricKey) || METRICS[1];
  const sorted = useMemo(() => [...assessments].sort((a, b) => String(a.fecha || "").localeCompare(String(b.fecha || ""))), [assessments]);
  const playerType = isGoalkeeper(player) ? "goalkeeper" : "field";
  const references = referenceRanges.filter((r) => r.active !== false && r.player_type === playerType && r.metric_key === metric.key).sort((a, b) => (a.order || 0) - (b.order || 0));
  const latest = sorted[sorted.length - 1];
  const linkedReading = interpretations.find((r) => r.nutrition_assessment_id === latest?.id || r.nutrition_assessment_key === latest?.nutrition_assessment_key);

  const chartData = sorted.map((row, index) => {
    const previous = index > 0 ? sorted[index - 1] : null;
    const value = row[metric.key] === undefined || row[metric.key] === null ? null : Number(row[metric.key]);
    const prevValue = previous?.[metric.key] === undefined || previous?.[metric.key] === null ? null : Number(previous[metric.key]);
    return {
      label: row.fecha ? moment(row.fecha).format("DD/MM") : "—",
      fecha: row.fecha ? moment(row.fecha).format("DD/MM/YYYY") : "—",
      value,
      diff: value !== null && prevValue !== null ? value - prevValue : null,
    };
  });

  const comparisonRows = METRICS.map((item) => {
    const values = sorted.map((row) => row[item.key]).filter((value) => value !== undefined && value !== null && value !== "").map(Number);
    const bestValue = values.length ? (item.best === "low" ? Math.min(...values) : Math.max(...values)) : null;
    const avgValue = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    return { item, latest: latest?.[item.key], previous: sorted[sorted.length - 2]?.[item.key], bestValue, avgValue };
  });

  const name = player?.full_name || `${player?.first_name || ""} ${player?.last_name || ""}`.trim() || latest?.player_name_original || "Jugador";

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <PlayerPhoto player={player || { full_name: name }} className="w-14 h-14 rounded-full object-cover border border-zinc-700" fallbackClassName="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center" textClassName="text-sm font-bold text-zinc-400" />
            <div>
              <h3 className="text-white text-lg font-black">{name}</h3>
              <p className="text-xs text-zinc-500">{player?.position || "Sin posición"} · {player?.squad_name || latest?.squad_id || "Plantel"} · {sorted.length} evaluaciones</p>
              {linkedReading && <p className="text-xs text-emerald-400 mt-1">Lectura vinculada: {linkedReading.interpretation_note || linkedReading.observation || "Disponible"}</p>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {METRICS.map((item) => <button key={item.key} onClick={() => setMetricKey(item.key)} className={`px-3 py-1.5 rounded-full border text-xs font-semibold ${metric.key === item.key ? "text-zinc-950 border-transparent" : "text-zinc-400 border-zinc-700 hover:text-white"}`} style={metric.key === item.key ? { backgroundColor: item.color } : {}}>{item.label}</button>)}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
            <h4 className="text-sm font-bold text-white mb-3">Evolución real · {metric.label}</h4>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="label" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} width={42} />
                  <Tooltip content={({ active, payload }) => active && payload?.length ? <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-xs"><p className="text-zinc-400">{payload[0].payload.fecha}</p><p className="text-white font-bold">{formatValue(payload[0].value, metric.unit)}</p><p className="text-zinc-500">Δ anterior: {payload[0].payload.diff == null ? "—" : `${payload[0].payload.diff > 0 ? "+" : ""}${payload[0].payload.diff.toFixed(1)}`}</p></div> : null} />
                  <Line type="monotone" dataKey="value" stroke={metric.color} strokeWidth={3} dot={{ r: 4, fill: metric.color }} activeDot={{ r: 6 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800"><h4 className="text-sm font-bold text-white">Comparativo</h4></div>
            <table className="w-full text-xs">
              <thead className="text-zinc-500"><tr><th className="text-left p-2">Variable</th><th className="p-2">Últ.</th><th className="p-2">Ant.</th><th className="p-2">Mejor</th><th className="p-2">Prom.</th></tr></thead>
              <tbody>{comparisonRows.map(({ item, latest, previous, bestValue, avgValue }) => <tr key={item.key} className="border-t border-zinc-800/60"><td className="p-2 text-zinc-300">{item.label}</td><td className="p-2 text-center text-white">{formatValue(latest, item.unit)}</td><td className="p-2 text-center text-zinc-400">{formatValue(previous, item.unit)}</td><td className="p-2 text-center text-emerald-400">{formatValue(bestValue, item.unit)}</td><td className="p-2 text-center text-zinc-400">{formatValue(avgValue, item.unit)}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      </div>

      <aside className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 xl:sticky xl:top-4 self-start">
        <div className="flex items-center gap-2 mb-4"><Target size={16} className="text-emerald-400" /><h4 className="text-white font-bold">Referencias automáticas</h4></div>
        <p className="text-xs text-zinc-500 mb-3">Tipo detectado: <span className="text-zinc-300 font-semibold">{playerType === "goalkeeper" ? "Arquero" : "Jugador de campo"}</span></p>
        <div className="space-y-2">
          {references.length ? references.map((ref) => <div key={ref.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2"><span className="text-xs font-semibold" style={{ color: ref.color || "#a1a1aa" }}>{ref.label}</span><span className="text-xs text-zinc-500">{ref.min_value ?? "—"} <ArrowRight size={10} className="inline" /> {ref.max_value ?? "—"}</span></div>) : <p className="text-xs text-zinc-500">No hay referencias configuradas para esta métrica.</p>}
        </div>
        <p className="text-[11px] text-zinc-600 mt-4">Las referencias se administran desde Configuración de Nutrición.</p>
      </aside>
    </div>
  );
}
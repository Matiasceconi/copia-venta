import React, { useMemo, useState } from "react";
import moment from "moment";
import { Bar, CartesianGrid, ComposedChart, LabelList, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MICRO_METRICS, buildMdBlocks, buildObjectiveBlocks, compareGroups, fmt } from "./gpsMicrocycleReportUtils";

function lightClass(light) {
  if (light === "Rojo") return "bg-red-500/15 text-red-300 border-red-500/30";
  if (light === "Amarillo") return "bg-yellow-500/15 text-yellow-200 border-yellow-500/30";
  if (light === "Verde") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  return "bg-zinc-700/40 text-zinc-400 border-zinc-700";
}

function ComparisonTable({ title, subtitle, rows, labelA = "Grupo A", labelB = "Grupo B" }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 overflow-x-auto">
      <div className="mb-3">
        <h3 className="text-white font-bold text-base">{title}</h3>
        {subtitle && <p className="text-zinc-500 text-xs">{subtitle}</p>}
      </div>
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="text-left text-zinc-500 border-b border-zinc-800">
            <th className="py-2 pr-3">Variable</th>
            <th className="py-2 pr-3">{labelA}</th>
            <th className="py-2 pr-3">{labelB}</th>
            <th className="py-2 pr-3">Dif. absoluta</th>
            <th className="py-2 pr-3">Dif. %</th>
            <th className="py-2 pr-3">Semáforo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.metric.key} className="border-b border-zinc-800/60">
              <td className="py-2 pr-3 text-white font-semibold">{r.metric.label}</td>
              <td className="py-2 pr-3 text-zinc-300">{fmt(r.a, r.metric.unit)}</td>
              <td className="py-2 pr-3 text-zinc-200 font-semibold">{fmt(r.b, r.metric.unit)}</td>
              <td className="py-2 pr-3 text-zinc-300">{r.diffAbs == null ? "—" : fmt(r.diffAbs, r.metric.unit)}</td>
              <td className="py-2 pr-3 text-zinc-300">{r.diff == null ? "—" : `${r.diff > 0 ? "+" : ""}${r.diff.toFixed(1)}%`}</td>
              <td className="py-2 pr-3"><span className={`inline-flex px-2 py-1 rounded-lg border text-xs font-bold ${lightClass(r.light)}`}>{r.light}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GroupSelect({ label, value, onChange, options }) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-semibold text-zinc-400">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function EvolutionChart({ sessions, metric }) {
  const ordered = [...sessions].sort((a, b) => (a.date || "").localeCompare(b.date || "")).slice(-6);
  const values = ordered.map((s) => Number(s[metric.key])).filter(Number.isFinite);
  const histAvg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const last4 = values.slice(-4);
  const last4Avg = last4.length ? last4.reduce((a, b) => a + b, 0) / last4.length : null;
  const data = ordered.map((s, idx) => ({
    ...s,
    label: moment(s.date).format("DD/MM"),
    value: s[metric.key],
    trend: values.length > 1 ? values[0] + ((values[values.length - 1] - values[0]) * idx) / Math.max(values.length - 1, 1) : s[metric.key],
  }));

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      <div className="mb-3">
        <h3 className="text-white font-bold text-base">Evolución · {metric.label}</h3>
        <p className="text-zinc-500 text-xs">Últimas 6 sesiones filtradas, tendencia, promedio histórico y promedio últimas 4.</p>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 20, right: 24, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="label" stroke="#71717a" fontSize={10} />
            <YAxis stroke="#71717a" fontSize={10} />
            <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 12, color: "#fff" }} formatter={(v) => fmt(v, metric.unit)} />
            <Legend />
            <ReferenceLine y={histAvg} stroke="#facc15" strokeDasharray="4 4" label={{ value: "Hist.", fill: "#facc15", fontSize: 10 }} />
            <ReferenceLine y={last4Avg} stroke="#22c55e" strokeDasharray="4 4" label={{ value: "Últ.4", fill: "#22c55e", fontSize: 10 }} />
            <Bar dataKey="value" name={metric.label} fill={metric.color} radius={[6, 6, 0, 0]}>
              <LabelList dataKey="value" position="top" fill="#e4e4e7" fontSize={10} formatter={(v) => v == null ? "—" : Math.round(v)} />
            </Bar>
            <Line type="monotone" dataKey="trend" name="Tendencia" stroke="#ffffff" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function GpsHistoricalAnalysisPanel({ sessionAverages, season }) {
  const objectives = useMemo(() => [...new Set(sessionAverages.map((s) => s.objective).filter((v) => v && v !== "—"))].sort(), [sessionAverages]);
  const mdOptions = useMemo(() => [...new Set(sessionAverages.map((s) => s.md).filter((v) => v && v !== "—"))].sort(), [sessionAverages]);
  const [objective, setObjective] = useState("");
  const [md, setMd] = useState("");
  const [metricKey, setMetricKey] = useState("total_distance");
  const activeObjective = objective || objectives[0] || "";
  const activeMd = md || mdOptions[0] || "";
  const objectiveBlocks = buildObjectiveBlocks(sessionAverages, activeObjective, season);
  const mdBlocks = buildMdBlocks(sessionAverages, activeMd, season);
  const groupOptions = [
    { value: "objective_current", label: `Sesión actual · ${activeObjective || "Objetivo"}`, rows: objectiveBlocks.current },
    { value: "objective_last4", label: `Últimas 4 · ${activeObjective || "Objetivo"}`, rows: objectiveBlocks.last4 },
    { value: "objective_last8", label: `Últimas 8 · ${activeObjective || "Objetivo"}`, rows: objectiveBlocks.last8 },
    { value: "objective_history", label: `Histórico · ${activeObjective || "Objetivo"}`, rows: objectiveBlocks.historical },
    { value: "md_current", label: `MD actual · ${activeMd || "MD"}`, rows: mdBlocks.current },
    { value: "md_history", label: `Histórico · ${activeMd || "MD"}`, rows: mdBlocks.historical },
  ];
  const [groupA, setGroupA] = useState("objective_last4");
  const [groupB, setGroupB] = useState("objective_current");
  const rowsA = groupOptions.find((g) => g.value === groupA)?.rows || [];
  const rowsB = groupOptions.find((g) => g.value === groupB)?.rows || [];
  const metric = MICRO_METRICS.find((m) => m.key === metricKey) || MICRO_METRICS[0];

  if (!sessionAverages.length) return null;

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="flex-1">
            <h3 className="text-white font-bold text-lg">Análisis histórico y metodológico</h3>
            <p className="text-zinc-500 text-sm">Compará objetivos físicos, códigos MD, grupos de sesiones y evolución de cargas de toda la temporada.</p>
          </div>
          <GroupSelect label="Objetivo físico" value={activeObjective} onChange={setObjective} options={objectives.map((o) => ({ value: o, label: o }))} />
          <GroupSelect label="Código MD" value={activeMd} onChange={setMd} options={mdOptions.map((o) => ({ value: o, label: o }))} />
          <GroupSelect label="Variable evolución" value={metricKey} onChange={setMetricKey} options={MICRO_METRICS.map((m) => ({ value: m.key, label: m.label }))} />
        </div>
      </div>

      <ComparisonTable title={`Comparación por objetivo físico · ${activeObjective}`} subtitle="Sesión actual contra últimas 4 sesiones del mismo objetivo." rows={compareGroups(objectiveBlocks.last4, objectiveBlocks.current)} labelA="Últimas 4" labelB="Actual" />
      <ComparisonTable title={`Objetivo físico · ${activeObjective} vs últimas 8`} subtitle="Control de estabilidad metodológica contra las últimas 8 sesiones del mismo objetivo." rows={compareGroups(objectiveBlocks.last8, objectiveBlocks.current)} labelA="Últimas 8" labelB="Actual" />
      <ComparisonTable title={`Objetivo físico · ${activeObjective} vs histórico`} subtitle="Sesión actual contra promedio histórico completo." rows={compareGroups(objectiveBlocks.historical, objectiveBlocks.current)} labelA="Histórico" labelB="Actual" />
      <ComparisonTable title={`Objetivo físico · ${activeObjective} vs temporada`} subtitle="Sesión actual contra promedio de temporada para el mismo objetivo." rows={compareGroups(objectiveBlocks.season, objectiveBlocks.current)} labelA="Temporada" labelB="Actual" />
      <ComparisonTable title={`Comparación por código del día · ${activeMd}`} subtitle="MD actual contra promedio histórico del mismo MD." rows={compareGroups(mdBlocks.historical, mdBlocks.current)} labelA="Histórico MD" labelB="Actual MD" />

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <GroupSelect label="Grupo A" value={groupA} onChange={setGroupA} options={groupOptions} />
          <GroupSelect label="Grupo B" value={groupB} onChange={setGroupB} options={groupOptions} />
        </div>
      </div>
      <ComparisonTable title="Comparador de sesiones" subtitle="Comparación libre entre dos grupos seleccionados." rows={compareGroups(rowsA, rowsB)} labelA="Grupo A" labelB="Grupo B" />
      <EvolutionChart sessions={objectiveBlocks.current.concat(objectiveBlocks.historical)} metric={metric} />
    </div>
  );
}
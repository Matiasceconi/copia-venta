import React from "react";
import { fmt } from "./gpsMicrocycleReportUtils";

function trendClass(trend) {
  if (trend === "Sube") return "text-red-300";
  if (trend === "Baja") return "text-blue-300";
  if (trend === "Estable") return "text-emerald-300";
  return "text-zinc-500";
}

export default function GpsMicrocycleComparison({ comparison }) {
  const hasPrevious = (comparison[0]?.weeksAvailable || 0) > 0;
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <div className="mb-4">
        <h3 className="text-white font-bold text-lg">Comparación con microciclo anterior</h3>
        <p className="text-zinc-500 text-sm">Semana actual vs microciclo anterior, respetando los filtros aplicados.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-500 border-b border-zinc-800">
              <th className="py-2 pr-3">Variable</th>
              <th className="py-2 pr-3">Semana actual</th>
              <th className="py-2 pr-3">Microciclo anterior</th>
              <th className="py-2 pr-3">Dif. absoluta</th>
              <th className="py-2 pr-3">Dif. %</th>
              <th className="py-2 pr-3">Tendencia</th>
            </tr>
          </thead>
          <tbody>
            {comparison.map((item) => (
              <tr key={item.metric.key} className="border-b border-zinc-800/60">
                <td className="py-2 pr-3 text-white font-semibold">{item.metric.label}</td>
                <td className="py-2 pr-3 text-zinc-200">{fmt(item.current, item.metric.unit)}</td>
                <td className="py-2 pr-3 text-zinc-300">{hasPrevious ? fmt(item.previous, item.metric.unit) : "—"}</td>
                <td className="py-2 pr-3 text-zinc-300">{item.diffAbs == null ? "—" : fmt(item.diffAbs, item.metric.unit)}</td>
                <td className={`py-2 pr-3 ${trendClass(item.trend)}`}>{item.diff == null ? "—" : `${item.diff > 0 ? "+" : ""}${item.diff.toFixed(1)}%`}</td>
                <td className={`py-2 pr-3 font-semibold ${trendClass(item.trend)}`}>{item.trend}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
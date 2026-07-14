import React from "react";
import { MICRO_METRICS, fmt, loadColorClass } from "./gpsMicrocycleReportUtils";

export default function GpsMicrocycleDailyTable({ dailySummaries, metrics = MICRO_METRICS }) {
  const averages = Object.fromEntries(metrics.map((m) => {
    const values = dailySummaries.map((d) => d[m.key]).filter((v) => v != null);
    return [m.key, values.length ? values.reduce((a, b) => a + b, 0) / values.length : null];
  }));

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 overflow-x-auto">
      <div className="mb-4">
        <h3 className="text-white font-bold text-lg">Detalle diario del microciclo</h3>
        <p className="text-zinc-500 text-sm">Valores calculados según los filtros aplicados; excluidos visibles aparte cuando corresponde.</p>
      </div>
      <table className="w-full min-w-[1180px] text-sm">
        <thead>
          <tr className="text-left text-zinc-500 border-b border-zinc-800">
            <th className="py-2 pr-3">Día</th>
            <th className="py-2 pr-3">MD</th>
            <th className="py-2 pr-3">Sesiones</th>
            {metrics.map((m) => <th key={m.key} className="py-2 pr-3">{m.short}</th>)}
            <th className="py-2 pr-3">GPS</th>
            <th className="py-2 pr-3">Excluidos</th>
          </tr>
        </thead>
        <tbody>
          {dailySummaries.map((day) => (
            <tr key={day.date} className="border-b border-zinc-800/70 align-top">
              <td className="py-3 pr-3 text-white font-semibold">{day.label}</td>
              <td className="py-3 pr-3 text-zinc-300">{day.md}</td>
              <td className="py-3 pr-3 text-zinc-400 max-w-[180px]">{(day.sessions || []).map((s) => s.title).join(" · ") || "Sin sesión"}</td>
              {metrics.map((m) => (
                <td key={m.key} className="py-3 pr-3">
                  <span className={`inline-flex px-2 py-1 rounded-lg border text-xs font-semibold ${loadColorClass(day[m.key], averages[m.key])}`}>{fmt(day[m.key], m.unit)}</span>
                </td>
              ))}
              <td className="py-3 pr-3 text-emerald-300 font-bold">{day.gpsPlayers}</td>
              <td className="py-3 pr-3 text-zinc-400">
                {day.excludedCount ? (
                  <div className="space-y-1">
                    {(day.excludedRows || []).slice(0, 4).map((r) => <p key={`${day.date}-${r.player_id}-${r.session_id}`} className="text-xs">{r.player_name} · {r.gps_group || r.exclusion_reason || "excluido"}</p>)}
                    {(day.excludedRows || []).length > 4 && <p className="text-xs text-zinc-500">+{(day.excludedRows || []).length - 4} más</p>}
                  </div>
                ) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
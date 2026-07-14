import React, { useMemo, useState } from "react";
import { ArrowUpDown, Expand, TrendingDown, TrendingUp, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { REPORT_METRICS, fmtMetricVal } from "./sessionGpsReportData";
import PlayerPhoto from "@/components/player/PlayerPhoto";

function pctColorClass(pct) {
  if (pct == null) return "bg-zinc-700 text-zinc-300";
  if (pct > 80) return "bg-red-500/85 text-white";
  if (pct >= 50) return "bg-yellow-500/85 text-zinc-900";
  return "bg-emerald-500/85 text-white";
}

function metricText(metric, value) {
  const v = fmtMetricVal(metric.key, value);
  if (v === "—") return "—";
  if (metric.key === "sprints") return `${v} sprints`;
  if (metric.key === "acc_3") return `${v} ACC`;
  if (metric.key === "dec_3") return `${v} DEC`;
  return metric.unit ? `${v} ${metric.unit}` : v;
}

function MetricChart({ metric, rows, average, expanded, onExpand, onClose }) {
  const data = [...rows].filter(r => r[metric.key] != null).sort((a, b) => (b[metric.key] || 0) - (a[metric.key] || 0)).map(r => ({ name: r.display_name || r.player_name, value: r[metric.key] || 0 }));
  const height = Math.max(220, data.length * 34 + 30);
  return (
    <div className={expanded ? "fixed inset-4 z-[70] bg-zinc-950 border border-zinc-700 rounded-2xl p-5 shadow-2xl" : "bg-zinc-800/40 border border-zinc-800 rounded-xl p-3"}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-xs font-bold text-white">{metric.label}</p>
          <p className="text-[10px] text-zinc-500">Por jugador · promedio del equipo visible</p>
        </div>
        <button onClick={expanded ? onClose : onExpand} className="p-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800">
          {expanded ? <X size={14} /> : <Expand size={14} />}
        </button>
      </div>
      <ResponsiveContainer width="100%" height={expanded ? Math.max(420, data.length * 38) : height}>
        <BarChart data={data} layout="vertical" margin={{ left: 70, right: 86, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
          <XAxis type="number" tick={{ fill: "#71717a", fontSize: 10 }} />
          <YAxis type="category" dataKey="name" width={68} tick={{ fill: "#d4d4d8", fontSize: 11 }} />
          <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }} formatter={(v) => metricText(metric, v)} />
          {average != null && <ReferenceLine x={average} stroke="#facc15" strokeDasharray="4 4" label={{ value: "Prom.", fill: "#facc15", fontSize: 10 }} />}
          <Bar dataKey="value" radius={[0, 6, 6, 0]}>
            <LabelList dataKey="value" position="right" fill="#e4e4e7" fontSize={10} formatter={(v) => metricText(metric, v)} />
            {data.map((_, idx) => <Cell key={idx} fill={metric.color} fillOpacity={0.9} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Rankings({ rows }) {
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-bold text-white">3. Rankings principales</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {REPORT_METRICS.map(metric => {
          const top = [...rows].filter(r => r[metric.key] != null).sort((a, b) => (b[metric.key] || 0) - (a[metric.key] || 0)).slice(0, 3);
          return (
            <div key={metric.key} className="bg-zinc-800/50 border border-zinc-800 rounded-xl p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: metric.color }}>{metric.label}</p>
              <div className="space-y-1.5">
                {top.map((r, idx) => <div key={r.player_id || idx} className="flex items-center justify-between gap-2 text-xs"><span className="text-white truncate">{medals[idx]} {r.display_name || r.player_name}</span><span className="font-bold text-zinc-200 whitespace-nowrap">{metricText(metric, r[metric.key])}</span></div>)}
                {!top.length && <p className="text-xs text-zinc-500">Sin datos</p>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function SessionGpsReportContent({ session, reportData, observations, setObservations, saving, onSaveObservations }) {
  const [sortKey, setSortKey] = useState("total_distance");
  const [sortDir, setSortDir] = useState("desc");
  const [chartMetric, setChartMetric] = useState("total_distance");
  const [expandedMetric, setExpandedMetric] = useState(null);
  const sortedPrincipal = useMemo(() => [...reportData.principal].sort((a, b) => ((b[sortKey] || 0) - (a[sortKey] || 0)) * (sortDir === "desc" ? 1 : -1)), [reportData, sortKey, sortDir]);
  const activeMetric = REPORT_METRICS.find(m => m.key === chartMetric) || REPORT_METRICS[0];
  const expanded = expandedMetric ? REPORT_METRICS.find(m => m.key === expandedMetric) : null;
  function toggleSort(key) { if (sortKey === key) setSortDir(d => d === "desc" ? "asc" : "desc"); else { setSortKey(key); setSortDir("desc"); } }
  return (
    <div className="gps-report-export bg-zinc-900 text-white space-y-6 p-1">
      <section className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
        <p className="text-[10px] text-yellow-400 uppercase tracking-[0.2em]">Informe profesional GPS</p>
        <h2 className="text-lg font-bold mt-1">{session.title}</h2>
        <p className="text-xs text-zinc-500">{session.squad_name || "Plantel"} · {session.date} · arqueros excluidos automáticamente</p>
      </section>
      <section className="space-y-3"><h3 className="text-sm font-bold">1. Resumen general</h3><div className="grid grid-cols-3 sm:grid-cols-5 gap-2">{[["Con GPS", reportData.summary.conGps], ["Excluidos", reportData.summary.excluidos], ["Diferenciados", reportData.summary.diferenciados], ["Kinesiología", reportData.summary.kinesiologia], ["Duración", reportData.summary.duracion ? `${reportData.summary.duracion}'` : "—"]].map(([label, val]) => <div key={label} className="bg-zinc-800/60 rounded-lg p-2 text-center"><p className="text-base font-bold">{val}</p><p className="text-[9px] text-zinc-500">{label}</p></div>)}</div><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{REPORT_METRICS.map(m => { const val = reportData.teamAverages[m.key], wk = reportData.weekAverages[m.key]; const diff = (val != null && wk) ? Math.round(((val - wk) / wk) * 100) : null; return <div key={m.key} className="bg-zinc-800/40 border border-zinc-800 rounded-lg p-2.5"><p className="text-[9px] text-zinc-500">{m.label}</p><p className="text-sm font-bold" style={{ color: m.color }}>{metricText(m, val)}</p>{diff != null && <p className={`text-[9px] flex items-center gap-1 ${diff >= 0 ? "text-emerald-400" : "text-red-400"}`}>{diff >= 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />} {diff >= 0 ? "+" : ""}{diff}% vs semana</p>}</div>; })}</div></section>
      <section className="space-y-3"><h3 className="text-sm font-bold">2. Gráficos por jugador</h3><div className="flex flex-wrap gap-2">{REPORT_METRICS.map(m => <button key={m.key} onClick={() => setChartMetric(m.key)} className={`px-3 py-1 rounded-full text-[10px] font-semibold border ${chartMetric === m.key ? "text-zinc-950 border-transparent" : "text-zinc-400 border-zinc-700"}`} style={chartMetric === m.key ? { backgroundColor: m.color } : {}}>{m.label}</button>)}</div><MetricChart metric={activeMetric} rows={reportData.principal} average={reportData.teamAverages[activeMetric.key]} onExpand={() => setExpandedMetric(activeMetric.key)} /></section>
      <Rankings rows={reportData.principal} />
      <section className="space-y-2"><h3 className="text-sm font-bold">4. Tabla general</h3><div className="overflow-x-auto border border-zinc-800 rounded-lg"><table className="w-full text-xs border-collapse"><thead><tr className="bg-zinc-800"><th className="text-left py-2 px-3 text-zinc-400 font-medium whitespace-nowrap">Jugador</th>{REPORT_METRICS.map(m => <th key={m.key} onClick={() => toggleSort(m.key)} className="text-right py-2 px-2 text-zinc-400 font-medium whitespace-nowrap cursor-pointer"><span className="flex items-center justify-end gap-1">{m.label} <ArrowUpDown size={9} /></span></th>)}</tr></thead><tbody>{sortedPrincipal.map(r => <tr key={r.player_id} className="border-t border-zinc-800/60"><td className="py-2 px-3 whitespace-nowrap flex items-center gap-2"><PlayerPhoto player={r._player || { full_name: r.display_name || r.player_name }} alt={r.display_name || r.player_name} className="w-7 h-7 rounded-full object-cover" fallbackClassName="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center" textClassName="text-xs font-bold text-zinc-300" /><div><p className="font-semibold">{r.display_name || r.player_name}</p><p className="text-[9px] text-zinc-500">{r._player?.position || "—"}</p></div></td>{REPORT_METRICS.map(m => <td key={m.key} className="text-right py-2 px-2 font-semibold whitespace-nowrap" style={{ color: m.color }}>{metricText(m, r[m.key])}</td>)}</tr>)}</tbody></table></div>{reportData.excluded.length > 0 && <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3"><p className="text-[10px] font-semibold text-amber-300 mb-1">Excluidos de los promedios ({reportData.excluded.length})</p><p className="text-[10px] text-zinc-400">{reportData.excluded.map(r => r.display_name || r.player_name).join(", ")}</p></div>}</section>
      {reportData.comparison.length > 0 && <section className="space-y-2"><h3 className="text-sm font-bold">5. Comparación vs. perfil competitivo</h3>{reportData.comparison.map(c => <div key={c.player_id} className="bg-zinc-800/40 border border-zinc-800 rounded-lg p-2.5"><p className="text-xs font-semibold mb-1.5">{c.display_name || c.player_name}</p><div className="grid grid-cols-3 sm:grid-cols-9 gap-1.5">{c.metrics.map(m => <div key={m.key} className={`rounded px-1.5 py-1 text-center ${pctColorClass(m.pct)}`}><p className="text-[8px] opacity-80">{m.label}</p><p className="text-[10px] font-bold">{m.pct != null ? `${Math.round(m.pct)}%` : "—"}</p></div>)}</div></div>)}</section>}
      <section className="space-y-2"><h3 className="text-sm font-bold">6. Análisis automático</h3><div className="bg-zinc-800/40 border border-zinc-800 rounded-lg p-3 space-y-1">{reportData.insights.map((line, i) => <p key={i} className="text-xs text-zinc-300">• {line}</p>)}</div></section>
      <section className="space-y-2"><h3 className="text-sm font-bold">7. Observaciones</h3><textarea rows={3} value={observations} onChange={e => setObservations(e.target.value)} placeholder="Observaciones del cuerpo técnico sobre esta sesión..." className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white resize-none focus:outline-none focus:border-zinc-500" /><button onClick={onSaveObservations} disabled={saving} className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 rounded-lg text-xs transition-colors disabled:opacity-50">{saving ? "Guardando..." : "Guardar observaciones"}</button></section>
      {expanded && <MetricChart metric={expanded} rows={reportData.principal} average={reportData.teamAverages[expanded.key]} expanded onClose={() => setExpandedMetric(null)} />}
    </div>
  );
}
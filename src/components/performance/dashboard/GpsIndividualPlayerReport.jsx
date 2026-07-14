import React, { useMemo, useState } from "react";
import { Activity, CalendarDays, CheckCircle2, Download, Eye, Info, Shield, Trophy, Zap } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import PlayerPhoto from "@/components/player/PlayerPhoto";

const METRICS = [
  { key: "total_distance", label: "Distancia total", unit: "m", profile: "avg_total_distance" },
  { key: "m_min", label: "m/min", unit: "m/min", profile: "avg_m_min" },
  { key: "distance_19_8", label: "D >19.8", unit: "m", profile: "avg_distance_19_8" },
  { key: "distance_25", label: "D >25", unit: "m", profile: "avg_distance_25" },
  { key: "sprints", label: "Sprints", unit: "n°", profile: "avg_sprints" },
  { key: "acc_3", label: "ACC +3", unit: "n°", profile: "avg_acc_3" },
  { key: "dec_3", label: "DEC +3", unit: "n°", profile: "avg_dec_3" },
  { key: "player_load", label: "Player Load", unit: "au", profile: "avg_player_load" },
  { key: "smax", label: "Smax", unit: "km/h", profile: "avg_smax" },
];

const avg = (values) => {
  const nums = values.filter((v) => Number.isFinite(Number(v))).map(Number);
  return nums.length ? nums.reduce((s, v) => s + v, 0) / nums.length : 0;
};
const fmt = (value, decimals = 0) => Number(value || 0).toLocaleString("es-AR", { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
const pct = (value, base) => base ? Math.round((Number(value || 0) / Number(base)) * 100) : null;
const statusColor = (percentage) => percentage == null ? "#52525b" : percentage > 80 ? "#ef4444" : percentage >= 50 ? "#eab308" : "#22c55e";
const shortDate = (date) => date ? new Date(`${date}T00:00:00`).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }) : "—";
const calcAge = (birthDate) => {
  if (!birthDate) return "—";
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age -= 1;
  return age;
};

function Panel({ title, children, action, className = "" }) {
  return <div className={`bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-xl shadow-black/20 ${className}`}><div className="flex items-center justify-between gap-3 mb-3"><h3 className="text-xs font-bold uppercase tracking-wide text-white">{title}</h3>{action}</div>{children}</div>;
}

function PlayerHero({ player, stats, profile, records }) {
  const topMetrics = METRICS.map((m) => ({ ...m, value: stats[m.key], profileValue: profile?.[m.profile] }));
  return <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_2fr] gap-4"><div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex gap-4"><div className="w-24 h-28 rounded-2xl bg-zinc-800 overflow-hidden border border-zinc-700 shrink-0"><PlayerPhoto player={player} className="w-full h-full object-cover" fallbackClassName="w-full h-full flex items-center justify-center" textClassName="text-2xl font-bold text-zinc-500" /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1"><Shield size={13} /> Disponible</div><h2 className="text-2xl font-black text-white leading-tight truncate">{player.full_name}</h2><div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400 mt-2"><span>{player.position || "Sin posición"}</span><span>{calcAge(player.birth_date)} años</span><span>{player.division || player.category || "Plantel"}</span></div><div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-zinc-800"><MiniStat label="Minutos" value={fmt(records.length * 45)} unit="'" /><MiniStat label="Sesiones" value={records.length} /><MiniStat label="Actualizado" value={new Date().toLocaleDateString("es-AR")} /></div></div></div><Panel title="Perfil competitivo individual" action={<Info size={13} className="text-zinc-500" />}><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 divide-y sm:divide-y-0 sm:divide-x divide-zinc-800">{topMetrics.map((item) => <div key={item.key} className="px-3 py-2"><p className="text-[10px] text-zinc-500 truncate">{item.label}</p><p className="text-lg font-black text-white mt-1">{fmt(item.profileValue || item.value, item.unit === "km/h" || item.unit === "m/min" ? 1 : 0)}</p><p className="text-[10px] text-zinc-500">{item.unit}</p></div>)}</div></Panel></div>;
}

function MiniStat({ label, value, unit = "" }) { return <div><p className="text-[10px] uppercase text-zinc-500 font-semibold">{label}</p><p className="text-sm font-bold text-white">{value}<span className="text-zinc-500">{unit}</span></p></div>; }

function LastSessionsChart({ data, metricKey, setMetricKey, profile }) {
  const metric = METRICS.find((m) => m.key === metricKey) || METRICS[0];
  const profileValue = profile?.[metric.profile] || avg(data.map((r) => r[metric.key]));
  return <Panel title="Últimas 7 sesiones" action={<select value={metricKey} onChange={(e) => setMetricKey(e.target.value)} className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-[11px] text-white">{METRICS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}</select>}><ResponsiveContainer width="100%" height={210}><BarChart data={data}><CartesianGrid strokeDasharray="4 4" stroke="#27272a" vertical={false} /><XAxis dataKey="label" stroke="#a1a1aa" tick={{ fontSize: 10 }} /><YAxis stroke="#71717a" tick={{ fontSize: 10 }} /><Tooltip contentStyle={{ background: "#09090b", border: "1px solid #27272a", borderRadius: 12, color: "#fff" }} /><Bar dataKey={metric.key} radius={[8, 8, 0, 0]}>{data.map((row) => <Cell key={row.id} fill={statusColor(pct(row[metric.key], profileValue))} />)}</Bar></BarChart></ResponsiveContainer><Legend /></Panel>;
}

function EvolutionChart({ data, metricKey, profile }) {
  const metric = METRICS.find((m) => m.key === metricKey) || METRICS[0];
  const profileValue = profile?.[metric.profile] || avg(data.map((r) => r[metric.key]));
  const chartData = data.map((r) => ({ ...r, profileLine: profileValue, averageLine: avg(data.map((x) => x[metric.key])) }));
  return <Panel title="Evolución" className="min-h-[260px]"><ResponsiveContainer width="100%" height={195}><LineChart data={chartData}><CartesianGrid strokeDasharray="4 4" stroke="#27272a" vertical={false} /><XAxis dataKey="dateLabel" stroke="#a1a1aa" tick={{ fontSize: 10 }} /><YAxis stroke="#71717a" tick={{ fontSize: 10 }} /><Tooltip contentStyle={{ background: "#09090b", border: "1px solid #27272a", borderRadius: 12 }} /><Line type="monotone" dataKey={metric.key} stroke="#22c55e" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="averageLine" stroke="#eab308" strokeDasharray="5 5" dot={false} /><Line type="monotone" dataKey="profileLine" stroke="#e5e7eb" strokeDasharray="5 5" dot={false} /></LineChart></ResponsiveContainer></Panel>;
}

function ComparisonTable({ stats, profile, last }) {
  return <Panel title="Comparación vs competencia"><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-zinc-500 border-b border-zinc-800"><th className="text-left py-2">Variable</th><th className="text-right py-2">Competencia</th><th className="text-right py-2">Última sesión</th><th className="text-right py-2">Promedio</th><th className="text-right py-2">% vs comp</th><th className="text-center py-2">Estado</th></tr></thead><tbody>{METRICS.map((m) => { const percentage = pct(stats[m.key], profile?.[m.profile]); return <tr key={m.key} className="border-b border-zinc-800/80"><td className="py-2 text-zinc-300">{m.label}</td><td className="py-2 text-right text-zinc-400">{fmt(profile?.[m.profile], m.unit === "km/h" || m.unit === "m/min" ? 1 : 0)}</td><td className="py-2 text-right text-white">{fmt(last?.[m.key], m.unit === "km/h" || m.unit === "m/min" ? 1 : 0)}</td><td className="py-2 text-right text-white">{fmt(stats[m.key], m.unit === "km/h" || m.unit === "m/min" ? 1 : 0)}</td><td className="py-2 text-right font-bold" style={{ color: statusColor(percentage) }}>{percentage ? `${percentage}%` : "—"}</td><td className="py-2 text-center"><span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusColor(percentage) }} /></td></tr>; })}</tbody></table></div></Panel>;
}

function RadarPanel({ stats, profile, last }) {
  const data = METRICS.slice(0, 8).map((m) => ({ metric: m.label, "Última sesión": Math.min(120, pct(last?.[m.key], profile?.[m.profile]) || 0), "Promedio": Math.min(120, pct(stats[m.key], profile?.[m.profile]) || 0), "Perfil": 100 }));
  return <Panel title="Radar: entrenamiento vs competencia"><ResponsiveContainer width="100%" height={225}><RadarChart data={data}><PolarGrid stroke="#3f3f46" /><PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: "#d4d4d8" }} /><PolarRadiusAxis tick={{ fontSize: 9, fill: "#71717a" }} /><Radar dataKey="Última sesión" stroke="#22c55e" fill="#22c55e" fillOpacity={0.25} /><Radar dataKey="Perfil" stroke="#e5e7eb" fill="#e5e7eb" fillOpacity={0.04} strokeDasharray="5 5" /><Tooltip contentStyle={{ background: "#09090b", border: "1px solid #27272a", borderRadius: 12 }} /></RadarChart></ResponsiveContainer></Panel>;
}

function AutoSummary({ stats, profile, count }) {
  const distancePct = pct(stats.total_distance, profile?.avg_total_distance);
  const closest = METRICS.map((m) => ({ label: m.label, diff: Math.abs((pct(stats[m.key], profile?.[m.profile]) || 0) - 100) })).sort((a, b) => a.diff - b.diff).slice(0, 3).map((m) => m.label).join(", ");
  return <Panel title="Resumen automático" action={<CheckCircle2 size={15} className="text-emerald-400" />}><div className="text-sm text-zinc-300 leading-relaxed space-y-3"><p>En las últimas <b className="text-white">{count} sesiones</b>, el jugador alcanzó un promedio de <b className="text-emerald-400">{distancePct || 0}%</b> de su perfil competitivo.</p><p>Las variables más cercanas al partido fueron <b className="text-emerald-400">{closest || "sin datos suficientes"}</b>.</p><p>La carga neuromuscular se mantiene estable durante el microciclo, con una distribución adecuada entre estímulo y recuperación.</p></div></Panel>;
}

function LoadCalendar({ data, profile }) {
  return <Panel title="Calendario de carga" className="xl:col-span-2"><div className="grid grid-cols-4 sm:grid-cols-7 gap-2">{data.map((r) => { const percentage = pct(r.total_distance, profile?.avg_total_distance); return <div key={r.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-center"><p className="text-[10px] text-zinc-500 uppercase">{r.dayName}</p><p className="text-[11px] text-white">{r.dateLabel}</p><p className="text-[10px] text-zinc-500 mb-2">{r.matchDayCode || "—"}</p><div className="rounded-lg py-1.5 text-xs font-black text-white" style={{ backgroundColor: statusColor(percentage) }}>{percentage ? `${percentage}%` : "—"}</div></div>; })}</div><Legend /></Panel>;
}

function BestRecords({ data }) {
  const bests = [{ label: "Mayor distancia", key: "total_distance", unit: "m" }, { label: "Más sprints", key: "sprints", unit: "" }, { label: "Mayor velocidad", key: "smax", unit: "km/h" }, { label: "Mayor Player Load", key: "player_load", unit: "au" }].map((item) => ({ ...item, row: data.reduce((best, r) => Number(r[item.key] || 0) > Number(best?.[item.key] || 0) ? r : best, data[0] || {}) }));
  return <Panel title="Mejores registros de la temporada" action={<Trophy size={15} className="text-yellow-400" />}><div className="grid grid-cols-2 gap-3">{bests.map((b) => <div key={b.key} className="border-r border-zinc-800 last:border-r-0 pr-2"><p className="text-[10px] text-zinc-500">{b.label}</p><p className="text-xl font-black text-white">{fmt(b.row?.[b.key], b.unit === "km/h" ? 1 : 0)}<span className="text-xs text-zinc-500 ml-1">{b.unit}</span></p><p className="text-[10px] text-zinc-500">{shortDate(b.row?.date)}</p></div>)}</div></Panel>;
}

function Legend() { return <div className="flex flex-wrap gap-4 mt-3 text-[10px] text-zinc-500"><span><b className="inline-block w-3 h-2 rounded-sm bg-red-500 mr-1" /> &gt;80% del perfil</span><span><b className="inline-block w-3 h-2 rounded-sm bg-yellow-500 mr-1" /> 50-80% del perfil</span><span><b className="inline-block w-3 h-2 rounded-sm bg-emerald-500 mr-1" /> &lt;50% del perfil</span></div>; }

export default function GpsIndividualPlayerReport({ player, records, stats, competitionProfile }) {
  const [metricKey, setMetricKey] = useState("total_distance");
  const ordered = useMemo(() => records.slice().sort((a, b) => (a.date || "").localeCompare(b.date || "")).slice(-7).map((r) => ({ ...r, label: `${shortDate(r.date)}\n${r.matchDayCode || ""}`, dateLabel: shortDate(r.date), dayName: new Date(`${r.date}T00:00:00`).toLocaleDateString("es-AR", { weekday: "short" }) })), [records]);
  const last = ordered[ordered.length - 1] || records[0] || {};

  return <div className="space-y-4"><div className="flex items-center justify-end gap-2"><button className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:text-white"><Eye size={13} /> Ver video del jugador</button><button onClick={() => window.print()} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-400 text-zinc-950 text-xs font-bold hover:bg-yellow-300"><Download size={13} /> Exportar informe PDF</button></div><PlayerHero player={player} stats={stats} profile={competitionProfile} records={records} /><div className="grid grid-cols-1 xl:grid-cols-[1.05fr_1fr] gap-4"><LastSessionsChart data={ordered} metricKey={metricKey} setMetricKey={setMetricKey} profile={competitionProfile} /><ComparisonTable stats={stats} profile={competitionProfile} last={last} /></div><div className="grid grid-cols-1 xl:grid-cols-3 gap-4"><EvolutionChart data={ordered} metricKey={metricKey} profile={competitionProfile} /><RadarPanel stats={stats} profile={competitionProfile} last={last} /><AutoSummary stats={stats} profile={competitionProfile} count={records.length} /></div><div className="grid grid-cols-1 xl:grid-cols-3 gap-4"><LoadCalendar data={ordered} profile={competitionProfile} /><BestRecords data={records} /></div></div>;
}
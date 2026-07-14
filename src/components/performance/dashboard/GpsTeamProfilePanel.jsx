import React, { useEffect, useMemo, useState } from "react";
import moment from "moment";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Activity, CalendarDays, Trophy, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, RadarChart, PolarGrid, PolarAngleAxis, Radar, LineChart, Line } from "recharts";
import GpsTeamModelAiAnalysis from "./GpsTeamModelAiAnalysis";
import GpsTeamModelPdfButton from "./GpsTeamModelPdfButton";
import { MODEL_DAYS, MODEL_METRICS, POSITION_FILTERS, buildEvolution, buildMicrocycle, buildProfile, fmt, normalizeMatchRows, normalizeSessionRows, pctClass } from "./teamModelUtils";

export default function GpsTeamProfilePanel({ squadId, squadName, season, sessions, gpsBySession, playerMap, onReload }) {
  const [positionId, setPositionId] = useState("all");
  const [metricKey, setMetricKey] = useState("total_distance");
  const [matches, setMatches] = useState([]), [minutes, setMinutes] = useState([]), [catapultRows, setCatapultRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [observations, setObservations] = useState("");
  const positionFilter = POSITION_FILTERS.find((p) => p.id === positionId) || POSITION_FILTERS[0];
  const metric = MODEL_METRICS.find((m) => m.key === metricKey) || MODEL_METRICS[0];

  async function loadMatchData() {
    if (!squadId) return;
    const [m, min, cat] = await Promise.all([base44.entities.MatchReport.filter({ squad_id: squadId }, "-date", 500), base44.entities.MinutesRecord.filter({ squad_id: squadId }, "-match_date", 3000), base44.entities.CatapultReport.list("-date", 5000)]);
    setMatches(m); setMinutes(min); setCatapultRows(cat);
  }
  useEffect(() => { loadMatchData(); }, [squadId, season]);

  const rows = useMemo(() => normalizeSessionRows({ sessions, gpsBySession, playerMap, positionFilter }), [sessions, gpsBySession, playerMap, positionFilter]);
  const microcycle = useMemo(() => buildMicrocycle(rows), [rows]);
  const matchRows = useMemo(() => normalizeMatchRows({ matches, minutes, catapultRows, playerMap, positionFilter }), [matches, minutes, catapultRows, playerMap, positionFilter]);
  const competition = useMemo(() => ({ ...buildProfile(matchRows), matches_count: new Set(matchRows.map((r) => r.session_id)).size }), [matchRows]);
  const evolution = useMemo(() => buildEvolution(rows, metricKey), [rows, metricKey]);
  const updatedAt = [...sessions.map((s) => s.updated_date), ...matches.map((m) => m.updated_date)].filter(Boolean).sort().pop();
  const weeks = new Set(rows.filter((r) => r.date).map((r) => moment(r.date).format("GGGG-WW"))).size;

  async function recalculate() {
    setLoading(true);
    await base44.functions.invoke("recalculateTeamGPSProfile", { squad_id: squadId, season_id: season });
    await Promise.all([loadMatchData(), onReload?.()]);
    setLoading(false);
  }

  const chartData = microcycle.map((d) => ({ day: d.day, valor: Math.round(d[metricKey] || 0), sesiones: d.sessions_count }));
  const radarData = MODEL_METRICS.slice(0, 8).map((m) => ({ metric: m.label, value: Math.round(competition[m.key] || 0) }));

  return <div className="space-y-5">
    <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap"><div><p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Modelo de Rendimiento</p><h2 className="text-2xl font-bold text-white">Perfil del Equipo</h2><p className="text-zinc-400 text-sm">Referencia física por microciclo y competencia.</p></div><div className="flex gap-2 flex-wrap"><button onClick={recalculate} disabled={loading || !squadId} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 text-white rounded-xl text-sm font-bold"><RefreshCw size={16} className={loading ? "animate-spin" : ""} />Recalcular Perfil del Equipo</button><GpsTeamModelPdfButton squadName={squadName} season={season} microcycle={microcycle} competition={competition} evolution={evolution} positionLabel={positionFilter.label} analysis={aiAnalysis} observations={observations} /></div></div>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">{[{l:"Plantel",v:squadName||"—",i:Activity},{l:"Temporada",v:season||"—",i:CalendarDays},{l:"Semanas",v:weeks,i:Clock},{l:"Sesiones",v:new Set(rows.map(r=>r.session_id)).size,i:Activity},{l:"Partidos",v:competition.matches_count||0,i:Trophy},{l:"Actualizado",v:updatedAt?new Date(updatedAt).toLocaleDateString("es-AR"):"—",i:Clock}].map((c)=>{const I=c.i;return <div key={c.l} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3"><I className="text-zinc-500 mb-2" size={16}/><div className="text-zinc-500 text-xs">{c.l}</div><div className="text-white font-bold text-sm truncate">{c.v}</div></div>})}</div>
      <div className="flex gap-3 flex-wrap"><select value={positionId} onChange={(e)=>setPositionId(e.target.value)} className="bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3 py-2 text-sm">{POSITION_FILTERS.map((p)=><option key={p.id} value={p.id}>{p.label}</option>)}</select><select value={metricKey} onChange={(e)=>setMetricKey(e.target.value)} className="bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3 py-2 text-sm">{MODEL_METRICS.map((m)=><option key={m.key} value={m.key}>{m.label}</option>)}</select></div>
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4"><div className="xl:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-4"><h3 className="text-white font-bold mb-3">Perfil del microciclo · {metric.label}</h3><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#27272a"/><XAxis dataKey="day" stroke="#71717a"/><YAxis stroke="#71717a"/><Tooltip contentStyle={{background:"#18181b",border:"1px solid #3f3f46",borderRadius:12,color:"#fff"}}/><Bar dataKey="valor" fill={metric.color} radius={[8,8,0,0]}><LabelList dataKey="valor" position="top" fill="#e4e4e7" fontSize={11}/></Bar></BarChart></ResponsiveContainer></div></div><div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"><h3 className="text-white font-bold mb-3">Radar competitivo</h3><div className="h-72"><ResponsiveContainer width="100%" height="100%"><RadarChart data={radarData}><PolarGrid stroke="#3f3f46"/><PolarAngleAxis dataKey="metric" tick={{fill:"#a1a1aa",fontSize:10}}/><Radar dataKey="value" stroke="#22c55e" fill="#22c55e" fillOpacity={0.25}/></RadarChart></ResponsiveContainer></div></div></div>

    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5"><div className="flex items-center justify-between mb-4"><h3 className="text-white font-bold">Perfil Competitivo</h3><span className="text-xs text-zinc-500">Referencia 100% · jugadores +80’</span></div><div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">{MODEL_METRICS.map((m)=><div key={m.key} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3"><div className="text-zinc-500 text-xs">{m.label}</div><div className="text-white font-bold mt-1">{fmt(competition[m.key],m.unit)}</div></div>)}</div></div>

    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 overflow-x-auto"><h3 className="text-white font-bold mb-4">Perfil del Microciclo</h3><table className="w-full min-w-[1200px] text-sm"><thead className="text-zinc-500 text-xs uppercase"><tr><th className="text-left p-2">Día</th><th className="text-left p-2">Sesiones</th>{MODEL_METRICS.map((m)=><th key={m.key} className="text-right p-2">{m.label}</th>)}</tr></thead><tbody className="divide-y divide-zinc-800">{microcycle.map((d)=><tr key={d.day}><td className="p-2 text-white font-bold">{d.day}</td><td className="p-2 text-zinc-300">{d.sessions_count}</td>{MODEL_METRICS.map((m)=><td key={m.key} className="p-2 text-right text-zinc-300">{fmt(d[m.key],m.unit)}</td>)}</tr>)}</tbody></table></div>

    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 overflow-x-auto"><h3 className="text-white font-bold mb-4">Comparación Entrenamiento vs Partido</h3><table className="w-full min-w-[1200px] text-sm"><thead className="text-zinc-500 text-xs uppercase"><tr><th className="text-left p-2">Día</th>{MODEL_METRICS.map((m)=><th key={m.key} className="text-center p-2">{m.label}</th>)}</tr></thead><tbody className="divide-y divide-zinc-800">{MODEL_DAYS.map((day)=>{const d=microcycle.find(x=>x.day===day);return <tr key={day}><td className="p-2 text-white font-bold">{day}</td>{MODEL_METRICS.map((m)=>{const pct=competition[m.key] ? (d[m.key]/competition[m.key])*100 : null;return <td key={m.key} className="p-2 text-center"><div className={`border rounded-lg px-2 py-1 ${pctClass(pct)}`}><div>{fmt(d[m.key],m.unit)}</div><div className="text-[11px]">{pct?`${Math.round(pct)}%`:"—"}</div></div></td>})}</tr>})}</tbody></table></div>

    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4"><div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"><h3 className="text-white font-bold mb-3">Evolución semanal · {metric.label}</h3><div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={evolution.weekly}><CartesianGrid strokeDasharray="3 3" stroke="#27272a"/><XAxis dataKey="week" stroke="#71717a" fontSize={10}/><YAxis stroke="#71717a"/><Tooltip contentStyle={{background:"#18181b",border:"1px solid #3f3f46",borderRadius:12,color:"#fff"}}/><Line type="monotone" dataKey="value" stroke={metric.color} strokeWidth={3}/></LineChart></ResponsiveContainer></div></div><div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 overflow-x-auto"><h3 className="text-white font-bold mb-3">Evolución del Perfil</h3><table className="w-full text-sm"><thead className="text-zinc-500 text-xs"><tr><th className="py-2 text-left">Variable</th><th className="py-2 text-right">Actual</th><th className="py-2 text-right">4 sem</th><th className="py-2 text-right">8 sem</th><th className="py-2 text-right">Temporada</th><th className="py-2 text-right">Cambio</th><th className="py-2 text-right">Tendencia</th></tr></thead><tbody>{evolution.summary.map((e)=><tr key={e.metric} className="border-b border-zinc-800"><td className="py-2 text-zinc-300">{e.metric}</td><td className="py-2 text-right text-white">{fmt(e.current,e.unit)}</td><td className="py-2 text-right text-zinc-400">{fmt(e.w4,e.unit)}</td><td className="py-2 text-right text-zinc-400">{fmt(e.w8,e.unit)}</td><td className="py-2 text-right text-zinc-400">{fmt(e.season,e.unit)}</td><td className="py-2 text-right text-zinc-400">{e.pct.toFixed(1)}%</td><td className="py-2 text-right text-emerald-300">{e.trend}</td></tr>)}</tbody></table></div></div>

    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5"><label className="text-white font-bold block mb-2">Observaciones</label><textarea value={observations} onChange={(e)=>setObservations(e.target.value)} placeholder="Agregar observaciones para el informe del modelo..." className="w-full min-h-24 bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 outline-none focus:border-emerald-500" /></div>
    <GpsTeamModelAiAnalysis microcycle={microcycle} competition={competition} evolution={evolution} positionLabel={positionFilter.label} onAnalysisReady={setAiAnalysis} />
  </div>;
}
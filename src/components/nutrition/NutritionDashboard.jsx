import React from "react";
import moment from "moment";
import { Users, Calendar, Scale, Activity, Percent, Dumbbell, AlertTriangle } from "lucide-react";

function avg(rows, field) {
  const nums = rows.map(r => Number(r[field])).filter(Number.isFinite);
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}
function fmt(n, d = 1) { return n ? n.toFixed(d) : "—"; }

function Stat({ icon: Icon, label, value, sub, accent = "emerald" }) {
  const tones = {
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
    blue: "text-blue-600 bg-blue-50 border-blue-100",
    orange: "text-orange-600 bg-orange-50 border-orange-100",
    violet: "text-violet-600 bg-violet-50 border-violet-100",
    amber: "text-amber-600 bg-amber-50 border-amber-100",
    slate: "text-slate-700 bg-slate-50 border-slate-100",
  };
  return <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${tones[accent]}`}><Icon size={18} /></div><p className="text-2xl font-bold mt-3 text-slate-900">{value}</p><p className="text-xs font-medium text-slate-500">{label}</p>{sub && <p className="text-[11px] text-emerald-600 mt-1">{sub}</p>}</div>;
}

export default function NutritionDashboard({ assessments, playerCount = 0 }) {
  const linked = assessments.filter(a => a.linked && a.player_id);
  const latestDate = assessments.map(a => a.fecha).filter(Boolean).sort().pop();
  const latestRows = latestDate ? linked.filter(a => a.fecha === latestDate) : linked;
  const latestByPlayer = new Map();
  linked.forEach(a => { if (!latestByPlayer.has(a.player_id) || (a.fecha || "") > (latestByPlayer.get(a.player_id).fecha || "")) latestByPlayer.set(a.player_id, a); });
  const staleLimit = moment().subtract(30, "days").format("YYYY-MM-DD");
  const stale = [...latestByPlayer.values()].filter(a => (a.fecha || "") < staleLimit).length;
  const evaluated = new Set(linked.map(a => a.player_id)).size;
  const coverage = playerCount ? Math.round((evaluated / playerCount) * 100) : 0;
  return <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3"><Stat icon={Users} label="Jugadores evaluados" value={evaluated} sub={`${coverage}% del plantel`} /><Stat icon={Calendar} label="Última medición" value={latestDate ? moment(latestDate).format("DD/MM/YYYY") : "—"} accent="emerald" /><Stat icon={AlertTriangle} label="Sin medición reciente" value={stale} sub="Más de 30 días" accent="orange" /><Stat icon={Scale} label="Peso promedio" value={`${fmt(avg(latestRows, "peso"))} kg`} accent="blue" /><Stat icon={Activity} label="Sumatoria 6P prom." value={`${fmt(avg(latestRows, "sumatoria_6p"))} mm`} accent="amber" /><Stat icon={Percent} label="% Grasa prom." value={`${fmt(avg(latestRows, "porcentaje_grasa"))}%`} accent="violet" /><Stat icon={Dumbbell} label="Kg Masa Muscular prom." value={`${fmt(avg(latestRows, "kg_masa_muscular"))} kg`} accent="emerald" /></div>;
}
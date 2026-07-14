import React, { useMemo, useState } from "react";
import moment from "moment";
import { CalendarDays, ChevronLeft, ChevronRight, Search } from "lucide-react";

function weekLabel(plan) {
  const start = plan?.week_start || plan?.fecha_inicio || plan?.days_data?.[0]?.date;
  const end = plan?.week_end || plan?.fecha_fin || plan?.days_data?.[plan?.days_data?.length - 1]?.date;
  return start ? `${moment(start).format("D")}–${moment(end || start).format("D MMMM YYYY")}` : "Semana";
}

function planStatus(plan, sessions, gpsBySession) {
  const dates = new Set((plan?.days_data || []).map((d) => d.date).filter(Boolean));
  const linked = sessions.filter((s) => dates.has(s.date));
  const withGps = linked.filter((s) => (gpsBySession[s.id] || []).length > 0).length;
  if (!linked.length) return { label: "Sin sesión", className: "bg-zinc-800 text-zinc-300 border-zinc-700" };
  if (withGps === linked.length) return { label: `GPS ${withGps}/${linked.length}`, className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" };
  if (withGps > 0) return { label: `GPS ${withGps}/${linked.length}`, className: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" };
  return { label: "GPS pendiente", className: "bg-zinc-800 text-zinc-300 border-zinc-700" };
}

export default function GpsMicrocycleWeekNavigator({ weeklyPlans = [], selectedWeekStart, onSelectWeek, sessions = [], gpsBySession = {} }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const sorted = useMemo(() => [...weeklyPlans].sort((a, b) => String(a.week_start || "").localeCompare(String(b.week_start || ""))), [weeklyPlans]);
  const currentIndex = Math.max(0, sorted.findIndex((p) => p.week_start === selectedWeekStart));
  const selected = sorted[currentIndex] || sorted[0];
  const todayStart = moment().startOf("isoWeek").format("YYYY-MM-DD");
  const visible = sorted.filter((p) => `${p.microcycle_number || ""} ${weekLabel(p)} ${(p.days_data || []).map((d) => `${d.rival || ""} ${d.competition || ""}`).join(" ")}`.toLowerCase().includes(search.toLowerCase()));

  return <div className="flex flex-wrap items-center gap-3">
    <div className="flex overflow-hidden rounded-xl border border-zinc-700/80 bg-zinc-950/80">
      <button onClick={() => sorted[currentIndex - 1] && onSelectWeek(sorted[currentIndex - 1].week_start)} className="flex h-10 w-10 items-center justify-center border-r border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white"><ChevronLeft size={17} /></button>
      <div className="flex h-10 min-w-[170px] items-center justify-center px-5 text-sm font-black text-white">{weekLabel(selected)}</div>
      <button onClick={() => sorted[currentIndex + 1] && onSelectWeek(sorted[currentIndex + 1].week_start)} className="flex h-10 w-10 items-center justify-center border-l border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white"><ChevronRight size={17} /></button>
    </div>
    <button onClick={() => setOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-700/80 bg-zinc-950/80 px-4 text-sm font-semibold text-zinc-200 hover:border-zinc-600 hover:text-white"><CalendarDays size={15} /> Seleccionar semana</button>
    <button onClick={() => onSelectWeek(todayStart)} className="h-10 rounded-xl border border-zinc-700/80 bg-zinc-950/80 px-4 text-sm font-semibold text-zinc-300 hover:border-zinc-600 hover:text-white">Ir a semana actual</button>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className="max-h-[86vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-950 p-5"><div className="mb-4 flex items-center justify-between"><div><h3 className="text-lg font-bold text-white">Seleccionar semana</h3><p className="text-sm text-zinc-500">Los microciclos anteriores se buscan desde este calendario semanal.</p></div><button onClick={() => setOpen(false)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300">Cerrar</button></div><div className="relative mb-4"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por rival, fecha, microciclo o competencia" className="w-full rounded-xl border border-zinc-700 bg-zinc-900 py-2 pl-9 pr-3 text-sm text-white outline-none" /></div><div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{visible.map((plan) => { const status = planStatus(plan, sessions, gpsBySession); const selectedPlan = plan.week_start === selectedWeekStart; const isCurrent = plan.week_start === todayStart; return <button key={plan.id || plan.week_start} onClick={() => { onSelectWeek(plan.week_start); setOpen(false); }} className={`rounded-2xl border p-4 text-left transition ${selectedPlan ? "border-lime-400 bg-lime-500/10" : isCurrent ? "border-blue-500/50 bg-blue-500/10" : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"}`}><p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Microciclo {plan.microcycle_number || "—"}</p><p className="mt-1 font-bold text-white">{weekLabel(plan)}</p><p className="mt-1 text-xs text-zinc-400">{(plan.days_data || []).find((d) => d.rival)?.rival || "Sin rival"}</p><span className={`mt-3 inline-flex rounded-full border px-2 py-1 text-[11px] ${status.className}`}>{status.label}</span></button>; })}</div></div></div>}
  </div>;
}
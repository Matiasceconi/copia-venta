import React, { useState } from "react";
import moment from "moment";
import { Activity, CalendarDays, CheckCircle2, Trash2, Trophy } from "lucide-react";
import { resolveDayMatch } from "./gpsMatchResolver";

function dayStatus(day, sessions, gpsBySession, match) {
  const linked = sessions.filter((s) => s.date === day.date);
  const withGps = linked.filter((s) => (gpsBySession[s.id] || []).length > 0).length;
  if (linked.length && withGps === linked.length) return { label: "GPS completo", state: "complete" };
  if (linked.length && withGps) return { label: "GPS parcial", state: "partial" };
  if (match) return { label: linked.length ? "GPS pendiente" : "Partido", state: "match" };
  if (!linked.length) return { label: (day.is_rest_day || day.type === "Descanso") ? "Día libre" : "Sin sesión", state: "empty" };
  return { label: "GPS pendiente", state: "pending" };
}

function selectionLabel(days, selectedDates) {
  const selected = days.filter((day) => selectedDates.includes(day.date));
  if (!selected.length) return "Sin días seleccionados";
  const names = selected.map((day) => moment(day.date).format("dddd"));
  if (names.length === 1) return `1 día seleccionado · ${names[0]}`;
  if (names.length === days.length) return "Semana completa seleccionada";
  return `${names.length} días seleccionados · ${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}

function initials(name) {
  return String(name || "R").split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function RivalShield({ match }) {
  const [failed, setFailed] = useState(false);
  if (match?.rival_logo_url && !failed) {
    return <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/95 p-2 shadow-inner"><img src={match.rival_logo_url} alt={`Escudo de ${match.rival}`} className="h-16 w-16 object-contain" onError={() => setFailed(true)} /></div>;
  }
  return <div title="Escudo no cargado" className="flex h-20 w-20 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-800/80 text-zinc-300">{match?.rival ? <span className="text-lg font-black">{initials(match.rival)}</span> : <Trophy size={30} />}</div>;
}

function MatchCard({ day, match, status, linked, active, onClick }) {
  return <button onClick={onClick} className={`relative min-h-[230px] min-w-[242px] rounded-xl border bg-gradient-to-br from-emerald-950 via-zinc-950 to-zinc-950 p-4 text-left transition ${active ? "border-lime-400 shadow-[0_0_0_1px_rgba(163,230,53,0.35),0_18px_42px_rgba(0,0,0,0.35)]" : "border-emerald-500/30 hover:border-emerald-400/60"}`}>
    {active && <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-lime-400 text-[11px] font-black text-zinc-950">✓</span>}
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-lg font-black leading-none text-white">MD</p>
        <p className="mt-1 text-xs font-bold text-zinc-300">{moment(day.date).format("dddd")} · {moment(day.date).format("DD/MM")}</p>
      </div>
      <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-1 text-[10px] font-black tracking-widest text-emerald-200">PARTIDO</span>
    </div>
    <div className="mt-4 flex items-center gap-4">
      <RivalShield match={match} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">vs.</p>
        <p className="truncate text-lg font-black text-white">{match?.rival || "Rival no definido"}</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-400">{[match?.time, match?.competition, match?.home_away].filter(Boolean).join(" · ") || "Sin datos del partido"}</p>
      </div>
    </div>
    <div className="mt-4 flex items-center justify-between gap-2 border-t border-emerald-500/20 pt-3"><span className="inline-flex items-center gap-2 text-xs font-semibold text-lime-300"><Activity size={13} />{status.label}</span><span className="text-[11px] text-zinc-500">{linked.length} {linked.length === 1 ? "sesión" : "sesiones"}</span></div>
  </button>;
}

export default function GpsMicrocycleDayHeader({ days = [], sessions = [], gpsBySession = {}, selectedDates = [], onToggleDate, onSelectAll, onClear, calendarEvents = [], matchReports = [] }) {
  return <div className="space-y-4">
    <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-2.5">
      <div className="flex items-center gap-2 text-sm text-zinc-400"><CheckCircle2 size={16} className="text-zinc-500" />{selectionLabel(days, selectedDates)}</div>
      <div className="flex gap-2"><button onClick={onSelectAll} className="inline-flex h-8 items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 text-xs font-semibold text-zinc-300 hover:text-white"><CalendarDays size={13} /> Toda la semana</button><button onClick={onClear} className="inline-flex h-8 items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 text-xs font-semibold text-zinc-300 hover:text-white"><Trash2 size={13} /> Limpiar</button></div>
    </div>
    <div className="flex gap-3 overflow-x-auto pb-1">{days.map((day) => { const match = resolveDayMatch(day, calendarEvents, matchReports); const status = dayStatus(day, sessions, gpsBySession, match); const linked = sessions.filter((s) => s.date === day.date); const active = selectedDates.includes(day.date); const isEmpty = status.state === "empty"; if (match) return <MatchCard key={day.date} day={day} match={match} status={status} linked={linked} active={active} onClick={() => onToggleDate(day.date)} />; return <button key={day.date} onClick={() => onToggleDate(day.date)} className={`relative min-h-[206px] min-w-[132px] rounded-lg border bg-gradient-to-b from-zinc-900 to-zinc-950 p-4 text-left transition ${active ? "border-lime-400 shadow-[0_0_0_1px_rgba(163,230,53,0.35),0_18px_42px_rgba(0,0,0,0.35)]" : "border-zinc-800 hover:border-zinc-700"}`}>
      <div className={`mb-5 h-1 w-9 rounded-full ${isEmpty ? "bg-zinc-700" : "bg-emerald-400"}`} />
      {active && <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-lime-400 text-[11px] font-black text-zinc-950">✓</span>}
      <p className="text-lg font-black leading-none text-white">{day.md || day.match_day_code || "—"}</p>
      <p className="mt-1 text-xs font-bold text-zinc-400">{moment(day.date).format("dddd")}</p>
      <p className="text-xs text-zinc-500">{moment(day.date).format("DD/MM")}</p>
      <div className="my-3 border-t border-dashed border-zinc-800" />
      <p className="min-h-[34px] text-xs leading-snug text-zinc-200">{day.physical_objective || day.objetivo_fisico || day.objetivo || "Sin objetivo"}</p>
      <div className="mt-5 flex items-center gap-2"><span className={`flex h-6 w-6 items-center justify-center rounded-full ${isEmpty ? "bg-zinc-800 text-zinc-500" : "bg-lime-500/10 text-lime-400"}`}><Activity size={13} /></span><span className={`text-xs font-semibold ${isEmpty ? "text-zinc-500" : "text-lime-400"}`}>{status.label}</span></div>
      <p className="mt-2 text-[11px] text-zinc-500">{linked.length} {linked.length === 1 ? "sesión" : "sesiones"}</p>
    </button>; })}</div>
  </div>;
}
import React from "react";
import moment from "moment";
import { Activity, Trophy, Timer, HeartPulse, Zap, Satellite, Smile, CalendarClock } from "lucide-react";

function fmtDate(d) { return d ? moment(d).format("DD/MM") : "—"; }

function Card({ icon: Icon, label, value, sub, color, onClick }) {
  return (
    <button onClick={onClick}
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-left hover:border-zinc-600 transition-colors">
      <Icon size={13} className={color} />
      <p className="text-sm font-bold text-white mt-1.5 leading-tight">{value}</p>
      <p className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{label}</p>
      {sub && <p className="text-[9px] text-zinc-600 mt-0.5">{sub}</p>}
    </button>
  );
}

export default function PlayerSummaryCards({
  lastSession, lastMatch, totalMinutes, activeInjury, weeklyLoadLabel, lastGps, nextMatch, onNavigate,
}) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mt-3">
      <Card icon={Activity} color="text-blue-400" label="Última sesión"
        value={lastSession ? fmtDate(lastSession.date) : "—"} sub={lastSession?.match_day_code}
        onClick={() => onNavigate("sesiones")} />
      <Card icon={Trophy} color="text-yellow-400" label="Último partido"
        value={lastMatch ? `${lastMatch.minutes || 0}'` : "—"} sub={lastMatch ? fmtDate(lastMatch.match_date) : null}
        onClick={() => onNavigate("partidos")} />
      <Card icon={Timer} color="text-orange-400" label="Minutos temporada"
        value={totalMinutes ? `${totalMinutes}'` : "0'"}
        onClick={() => onNavigate("minutos")} />
      <Card icon={HeartPulse} color={activeInjury ? "text-red-400" : "text-emerald-400"} label="Lesión activa"
        value={activeInjury ? "Sí" : "No"} sub={activeInjury?.diagnosis}
        onClick={() => onNavigate("medico")} />
      <Card icon={Zap} color="text-purple-400" label="Carga semanal"
        value={weeklyLoadLabel}
        onClick={() => onNavigate("carga_externa")} />
      <Card icon={Satellite} color="text-cyan-400" label="Último GPS"
        value={lastGps ? fmtDate(lastGps.created_date) : "—"}
        onClick={() => onNavigate("gps")} />
      <Card icon={Smile} color="text-pink-400" label="Wellness"
        value="—" sub="Próximamente"
        onClick={() => onNavigate("wellness")} />
      <Card icon={CalendarClock} color="text-violet-400" label="Próxima convocatoria"
        value={nextMatch ? fmtDate(nextMatch.date) : "—"} sub={nextMatch?.rival}
        onClick={() => onNavigate("partidos")} />
    </div>
  );
}
import React from "react";
import moment from "moment";
import "moment/locale/es";
import { CheckCircle2, Activity, Trophy, Zap, HeartPulse, Satellite, CalendarClock } from "lucide-react";

moment.locale("es");
function fmtDate(d) { return d ? moment(d).format("DD/MM/YYYY") : "—"; }

function Row({ icon: Icon, color, label, value }) {
  return (
    <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-3.5">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color.bg}`}>
        <Icon size={16} className={color.text} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-white truncate">{value}</p>
      </div>
    </div>
  );
}

export default function PlayerResumen360Tab({
  badge, lastSession, lastMatch, weeklyLoadLabel, activeInjury, lastGps, nextSession, nextMatch,
}) {
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
        <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
        <div>
          <p className="text-base font-bold text-white">{badge.label}.</p>
          <p className="text-xs text-zinc-500 mt-0.5">Resumen automático de la situación actual del jugador</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Row icon={Activity} color={{ bg: "bg-blue-500/15", text: "text-blue-400" }} label="Última sesión"
          value={lastSession ? `${fmtDate(lastSession.date)} · ${lastSession.match_day_code || "—"}` : "Sin registros"} />
        <Row icon={Trophy} color={{ bg: "bg-yellow-500/15", text: "text-yellow-400" }} label="Último partido"
          value={lastMatch ? `${lastMatch.minutes || 0} minutos · ${fmtDate(lastMatch.match_date)}` : "Sin registros"} />
        <Row icon={Zap} color={{ bg: "bg-purple-500/15", text: "text-purple-400" }} label="Carga semanal" value={weeklyLoadLabel} />
        <Row icon={HeartPulse} color={{ bg: activeInjury ? "bg-red-500/15" : "bg-emerald-500/15", text: activeInjury ? "text-red-400" : "text-emerald-400" }}
          label="Lesiones activas" value={activeInjury ? `Sí — ${activeInjury.diagnosis || ""}` : "No"} />
        <Row icon={Satellite} color={{ bg: "bg-cyan-500/15", text: "text-cyan-400" }} label="Carga Externa (GPS)"
          value={lastGps ? "Cargado correctamente" : "Sin datos cargados"} />
        <Row icon={CalendarClock} color={{ bg: "bg-violet-500/15", text: "text-violet-400" }} label="Próximo entrenamiento"
          value={nextSession ? (nextSession.match_day_code || fmtDate(nextSession.date)) : "Sin programar"} />
      </div>

      {nextMatch && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Próxima convocatoria</p>
          <p className="text-sm text-white font-semibold">vs {nextMatch.rival} · {fmtDate(nextMatch.date)}</p>
        </div>
      )}
    </div>
  );
}
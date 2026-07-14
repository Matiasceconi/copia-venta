import React from "react";
import moment from "moment";
import "moment/locale/es";
import { Trophy, Zap, Gauge, Wind, Activity } from "lucide-react";
import { fmtInt, fmtSmax } from "../externalGpsLoadUtils";
moment.locale("es");

function HighlightCard({ icon: Icon, label, name, value, color }) {
  return (
    <div className={`rounded-xl border p-2.5 ${color.bg} ${color.border}`}>
      <div className="flex items-center gap-1 mb-1">
        <Icon size={11} className={color.text} />
        <p className={`text-[9px] font-bold uppercase tracking-wider ${color.text}`}>{label}</p>
      </div>
      <p className="text-white text-xs font-semibold truncate">{name || "—"}</p>
      <p className="text-zinc-400 text-[10px]">{value}</p>
    </div>
  );
}

export default function GpsSessionSummaryPanel({ session, summary, highlights }) {
  if (!session) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
        <p className="text-zinc-500 text-sm">Seleccioná una sesión para ver su resumen</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-4">
      <div>
        <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Informe de sesión</p>
        <p className="text-white font-bold text-sm mt-0.5">{moment(session.date).format("DD/MM/YYYY")} · {session.title}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-zinc-800/60 rounded-lg p-2.5">
          <p className="text-white font-bold text-base">{summary.playersCount}</p>
          <p className="text-[9px] text-zinc-500 uppercase font-semibold">Jugadores</p>
        </div>
        <div className="bg-zinc-800/60 rounded-lg p-2.5">
          <p className="text-white font-bold text-base">{fmtInt(summary.avgDistance)} m</p>
          <p className="text-[9px] text-zinc-500 uppercase font-semibold">Dist. total prom.</p>
        </div>
        <div className="bg-zinc-800/60 rounded-lg p-2.5">
          <p className="text-white font-bold text-base">{fmtInt(summary.avgMMin)}</p>
          <p className="text-[9px] text-zinc-500 uppercase font-semibold">m/min prom.</p>
        </div>
        <div className="bg-zinc-800/60 rounded-lg p-2.5">
          <p className="text-white font-bold text-base">{fmtInt(summary.avgPlayerLoad)}</p>
          <p className="text-[9px] text-zinc-500 uppercase font-semibold">PL prom.</p>
        </div>
      </div>

      <div>
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-2">Destacados de la sesión</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <HighlightCard icon={Trophy} label="Mayor distancia" name={highlights.maxDistance?.name} value={`${fmtInt(highlights.maxDistance?.value)} m`} color={{ bg: "bg-blue-500/10", border: "border-blue-500/25", text: "text-blue-300" }} />
          <HighlightCard icon={Wind} label="Más sprints" name={highlights.maxSprints?.name} value={fmtInt(highlights.maxSprints?.value)} color={{ bg: "bg-cyan-500/10", border: "border-cyan-500/25", text: "text-cyan-300" }} />
          <HighlightCard icon={Zap} label="Mayor Player Load" name={highlights.maxPlayerLoad?.name} value={fmtInt(highlights.maxPlayerLoad?.value)} color={{ bg: "bg-pink-500/10", border: "border-pink-500/25", text: "text-pink-300" }} />
          <HighlightCard icon={Gauge} label="Mayor S Max" name={highlights.maxSmax?.name} value={`${fmtSmax(highlights.maxSmax?.value)} km/h`} color={{ bg: "bg-red-500/10", border: "border-red-500/25", text: "text-red-300" }} />
          <HighlightCard icon={Activity} label="Mayor RHIE" name={highlights.maxRhie?.name} value={fmtInt(highlights.maxRhie?.value)} color={{ bg: "bg-amber-500/10", border: "border-amber-500/25", text: "text-amber-300" }} />
        </div>
      </div>
    </div>
  );
}
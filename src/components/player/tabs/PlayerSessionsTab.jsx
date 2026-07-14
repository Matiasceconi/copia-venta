import React from "react";
import moment from "moment";
import { Calendar, Satellite, ArrowRight } from "lucide-react";

function fmtDate(d) { return d ? moment(d).format("DD/MM/YYYY") : "—"; }

const ATTENDANCE_LABELS = {
  presente: "Presente", ausente: "Ausente", diferenciado: "Diferenciado",
  kinesiologia: "Kinesiología", no_entrena: "No entrena",
};
const ATTENDANCE_COLORS = {
  presente: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
  ausente: "text-zinc-400 bg-zinc-700/30 border-zinc-600",
  diferenciado: "text-amber-400 bg-amber-500/15 border-amber-500/30",
  kinesiologia: "text-teal-400 bg-teal-500/15 border-teal-500/30",
  no_entrena: "text-red-400 bg-red-500/15 border-red-500/30",
};

function EmptyState({ text = "Sin registros" }) {
  return <div className="text-center py-10 text-zinc-600 text-sm">{text}</div>;
}

export default function PlayerSessionsTab({ sessions, sessionPlayers, gpsData, onOpenSession }) {
  if (!sessionPlayers.length) return <EmptyState />;
  const spBySession = {};
  sessionPlayers.forEach(sp => { spBySession[sp.session_id] = sp; });
  const gpsBySession = new Set(gpsData.map(g => g.session_id));

  const sorted = [...sessions].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  return (
    <div className="space-y-2.5 max-h-[28rem] overflow-y-auto pr-1">
      {sorted.map(s => {
        const sp = spBySession[s.id];
        const attendance = sp?.attendance || "presente";
        const hasGps = gpsBySession.has(s.id);
        return (
          <div key={s.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 hover:border-zinc-600 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-white truncate">{s.title}</p>
                  {s.match_day_code && <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 shrink-0">{s.match_day_code}</span>}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-1">
                  <Calendar size={11} /> {fmtDate(s.date)} · {s.session_type}
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0 ${ATTENDANCE_COLORS[attendance] || ATTENDANCE_COLORS.presente}`}>
                {ATTENDANCE_LABELS[attendance] || attendance}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2.5">
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                {sp?.minutes ? <span className="text-yellow-400 font-semibold">{sp.minutes}'</span> : null}
                {sp?.rpe ? <span className="text-orange-400">RPE {sp.rpe}</span> : null}
                {hasGps && <span className="flex items-center gap-1 text-cyan-400"><Satellite size={11} /> GPS</span>}
              </div>
              <button onClick={() => onOpenSession(s.id)}
                className="flex items-center gap-1 text-xs text-white bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 rounded-lg transition-colors">
                Abrir sesión <ArrowRight size={11} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
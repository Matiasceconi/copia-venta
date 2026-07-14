import React from "react";
import moment from "moment";
import { CheckCircle2, Circle, Clock } from "lucide-react";

export default function GpsMicrocycleContext({ days, rivalByDate, objective }) {
  if (!days || days.length === 0) return null;
  const today = moment().format("YYYY-MM-DD");
  const doneCount = days.filter((d) => d.date && d.date < today).length;
  const progressPct = days.length ? Math.round((doneCount / days.length) * 100) : 0;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Microciclo actual</p>
        {objective && (
          <span className="text-[11px] font-semibold text-blue-300 bg-blue-900/30 border border-blue-800/40 px-2 py-0.5 rounded-full">
            Objetivo: {objective}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {days.map((d, i) => {
          const isToday = d.date === today;
          const isDone = d.date && d.date < today;
          const rival = rivalByDate?.[d.date];
          return (
            <div
              key={i}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border min-w-[76px] shrink-0 ${
                isToday ? "bg-blue-900/30 border-blue-600" : isDone ? "bg-emerald-900/10 border-emerald-800/40" : "bg-zinc-800/60 border-zinc-700"
              }`}
            >
              {isDone ? <CheckCircle2 size={14} className="text-emerald-400" /> : isToday ? <Clock size={14} className="text-blue-400" /> : <Circle size={14} className="text-zinc-600" />}
              <span className="text-[11px] font-bold text-white">{d.md && d.md !== "— MD —" ? d.md : "—"}</span>
              <span className="text-[9px] text-zinc-500">{d.date ? moment(d.date).format("DD/MM") : ""}</span>
              {rival && <span className="text-[9px] text-amber-300 font-semibold truncate max-w-[70px]">vs {rival}</span>}
            </div>
          );
        })}
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
          <span>Progreso del microciclo</span>
          <span>{doneCount}/{days.length} sesiones</span>
        </div>
        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>
    </div>
  );
}
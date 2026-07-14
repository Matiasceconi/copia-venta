import React from "react";
import moment from "moment";
import { fmtInt } from "./externalGpsLoadUtils";
import { ChevronRight } from "lucide-react";

export default function ExternalGpsSessionList({ sessions, onViewSession }) {
  if (sessions.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
        <p className="text-zinc-500 text-sm">Sin datos GPS para esta semana</p>
      </div>
    );
  }
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-white">Detalle por sesión</h3>
      </div>
      <div className="divide-y divide-zinc-800">
        {sessions.map((s) => (
          <div key={s.id} className="p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-[160px]">
              <p className="text-sm text-white font-medium">{s.title}</p>
              <p className="text-xs text-zinc-500">{moment(s.date).format("DD/MM/YYYY")}{s.match_day_code ? ` · ${s.match_day_code}` : ""}</p>
            </div>
            <div className="flex items-center gap-5 text-xs text-zinc-400">
              <span>{s.playersWithGps} jug. GPS</span>
              <span>Dist: <span className="text-white font-semibold">{fmtInt(s.avgDistance)}</span></span>
              <span>m/min: <span className="text-white font-semibold">{fmtInt(s.avgMMin)}</span></span>
              <span>PL: <span className="text-white font-semibold">{fmtInt(s.avgPlayerLoad)}</span></span>
            </div>
            <button onClick={() => onViewSession(s.id)}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors">
              Ver sesión <ChevronRight size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
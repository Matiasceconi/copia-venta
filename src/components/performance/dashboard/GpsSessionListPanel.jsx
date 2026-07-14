import React from "react";
import moment from "moment";
import "moment/locale/es";
import { ArrowRight } from "lucide-react";
moment.locale("es");

const MD_COLORS = {
  "Partido": "bg-red-500/15 text-red-300 border-red-500/30",
  "Regenerativo": "bg-blue-500/15 text-blue-300 border-blue-500/30",
};
function mdBadgeClass(md) {
  return MD_COLORS[md] || "bg-zinc-700/40 text-zinc-300 border-zinc-600/50";
}

export default function GpsSessionListPanel({ sessions, selectedSessionId, onSelect, onViewReport }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Sesiones GPS</p>
      </div>
      <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-zinc-900">
            <tr className="text-[11px] text-zinc-500 uppercase">
              <th className="text-left px-4 py-2 font-semibold">Fecha</th>
              <th className="text-left px-2 py-2 font-semibold">Tipo</th>
              <th className="text-left px-2 py-2 font-semibold">Descripción</th>
              <th className="text-left px-2 py-2 font-semibold">Objetivo</th>
              <th className="text-center px-2 py-2 font-semibold">Min.</th>
              <th className="text-center px-2 py-2 font-semibold">Jug.</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr
                key={s.id}
                onClick={() => onSelect(s.id)}
                className={`cursor-pointer border-t border-zinc-800/70 transition-colors ${selectedSessionId === s.id ? "bg-emerald-500/10" : "hover:bg-zinc-800/50"}`}
              >
                <td className="px-4 py-2 text-zinc-300 whitespace-nowrap">{moment(s.date).format("DD/MM/YYYY")}</td>
                <td className="px-2 py-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${mdBadgeClass(s.match_day_code)}`}>
                    {s.match_day_code || "—"}
                  </span>
                </td>
                <td className="px-2 py-2 text-zinc-300 max-w-[160px] truncate">{s.title}</td>
                <td className="px-2 py-2 text-zinc-400 max-w-[150px] truncate">{s.session_objective || "—"}</td>
                <td className="px-2 py-2 text-center text-zinc-300">{s.durationForFilter || s.duration_minutes || "—"}</td>
                <td className="px-2 py-2 text-center text-zinc-300">{s.playerCount}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={(e) => { e.stopPropagation(); onViewReport(s.id); }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    Ver informe <ArrowRight size={11} />
                  </button>
                </td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr><td colSpan={7} className="text-center text-zinc-600 text-xs py-8">Sin sesiones para los filtros aplicados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
import React from "react";
import moment from "moment";
import { fmtInt, fmtSmax, EXCLUSION_REASON_LABELS } from "./externalGpsLoadUtils";
import { UserX } from "lucide-react";

export default function ExternalGpsExcludedList({ rows }) {
  if (!rows || rows.length === 0) return null;
  return (
    <div className="bg-zinc-900 border border-amber-500/30 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-amber-500/20 flex items-center gap-2">
        <UserX size={15} className="text-amber-400" />
        <div>
          <h3 className="text-sm font-semibold text-amber-300">Jugadores excluidos de promedios ({rows.length})</h3>
          <p className="text-[11px] text-zinc-500">No afectan los promedios semanales ni las comparaciones grupales</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left py-2.5 px-4 text-zinc-400 font-medium whitespace-nowrap">Jugador</th>
              <th className="text-left py-2.5 px-3 text-zinc-400 font-medium whitespace-nowrap">Sesión</th>
              <th className="text-left py-2.5 px-3 text-zinc-400 font-medium whitespace-nowrap">Fecha</th>
              <th className="text-left py-2.5 px-3 text-zinc-400 font-medium whitespace-nowrap">Motivo</th>
              <th className="text-right py-2.5 px-3 text-zinc-400 font-medium whitespace-nowrap">Distancia</th>
              <th className="text-right py-2.5 px-3 text-zinc-400 font-medium whitespace-nowrap">P.Load</th>
              <th className="text-right py-2.5 px-3 text-zinc-400 font-medium whitespace-nowrap">Smax</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id || i} className="border-b border-zinc-800/40 hover:bg-zinc-800/30 transition-colors">
                <td className="py-2 px-4 text-white font-semibold whitespace-nowrap">{r.player_name}</td>
                <td className="py-2 px-3 text-zinc-400 whitespace-nowrap">{r.session_title || "—"}</td>
                <td className="py-2 px-3 text-zinc-500 whitespace-nowrap">{r.date ? moment(r.date).format("DD/MM/YYYY") : "—"}</td>
                <td className="py-2 px-3 text-amber-300 whitespace-nowrap">{EXCLUSION_REASON_LABELS[r.exclusion_reason] || r.exclusion_reason || "—"}</td>
                <td className="py-2 px-3 text-right font-bold text-blue-400">{fmtInt(r.total_distance)}</td>
                <td className="py-2 px-3 text-right font-bold text-purple-400">{fmtInt(r.player_load)}</td>
                <td className="py-2 px-3 text-right font-bold text-red-400">{fmtSmax(r.smax)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
import React from "react";
import { fmtInt, fmtSmax } from "./externalGpsLoadUtils";
import PlayerAvatar from "@/components/player/PlayerAvatar";

export default function ExternalGpsPlayerTable({ rows, playerMap }) {
  if (rows.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
        <p className="text-zinc-500 text-sm">Sin datos GPS para esta semana</p>
      </div>
    );
  }
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-white">Carga por jugador</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-zinc-800/80">
              <th className="px-3 py-2.5 text-left text-zinc-400 font-semibold whitespace-nowrap">Jugador</th>
              <th className="px-3 py-2.5 text-left text-zinc-400 font-semibold whitespace-nowrap">Posición</th>
              <th className="px-3 py-2.5 text-left text-zinc-400 font-semibold whitespace-nowrap">Tipo</th>
              <th className="px-3 py-2.5 text-right text-zinc-400 font-semibold whitespace-nowrap">Sesiones GPS</th>
              <th className="px-3 py-2.5 text-right text-zinc-400 font-semibold whitespace-nowrap">Distancia acum.</th>
              <th className="px-3 py-2.5 text-right text-zinc-400 font-semibold whitespace-nowrap">Player Load acum.</th>
              <th className="px-3 py-2.5 text-right text-zinc-400 font-semibold whitespace-nowrap">Sprints acum.</th>
              <th className="px-3 py-2.5 text-right text-zinc-400 font-semibold whitespace-nowrap">ACC +3</th>
              <th className="px-3 py-2.5 text-right text-zinc-400 font-semibold whitespace-nowrap">DEC +3</th>
              <th className="px-3 py-2.5 text-right text-zinc-400 font-semibold whitespace-nowrap">Smax máx.</th>
            </tr>
          </thead>
          <tbody>
            {[...rows].sort((a, b) => (b.total_distance || 0) - (a.total_distance || 0)).map((r, i) => (
              <tr key={r.player_id} className={i % 2 === 0 ? "bg-zinc-900" : "bg-zinc-800/30"}>
                <td className="px-3 py-2 whitespace-nowrap">
                  <PlayerAvatar player={playerMap[r.player_id] || { id: r.player_id, full_name: r.player_name }} size="xs" showName />
                </td>
                <td className="px-3 py-2 text-zinc-300 whitespace-nowrap">{r.position || "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${r.player_type === "arquero" ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" : "bg-blue-500/15 text-blue-300 border-blue-500/30"}`}>
                    {r.player_type === "arquero" ? "Arquero" : "Campo"}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-zinc-200 font-mono">{r.sessions}</td>
                <td className="px-3 py-2 text-right text-zinc-200 font-mono">{fmtInt(r.total_distance)}</td>
                <td className="px-3 py-2 text-right text-zinc-200 font-mono">{fmtInt(r.player_load)}</td>
                <td className="px-3 py-2 text-right text-zinc-200 font-mono">{fmtInt(r.sprints)}</td>
                <td className="px-3 py-2 text-right text-zinc-200 font-mono">{fmtInt(r.acc_3)}</td>
                <td className="px-3 py-2 text-right text-zinc-200 font-mono">{fmtInt(r.dec_3)}</td>
                <td className="px-3 py-2 text-right text-zinc-200 font-mono">{fmtSmax(r.smax_max)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
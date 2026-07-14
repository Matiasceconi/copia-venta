import React, { useMemo } from "react";
import { fmtInt, fmtSmax } from "../externalGpsLoadUtils";

const COLS = [
  { key: "total_distance", label: "Dist. (m)", fmt: fmtInt },
  { key: "m_min", label: "m/min", fmt: fmtInt },
  { key: "distance_19_8", label: "D>19.8", fmt: fmtInt },
  { key: "distance_25", label: "D>25", fmt: fmtInt },
  { key: "sprints", label: "Sprints", fmt: fmtInt },
  { key: "acc_3", label: "ACC +3", fmt: fmtInt },
  { key: "dec_3", label: "DEC +3", fmt: fmtInt },
  { key: "player_load", label: "Player Load", fmt: fmtInt },
  { key: "smax", label: "S Max", fmt: fmtSmax },
];

export default function GpsPlayerTable({ rows }) {
  const maxByCol = useMemo(() => {
    const map = {};
    COLS.forEach((c) => {
      const vals = rows.map((r) => r[c.key]).filter((v) => v != null && !isNaN(v));
      map[c.key] = vals.length ? Math.max(...vals) : null;
    });
    return map;
  }, [rows]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Jugadores de la sesión</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] text-zinc-500 uppercase bg-zinc-800/50">
              <th className="text-left px-3 py-2 font-semibold">Jugador</th>
              <th className="text-left px-2 py-2 font-semibold">Pos.</th>
              {COLS.map((c) => <th key={c.key} className="text-center px-2 py-2 font-semibold whitespace-nowrap">{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.player_id} className="border-t border-zinc-800/70 hover:bg-zinc-800/40">
                <td className="px-3 py-2 text-white font-medium whitespace-nowrap">{r.player_name}</td>
                <td className="px-2 py-2 text-zinc-400 whitespace-nowrap">{r.position || "—"}</td>
                {COLS.map((c) => {
                  const val = r[c.key];
                  const isMax = maxByCol[c.key] != null && val === maxByCol[c.key] && val != null;
                  return (
                    <td key={c.key} className={`px-2 py-2 text-center ${isMax ? "text-emerald-400 font-bold" : "text-zinc-300"}`}>
                      {c.fmt(val)}
                    </td>
                  );
                })}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={2 + COLS.length} className="text-center text-zinc-600 py-8">Sin datos GPS para esta sesión</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
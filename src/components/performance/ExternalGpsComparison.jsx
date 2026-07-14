import React from "react";
import { avg, fmtInt, fmtSmax } from "./externalGpsLoadUtils";

const METRICS = [
  { key: "total_distance", label: "Distancia prom.", fmt: fmtInt },
  { key: "m_min", label: "m/min prom.", fmt: fmtInt },
  { key: "player_load", label: "Player Load prom.", fmt: fmtInt },
  { key: "sprints", label: "Sprints prom.", fmt: fmtInt },
  { key: "smax", label: "Smax prom.", fmt: fmtSmax },
];

export default function ExternalGpsComparison({ fieldRows, gkRows }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-white">Comparación Campo / Arqueros</h3>
      </div>
      <div className="grid grid-cols-3 text-xs">
        <div className="px-4 py-2.5 font-semibold text-zinc-400 border-b border-zinc-800">Métrica</div>
        <div className="px-4 py-2.5 font-semibold text-blue-300 border-b border-zinc-800 text-center">Campo ({fieldRows.length})</div>
        <div className="px-4 py-2.5 font-semibold text-yellow-300 border-b border-zinc-800 text-center">Arqueros ({gkRows.length})</div>
        {METRICS.map(({ key, label, fmt }) => (
          <React.Fragment key={key}>
            <div className="px-4 py-2.5 text-zinc-300 border-b border-zinc-800/50">{label}</div>
            <div className="px-4 py-2.5 text-center text-white font-bold border-b border-zinc-800/50">{fmt(avg(fieldRows.map((r) => r[key])))}</div>
            <div className="px-4 py-2.5 text-center text-white font-bold border-b border-zinc-800/50">{fmt(avg(gkRows.map((r) => r[key])))}</div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
import React from "react";
import { fmtInt, fmtSmax } from "./externalGpsLoadUtils";

const CARDS = [
  { key: "sessionsCount", label: "Sesiones con GPS", fmt: fmtInt },
  { key: "playersCount", label: "Jugadores con GPS", fmt: fmtInt },
  { key: "avgDistance", label: "Distancia total prom.", fmt: fmtInt, suffix: "m" },
  { key: "avgMMin", label: "m/min prom.", fmt: fmtInt },
  { key: "avgPlayerLoad", label: "Player Load prom.", fmt: fmtInt },
  { key: "avgSprints", label: "Sprints prom.", fmt: fmtInt },
  { key: "avgAcc", label: "ACC +3 prom.", fmt: fmtInt },
  { key: "avgDec", label: "DEC +3 prom.", fmt: fmtInt },
  { key: "maxSmax", label: "Smax máxima semanal", fmt: fmtSmax, suffix: "km/h" },
];

export default function ExternalGpsWeeklySummary({ summary }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {CARDS.map(({ key, label, fmt, suffix }) => (
        <div key={key} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
          <p className="text-zinc-500 text-xs">{label}</p>
          <p className="font-bold text-lg mt-0.5 text-white">
            {fmt(summary[key])}{summary[key] != null && suffix ? <span className="text-xs text-zinc-500 ml-1">{suffix}</span> : ""}
          </p>
        </div>
      ))}
    </div>
  );
}
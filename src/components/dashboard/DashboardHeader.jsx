import React from "react";
import moment from "moment";
import SquadActiveSelector from "./SquadActiveSelector";
import NextMatchHeaderCard from "./NextMatchHeaderCard";

const MICROCYCLE_COLORS = {
  "MD-4": "bg-zinc-700/50 text-zinc-300 border-zinc-600",
  "MD-3": "bg-zinc-700/50 text-zinc-300 border-zinc-600",
  "MD-2": "bg-amber-500/15 text-amber-300 border-amber-500/30",
  "MD-1": "bg-orange-500/15 text-orange-300 border-orange-500/30",
  "MD": "bg-red-500/15 text-red-300 border-red-500/30",
  "MD+1": "bg-sky-500/15 text-sky-300 border-sky-500/30",
  "MD+2": "bg-sky-500/15 text-sky-300 border-sky-500/30",
  "Libre": "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};

function seasonLabel(activeSquad, activeSeasonId) {
  const raw = activeSquad?.season || activeSeasonId || "";
  const match = String(raw).match(/20\d{2}/);
  return match ? `Temporada ${match[0]}` : "";
}

export default function DashboardHeader({ activeSquad, activeSeasonId, mySquads, setActiveSquad, nextMatch, nextMatchReport, microcycleLabel }) {
  const microColor = MICROCYCLE_COLORS[microcycleLabel] || MICROCYCLE_COLORS["Libre"];
  const season = seasonLabel(activeSquad, activeSeasonId);
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 overflow-hidden p-1.5">
          <img
            src="https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/a8608f7d3_defensa.png"
            alt="Defensa y Justicia"
            className="w-full h-full object-contain"
          />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-white tracking-tight">{activeSquad?.name || "Plantel"}</h1>
            {season && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-300">
                {season}
              </span>
            )}
            {MICROCYCLE_COLORS[microcycleLabel] && (
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${microColor}`}>
                {microcycleLabel}
              </span>
            )}
          </div>
          <p className="text-zinc-500 text-sm mt-1 capitalize">{moment().format("dddd D [de] MMMM, YYYY")}</p>
          {mySquads.length > 1 && (
            <div className="mt-2">
              <SquadActiveSelector mySquads={mySquads} activeSquad={activeSquad} setActiveSquad={setActiveSquad} />
            </div>
          )}
        </div>
      </div>

      {nextMatch && (
        <NextMatchHeaderCard match={nextMatch} matchReport={nextMatchReport} />
      )}
    </div>
  );
}
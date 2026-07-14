import React, { useMemo } from "react";
import { MICRO_DAYS, formatProfileValue, pctColor } from "./gpsProfileMetrics";

function ProfileCell({ value, matchValue, unit, isMatch }) {
  if (!Number.isFinite(Number(value)) || Number(value) <= 0) return <td className="px-3 py-3 text-zinc-600 text-xs">Sin datos</td>;
  if (isMatch) return <td className="px-3 py-3 text-white font-bold text-sm">{formatProfileValue(value, unit)}</td>;
  const pct = matchValue > 0 ? (Number(value) / Number(matchValue)) * 100 : null;
  return (
    <td className="px-3 py-3">
      <div className={`rounded-xl border px-3 py-2 ${pctColor(pct)}`}>
        <div className="font-bold text-sm">{formatProfileValue(value, unit)}</div>
        <div className="text-[11px] opacity-80">{pct == null ? "Sin partido" : `${Math.round(pct)}%`}</div>
      </div>
    </td>
  );
}

export default function GpsIndividualMicrocycleTable({ players, competitionProfiles, microcycleProfiles, metric }) {
  const { competitionMap, microMap, tablePlayers } = useMemo(() => {
    const comp = Object.fromEntries(competitionProfiles.map((p) => [p.player_id, p]));
    const micro = {};
    microcycleProfiles.forEach((p) => { micro[`${p.player_id}:${p.microcycle_day}`] = p; });
    const list = [...players].sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
    return { competitionMap: comp, microMap: micro, tablePlayers: list };
  }, [players, competitionProfiles, microcycleProfiles]);

  return (
    <div className="overflow-x-auto border border-zinc-800 rounded-2xl">
      <table className="w-full min-w-[980px] text-left">
        <thead className="bg-zinc-950 text-zinc-500 text-xs uppercase tracking-wide">
          <tr><th className="px-4 py-3">Jugador</th><th className="px-3 py-3">Partido +80’</th>{MICRO_DAYS.map((d) => <th key={d} className="px-3 py-3">{d}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-zinc-800 bg-zinc-900/60">
          {tablePlayers.map((player) => {
            const comp = competitionMap[player.id];
            const matchValue = Number(comp?.[metric.key]) || 0;
            return <tr key={player.id} className="hover:bg-zinc-900"><td className="px-4 py-3"><div className="text-white font-semibold text-sm">{player.full_name}</div><div className="text-zinc-500 text-xs">{player.position || "—"}</div></td><ProfileCell value={matchValue} unit={metric.unit} isMatch />{MICRO_DAYS.map((day) => <ProfileCell key={day} value={microMap[`${player.id}:${day}`]?.[metric.key]} matchValue={matchValue} unit={metric.unit} />)}</tr>;
          })}
          {!tablePlayers.length && <tr><td colSpan={9} className="px-4 py-10 text-center text-zinc-500">Sin datos suficientes para este plantel y temporada.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
import React from "react";

const METRICS = [
  { key: "total_distance", compKey: "avg_total_distance", label: "Distancia" },
  { key: "m_min", compKey: "avg_m_min", label: "m/min" },
  { key: "distance_19_8", compKey: "avg_distance_19_8", label: "D>19.8" },
  { key: "distance_25", compKey: "avg_distance_25", label: "D>25" },
  { key: "sprints", compKey: "avg_sprints", label: "Sprints" },
  { key: "player_load", compKey: "avg_player_load", label: "Player Load" },
  { key: "smax", compKey: "avg_smax", label: "S Max" },
];

function pctClass(pct) {
  if (pct == null) return "text-zinc-500";
  if (pct >= 110) return "text-red-400";
  if (pct >= 95) return "text-amber-400";
  return "text-emerald-400";
}

export default function GpsMatchComparisonPanel({ rows, competitionMap, selectedPlayerId, onSelectPlayer }) {
  const player = rows.find((r) => r.player_id === selectedPlayerId) || rows[0];
  const comp = player ? competitionMap[player.player_id] : null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Comparación vs. promedio individual de partido</p>
        <select
          value={player?.player_id || ""}
          onChange={(e) => onSelectPlayer(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 text-white text-xs rounded-lg px-2 py-1 focus:outline-none"
        >
          {rows.map((r) => <option key={r.player_id} value={r.player_id} className="bg-zinc-900">{r.player_name}</option>)}
        </select>
      </div>

      {!comp ? (
        <p className="text-zinc-600 text-xs text-center py-6">Sin perfil competitivo para este jugador</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
          {METRICS.map((m) => {
            const compVal = comp[m.compKey];
            const sessionVal = player[m.key];
            const pct = compVal ? (sessionVal / compVal) * 100 : null;
            return (
              <div key={m.key} className="bg-zinc-800/60 rounded-lg p-2 text-center">
                <p className="text-[9px] text-zinc-500 uppercase font-semibold">{m.label}</p>
                <p className={`text-sm font-bold ${pctClass(pct)}`}>{pct != null ? `${Math.round(pct)}%` : "—"}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
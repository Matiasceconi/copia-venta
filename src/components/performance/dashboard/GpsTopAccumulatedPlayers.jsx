import React from "react";
import PlayerPhoto from "@/components/player/PlayerPhoto";

function fmt(value, unit) {
  if (!value || Number.isNaN(value)) return `0 ${unit}`.trim();
  return `${Math.round(value).toLocaleString("es-AR")} ${unit}`.trim();
}

function initials(name) {
  return (name || "J").split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

export default function GpsTopAccumulatedPlayers({ rows, playerMap, metrics }) {
  const rankings = metrics.map((metric) => {
    const byPlayer = {};
    rows.forEach((row) => {
      const value = Number(row[metric.key]) || 0;
      if (!value) return;
      const player = playerMap[row.player_id];
      const name = row.player_name || player?.full_name || "Jugador";
      if (!byPlayer[row.player_id]) byPlayer[row.player_id] = { player, name, total: 0 };
      byPlayer[row.player_id].total += value;
    });
    return { metric, players: Object.values(byPlayer).sort((a, b) => b.total - a.total).slice(0, 3) };
  });

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <div className="mb-4">
        <h3 className="text-white font-bold text-lg">Jugadores con mayor carga acumulada</h3>
        <p className="text-zinc-500 text-sm">Top 3 del microciclo por variable.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {rankings.map(({ metric, players }) => (
          <div key={metric.key} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: metric.color }}>{metric.label}</p>
            <div className="space-y-2">
              {players.length ? players.map((item, index) => (
                <div key={`${metric.key}-${item.player?.id || item.name}`} className="flex items-center gap-3">
                  <span className="w-5 text-xs font-bold text-zinc-500">#{index + 1}</span>
                  <PlayerPhoto
                    player={item.player || { full_name: item.name }}
                    alt={item.name}
                    className="w-9 h-9 rounded-full object-cover border border-zinc-700"
                    fallbackClassName="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center"
                    textClassName="text-xs font-bold text-zinc-300"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                    <p className="text-xs text-zinc-500">{fmt(item.total, metric.unit)}</p>
                  </div>
                </div>
              )) : <p className="text-sm text-zinc-500">Sin datos</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
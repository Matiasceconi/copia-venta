import React from "react";
import { Search } from "lucide-react";

export default function GpsIndividualPlayerSelector({
  players,
  selectedPlayerId,
  onSelectPlayer,
  loading,
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <div className="flex items-center gap-3">
        <Search size={18} className="text-zinc-500 shrink-0" />
        <select
          value={selectedPlayerId}
          onChange={(e) => onSelectPlayer(e.target.value)}
          disabled={loading}
          className="flex-1 bg-zinc-800 border border-zinc-700 text-white text-sm rounded-xl px-4 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">-- Seleccionar jugador --</option>
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.full_name} {player.shirt_number ? `(#${player.shirt_number})` : ""}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
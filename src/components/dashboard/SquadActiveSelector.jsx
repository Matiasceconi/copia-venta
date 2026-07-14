import React from "react";

export default function SquadActiveSelector({ mySquads, activeSquad, setActiveSquad }) {
  return (
    <select
      value={activeSquad?.id || ""}
      onChange={e => {
        const sq = mySquads.find(s => s.id === e.target.value);
        if (sq) setActiveSquad(sq);
      }}
      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
    >
      {mySquads.map(sq => (
        <option key={sq.id} value={sq.id}>{sq.name}</option>
      ))}
    </select>
  );
}
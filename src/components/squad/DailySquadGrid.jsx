import React from "react";
import { POSITION_GROUPS } from "@/components/squad/squadConstants";
import PlayerDayCard from "@/components/squad/PlayerDayCard";

export default function DailySquadGrid({ players, getEffectiveStatus, applyChange, pendingChanges, selectedDate, squads, selectedSquadId, onApplyMovement, onEndTemporaryMovement }) {
  const grouped = {};
  const ungrouped = [];

  players.forEach(p => {
    let found = false;
    for (const [group, positions] of Object.entries(POSITION_GROUPS)) {
      if (positions.includes(p.position)) {
        if (!grouped[group]) grouped[group] = [];
        grouped[group].push(p);
        found = true;
        break;
      }
    }
    if (!found) ungrouped.push(p);
  });

  const groupOrder = Object.keys(POSITION_GROUPS);

  if (players.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
        <p className="text-zinc-500 text-sm">No hay jugadores que coincidan con los filtros</p>
      </div>
    );
  }

  const isGkGroup = (group) => group === "Arqueros";

  return (
    <div className="space-y-6">
      {groupOrder.filter(g => grouped[g]?.length > 0).map(group => (
        <div key={group}>
          <div className="flex items-center gap-3 mb-3">
            {isGkGroup(group)
              ? <h2 className="text-sm font-semibold text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">🥅 {group}</h2>
              : <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">{group}</h2>}
            <div className={`flex-1 h-px ${isGkGroup(group) ? "bg-yellow-500/25" : "bg-zinc-800"}`} />
            <span className={`text-xs ${isGkGroup(group) ? "text-yellow-500" : "text-zinc-600"}`}>{grouped[group].length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {grouped[group].map(p => (
              <PlayerDayCard
                key={p.id}
                player={p}
                dayStatus={getEffectiveStatus(p)}
                hasPending={!!pendingChanges[p.id]}
                onChange={changes => applyChange(p.id, changes)}
                selectedDate={selectedDate}
                squads={squads}
                selectedSquadId={selectedSquadId}
                onApplyMovement={onApplyMovement}
                onEndTemporaryMovement={onEndTemporaryMovement}
              />
            ))}
          </div>
        </div>
      ))}
      {ungrouped.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Otros</h2>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {ungrouped.map(p => (
              <PlayerDayCard
                key={p.id}
                player={p}
                dayStatus={getEffectiveStatus(p)}
                hasPending={!!pendingChanges[p.id]}
                onChange={changes => applyChange(p.id, changes)}
                selectedDate={selectedDate}
                squads={squads}
                selectedSquadId={selectedSquadId}
                onApplyMovement={onApplyMovement}
                onEndTemporaryMovement={onEndTemporaryMovement}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
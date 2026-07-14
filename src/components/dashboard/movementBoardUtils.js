import { resolvePositionGroup } from "@/components/squad/squadConstants";

export const POSITION_ORDER = ["Arqueros", "Defensores", "Mediocampistas", "Extremos", "Delanteros"];

function getPositionGroup(ds, playerMap) {
  const player = playerMap[ds.player_id];
  if (player?.position_group) return player.position_group;
  const position = player?.position || ds.position || "";
  return resolvePositionGroup(position) || "";
}

// Sorts records by position group order: Arqueros, Defensores, Mediocampistas, Extremos, Delanteros
export function sortRecordsByPosition(records, playerMap) {
  return [...records].sort((a, b) => {
    const ga = POSITION_ORDER.indexOf(getPositionGroup(a, playerMap));
    const gb = POSITION_ORDER.indexOf(getPositionGroup(b, playerMap));
    const ia = ga === -1 ? POSITION_ORDER.length : ga;
    const ib = gb === -1 ? POSITION_ORDER.length : gb;
    return ia - ib;
  });
}
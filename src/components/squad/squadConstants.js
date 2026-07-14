export const ALL_TAGS = [
  "Lesionado", "Molestia", "Disponible", "Diferenciado",
  "Baja a cuarta", "Sube a reserva", "Baja a juveniles", "Sube a primera",
  "Convocado", "No convocado", "Suspendido", "Reintegro",
  "Descanso", "Ausente", "Alta médica", "A prueba"
];

export const STATUS_LABELS = {
  disponible:   "Disponible",
  lesionado:    "Lesionado",
  molestia:     "Molestia",
  suspendido:   "Suspendido",
  reintegro:    "Reintegro",
  "bajó":       "Bajó",
  "subió":      "Subió",
  convocado:    "Convocado",
  ausente:      "Ausente",
  descanso:     "Descanso",
  diferenciado: "Diferenciado",
};

export const STATUS_COLORS = {
  disponible:   "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  lesionado:    "bg-red-500/20 text-red-300 border-red-500/30",
  molestia:     "bg-orange-500/20 text-orange-300 border-orange-500/30",
  suspendido:   "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  reintegro:    "bg-teal-500/20 text-teal-300 border-teal-500/30",
  "bajó":       "bg-pink-500/20 text-pink-300 border-pink-500/30",
  "subió":      "bg-violet-500/20 text-violet-300 border-violet-500/30",
  convocado:    "bg-blue-500/20 text-blue-300 border-blue-500/30",
  ausente:      "bg-zinc-600/30 text-zinc-400 border-zinc-600",
  descanso:     "bg-sky-500/20 text-sky-300 border-sky-500/30",
  diferenciado: "bg-amber-500/20 text-amber-300 border-amber-500/30",
};

export const POSITION_GROUPS = {
  "Arqueros":       ["Arquero"],
  "Defensores":     ["Defensor Central", "Lateral Derecho", "Lateral Izquierdo"],
  "Mediocampistas": ["Mediocampista Central", "Volante Interno"],
  "Extremos":       ["Extremo"],
  "Delanteros":     ["Delantero Centro"],
};

// Alias conocidos de arquero (normalizados a minúsculas)
const GK_ALIASES = new Set(["arquero", "arq", "gk", "goalkeeper", "portero", "golero", "guardameta", "arqueros"]);

// Helper: determina si un jugador es arquero por su posición o player_type
export function isGoalkeeper(player) {
  if (!player) return false;
  // Chequear player_type primero (más confiable si está seteado)
  if (player.player_type === "arquero") return true;
  // Fallback: chequear position
  const pos = (player.position || "").toLowerCase().trim();
  return GK_ALIASES.has(pos);
}

// Helper: determina el player_type según posición
export function resolvePlayerType(position) {
  const pos = (position || "").toLowerCase().trim();
  return GK_ALIASES.has(pos) ? "arquero" : "jugador_campo";
}

// Helper: determina el position_group según posición
export function resolvePositionGroup(position) {
  const pos = (position || "").toLowerCase().trim();
  if (GK_ALIASES.has(pos)) return "Arqueros";
  for (const [group, positions] of Object.entries(POSITION_GROUPS)) {
    if (positions.map(p => p.toLowerCase()).includes(pos)) return group;
  }
  return null;
}
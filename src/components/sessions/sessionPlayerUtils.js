import { POSITION_GROUPS } from "@/components/squad/squadConstants";

const GROUP_ORDER = ["Arqueros", "Defensores", "Mediocampistas", "Extremos", "Delanteros"];

export function resolveGroup(position) {
  for (const [group, positions] of Object.entries(POSITION_GROUPS)) {
    if (positions.includes(position)) return group;
  }
  return "Defensores";
}

function lastNameKey(fullName) {
  const parts = (fullName || "").trim().split(" ");
  return (parts[parts.length - 1] || "").toLowerCase();
}

// Ordena por grupo posicional (Arqueros > Defensores > Mediocampistas > Extremos > Delanteros)
// y dentro de cada grupo alfabéticamente por apellido.
export function sortPlayers(list) {
  return [...list].sort((a, b) => {
    const ga = GROUP_ORDER.indexOf(resolveGroup(a.position));
    const gb = GROUP_ORDER.indexOf(resolveGroup(b.position));
    if (ga !== gb) return ga - gb;
    return lastNameKey(a.player_name).localeCompare(lastNameKey(b.player_name));
  });
}

export const STATUS_LABELS = {
  disponible: "Disponible", lesionado: "Lesionado", molestia: "Molestia",
  diferenciado: "Diferenciado", suspendido: "Suspendido", ausente: "Ausente",
  "bajó": "Bajó", "subió": "Subió", convocado: "Convocado", reintegro: "Reintegro",
};

export const STATUS_COLORS = {
  disponible: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  lesionado: "bg-red-500/15 text-red-300 border-red-500/30",
  molestia: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  diferenciado: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  suspendido: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  ausente: "bg-zinc-700/40 text-zinc-400 border-zinc-600",
  "bajó": "bg-orange-500/15 text-orange-300 border-orange-500/30",
  "subió": "bg-sky-500/15 text-sky-300 border-sky-500/30",
  convocado: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  reintegro: "bg-teal-500/15 text-teal-300 border-teal-500/30",
};
export const MICRO_DAYS = ["MD-4", "MD-3", "MD-2", "MD-1", "MD", "MD+1", "MD+2"];

export const PROFILE_METRICS = [
  { key: "avg_total_distance", label: "Distancia total", unit: "m" },
  { key: "avg_m_min", label: "m/min", unit: "" },
  { key: "avg_distance_19_8", label: "D >19.8", unit: "m" },
  { key: "avg_distance_25", label: "D >25", unit: "m" },
  { key: "avg_sprints", label: "Sprints", unit: "" },
  { key: "avg_acc_3", label: "ACC +3", unit: "" },
  { key: "avg_dec_3", label: "DEC +3", unit: "" },
  { key: "avg_player_load", label: "Player Load", unit: "u" },
  { key: "avg_smax", label: "Smax", unit: "km/h" },
];

export function formatProfileValue(value, unit) {
  if (!Number.isFinite(Number(value)) || Number(value) <= 0) return "Sin datos";
  const n = Number(value);
  const shown = unit === "km/h" ? n.toFixed(1) : Math.round(n).toLocaleString("es-AR");
  return `${shown}${unit ? ` ${unit}` : ""}`;
}

export function pctColor(percent) {
  if (!Number.isFinite(percent)) return "bg-zinc-900 text-zinc-500 border-zinc-800";
  if (percent > 100) return "bg-purple-500/15 text-purple-300 border-purple-500/30";
  if (percent >= 85) return "bg-red-500/15 text-red-300 border-red-500/30";
  if (percent >= 60) return "bg-orange-500/15 text-orange-300 border-orange-500/30";
  if (percent >= 30) return "bg-yellow-500/15 text-yellow-300 border-yellow-500/30";
  return "bg-blue-500/15 text-blue-300 border-blue-500/30";
}
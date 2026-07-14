import React from "react";

const DEFAULT_STATUSES = [
  { name: "Óptimo", color: "#16a34a" },
  { name: "Adecuado", color: "#0ea5e9" },
  { name: "Observar", color: "#eab308" },
  { name: "A mejorar", color: "#f97316" },
  { name: "Seguimiento", color: "#8b5cf6" },
  { name: "Prioritario", color: "#ef4444" },
];

function hexToRgba(hex, alpha = 0.15) {
  const value = String(hex || "#888").replace("#", "");
  const normalized = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(normalized.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function ReadingStatusBadge({ statusId, statusMap, name, color, small = false }) {
  let resolvedName = name;
  let resolvedColor = color;

  if (statusId && statusMap) {
    const found = statusMap[statusId];
    if (found) {
      resolvedName = found.name;
      resolvedColor = found.color;
    }
  }

  if (!resolvedName && !resolvedColor) {
    return (
      <span className={`inline-flex items-center rounded-full font-medium text-zinc-500 bg-zinc-800 border border-zinc-700 ${small ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"}`}>
        Sin lectura
      </span>
    );
  }

  const bgColor = resolvedColor ? hexToRgba(resolvedColor, 0.15) : "rgba(100,100,100,0.15)";
  const textColor = resolvedColor || "#aaaaaa";

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold border ${small ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"}`}
      style={{ backgroundColor: bgColor, color: textColor, borderColor: hexToRgba(resolvedColor || "#888", 0.35) }}
    >
      {resolvedName}
    </span>
  );
}

export { DEFAULT_STATUSES };

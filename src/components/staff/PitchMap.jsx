import React, { useState, useRef } from "react";

// PitchMap — 4-3-3 formation
// players: array of player objects from DB (full_name, number, position, status, photo_url)
// highlighted: set of player ids (for session toggle mode)
// onToggle: optional callback(player)
// emptyLabel: shown when no players

const statusColors = {
  "Disponible":      { bg: "#22c55e", text: "#fff" },
  "Lesionado":       { bg: "#ef4444", text: "#fff" },
  "En recuperación": { bg: "#f59e0b", text: "#fff" },
  "Suspendido":      { bg: "#f97316", text: "#fff" },
  "Permiso":         { bg: "#3b82f6", text: "#fff" },
  "Selección":       { bg: "#a855f7", text: "#fff" },
};

function rowPositions(count, yPercent) {
  const positions = [];
  for (let i = 0; i < count; i++) {
    const x = ((i + 1) / (count + 1)) * 100;
    positions.push({ x, y: yPercent });
  }
  return positions;
}

// Assign players to 4-3-3 rows based on position
function buildFormation433(players) {
  const gk         = players.filter((p) => p.position === "Arquero");
  const defenders  = players.filter((p) => ["Defensor Central", "Lateral Derecho", "Lateral Izquierdo", "Defensor"].includes(p.position));
  const midfield   = players.filter((p) => ["Mediocampista Central", "Volante Interno", "Mediocampista"].includes(p.position));
  // In 4-3-3, wingers (Extremo) go in the attacking line with the striker
  const forwards   = players.filter((p) => ["Delantero Centro", "Delantero", "Extremo"].includes(p.position));
  // Any unclassified player
  const rest       = players.filter((p) =>
    !gk.includes(p) && !defenders.includes(p) && !midfield.includes(p) && !forwards.includes(p)
  );

  return [
    { group: gk,        y: 88 },
    { group: defenders, y: 68 },
    { group: midfield,  y: 47 },
    { group: forwards,  y: 22 },
    { group: rest,      y: 10 },
  ];
}

function PlayerChip({ chipColor, photoUrl, player }) {
  const [imgError, setImgError] = React.useState(false);
  if (imgError) {
    return (
      <div
        style={{ background: chipColor, boxShadow: `0 0 16px ${chipColor}60, 0 4px 12px rgba(0,0,0,0.7)` }}
        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 border-white/50 transition-transform group-hover:scale-110 text-white"
      >
        {player.number || "?"}
      </div>
    );
  }
  return (
    <div
      style={{ borderColor: chipColor, borderWidth: "3px", borderStyle: "solid", boxShadow: `0 0 16px ${chipColor}60, 0 4px 12px rgba(0,0,0,0.7)` }}
      className="w-10 h-10 rounded-full overflow-hidden transition-transform group-hover:scale-110"
    >
      <img
        src={photoUrl}
        alt={player.full_name || ""}
        className="w-full h-full object-cover"
        onError={() => setImgError(true)}
      />
    </div>
  );
}

const EMPTY_SET = new Set();

export default function PitchMap({ players: rawPlayers, highlighted = EMPTY_SET, onToggle, emptyLabel }) {
  const players = (rawPlayers || []).filter(p => p && p.id);
  const [customPositions, setCustomPositions] = React.useState({});
  const [dragging, setDragging] = React.useState(null);
  const containerRef = React.useRef(null);

  const rows = buildFormation433(players);

  const allDots = [];
  rows.forEach(({ group, y }) => {
    if (!group.length) return;
    const coords = rowPositions(group.length, y);
    group.forEach((p, i) => {
      const custom = customPositions[p.id];
      allDots.push({
        player: p,
        x: custom ? custom.x : coords[i].x,
        y: custom ? custom.y : y,
      });
    });
  });

  const handleMouseDown = (e, player) => {
    if (onToggle) return;
    e.preventDefault();
    setDragging(player.id);
  };

  const handleMouseMove = (e) => {
    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    // Correct for the paddingBottom aspect ratio (78%)
    const y = ((e.clientY - rect.top) / (rect.width * 0.78)) * 100;
    setCustomPositions((prev) => ({
      ...prev,
      [dragging]: { x: Math.max(2, Math.min(98, x)), y: Math.max(2, Math.min(96, y)) },
    }));
  };

  const handleMouseUp = () => setDragging(null);

  if (!players || players.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-600 text-sm">
        {emptyLabel || "Sin jugadores"}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none rounded-lg overflow-hidden"
      style={{ paddingBottom: "78%" }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* SVG Pitch */}
      <svg
        viewBox="0 0 110 80"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="pitchGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: "#15803d", stopOpacity: 1 }} />
            <stop offset="50%" style={{ stopColor: "#16a34a", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "#15803d", stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        <rect width="110" height="80" fill="url(#pitchGrad)" />
        {/* Grass stripes */}
        {[0,1,2,3,4,5,6,7,8].map((i) => (
          <rect key={i} x={i * 13.75} width="13.75" height="80"
            fill={i % 2 === 0 ? "#22c55e" : "transparent"} opacity="0.07" />
        ))}
        {/* Outer border */}
        <rect x="3" y="3" width="104" height="74" fill="none" stroke="white" strokeWidth="0.6" />
        {/* Center line */}
        <line x1="3" y1="40" x2="107" y2="40" stroke="white" strokeWidth="0.5" />
        {/* Center circle */}
        <circle cx="55" cy="40" r="9.5" fill="none" stroke="white" strokeWidth="0.6" />
        <circle cx="55" cy="40" r="0.7" fill="white" />
        {/* Penalty area — top (defense) */}
        <rect x="29" y="3" width="52" height="18" fill="none" stroke="white" strokeWidth="0.6" />
        <rect x="38" y="3" width="34" height="7" fill="none" stroke="white" strokeWidth="0.6" />
        <path d="M 41 1.5 L 41 0 L 69 0 L 69 1.5" stroke="white" strokeWidth="0.6" fill="none" />
        {/* Penalty area — bottom (attack) */}
        <rect x="29" y="59" width="52" height="18" fill="none" stroke="white" strokeWidth="0.6" />
        <rect x="38" y="70" width="34" height="7" fill="none" stroke="white" strokeWidth="0.6" />
        <path d="M 41 78.5 L 41 80 L 69 80 L 69 78.5" stroke="white" strokeWidth="0.6" fill="none" />
        {/* Corner flags */}
        {[[5,5],[105,5],[5,75],[105,75]].map((pos, i) => (
          <circle key={i} cx={pos[0]} cy={pos[1]} r="0.5" fill="white" />
        ))}
      </svg>

      {/* Player chips */}
      {allDots.map(({ player, x, y }) => {
        const isHighlighted = highlighted.has(player.id);
        const colors = statusColors[player.status] || statusColors["Disponible"];
        const chipColor = onToggle
          ? (isHighlighted ? "#22c55e" : "#52525b")
          : colors.bg;

        const photoUrl = player.photo_url;
        const displayNumber = player.jersey_number || player.number;
        const displayName = player.full_name || player.name || "?";

        return (
          <div
            key={player.id}
            onMouseDown={(e) => handleMouseDown(e, player)}
            onClick={() => onToggle && onToggle(player)}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              transform: "translate(-50%, -50%)",
              zIndex: dragging === player.id ? 50 : 10,
              cursor: onToggle ? "pointer" : (dragging === player.id ? "grabbing" : "grab"),
            }}
            className="flex flex-col items-center group"
          >
            {photoUrl ? (
              <PlayerChip chipColor={chipColor} photoUrl={photoUrl} player={{ ...player, number: displayNumber, full_name: displayName }} />
            ) : (
              <div
                style={{
                  background: chipColor,
                  boxShadow: `0 0 16px ${chipColor}60, 0 4px 12px rgba(0,0,0,0.7)`,
                }}
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 border-white/50 transition-transform group-hover:scale-110 text-white"
              >
                {displayNumber || "?"}
              </div>
            )}

            <div className="mt-1 bg-black/80 rounded px-1.5 py-0.5 border border-white/30 text-center whitespace-nowrap shadow-md">
              <div className="text-[9px] font-bold text-white leading-tight tracking-wide">
                {displayNumber ? `${displayNumber}·` : ""}
                {(displayName.split(" ").pop() || "?").toUpperCase()}
              </div>
              <div className="text-[7px] text-yellow-300 leading-tight font-semibold">
                {(player.position || "").substring(0, 3).toUpperCase()}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
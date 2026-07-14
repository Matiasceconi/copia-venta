/**
 * PlayerAvatar — foto o iniciales de jugador, clickeable para abrir la Ficha 360°.
 * Props:
 *   player: objeto Player (requiere .id, .full_name, .photo_url)
 *   size: "xs" | "sm" | "md" | "lg" (default "sm")
 *   showName: bool — mostrar nombre al lado (default false)
 *   className: clases adicionales para el wrapper
 */
import React from "react";
import { usePlayerCard360 } from "@/components/player/PlayerCard360Context";
import PlayerPhoto from "@/components/player/PlayerPhoto";

const SIZES = {
  xs: { wrap: "w-6 h-6", text: "text-[9px]" },
  sm: { wrap: "w-8 h-8", text: "text-xs" },
  md: { wrap: "w-10 h-10", text: "text-sm" },
  lg: { wrap: "w-14 h-14", text: "text-lg" },
};

export default function PlayerAvatar({ player, size = "sm", showName = false, className = "" }) {
  const { openCard } = usePlayerCard360();
  const s = SIZES[size] || SIZES.sm;
  const name = player?.full_name || player?.player_name || "?";
  const initial = name.charAt(0).toUpperCase();

  function handleClick(e) {
    e.stopPropagation();
    if (player?.id) openCard(player);
  }

  return (
    <button
      onClick={handleClick}
      title={`Ver ficha de ${name}`}
      className={`flex items-center gap-2 group focus:outline-none ${className}`}
    >
      <div className={`${s.wrap} rounded-full overflow-hidden border border-zinc-700 bg-zinc-800 shrink-0 group-hover:ring-2 group-hover:ring-white/30 transition-all`}>
        <PlayerPhoto
          player={player}
          alt={name}
          className="w-full h-full object-cover"
          fallbackClassName="w-full h-full flex items-center justify-center"
          textClassName={`font-bold text-zinc-400 ${s.text}`}
        />
      </div>
      {showName && (
        <span className="text-sm text-white group-hover:text-blue-300 transition-colors truncate font-medium">
          {name}
        </span>
      )}
    </button>
  );
}
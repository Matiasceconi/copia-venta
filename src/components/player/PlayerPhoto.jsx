import React, { useEffect, useState } from "react";
import { transparentPngFromUrl } from "@/lib/playerPhotoPng";

export default function PlayerPhoto({ player, src, alt, className = "w-8 h-8 rounded-full object-cover border border-zinc-700", fallbackClassName = "w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center", textClassName = "text-xs font-bold text-zinc-400" }) {
  const photoUrl = src || player?.photo_url;
  const name = alt || player?.full_name || player?.player_name || player?.name || "Jugador";
  const [displayUrl, setDisplayUrl] = useState(photoUrl || "");

  useEffect(() => {
    let cancelled = false;
    if (!photoUrl) {
      setDisplayUrl("");
      return () => { cancelled = true; };
    }
    setDisplayUrl(photoUrl);
    transparentPngFromUrl(photoUrl).then((url) => {
      if (!cancelled) setDisplayUrl(url);
    });
    return () => { cancelled = true; };
  }, [photoUrl]);

  if (displayUrl) return <img src={displayUrl} alt={name} className={className} />;

  return (
    <div className={fallbackClassName}>
      <span className={textClassName}>{name.charAt(0).toUpperCase()}</span>
    </div>
  );
}
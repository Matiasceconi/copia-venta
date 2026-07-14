import React from "react";
import { Shirt } from "lucide-react";
import PlayerPhoto from "@/components/player/PlayerPhoto";

export default function GpsIndividualPlayerHeader({ player }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex items-start gap-6">
      {/* Photo */}
      <div className="shrink-0">
        <PlayerPhoto
          player={player}
          className="w-24 h-24 rounded-xl object-cover border border-zinc-700"
          fallbackClassName="w-24 h-24 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center"
          textClassName="text-2xl font-bold text-zinc-500"
        />
      </div>

      {/* Info */}
      <div className="flex-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-white">{player.full_name}</h3>
            <p className="text-zinc-500 text-sm mt-1">{player.position || "Posición desconocida"}</p>

            <div className="flex items-center gap-6 mt-4 flex-wrap">
              {player.shirt_number && (
                <div className="flex items-center gap-2">
                  <Shirt size={16} className="text-zinc-500" />
                  <span className="text-sm text-zinc-400">Dorsal: <span className="font-semibold text-white">{player.shirt_number}</span></span>
                </div>
              )}
              {player.birth_date && (
                <div>
                  <span className="text-sm text-zinc-400">Edad: <span className="font-semibold text-white">{calculateAge(player.birth_date)} años</span></span>
                </div>
              )}
              {player.height && (
                <div>
                  <span className="text-sm text-zinc-400">Altura: <span className="font-semibold text-white">{player.height} cm</span></span>
                </div>
              )}
              {player.weight && (
                <div>
                  <span className="text-sm text-zinc-400">Peso: <span className="font-semibold text-white">{player.weight} kg</span></span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function calculateAge(birthDate) {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}
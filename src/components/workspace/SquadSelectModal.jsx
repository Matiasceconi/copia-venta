import React from "react";
import { Shield, ChevronRight } from "lucide-react";

/**
 * Shown right after login when the user belongs to multiple squads.
 * Calls onSelect(squad) once the user picks one.
 */
export default function SquadSelectModal({ squads, userName, onSelect }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <Shield size={22} className="text-blue-400" />
          <span className="text-lg font-black text-white">Performance<span className="text-blue-400">Pitch</span></span>
        </div>

        <h2 className="text-xl font-bold text-white mb-1">
          Bienvenido{userName ? `, ${userName.split(" ")[0]}` : ""}
        </h2>
        <p className="text-zinc-500 text-sm mb-6">
          Seleccioná el plantel con el que querés trabajar hoy:
        </p>

        <div className="space-y-2">
          {squads.map(squad => (
            <button
              key={squad.id}
              onClick={() => onSelect(squad)}
              className="w-full flex items-center justify-between px-4 py-4 bg-zinc-900 border border-zinc-700 rounded-xl hover:border-blue-500 hover:bg-zinc-800 transition-all group text-left"
            >
              <div>
                <p className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">
                  {squad.name}
                </p>
                {squad.category && (
                  <p className="text-xs text-zinc-500 mt-0.5">{squad.category} · {squad.season || ""}</p>
                )}
              </div>
              <ChevronRight size={16} className="text-zinc-600 group-hover:text-blue-400 transition-colors" />
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-zinc-600 mt-8">
          Podés cambiar el plantel en cualquier momento desde el menú lateral.
        </p>
      </div>
    </div>
  );
}
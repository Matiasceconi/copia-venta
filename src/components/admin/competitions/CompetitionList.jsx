import React from "react";

export default function CompetitionList({ competitions, selectedId, onSelect, onEdit }) {
  return <div className="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800 overflow-hidden">
    {competitions.map((competition) => (
      <button key={competition.id} onClick={() => onSelect(competition)} className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-zinc-800/50 ${selectedId === competition.id ? "bg-zinc-800/70" : ""}`}>
        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: competition.color || "#F0C800" }} />
        {competition.logo && <img src={competition.logo} alt="" className="w-7 h-7 object-contain" />}
        <span className="flex-1 min-w-0"><span className="block text-white text-sm font-medium truncate">{competition.name}</span><span className="block text-zinc-500 text-xs truncate">{competition.short_name || competition.competition_type || "Competencia"}</span></span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${competition.active === false ? "bg-zinc-700 text-zinc-400" : "bg-green-500/15 text-green-300"}`}>{competition.active === false ? "Inactiva" : "Activa"}</span>
        <span onClick={(e) => { e.stopPropagation(); onEdit(competition); }} className="text-xs text-yellow-300 hover:text-yellow-200">Editar</span>
      </button>
    ))}
    {competitions.length === 0 && <p className="text-zinc-500 text-sm text-center p-6">Sin competencias cargadas</p>}
  </div>;
}
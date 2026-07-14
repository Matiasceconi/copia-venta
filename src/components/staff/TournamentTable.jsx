import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw } from "lucide-react";

export default function TournamentTable() {
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("General");

  useEffect(() => {
    async function load() {
      try {
        const data = await base44.entities.TournamentStanding.list("position", 50);
        setStandings(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredStandings = standings.filter((team) => {
    if (activeTab === "General") return team.group === "General" || !team.group;
    return team.group === activeTab;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (standings.length === 0) {
    return (
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6 text-center">
        <p className="text-zinc-500 text-sm">Sin datos de clasificación</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-4 border-b border-zinc-800 pb-3">
        {["General", "Zona A", "Zona B"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-700">
            <th className="text-left py-3 px-3 text-zinc-400 font-semibold text-xs">#</th>
            <th className="text-left py-3 px-3 text-zinc-400 font-semibold text-xs">Equipo</th>
            <th className="text-center py-3 px-2 text-zinc-400 font-semibold text-xs">PJ</th>
            <th className="text-center py-3 px-2 text-zinc-400 font-semibold text-xs">G</th>
            <th className="text-center py-3 px-2 text-zinc-400 font-semibold text-xs">E</th>
            <th className="text-center py-3 px-2 text-zinc-400 font-semibold text-xs">P</th>
            <th className="text-center py-3 px-2 text-zinc-400 font-semibold text-xs">GF</th>
            <th className="text-center py-3 px-2 text-zinc-400 font-semibold text-xs">GC</th>
            <th className="text-center py-3 px-2 text-zinc-400 font-semibold text-xs">DIF</th>
            <th className="text-center py-3 px-3 text-zinc-400 font-semibold text-xs">Pts</th>
          </tr>
        </thead>
        <tbody>
          {filteredStandings.map((team, idx) => {
            const diff = team.goals_for - team.goals_against;
            const isHighlighted = team.team_name.toLowerCase().includes("defensa") && team.team_name.toLowerCase().includes("justicia");
            return (
              <tr
                key={team.id}
                className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors ${isHighlighted ? "bg-yellow-500/10" : ""}`}
              >
                <td className={`py-3 px-3 font-bold ${isHighlighted ? "text-yellow-400" : "text-white"}`}>
                  {team.position}
                </td>
                <td className={`py-3 px-3 font-semibold flex items-center gap-2 ${isHighlighted ? "text-white" : "text-white"}`}>
                  {team.team_logo_url ? (
                    <img src={team.team_logo_url} alt={team.team_name} className="w-5 h-5 object-contain" />
                  ) : (
                    <div className="w-5 h-5 bg-zinc-700 rounded-sm" />
                  )}
                  {team.team_name}
                </td>
                <td className="py-3 px-2 text-center text-zinc-300">{team.matches_played}</td>
                <td className="py-3 px-2 text-center text-emerald-400">{team.wins}</td>
                <td className="py-3 px-2 text-center text-yellow-400">{team.draws}</td>
                <td className="py-3 px-2 text-center text-red-400">{team.losses}</td>
                <td className="py-3 px-2 text-center text-zinc-300">{team.goals_for}</td>
                <td className="py-3 px-2 text-center text-zinc-300">{team.goals_against}</td>
                <td className={`py-3 px-2 text-center font-semibold ${diff > 0 ? "text-emerald-400" : diff < 0 ? "text-red-400" : "text-zinc-400"}`}>
                  {diff > 0 ? "+" : ""}{diff}
                </td>
                <td className={`py-3 px-3 font-bold text-right ${isHighlighted ? "text-yellow-300 text-base" : "text-white"}`}>
                  {team.points}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
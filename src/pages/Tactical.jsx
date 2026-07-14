import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PitchMap from "@/components/staff/PitchMap";
import PlayerStatusBadge from "@/components/staff/PlayerStatusBadge";
import { Users, Dumbbell, Wrench } from "lucide-react";
import UtileriaPanel from "@/components/tactical/UtileriaPanel";
import moment from "moment";

export default function Tactical() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading]  = useState(true);
  const [tab, setTab]          = useState("squad"); // "squad" | "session"
  // Session map: set of player ids selected for today's session
  const [sessionIds, setSessionIds] = useState(new Set());

  useEffect(() => {
    base44.entities.Player.list("-created_date", 100).then((data) => {
      setPlayers(data);
      // Pre-select available players for the session map
      const available = data.filter((p) => p.status === "Disponible").map((p) => p.id);
      setSessionIds(new Set(available));
    }).finally(() => setLoading(false));
  }, []);

  function toggleSession(player) {
    setSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(player.id)) next.delete(player.id);
      else next.add(player.id);
      return next;
    });
  }

  const available    = players.filter((p) => p.status === "Disponible");
  const notAvailable = players.filter((p) => p.status !== "Disponible");
  const sessionPlayers = players.filter((p) => sessionIds.has(p.id));
  const sessionOut     = players.filter((p) => !sessionIds.has(p.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Mapa táctico</h1>
        <p className="text-zinc-500 text-sm mt-1">Visualizá el plantel y la sesión de hoy en la cancha</p>
      </div>

      {/* Tab toggle */}
      <div className="flex items-center bg-zinc-800 rounded-lg p-1 gap-1 w-fit">
        <button
          onClick={() => setTab("squad")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "squad" ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Users size={15} /> Plantel
        </button>
        <button
          onClick={() => setTab("session")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "session" ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Dumbbell size={15} /> Sesión de hoy
        </button>
        <button
          onClick={() => setTab("utileria")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "utileria" ? "bg-yellow-400 text-zinc-900" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Wrench size={15} /> Utilería
        </button>
      </div>

      {/* ── SQUAD MAP ── */}
      {tab === "squad" && (
        <div className="grid lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden p-4">
            <PitchMap players={available} />
          </div>
          <div className="space-y-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                Disponibles ({available.length})
              </p>
              <div className="space-y-2">
                {available.map((p) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <span className="text-zinc-600 text-xs font-mono w-5 text-right">{p.jersey_number || p.number}</span>
                    <span className="text-sm text-white flex-1">{p.full_name}</span>
                    <span className="text-xs text-zinc-500">{(p.position || "").slice(0,3)}</span>
                  </div>
                ))}
              </div>
            </div>
            {notAvailable.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                  No disponibles ({notAvailable.length})
                </p>
                <div className="space-y-2">
                  {notAvailable.map((p) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <span className="text-zinc-600 text-xs font-mono w-5 text-right">{p.jersey_number || p.number}</span>
                      <span className="text-sm text-zinc-400 flex-1">{p.full_name}</span>
                      <PlayerStatusBadge status={p.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── UTILERÍA ── */}
      {tab === "utileria" && <UtileriaPanel />}

      {/* ── SESSION MAP ── */}
      {tab === "session" && (
        <div className="grid lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden p-4">
            <div className="flex items-center justify-between mb-3 px-1">
              <p className="text-xs text-zinc-500">
                Hacé clic en un jugador para incluirlo o quitarlo de la sesión
              </p>
              <span className="text-xs text-emerald-400 font-semibold">{sessionIds.size} en sesión</span>
            </div>
            <PitchMap
              players={players}
              highlighted={sessionIds}
              onToggle={toggleSession}
              emptyLabel="Sin jugadores en el plantel"
            />
          </div>

          <div className="space-y-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-3">
                En sesión ({sessionPlayers.length})
              </p>
              <div className="space-y-2">
                {sessionPlayers.length === 0 && (
                  <p className="text-zinc-600 text-xs">Ninguno seleccionado</p>
                )}
                {sessionPlayers.map((p) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <span className="text-zinc-600 text-xs font-mono w-5 text-right">{p.jersey_number || p.number}</span>
                    <span className="text-sm text-white flex-1">{p.full_name}</span>
                    <button
                      onClick={() => toggleSession(p)}
                      className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
                    >✕</button>
                  </div>
                ))}
              </div>
            </div>

            {sessionOut.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-3">
                  Fuera de sesión ({sessionOut.length})
                </p>
                <div className="space-y-2">
                  {sessionOut.map((p) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <span className="text-zinc-700 text-xs font-mono w-5 text-right">{p.jersey_number || p.number}</span>
                      <span className="text-sm text-zinc-500 flex-1">{p.full_name}</span>
                      <button
                        onClick={() => toggleSession(p)}
                        className="text-xs text-zinc-600 hover:text-emerald-400 transition-colors"
                      >＋</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
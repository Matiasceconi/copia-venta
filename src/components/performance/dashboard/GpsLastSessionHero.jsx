import React from "react";
import moment from "moment";
import { Calendar, Users, Clock, Target, Swords } from "lucide-react";

export default function GpsLastSessionHero({ session, playerCount, md, rival }) {
  if (!session) return null;

  const items = [
    { icon: Calendar, label: "Fecha", value: moment(session.date).format("DD/MM/YYYY") },
    { icon: Target, label: "Día", value: md && md !== "— MD —" ? md : (session.match_day_code || "—") },
    { icon: Swords, label: "Rival", value: rival || "—" },
    { icon: Users, label: "Jugadores", value: playerCount ?? "—" },
    { icon: Clock, label: "Duración", value: session.duration_minutes ? `${session.duration_minutes}'` : "—" },
    { icon: Target, label: "Objetivo", value: session.session_objective || session.objective || "—" },
  ];

  return (
    <div className="bg-gradient-to-br from-emerald-950 via-zinc-900 to-zinc-900 border border-emerald-800/40 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Última sesión</p>
          <h2 className="text-xl font-bold text-white mt-0.5">{session.title || "Sesión"}</h2>
        </div>
        <span className="text-[11px] font-semibold text-emerald-300 bg-emerald-900/30 border border-emerald-700/40 px-2.5 py-1 rounded-full">
          {session.session_type}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {items.map((it, i) => (
          <div key={i} className="bg-black/20 border border-white/5 rounded-xl p-3">
            <it.icon size={14} className="text-emerald-400 mb-1.5" />
            <p className="text-[10px] text-zinc-500">{it.label}</p>
            <p className="text-sm font-bold text-white truncate">{it.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
import React from "react";
import { Layers, CalendarCheck2, Users, Gauge, Zap, Wind } from "lucide-react";
import moment from "moment";
import { fmtInt } from "../externalGpsLoadUtils";

function KpiCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color.bg}`}>
          <Icon size={15} className={color.text} />
        </div>
      </div>
      <div>
        <p className="text-xl font-bold text-white leading-tight">{value}</p>
        <p className="text-[11px] text-zinc-500 mt-0.5 uppercase tracking-wide font-semibold">{label}</p>
        {sub && <p className="text-[10px] text-zinc-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function GpsKpiCards({ kpis }) {
  const items = [
    { icon: Layers, label: "Sesiones cargadas", value: kpis.sessionsCount, sub: "Esta temporada", color: { bg: "bg-blue-500/15", text: "text-blue-400" } },
    { icon: CalendarCheck2, label: "Última sesión", value: kpis.lastSessionDate ? moment(kpis.lastSessionDate).format("DD/MM/YYYY") : "—", sub: kpis.lastSessionTitle || "", color: { bg: "bg-emerald-500/15", text: "text-emerald-400" } },
    { icon: Users, label: "Jugadores promedio", value: fmtInt(kpis.avgPlayersPerSession), sub: "Por sesión", color: { bg: "bg-violet-500/15", text: "text-violet-400" } },
    { icon: Gauge, label: "Distancia total prom.", value: `${fmtInt(kpis.avgTotalDistance)} m`, sub: "Por jugador", color: { bg: "bg-amber-500/15", text: "text-amber-400" } },
    { icon: Zap, label: "Player Load prom.", value: fmtInt(kpis.avgPlayerLoad), sub: "Por jugador", color: { bg: "bg-pink-500/15", text: "text-pink-400" } },
    { icon: Wind, label: "Sprints prom.", value: fmtInt(kpis.avgSprints), sub: "Por jugador", color: { bg: "bg-cyan-500/15", text: "text-cyan-400" } },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map((it) => <KpiCard key={it.label} {...it} />)}
    </div>
  );
}
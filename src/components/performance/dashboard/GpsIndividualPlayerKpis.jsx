import React from "react";
import { TrendingUp, Activity, Zap, Gauge } from "lucide-react";

export default function GpsIndividualPlayerKpis({ stats, competitionProfile }) {
  const formatNumber = (num) => {
    if (!num) return "0";
    return Number(num).toFixed(1);
  };

  const getPercentageVsCompetitive = (value, competitive) => {
    if (!competitive || !value) return null;
    return Math.round((value / competitive) * 100);
  };

  const getStatusBadge = (percentage) => {
    if (!percentage) return null;
    if (percentage >= 110) {
      return { label: "Muy alta", color: "bg-red-500/20 text-red-400" };
    } else if (percentage >= 95) {
      return { label: "Alta", color: "bg-yellow-500/20 text-yellow-400" };
    } else {
      return { label: "Óptima", color: "bg-emerald-500/20 text-emerald-400" };
    }
  };

  const kpis = [
    {
      icon: Activity,
      label: "Distancia total",
      value: formatNumber(stats.avgDistance),
      unit: "m/min",
      competitive: competitionProfile?.avg_total_distance,
      color: "emerald",
    },
    {
      icon: TrendingUp,
      label: "Sprints",
      value: formatNumber(stats.avgSprints),
      unit: "n°",
      competitive: competitionProfile?.avg_sprints,
      color: "blue",
    },
    {
      icon: Zap,
      label: "Carga de jugador",
      value: formatNumber(stats.avgPlayerLoad),
      unit: "au",
      competitive: competitionProfile?.avg_player_load,
      color: "purple",
    },
    {
      icon: Gauge,
      label: "Velocidad máxima",
      value: formatNumber(stats.maxSpeed),
      unit: "km/h",
      competitive: competitionProfile?.max_speed,
      color: "orange",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        const percentage = getPercentageVsCompetitive(
          kpi.value === "0" ? 0 : parseFloat(kpi.value),
          kpi.competitive
        );
        const badge = getStatusBadge(percentage);

        return (
          <div
            key={kpi.label}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3"
          >
            <div className="flex items-center gap-2">
              <Icon size={18} className="text-zinc-500" />
              <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">{kpi.label}</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">{kpi.value}</span>
                <span className="text-sm text-zinc-500">{kpi.unit}</span>
              </div>

              {kpi.competitive && percentage !== null && (
                <div className="pt-2 border-t border-zinc-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">vs competitivo</span>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${badge?.color}`}>
                      {percentage}%
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Competitivo: {formatNumber(kpi.competitive)} {kpi.unit}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

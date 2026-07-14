import React from "react";
import { TrendingUp, Zap, Gauge, Activity } from "lucide-react";

export default function GpsIndividualPlayerStats({
  stats,
  competitionProfile,
}) {
  const formatNumber = (num) => {
    if (!num) return "0";
    return Number(num).toFixed(1);
  };

  const getComparisonBadge = (value, competitive) => {
    if (!competitive) return null;
    const percentage = (value / competitive) * 100;
    if (percentage >= 110) {
      return <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400">Muy alta</span>;
    } else if (percentage >= 95) {
      return <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400">Alta</span>;
    } else {
      return <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">Óptima</span>;
    }
  };

  const cards = [
    {
      icon: Activity,
      label: "Distancia promedio",
      value: formatNumber(stats.avgDistance),
      unit: "m",
      competitive: competitionProfile?.avg_total_distance,
      color: "emerald",
    },
    {
      icon: Gauge,
      label: "Sprints promedio",
      value: formatNumber(stats.avgSprints),
      unit: "",
      competitive: competitionProfile?.avg_sprints,
      color: "blue",
    },
    {
      icon: Zap,
      label: "Carga promedio",
      value: formatNumber(stats.avgPlayerLoad),
      unit: "au",
      competitive: competitionProfile?.avg_player_load,
      color: "purple",
    },
    {
      icon: TrendingUp,
      label: "Velocidad máxima",
      value: formatNumber(stats.maxSpeed),
      unit: "km/h",
      competitive: competitionProfile?.max_speed,
      color: "orange",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Icon size={16} className="text-zinc-500" />
                <span className="text-xs text-zinc-500 font-medium">{card.label}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <span className="text-3xl font-bold text-white">
                  {card.value}
                </span>
                <span className="text-sm text-zinc-500 ml-1">{card.unit}</span>
              </div>

              {card.competitive && (
                <div className="space-y-1">
                  <p className="text-xs text-zinc-500">vs competitivo</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">
                      {formatNumber(card.competitive)} {card.unit}
                    </span>
                    {getComparisonBadge(stats.avgDistance, card.competitive)}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
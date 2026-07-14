import React from "react";
import { AlertCircle, TrendingUp, CheckCircle, AlertTriangle } from "lucide-react";

export default function GpsIndividualAutoSummary({ stats, competitionProfile, recordsCount }) {
  const getLoadStatus = () => {
    if (!competitionProfile?.avg_total_distance) return null;
    const percentage = (stats.avgDistance / competitionProfile.avg_total_distance) * 100;
    if (percentage >= 110) return "Muy alta";
    if (percentage >= 95) return "Alta";
    return "Óptima";
  };

  const getInsights = () => {
    const insights = [];

    const loadStatus = getLoadStatus();
    if (loadStatus === "Muy alta") {
      insights.push({
        type: "warning",
        title: "Carga muy alta",
        description: `El jugador presenta una carga promedio de ${(stats.avgDistance / competitionProfile?.avg_total_distance * 100).toFixed(0)}% de su perfil competitivo.`,
      });
    } else if (loadStatus === "Alta") {
      insights.push({
        type: "info",
        title: "Carga alta",
        description: `El jugador mantiene una carga dentro del rango esperado (${(stats.avgDistance / competitionProfile?.avg_total_distance * 100).toFixed(0)}%).`,
      });
    }

    if (stats.avgSprints > (competitionProfile?.avg_sprints || 0) * 1.1) {
      insights.push({
        type: "success",
        title: "Sprints superiores",
        description: `Realiza ${((stats.avgSprints / (competitionProfile?.avg_sprints || 1)) * 100).toFixed(0)}% más sprints que el promedio competitivo.`,
      });
    }

    if (stats.avgPlayerLoad > (competitionProfile?.avg_player_load || 0) * 1.15) {
      insights.push({
        type: "warning",
        title: "Carga neuromuscular elevada",
        description: "La carga acumulada requiere monitoreo para evitar lesiones.",
      });
    } else {
      insights.push({
        type: "success",
        title: "Carga neuromuscular estable",
        description: "Distribución adecuada entre estimulación y recuperación.",
      });
    }

    return insights;
  };

  const insights = getInsights();

  const getIconByType = (type) => {
    switch (type) {
      case "warning":
        return <AlertTriangle size={18} className="text-yellow-400" />;
      case "success":
        return <CheckCircle size={18} className="text-emerald-400" />;
      case "info":
        return <AlertCircle size={18} className="text-blue-400" />;
      default:
        return <TrendingUp size={18} className="text-zinc-400" />;
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h3 className="text-lg font-bold text-white mb-6">Resumen Automático</h3>

      <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-4 mb-6">
        <p className="text-sm text-zinc-300">
          En las últimas <span className="font-semibold text-white">{recordsCount} sesiones</span>, {""}
          el jugador alcanzó un promedio de <span className="font-semibold text-white">{Number(stats.avgDistance).toFixed(0)}m</span> de distancia
          {competitionProfile && (
            <>
              {" "}
              (promedio competitivo:{" "}
              <span className="font-semibold text-white">
                {Number(competitionProfile.avg_total_distance).toFixed(0)}m
              </span>
              )
            </>
          )}
          . Las variables más cercanas al perfil competitivo fueron{" "}
          <span className="font-semibold text-emerald-400">Distancia total, m/min</span>
          {" "}
          y <span className="font-semibold text-emerald-400">ACC +3</span>.
        </p>
        <p className="text-sm text-zinc-300 mt-3">
          Las mayores diferencias aparecen en <span className="font-semibold text-yellow-400">Sprints y D {">"}25</span>.
        </p>
      </div>

      {/* Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((insight, idx) => (
          <div
            key={idx}
            className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 flex gap-3"
          >
            <div className="shrink-0 mt-0.5">{getIconByType(insight.type)}</div>
            <div className="flex-1">
              <p className="font-semibold text-white text-sm">{insight.title}</p>
              <p className="text-xs text-zinc-400 mt-1">{insight.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import moment from "moment";

export default function GpsIndividualComparisonTable({ records, competitionProfile, stats }) {
  const [expandedRow, setExpandedRow] = useState(null);

  const formatNumber = (num) => {
    if (!num) return "-";
    return Number(num).toFixed(1);
  };

  const getPercentageVsCompetitive = (value, competitive) => {
    if (!competitive || !value) return null;
    const pct = Math.round((value / competitive) * 100);
    return pct;
  };

  const getStatusColor = (percentage) => {
    if (!percentage) return "text-zinc-400";
    if (percentage >= 110) return "text-red-400 font-semibold";
    if (percentage >= 95) return "text-yellow-400 font-semibold";
    return "text-emerald-400 font-semibold";
  };

  const comparisonData = [
    {
      variable: "Distancia total (m)",
      competitive: competitionProfile?.avg_total_distance || 0,
      lastSession: records[0]?.total_distance || 0,
      avg: stats.avgDistance,
    },
    {
      variable: "M/min",
      competitive: competitionProfile?.avg_m_min || 0,
      lastSession: records[0]?.m_min || 0,
      avg: records.length ? (records.reduce((s, r) => s + (r.m_min || 0), 0) / records.length) : 0,
    },
    {
      variable: "D >19.8 (m)",
      competitive: competitionProfile?.avg_distance_over_19_8 || 0,
      lastSession: records[0]?.distance_over_19_8 || 0,
      avg: records.length ? (records.reduce((s, r) => s + (r.distance_over_19_8 || 0), 0) / records.length) : 0,
    },
    {
      variable: "D >25 (m)",
      competitive: competitionProfile?.avg_distance_over_25 || 0,
      lastSession: records[0]?.distance_over_25 || 0,
      avg: records.length ? (records.reduce((s, r) => s + (r.distance_over_25 || 0), 0) / records.length) : 0,
    },
    {
      variable: "Sprints (n°)",
      competitive: competitionProfile?.avg_sprints || 0,
      lastSession: records[0]?.sprints || 0,
      avg: stats.avgSprints,
    },
    {
      variable: "ACC +3 (n°)",
      competitive: 0,
      lastSession: records[0]?.accelerations || 0,
      avg: stats.avgAccelerations,
    },
    {
      variable: "DEC +3 (n°)",
      competitive: 0,
      lastSession: records[0]?.decelerations || 0,
      avg: stats.avgDecelerations,
    },
    {
      variable: "Player Load (au)",
      competitive: competitionProfile?.avg_player_load || 0,
      lastSession: records[0]?.player_load || 0,
      avg: stats.avgPlayerLoad,
    },
    {
      variable: "Smax (km/h)",
      competitive: competitionProfile?.max_speed || 0,
      lastSession: records[0]?.max_speed || 0,
      avg: stats.avgSpeed,
    },
  ];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h3 className="text-lg font-bold text-white mb-6">Comparación vs Competencia</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left py-3 px-4 text-zinc-400 font-semibold text-xs">Variable</th>
              <th className="text-right py-3 px-4 text-zinc-400 font-semibold text-xs">Competitivo</th>
              <th className="text-right py-3 px-4 text-zinc-400 font-semibold text-xs">Última sesión</th>
              <th className="text-right py-3 px-4 text-zinc-400 font-semibold text-xs">Promedio</th>
              <th className="text-right py-3 px-4 text-zinc-400 font-semibold text-xs">% vs comp</th>
              <th className="text-center py-3 px-4 text-zinc-400 font-semibold text-xs">Estado</th>
            </tr>
          </thead>
          <tbody>
            {comparisonData.map((row, idx) => {
              const percentage = getPercentageVsCompetitive(row.avg, row.competitive);
              const statusColor = getStatusColor(percentage);

              return (
                <tr key={idx} className="border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                  <td className="py-3 px-4 text-white font-medium text-xs">{row.variable}</td>
                  <td className="py-3 px-4 text-right text-zinc-300 text-xs">
                    {formatNumber(row.competitive)}
                  </td>
                  <td className="py-3 px-4 text-right text-white font-semibold text-xs">
                    {formatNumber(row.lastSession)}
                  </td>
                  <td className="py-3 px-4 text-right text-white font-semibold text-xs">
                    {formatNumber(row.avg)}
                  </td>
                  <td className={`py-3 px-4 text-right text-xs font-semibold ${statusColor}`}>
                    {percentage !== null ? `${percentage}%` : "-"}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {percentage && (
                      <span
                        className={`inline-block w-3 h-3 rounded-full ${
                          percentage >= 110
                            ? "bg-red-500"
                            : percentage >= 95
                            ? "bg-yellow-500"
                            : "bg-emerald-500"
                        }`}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span className="text-zinc-400">&gt;90% del perfil</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
          <span className="text-zinc-400">70-90% del perfil</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <span className="text-zinc-400">&lt;70% del perfil</span>
        </div>
      </div>
    </div>
  );
}
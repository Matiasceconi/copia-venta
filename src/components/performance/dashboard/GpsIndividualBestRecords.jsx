import React from "react";
import { Trophy, Zap, Activity, Gauge } from "lucide-react";

export default function GpsIndividualBestRecords({ records }) {
  const getBestRecords = () => {
    if (records.length === 0) return {};

    return {
      maxDistance: records.reduce((max, r) => (r.total_distance > max.total_distance ? r : max)),
      maxSprints: records.reduce((max, r) => (r.sprints > max.sprints ? r : max)),
      maxSpeed: records.reduce((max, r) => (r.max_speed > max.max_speed ? r : max)),
      maxPlayerLoad: records.reduce((max, r) => (r.player_load > max.player_load ? r : max)),
    };
  };

  const best = getBestRecords();
  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const recordsData = [
    {
      icon: Activity,
      label: "Mayor distancia",
      value: best.maxDistance?.total_distance?.toFixed(0),
      unit: "m",
      date: best.maxDistance?.date,
      color: "emerald",
    },
    {
      icon: Gauge,
      label: "Más sprints",
      value: best.maxSprints?.sprints?.toFixed(0),
      unit: "n°",
      date: best.maxSprints?.date,
      color: "blue",
    },
    {
      icon: Zap,
      label: "Mayor velocidad",
      value: best.maxSpeed?.max_speed?.toFixed(1),
      unit: "km/h",
      date: best.maxSpeed?.date,
      color: "orange",
    },
    {
      icon: Trophy,
      label: "Mayor carga",
      value: best.maxPlayerLoad?.player_load?.toFixed(0),
      unit: "au",
      date: best.maxPlayerLoad?.date,
      color: "purple",
    },
  ];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-6">
        <Trophy size={20} className="text-yellow-500" />
        <h3 className="text-lg font-bold text-white">Mejores registros de la temporada</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {recordsData.map((record) => {
          const Icon = record.icon;
          const colorClass = {
            emerald: "bg-emerald-500/20 border-emerald-500/30",
            blue: "bg-blue-500/20 border-blue-500/30",
            orange: "bg-orange-500/20 border-orange-500/30",
            purple: "bg-purple-500/20 border-purple-500/30",
          }[record.color];

          return (
            <div key={record.label} className={`border border-zinc-700 rounded-lg p-4 ${colorClass}`}>
              <div className="flex items-start justify-between mb-3">
                <Icon size={18} className="text-zinc-400" />
              </div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                {record.label}
              </p>
              <p className="text-3xl font-bold text-white mt-2">
                {record.value}
                <span className="text-sm text-zinc-400 ml-1">{record.unit}</span>
              </p>
              <p className="text-xs text-zinc-400 mt-2">{formatDate(record.date)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
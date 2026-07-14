import React from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export default function GpsIndividualRadarChart({ records, competitionProfile }) {
  const formatNumber = (num) => (num ? Number(num).toFixed(1) : "0");

  const avgDistance = records.length
    ? (records.reduce((sum, r) => sum + (r.total_distance || 0), 0) / records.length)
    : 0;

  const avgSprints = records.length
    ? (records.reduce((sum, r) => sum + (r.sprints || 0), 0) / records.length)
    : 0;

  const avgPlayerLoad = records.length
    ? (records.reduce((sum, r) => sum + (r.player_load || 0), 0) / records.length)
    : 0;

  const avgMaxSpeed = records.length
    ? (records.reduce((sum, r) => sum + (r.max_speed || 0), 0) / records.length)
    : 0;

  const avgAccelerations = records.length
    ? (records.reduce((sum, r) => sum + (r.accelerations || 0), 0) / records.length)
    : 0;

  // Normalize values to 0-100 scale for better radar visualization
  const data = [
    {
      name: "Distancia",
      "Última sesión": Math.min(100, (records[0]?.total_distance || 0) / 100),
      "Promedio microciclo": Math.min(100, avgDistance / 100),
      "Competitivo": Math.min(100, (competitionProfile?.avg_total_distance || 0) / 100),
    },
    {
      name: "Sprints",
      "Última sesión": Math.min(100, (records[0]?.sprints || 0) * 3),
      "Promedio microciclo": Math.min(100, avgSprints * 3),
      "Competitivo": Math.min(100, (competitionProfile?.avg_sprints || 0) * 3),
    },
    {
      name: "Carga",
      "Última sesión": Math.min(100, (records[0]?.player_load || 0) / 10),
      "Promedio microciclo": Math.min(100, avgPlayerLoad / 10),
      "Competitivo": Math.min(100, (competitionProfile?.avg_player_load || 0) / 10),
    },
    {
      name: "V.Max",
      "Última sesión": Math.min(100, (records[0]?.max_speed || 0) / 0.35),
      "Promedio microciclo": Math.min(100, avgMaxSpeed / 0.35),
      "Competitivo": Math.min(100, (competitionProfile?.max_speed || 0) / 0.35),
    },
    {
      name: "Aceleraciones",
      "Última sesión": Math.min(100, (records[0]?.accelerations || 0) / 0.5),
      "Promedio microciclo": Math.min(100, avgAccelerations / 0.5),
      "Competitivo": competitionProfile ? 80 : 0,
    },
  ];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h3 className="text-lg font-bold text-white mb-6">Radar: Entrenamiento vs Competencia</h3>
      <ResponsiveContainer width="100%" height={350}>
        <RadarChart data={data}>
          <PolarGrid stroke="#3f3f46" />
          <PolarAngleAxis dataKey="name" stroke="#71717a" style={{ fontSize: "12px" }} />
          <PolarRadiusAxis stroke="#71717a" style={{ fontSize: "11px" }} />
          <Radar name="Última sesión" dataKey="Última sesión" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
          <Radar name="Promedio microciclo" dataKey="Promedio microciclo" stroke="#f97316" fill="#f97316" fillOpacity={0.2} />
          {competitionProfile && (
            <Radar name="Competitivo" dataKey="Competitivo" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
          )}
          <Legend />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #27272a",
              borderRadius: "8px",
            }}
            labelStyle={{ color: "#fff" }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
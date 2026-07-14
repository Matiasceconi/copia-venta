import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

export default function GpsIndividualPlayerCharts({ records, stats }) {
  const chartData = records.map((r, idx) => ({
    name: r.matchDayCode ? r.matchDayCode : `D${idx + 1}`,
    distance: Number(r.total_distance?.toFixed(0)) || 0,
    sprints: Number(r.sprints?.toFixed(1)) || 0,
    playerLoad: Number(r.player_load?.toFixed(0)) || 0,
    maxSpeed: Number(r.max_speed?.toFixed(1)) || 0,
  }));

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h3 className="text-lg font-bold text-white mb-6">Últimas 7 sesiones</h3>
      <div className="space-y-6">
        {/* Distance Chart */}
        <div>
          <p className="text-xs text-zinc-400 uppercase tracking-wider font-semibold mb-3">Distancia total (m)</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis dataKey="name" stroke="#71717a" style={{ fontSize: "12px" }} />
              <YAxis stroke="#71717a" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #27272a",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#fff" }}
              />
              <Bar dataKey="distance" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Sprints and Player Load Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Sprints */}
          <div>
            <p className="text-xs text-zinc-400 uppercase tracking-wider font-semibold mb-3">Sprints (n°)</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis dataKey="name" stroke="#71717a" style={{ fontSize: "11px" }} />
                <YAxis stroke="#71717a" style={{ fontSize: "11px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "1px solid #27272a",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#fff" }}
                />
                <Bar dataKey="sprints" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Player Load */}
          <div>
            <p className="text-xs text-zinc-400 uppercase tracking-wider font-semibold mb-3">Carga (au)</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis dataKey="name" stroke="#71717a" style={{ fontSize: "11px" }} />
                <YAxis stroke="#71717a" style={{ fontSize: "11px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "1px solid #27272a",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#fff" }}
                />
                <Bar dataKey="playerLoad" fill="#a855f7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
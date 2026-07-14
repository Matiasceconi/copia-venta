import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from "recharts";
import { FileSpreadsheet } from "lucide-react";
import moment from "moment";

const POSITIONS = [
  "Arquero",
  "Defensor Central",
  "Lateral Derecho",
  "Lateral Izquierdo",
  "Mediocampista Central",
  "Volante Interno",
  "Extremo",
  "Delantero Centro",
];

const METRICS = [
  { key: "total_distance", label: "Distancia Total (m)", color: "#60a5fa" },
  { key: "distance_hsr", label: "19.8-25 km/h (m)", color: "#34d399" },
  { key: "sprint_distance", label: "Sprint +25 km/h (m)", color: "#fbbf24" },
  { key: "player_load", label: "Player Load", color: "#a78bfa" },
  { key: "max_velocity", label: "Vel. Máxima (km/h)", color: "#f87171" },
  { key: "accelerations", label: "Aceleraciones", color: "#fb923c" },
];

export default function PositionAnalysis() {
  const [reports, setReports] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPositions, setSelectedPositions] = useState(["Defensor Central", "Mediocampista Central", "Delantero Centro"]);
  const [selectedMetric, setSelectedMetric] = useState("total_distance");
  const [dateRange, setDateRange] = useState("all");

  useEffect(() => {
    async function load() {
      try {
        const [r, p] = await Promise.all([
          base44.entities.CatapultReport.list("-date", 1000),
          base44.entities.Player.list("-created_date", 100),
        ]);
        setReports(r);
        setPlayers(p);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filterReportsByDate = () => {
    const now = moment();
    return reports.filter((r) => {
      if (dateRange === "week") return moment(r.date).isAfter(now.clone().subtract(7, "days"));
      if (dateRange === "month") return moment(r.date).isAfter(now.clone().subtract(30, "days"));
      if (dateRange === "season") return moment(r.date).isAfter(now.clone().subtract(180, "days"));
      return true;
    });
  };

  const playerMap = Object.fromEntries(players.map((p) => [p.name, p]));
  const filteredReports = filterReportsByDate();

  // Agrupar datos por posición y jugador
  const positionData = {};
  POSITIONS.forEach((pos) => {
    positionData[pos] = [];
  });

  filteredReports.forEach((r) => {
    const player = playerMap[r.player_name];
    if (player && player.position && selectedPositions.includes(player.position)) {
      if (!positionData[player.position]) {
        positionData[player.position] = [];
      }
      positionData[player.position].push({
        player_name: r.player_name,
        date: r.date,
        ...r,
      });
    }
  });

  // Calcular promedios por posición
  const positionAverages = [];
  selectedPositions.forEach((pos) => {
    const data = positionData[pos] || [];
    const metric = selectedMetric;
    const values = data.map((d) => d[metric]).filter((v) => v != null);
    
    if (values.length > 0) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);
      
      positionAverages.push({
        position: pos,
        average: parseFloat(avg.toFixed(1)),
        max: parseFloat(max.toFixed(1)),
        min: parseFloat(min.toFixed(1)),
        count: values.length,
      });
    }
  });

  // Datos para gráfico evolutivo (promedio por posición a lo largo del tiempo)
  const evolutionData = {};
  filteredReports.forEach((r) => {
    const player = playerMap[r.player_name];
    if (player && selectedPositions.includes(player.position)) {
      const date = moment(r.date).format("DD/MM");
      if (!evolutionData[date]) {
        evolutionData[date] = {};
      }
      if (!evolutionData[date][player.position]) {
        evolutionData[date][player.position] = [];
      }
      evolutionData[date][player.position].push(r[selectedMetric]);
    }
  });

  const evolutionChart = Object.entries(evolutionData).map(([date, positions]) => {
    const point = { date };
    Object.entries(positions).forEach(([pos, values]) => {
      point[pos] = parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1));
    });
    return point;
  });

  const colors = {
    "Arquero": "#f87171",
    "Defensor Central": "#60a5fa",
    "Lateral Derecho": "#34d399",
    "Lateral Izquierdo": "#34d399",
    "Mediocampista Central": "#a78bfa",
    "Volante Interno": "#a78bfa",
    "Extremo": "#fbbf24",
    "Delantero Centro": "#fb923c",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (filteredReports.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
        <FileSpreadsheet size={40} className="text-zinc-700 mx-auto mb-3" />
        <p className="text-zinc-500 text-sm">No hay datos GPS disponibles</p>
        <p className="text-zinc-600 text-xs mt-1">Importá datos desde la solapa Catapult GPS</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
        <div>
          <p className="text-zinc-400 text-xs font-medium mb-2">Posiciones a comparar:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {POSITIONS.map((pos) => (
              <label key={pos} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedPositions.includes(pos)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedPositions([...selectedPositions, pos]);
                    } else {
                      setSelectedPositions(selectedPositions.filter((p) => p !== pos));
                    }
                  }}
                  className="rounded border-zinc-600"
                />
                <span className="text-zinc-300 text-xs">{pos}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div>
            <p className="text-zinc-400 text-xs font-medium mb-2">Métrica:</p>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="bg-zinc-800 text-zinc-300 text-xs rounded-lg px-3 py-1.5 border border-zinc-700 focus:outline-none focus:border-zinc-500"
            >
              {METRICS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-zinc-400 text-xs font-medium mb-2">Período:</p>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-zinc-800 text-zinc-300 text-xs rounded-lg px-3 py-1.5 border border-zinc-700 focus:outline-none focus:border-zinc-500"
            >
              <option value="all">Todo el tiempo</option>
              <option value="season">Última temporada (180 días)</option>
              <option value="month">Último mes</option>
              <option value="week">Última semana</option>
            </select>
          </div>
        </div>
      </div>

      {/* Averages by position */}
      {positionAverages.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
          <div>
            <h3 className="text-white font-semibold text-sm">Promedios por posición — {selectedMetric === "total_distance" ? "Distancia Total" : METRICS.find((m) => m.key === selectedMetric)?.label}</h3>
            <p className="text-zinc-500 text-xs mt-0.5">Comparativa de rendimiento según posición del jugador</p>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={positionAverages}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="position" tick={{ fill: "#a1a1aa", fontSize: 10 }} angle={-45} textAnchor="end" height={100} />
              <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, color: "#fff", fontSize: 11 }} />
              <Bar dataKey="average" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              <Bar dataKey="max" fill="#34d399" radius={[4, 4, 0, 0]} opacity={0.6} />
              <Bar dataKey="min" fill="#f87171" radius={[4, 4, 0, 0]} opacity={0.6} />
            </BarChart>
          </ResponsiveContainer>

          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-400" /> Promedio
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-400" /> Máximo
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-red-400" /> Mínimo
            </span>
          </div>
        </div>
      )}

      {/* Evolution over time */}
      {evolutionChart.length > 0 && selectedPositions.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
          <div>
            <h3 className="text-white font-semibold text-sm">Evolución de rendimiento por posición</h3>
            <p className="text-zinc-500 text-xs mt-0.5">Tendencia de {METRICS.find((m) => m.key === selectedMetric)?.label.toLowerCase()} a lo largo del tiempo</p>
          </div>

          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={evolutionChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 10 }} />
              <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, color: "#fff", fontSize: 11 }} />
              <Legend />
              {selectedPositions.map((pos) => (
                <Line
                  key={pos}
                  type="monotone"
                  dataKey={pos}
                  stroke={colors[pos] || "#60a5fa"}
                  isAnimationActive={false}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Detail stats */}
      {positionAverages.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {positionAverages.map((p) => (
            <div key={p.position} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <h4 className="text-white font-semibold text-sm mb-3">{p.position}</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-500 text-xs">Promedio:</span>
                  <span className="text-white font-medium text-sm">{p.average}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 text-xs">Máximo:</span>
                  <span className="text-emerald-400 font-medium text-sm">{p.max}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 text-xs">Mínimo:</span>
                  <span className="text-red-400 font-medium text-sm">{p.min}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 text-xs">Registros:</span>
                  <span className="text-blue-400 font-medium text-sm">{p.count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
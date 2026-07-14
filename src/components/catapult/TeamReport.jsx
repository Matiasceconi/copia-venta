import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { FileSpreadsheet } from "lucide-react";
import moment from "moment";

const METRICS = [
  { key: "total_distance", label: "Distancia Total (m)", color: "#60a5fa" },
  { key: "distance_hsr", label: "19.8-25 km/h (m)", color: "#34d399" },
  { key: "sprint_distance", label: "Sprint +25 km/h (m)", color: "#fbbf24" },
  { key: "player_load", label: "Player Load", color: "#a78bfa" },
  { key: "max_velocity", label: "Vel. Máxima (km/h)", color: "#f87171" },
  { key: "accelerations", label: "Aceleraciones", color: "#fb923c" },
];

export default function TeamReport() {
  const [sessions, setSessions] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState("total_distance");

  useEffect(() => {
    async function load() {
      try {
        const [s, r] = await Promise.all([
          base44.entities.TrainingSession.list("-date", 100),
          base44.entities.CatapultReport.list("-date", 500),
        ]);
        setSessions(s);
        setReports(r);
        // Auto-select latest session with data
        const latestSession = s.find((session) => r.some((report) => report.session_id === session.id));
        if (latestSession) {
          setSelectedSession(latestSession.id);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const sessionReports = selectedSession ? reports.filter((r) => r.session_id === selectedSession) : [];
  const selectedSessionData = sessions.find((s) => s.id === selectedSession);

  // Calcular promedios de equipo
  const teamAverages = {};
  METRICS.forEach(({ key }) => {
    const values = sessionReports.map((r) => r[key]).filter((v) => v != null);
    if (values.length > 0) {
      teamAverages[key] = {
        avg: parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)),
        max: Math.max(...values),
        min: Math.min(...values),
        total: values.reduce((a, b) => a + b, 0),
      };
    }
  });

  // Datos para gráfico de comparación de jugadores
  const playerMetrics = sessionReports
    .filter((r) => r[selectedMetric] != null)
    .sort((a, b) => (b[selectedMetric] || 0) - (a[selectedMetric] || 0))
    .map((r) => ({
      name: r.player_name?.split(" ").slice(-1)[0] || "—",
      value: r[selectedMetric] || 0,
      fullName: r.player_name,
    }));

  // Distribución de carga
  const teamLoad = sessionReports.reduce((sum, r) => sum + (r.player_load || 0), 0);
  const loadDistribution = sessionReports
    .map((r) => ({
      name: r.player_name?.split(" ").slice(-1)[0] || "—",
      value: parseFloat(((r.player_load || 0) / (teamLoad || 1)) * 100).toFixed(1),
    }))
    .filter((r) => parseFloat(r.value) > 2)
    .sort((a, b) => parseFloat(b.value) - parseFloat(a.value));

  const colors = ["#60a5fa", "#34d399", "#fbbf24", "#a78bfa", "#f87171", "#fb923c", "#ec4899", "#06b6d4"];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const sessionsWithData = sessions.filter((s) => reports.some((r) => r.session_id === s.id));

  if (sessionsWithData.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
        <FileSpreadsheet size={40} className="text-zinc-700 mx-auto mb-3" />
        <p className="text-zinc-500 text-sm">No hay datos de equipo disponibles</p>
        <p className="text-zinc-600 text-xs mt-1">Importá datos GPS desde la solapa Entrenamientos</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Session selector */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <p className="text-zinc-400 text-xs font-medium mb-2">Seleccionar sesión:</p>
        <select
          value={selectedSession || ""}
          onChange={(e) => setSelectedSession(e.target.value)}
          className="w-full bg-zinc-800 text-zinc-300 text-sm rounded-lg px-4 py-2.5 border border-zinc-700 focus:outline-none focus:border-zinc-500"
        >
          {sessionsWithData.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title} — {moment(s.date).format("DD/MM/YYYY")}
              {s.match_day_code && ` (${s.match_day_code})`}
              {s.session_type && ` · ${s.session_type}`}
            </option>
          ))}
        </select>
      </div>

      {selectedSessionData && sessionReports.length > 0 && (
        <>
          {/* Header stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
              <p className="text-zinc-500 text-xs">Jugadores</p>
              <p className="text-white font-bold text-2xl mt-1">{sessionReports.length}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
              <p className="text-zinc-500 text-xs">Distancia (m)</p>
              <p className="text-white font-bold text-2xl mt-1">{Math.round(teamAverages.total_distance?.total || 0)}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
              <p className="text-zinc-500 text-xs">Carga de Equipo</p>
              <p className="text-white font-bold text-2xl mt-1">{Math.round(teamLoad)}</p>
            </div>
          </div>

          {/* Metric selector */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400 text-xs font-medium mb-2">Métrica:</p>
            <div className="flex gap-2 flex-wrap">
              {METRICS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setSelectedMetric(m.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedMetric === m.key ? "bg-white text-zinc-900" : "bg-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Team averages */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
            <h3 className="text-white font-semibold text-sm">Promedios de equipo</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(teamAverages).map(([key, data]) => {
                const metric = METRICS.find((m) => m.key === key);
                return (
                  <div key={key} className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3">
                    <p className="text-zinc-500 text-xs">{metric?.label}</p>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-zinc-600 text-xs">Promedio:</span>
                        <span className="text-white font-bold text-sm">{data.avg}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600 text-xs">Máx/Mín:</span>
                        <span className="text-zinc-400 text-xs">{Math.round(data.max)} / {Math.round(data.min)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Player comparison chart */}
          {playerMetrics.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
              <div>
                <h3 className="text-white font-semibold text-sm">Distribución por jugador</h3>
                <p className="text-zinc-500 text-xs mt-0.5">{METRICS.find((m) => m.key === selectedMetric)?.label}</p>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={playerMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, color: "#fff", fontSize: 11 }} />
                  <Bar dataKey="value" fill={METRICS.find((m) => m.key === selectedMetric)?.color || "#60a5fa"} radius={[4, 4, 0, 0]}>
                    {playerMetrics.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Load distribution */}
          {loadDistribution.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
              <div>
                <h3 className="text-white font-semibold text-sm">Distribución de carga (%)</h3>
                <p className="text-zinc-500 text-xs mt-0.5">Porcentaje de la carga total del equipo por jugador</p>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={loadDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {loadDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}%`} contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, color: "#fff" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Summary statistics */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
            <h3 className="text-white font-semibold text-sm">Resumen de sesión</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-zinc-500 text-xs">Fecha:</p>
                <p className="text-white font-medium">{moment(selectedSessionData.date).format("DD [de] MMMM YYYY")}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs">Tipo:</p>
                <p className="text-white font-medium">{selectedSessionData.session_type || "—"}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs">Intensidad:</p>
                <p className="text-white font-medium">{selectedSessionData.intensity || "—"}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs">Duración:</p>
                <p className="text-white font-medium">{selectedSessionData.duration_minutes ? `${selectedSessionData.duration_minutes} min` : "—"}</p>
              </div>
            </div>
            {selectedSessionData.notes && (
              <div>
                <p className="text-zinc-500 text-xs">Notas:</p>
                <p className="text-white text-sm mt-1 p-2 bg-zinc-800/50 rounded border border-zinc-700">{selectedSessionData.notes}</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
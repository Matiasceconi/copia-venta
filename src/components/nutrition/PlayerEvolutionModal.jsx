import React, { useMemo, useState } from "react";
import moment from "moment";
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  X, TrendingUp, TrendingDown, Minus, Download,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import PlayerPhoto from "@/components/player/PlayerPhoto";
import { exportPlayerEvolutionPdf } from "@/lib/reports/nutritionPdf";

const METRICS = [
  { key: "peso", label: "Peso", unit: "kg", color: "#60a5fa" },
  { key: "sumatoria_6p", label: "Sum. 6 Pliegues", unit: "mm", color: "#fb923c" },
  { key: "porcentaje_grasa", label: "% Grasa", unit: "%", color: "#f472b6" },
  { key: "kg_masa_muscular", label: "Masa Muscular", unit: "kg", color: "#a78bfa" },
];

function fmt(v, unit = "", d = 1) {
  return v !== undefined && v !== null && v !== "" ? `${Number(v).toFixed(d)}${unit ? ` ${unit}` : ""}` : "—";
}

function DiffBadge({ diff }) {
  if (diff == null) return <span className="text-zinc-600 text-xs">—</span>;
  const n = Number(diff);
  const sign = n > 0 ? "+" : "";
  const color = n > 0 ? "text-red-400" : n < 0 ? "text-emerald-400" : "text-zinc-500";
  const Icon = n > 0 ? TrendingUp : n < 0 ? TrendingDown : Minus;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${color}`}>
      <Icon size={12} /> {sign}{n.toFixed(1)}
    </span>
  );
}

function StatCard({ label, value, sub, accent = "blue" }) {
  const accents = {
    blue: "border-blue-500/30 text-blue-300",
    orange: "border-orange-500/30 text-orange-300",
    pink: "border-pink-500/30 text-pink-300",
    purple: "border-purple-500/30 text-purple-300",
    green: "border-emerald-500/30 text-emerald-300",
  };
  return (
    <div className={`bg-zinc-900 border rounded-xl p-3 ${accents[accent]}`}>
      <p className="text-[10px] text-zinc-500 uppercase font-semibold mb-1">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
      {sub && <p className="text-[10px] text-zinc-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function PlayerEvolutionModal({ player, assessments, squadName, seasonLabel, onClose }) {
  const [activeMetric, setActiveMetric] = useState(METRICS[1]); // default: Sum 6P
  const [exporting, setExporting] = useState(false);

  const sorted = useMemo(() =>
    [...assessments].sort((a, b) => (a.fecha || "").localeCompare(b.fecha || "")),
    [assessments]
  );

  const chartData = useMemo(() =>
    sorted.map((a, i) => {
      const prev = i > 0 ? sorted[i - 1] : null;
      const val = a[activeMetric.key];
      const prevVal = prev?.[activeMetric.key];
      const diff = val != null && prevVal != null ? Number(val) - Number(prevVal) : null;
      return {
        label: a.fecha ? moment(a.fecha).format("DD/MM") : "—",
        fecha: a.fecha ? moment(a.fecha).format("DD/MM/YYYY") : "—",
        [activeMetric.key]: val != null ? Number(val) : null,
        diff,
      };
    }),
    [sorted, activeMetric]
  );

  const latest = sorted[sorted.length - 1];
  const previous = sorted[sorted.length - 2];

  const seasonAvg = useMemo(() => {
    const vals = sorted.map((a) => a[activeMetric.key]).filter((v) => v != null).map(Number);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  }, [sorted, activeMetric]);

  const seasonBest = useMemo(() => {
    const vals = sorted.map((a) => a[activeMetric.key]).filter((v) => v != null).map(Number);
    if (!vals.length) return null;
    // For weight and fat %, "best" means lowest; for muscle mass, highest
    const invertedMetrics = ["sumatoria_6p", "porcentaje_grasa", "peso"];
    return invertedMetrics.includes(activeMetric.key) ? Math.min(...vals) : Math.max(...vals);
  }, [sorted, activeMetric]);

  const latestDiff = latest && previous
    ? (latest[activeMetric.key] != null && previous[activeMetric.key] != null
      ? Number(latest[activeMetric.key]) - Number(previous[activeMetric.key])
      : null)
    : null;

  const playerName = player?.full_name || `${player?.first_name || ""} ${player?.last_name || ""}`.trim() || "—";

  async function handleExport() {
    setExporting(true);
    try {
      await exportPlayerEvolutionPdf({ player, assessments: sorted, squadName, seasonLabel });
    } finally {
      setExporting(false);
    }
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    const item = chartData.find((c) => c.label === label);
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-3 shadow-xl text-xs min-w-[130px]">
        <p className="text-zinc-400 mb-1">{item?.fecha || label}</p>
        <p className="text-white font-bold">{fmt(d.value, activeMetric.unit)}</p>
        {item?.diff != null && (
          <p className={`mt-1 font-medium ${item.diff > 0 ? "text-red-400" : item.diff < 0 ? "text-emerald-400" : "text-zinc-500"}`}>
            {item.diff > 0 ? "+" : ""}{item.diff.toFixed(1)} vs anterior
          </p>
        )}
      </div>
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border border-zinc-800 text-white max-w-4xl max-h-[92vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <PlayerPhoto
              player={player}
              photoUrl={player?.photo_url}
              className="w-10 h-10 rounded-full object-cover"
              fallbackClassName="w-10 h-10 rounded-full bg-zinc-800 text-zinc-400 text-sm flex items-center justify-center"
            />
            <div>
              <h2 className="text-white font-bold text-base">{playerName}</h2>
              <p className="text-zinc-500 text-xs">{player?.position || "—"} · {sorted.length} evaluaciones</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs rounded-lg disabled:opacity-60"
            >
              <Download size={13} />
              {exporting ? "Exportando..." : "PDF"}
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400">
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Metric selector */}
          <div className="flex flex-wrap gap-2">
            {METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => setActiveMetric(m)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${activeMetric.key === m.key
                  ? "border-transparent text-zinc-900"
                  : "bg-transparent border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}
                style={activeMetric.key === m.key ? { backgroundColor: m.color, borderColor: m.color } : {}}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Comparative cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Última evaluación"
              value={fmt(latest?.[activeMetric.key], activeMetric.unit)}
              sub={latest?.fecha ? moment(latest.fecha).format("DD/MM/YYYY") : undefined}
              accent="blue"
            />
            <StatCard
              label="Evaluación anterior"
              value={fmt(previous?.[activeMetric.key], activeMetric.unit)}
              sub={previous?.fecha ? moment(previous.fecha).format("DD/MM/YYYY") : undefined}
              accent="purple"
            />
            <StatCard
              label="Mejor de temporada"
              value={fmt(seasonBest, activeMetric.unit)}
              sub="Valor óptimo"
              accent="green"
            />
            <StatCard
              label="Promedio temporada"
              value={fmt(seasonAvg, activeMetric.unit)}
              sub={`${sorted.length} evaluaciones`}
              accent="orange"
            />
          </div>

          {/* Diff from previous */}
          {latestDiff != null && (
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span>Variación última vs anterior:</span>
              <DiffBadge diff={latestDiff} />
            </div>
          )}

          {/* Chart */}
          {sorted.length > 1 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <h4 className="text-zinc-300 font-semibold text-sm mb-4">
                Evolución — {activeMetric.label}
                <span className="text-zinc-600 font-normal ml-2">({activeMetric.unit})</span>
              </h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#71717a", fontSize: 11 }} width={40} />
                    <Tooltip content={<CustomTooltip />} />
                    {seasonAvg != null && (
                      <ReferenceLine
                        y={seasonAvg}
                        stroke="#52525b"
                        strokeDasharray="4 2"
                        label={{ value: "Prom", fill: "#71717a", fontSize: 10 }}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey={activeMetric.key}
                      stroke={activeMetric.color}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: activeMetric.color, strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-600 text-sm">
              Se necesitan al menos 2 evaluaciones para mostrar el gráfico de evolución
            </div>
          )}

          {/* History table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800">
              <h4 className="text-zinc-300 font-semibold text-sm">Historial completo</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-[11px]">
                    <th className="text-left p-3">Fecha</th>
                    <th className="text-center p-3">Peso</th>
                    <th className="text-center p-3">Sum. 6P</th>
                    <th className="text-center p-3">% Grasa</th>
                    <th className="text-center p-3">Masa Musc.</th>
                    <th className="text-center p-3">Δ 6P</th>
                  </tr>
                </thead>
                <tbody>
                  {[...sorted].reverse().map((a, i, arr) => {
                    const realPrev = sorted[sorted.length - 1 - i - 1];
                    const d6p = realPrev && a.sumatoria_6p != null && realPrev.sumatoria_6p != null
                      ? Number(a.sumatoria_6p) - Number(realPrev.sumatoria_6p)
                      : null;
                    return (
                      <tr key={a.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="p-3 text-zinc-300 font-medium whitespace-nowrap">
                          {a.fecha ? moment(a.fecha).format("DD/MM/YYYY") : "—"}
                          {i === 0 && <span className="ml-2 text-[10px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">Última</span>}
                        </td>
                        <td className="p-3 text-center text-zinc-400">{fmt(a.peso, " kg")}</td>
                        <td className="p-3 text-center text-orange-400 font-medium">{fmt(a.sumatoria_6p, " mm")}</td>
                        <td className="p-3 text-center text-pink-400">{fmt(a.porcentaje_grasa, "%")}</td>
                        <td className="p-3 text-center text-purple-400">{fmt(a.kg_masa_muscular, " kg")}</td>
                        <td className="p-3 text-center"><DiffBadge diff={d6p} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

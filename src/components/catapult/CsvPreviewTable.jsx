import React from "react";

const THRESHOLDS = {
  total_distance:          { green: 9000, yellow: 6000 },
  distance_hsr:            { green: 1200, yellow: 700 },
  sprint_distance:         { green: 400,  yellow: 150 },
  sprint_efforts:          { green: 20,   yellow: 10 },
  accelerations:           { green: 30,   yellow: 15 },
  decelerations:           { green: 30,   yellow: 15 },
  player_load:             { green: 700,  yellow: 400 },
  max_velocity:            { green: 30,   yellow: 25 },
  max_velocity_percentage: { green: 85,   yellow: 70 },
  meters_per_minute:       { green: 100,  yellow: 75 },
};

// Columns with no decimal places (whole numbers only, no thousand separators)
const NO_DECIMALS = new Set(["total_distance", "distance_hsr", "sprint_distance", "sprint_efforts", "accelerations", "decelerations"]);
const ONE_DECIMAL = new Set(["player_load", "meters_per_minute", "max_velocity", "max_velocity_percentage", "total_duration"]);

function formatValue(key, val) {
  if (val == null || val === "") return "—";
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  if (NO_DECIMALS.has(key)) return Math.round(n).toString();
  if (ONE_DECIMAL.has(key)) return n.toFixed(1);
  return n.toFixed(0);
}

function colorCell(key, value) {
  const t = THRESHOLDS[key];
  if (!t || value == null) return { bg: "bg-zinc-800/60", text: "text-zinc-300" };
  const n = parseFloat(value);
  if (isNaN(n)) return { bg: "bg-zinc-800/60", text: "text-zinc-300" };
  if (n >= t.green) return { bg: "bg-green-900/40", text: "text-green-300" };
  if (n >= t.yellow) return { bg: "bg-yellow-900/40", text: "text-yellow-300" };
  return { bg: "bg-red-900/40", text: "text-red-300" };
}

const METRICS = [
  { key: "total_distance",          label: "Dist. Total",      unit: "m" },
  { key: "distance_hsr",            label: "19.8–25 km/h",     unit: "m" },
  { key: "sprint_distance",         label: "+25 km/h",         unit: "m" },
  { key: "sprint_efforts",          label: "Sprints",          unit: "" },
  { key: "accelerations",           label: "Acel.",            unit: "" },
  { key: "decelerations",           label: "Decel.",           unit: "" },
  { key: "player_load",             label: "Player Load",      unit: "" },
  { key: "max_velocity",            label: "Vel. Máx",         unit: "km/h" },
  { key: "max_velocity_percentage", label: "% Vel. Máx",       unit: "%" },
  { key: "meters_per_minute",       label: "m/min",            unit: "" },
];

function MetricCard({ metricKey, label, unit, value }) {
  const { bg, text } = colorCell(metricKey, value);
  const display = formatValue(metricKey, value);
  return (
    <div className={`rounded-lg p-3 flex flex-col gap-1 ${bg}`}>
      <span className="text-zinc-400 text-xs leading-tight">{label}</span>
      <span className={`text-xl font-bold leading-none ${text}`}>{display}</span>
      {unit && <span className="text-zinc-500 text-xs">{unit}</span>}
    </div>
  );
}

// Single-player card view
function PlayerCard({ row }) {
  return (
    <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-4">
      <p className="text-white font-semibold text-sm mb-3">{row.player_name || "—"}</p>
      <div className="grid grid-cols-5 gap-2">
        {METRICS.map((m) => (
          <MetricCard key={m.key} metricKey={m.key} label={m.label} unit={m.unit} value={row[m.key]} />
        ))}
      </div>
    </div>
  );
}

// Table view for multiple players
function TableView({ rows }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-700">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-zinc-800 text-zinc-400">
            <th className="px-3 py-2.5 font-semibold text-left whitespace-nowrap border-b border-zinc-700 sticky left-0 bg-zinc-800 z-10">Jugador</th>
            {METRICS.map((m) => (
              <th key={m.key} className="px-3 py-2.5 font-semibold text-right whitespace-nowrap border-b border-zinc-700">
                {m.label}{m.unit ? ` (${m.unit})` : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-zinc-800/60 hover:bg-zinc-800/30 transition-colors">
              <td className="px-3 py-2.5 font-medium text-white whitespace-nowrap sticky left-0 bg-zinc-900 z-10">{row.player_name || "—"}</td>
              {METRICS.map((m) => {
                const { bg, text } = colorCell(m.key, row[m.key]);
                return (
                  <td key={m.key} className={`px-3 py-2.5 text-right font-semibold whitespace-nowrap ${bg} ${text}`}>
                    {formatValue(m.key, row[m.key])}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CsvPreviewTable({ rows }) {
  if (!rows || rows.length === 0) return null;
  if (rows.length === 1) return <PlayerCard row={rows[0]} />;
  return <TableView rows={rows} />;
}
import React from "react";
import moment from "moment";
import { EXCLUSION_REASON_LABELS } from "@/components/performance/externalGpsLoadUtils";

function fmtDate(d) { return d ? moment(d).format("DD/MM/YYYY") : "—"; }

function MiniStat({ label, value, color = "text-white", sub }) {
  return (
    <div className="bg-zinc-800/60 rounded-xl p-3 text-center">
      <p className={`text-xl font-bold ${color}`}>{value ?? "—"}</p>
      <p className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{label}</p>
      {sub && <p className="text-[9px] text-zinc-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function EmptyState({ text = "Sin registros" }) {
  return <div className="text-center py-10 text-zinc-600 text-sm">{text}</div>;
}

const GPS_COLS = [
  { key: "total_distance", label: "Dist. total (m)" },
  { key: "m_min",          label: "m/min" },
  { key: "distance_19_8",  label: "D >19.8 (m)" },
  { key: "distance_25",    label: "D >25 (m)" },
  { key: "sprints",        label: "Sprints" },
  { key: "acc_3",          label: "ACC +3" },
  { key: "dec_3",          label: "DEC +3" },
  { key: "player_load",    label: "Player Load" },
  { key: "smax",           label: "Smax (km/h)" },
];

function avg(arr, key) {
  const vals = arr.map(r => r[key]).filter(v => v != null && !isNaN(v));
  if (!vals.length) return "—";
  return (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1);
}
function max(arr, key) {
  const vals = arr.map(r => r[key]).filter(v => v != null && !isNaN(v));
  if (!vals.length) return "—";
  return Math.max(...vals).toFixed(1);
}

export default function PlayerGPSTab({ gpsData }) {
  if (!gpsData.length) return <EmptyState />;
  const normalRows = gpsData.filter(r => r.include_in_session_average !== false);
  const excludedRows = gpsData.filter(r => r.include_in_session_average === false);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Registros GPS" value={gpsData.length} color="text-purple-400" />
        <MiniStat label="Última carga" value={fmtDate(gpsData[0]?.created_date)} color="text-zinc-300 text-xs" />
        <MiniStat label="Dist. prom." value={avg(normalRows, "total_distance") + " m"} color="text-blue-400 text-sm" />
      </div>

      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Promedios y máximos históricos</p>
        <div className="bg-zinc-900 rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-3 py-2 text-zinc-500 font-medium">Variable</th>
                <th className="text-right px-3 py-2 text-zinc-500 font-medium">Promedio</th>
                <th className="text-right px-3 py-2 text-zinc-500 font-medium">Máximo</th>
              </tr>
            </thead>
            <tbody>
              {GPS_COLS.map(col => (
                <tr key={col.key} className="border-b border-zinc-800/50 last:border-0">
                  <td className="px-3 py-2 text-zinc-400">{col.label}</td>
                  <td className="px-3 py-2 text-right text-white font-medium">{avg(normalRows, col.key)}</td>
                  <td className="px-3 py-2 text-right text-yellow-400 font-medium">{max(normalRows, col.key)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Últimos registros</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-max">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-2 py-2 text-zinc-500">Fecha</th>
                {GPS_COLS.map(c => <th key={c.key} className="text-right px-2 py-2 text-zinc-500 whitespace-nowrap">{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {normalRows.slice(0, 15).map(r => (
                <tr key={r.id} className="border-b border-zinc-800/40 last:border-0">
                  <td className="px-2 py-1.5 text-zinc-400 whitespace-nowrap">{fmtDate(r.created_date)}</td>
                  {GPS_COLS.map(c => (
                    <td key={c.key} className="px-2 py-1.5 text-right text-white">{r[c.key] ?? "—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {excludedRows.length > 0 && (
        <div>
          <p className="text-xs text-amber-400 uppercase tracking-wider font-semibold mb-2">Sesiones excluidas del promedio</p>
          <div className="space-y-1.5">
            {excludedRows.slice(0, 15).map(r => (
              <div key={r.id} className="flex items-center justify-between bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2 gap-3">
                <span className="text-sm text-white">{fmtDate(r.created_date)}</span>
                <div className="text-right">
                  <p className="text-xs text-amber-300">{EXCLUSION_REASON_LABELS[r.exclusion_reason] || r.exclusion_reason || "—"}</p>
                  <p className="text-xs text-zinc-500">{r.total_distance ? `${r.total_distance.toFixed(0)} m` : "—"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
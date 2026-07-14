import React, { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { fmtMetric, fmtSmax } from "@/utils";
import { COLUMN_DEFS } from "@/components/sessions/gps/gpsColumnsConfig";

const DISPLAYABLE = COLUMN_DEFS.filter(c => !c.core);

export default function GpsDataTable({ title, rows, visibleFields, setVisibleFields }) {
  const [showToggle, setShowToggle] = useState(false);
  const cols = DISPLAYABLE.filter(c => visibleFields.includes(c.field));

  function toggleField(field) {
    setVisibleFields(prev => prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]);
  }

  if (rows.length === 0) return null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
        <p className="text-xs font-semibold text-white">{title} ({rows.length})</p>
        <button onClick={() => setShowToggle(v => !v)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 text-[10px] hover:text-white">
          <SlidersHorizontal size={11} /> Columnas
        </button>
      </div>
      {showToggle && (
        <div className="p-3 border-b border-zinc-800 flex flex-wrap gap-2">
          {DISPLAYABLE.map(c => (
            <label key={c.field} className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border cursor-pointer ${
              visibleFields.includes(c.field) ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-zinc-800 border-zinc-700 text-zinc-500"
            }`}>
              <input type="checkbox" className="accent-emerald-500" checked={visibleFields.includes(c.field)} onChange={() => toggleField(c.field)} />
              {c.label}
            </label>
          ))}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left py-3 px-4 text-zinc-400 font-medium whitespace-nowrap">Jugador</th>
              {cols.map(c => (
                <th key={c.field} className="text-right py-3 px-3 font-medium whitespace-nowrap" style={{ color: c.color || "#a1a1aa" }}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.player_id || i} className="border-b border-zinc-800/40 hover:bg-zinc-800/30 transition-colors">
                <td className="py-2.5 px-4 text-white font-semibold whitespace-nowrap">{r.player_name}</td>
                {cols.map(c => (
                  <td key={c.field} className="py-2.5 px-3 text-right font-bold" style={{ color: c.color || "#d4d4d8" }}>
                    {c.field === "smax" ? fmtSmax(r[c.field]) : c.numeric ? fmtMetric(r[c.field]) : (r[c.field] || "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
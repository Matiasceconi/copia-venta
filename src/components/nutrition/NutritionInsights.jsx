import React, { useMemo } from "react";
import moment from "moment";

function playerName(p) { return p?.full_name || `${p?.first_name || ""} ${p?.last_name || ""}`.trim(); }

export default function NutritionInsights({ assessments, players, syncState, detailed = false }) {
  const playerMap = useMemo(() => Object.fromEntries(players.map(p => [p.id, p])), [players]);
  const latest = useMemo(() => {
    const map = new Map();
    assessments.filter(a => a.linked && a.player_id).forEach(a => { if (!map.has(a.player_id) || (a.fecha || "") > (map.get(a.player_id).fecha || "")) map.set(a.player_id, a); });
    return [...map.values()];
  }, [assessments]);
  const staleDate = moment().subtract(30, "days").format("YYYY-MM-DD");
  const alerts = [
    { label: "% Grasa elevado", color: "bg-red-500", rows: latest.filter(a => Number(a.porcentaje_grasa) >= 18) },
    { label: "Masa muscular baja", color: "bg-orange-500", rows: latest.filter(a => Number(a.kg_masa_muscular) > 0 && Number(a.kg_masa_muscular) < 32) },
    { label: "Peso por debajo del rango", color: "bg-amber-500", rows: latest.filter(a => Number(a.peso) > 0 && Number(a.peso) < 68) },
    { label: "Sin medición reciente", color: "bg-yellow-500", rows: latest.filter(a => (a.fecha || "") < staleDate) },
  ];
  const result = syncState?.last_sync_result || {};
  return <div className="space-y-4">{!detailed && <><div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><div className="flex items-center justify-between mb-3"><h3 className="font-bold text-slate-900 text-sm">Alertas nutricionales</h3><button className="text-[11px] text-emerald-600">Ver todas</button></div><div className="space-y-3">{alerts.map(a => <div key={a.label} className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-slate-700"><i className={`w-2 h-2 rounded-full ${a.color}`} />{a.label}</span><b className="text-slate-500 font-medium">{a.rows.length} jugadores</b></div>)}</div></div><div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><h3 className="font-bold text-slate-900 text-sm mb-3">Sincronización</h3><dl className="grid grid-cols-[1fr_auto] gap-y-1.5 text-xs"><dt className="text-slate-500">Estado:</dt><dd className="text-emerald-600 font-semibold">Completada</dd><dt className="text-slate-500">Filas leídas:</dt><dd>{result.rows_read || assessments.length}</dd><dt className="text-slate-500">Jugadores vinculados:</dt><dd>{result.linked || latest.length}</dd><dt className="text-slate-500">Sin vincular:</dt><dd>{result.unlinked || assessments.filter(a => !a.linked).length}</dd><dt className="text-slate-500">Creadas:</dt><dd>{result.created || 0}</dd><dt className="text-slate-500">Actualizadas:</dt><dd>{result.updated || 0}</dd><dt className="text-slate-500">Duplicados evitados:</dt><dd>{result.duplicates_avoided || 0}</dd><dt className="text-slate-500">Errores:</dt><dd>{result.errors || 0}</dd></dl></div></>}{detailed && <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><h3 className="font-bold text-slate-900 mb-4">Detalle de alertas nutricionales</h3><div className="space-y-4">{alerts.map(a => <div key={a.label}><p className="text-sm font-semibold text-slate-800 flex items-center gap-2"><i className={`w-2.5 h-2.5 rounded-full ${a.color}`} />{a.label} · {a.rows.length}</p><div className="mt-2 grid md:grid-cols-2 gap-2">{a.rows.slice(0, 8).map(row => <div key={row.id} className="border border-slate-100 bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-600">{playerName(playerMap[row.player_id]) || row.player_name_original} · {row.fecha}</div>)}</div></div>)}</div></div>}</div>;
}
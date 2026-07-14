import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Activity, AlertTriangle, CheckCircle, ChevronDown, ChevronRight, UserCheck } from "lucide-react";
import { FileSpreadsheet, Users } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import PlayerPhoto from "@/components/player/PlayerPhoto";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";

const METRICS = [
  { key: "total_distance",   label: "Distancia (m)",      color: "#60a5fa", fmt: (v) => Math.round(v) },
  { key: "distance_hsr",    label: "19.8-25 km/h (m)",   color: "#34d399", fmt: (v) => Math.round(v) },
  { key: "sprint_distance", label: "+25 km/h (m)",        color: "#fbbf24", fmt: (v) => Math.round(v) },
  { key: "player_load",     label: "Player Load",         color: "#a78bfa", fmt: (v) => parseFloat(v).toFixed(0) },
  { key: "max_velocity",    label: "Vel. Máx (km/h)",    color: "#f87171", fmt: (v) => parseFloat(v).toFixed(1) },
  { key: "accelerations",   label: "Aceleraciones",       color: "#fb923c", fmt: (v) => Math.round(v) },
  { key: "decelerations",   label: "Desaceleraciones",    color: "#e879f9", fmt: (v) => Math.round(v) },
  { key: "sprint_efforts",  label: "Sprint Efforts",      color: "#2dd4bf", fmt: (v) => Math.round(v) },
];

function avg(arr) {
  const v = arr.filter((x) => x != null && !isNaN(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

function getTrafficLight(value, teamAvg) {
  if (value == null || teamAvg == null || teamAvg === 0) return null;
  const pct = (value / teamAvg) * 100;
  if (pct > 90) return { color: "#ef4444", bg: "bg-red-500/20 border-red-500/40", dot: "bg-red-500" };
  if (pct >= 60) return { color: "#f59e0b", bg: "bg-yellow-500/20 border-yellow-500/40", dot: "bg-yellow-500" };
  return { color: "#22c55e", bg: "bg-green-500/20 border-green-500/40", dot: "bg-green-500" };
}

// ── Panel de resolución de nombres no reconocidos ──────────────────────────
function UnresolvedNamesPanel({ unresolvedNames, playerOptions, onResolved, matchId, matchDate, csvUrl, csvLabel }) {
  const { toast } = useToast();
  const [selections, setSelections] = useState({}); // csvName -> player_id
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState({});

  async function saveMapping(csvName) {
    const playerId = selections[csvName];
    if (!playerId) return;
    setSaving(true);
    try {
      await base44.functions.invoke("resolveMatchGpsCSV", {
        mode: "save_mapping",
        csv_name: csvName,
        player_id: playerId,
        match_id: matchId,
        match_date: matchDate,
        csv_url: csvUrl,
        csv_label: csvLabel,
      });
      setSaved(s => ({ ...s, [csvName]: true }));
      toast({ title: `"${csvName}" vinculado correctamente` });
      onResolved?.();
    } catch {
      toast({ title: "Error al guardar el vínculo", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const pending = unresolvedNames.filter(n => !saved[n]);
  if (pending.length === 0) return null;

  return (
    <div className="bg-orange-950/30 border border-orange-500/30 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle size={14} className="text-orange-400" />
        <p className="text-sm font-semibold text-orange-300">
          {pending.length} jugador{pending.length !== 1 ? "es" : ""} sin identificar en el CSV
        </p>
      </div>
      <p className="text-xs text-orange-400/70">
        Asignales su perfil del plantel para que queden unificados en todos los reportes futuros.
      </p>
      <div className="space-y-2">
        {pending.map((csvName) => (
          <div key={csvName} className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono bg-zinc-900 border border-zinc-700 text-zinc-300 px-2 py-1 rounded min-w-[140px]">
              {csvName}
            </span>
            <ChevronRight size={12} className="text-zinc-600 shrink-0" />
            <select
              value={selections[csvName] || ""}
              onChange={e => setSelections(s => ({ ...s, [csvName]: e.target.value }))}
              className="flex-1 min-w-[160px] bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-orange-500/50"
            >
              <option value="">— Seleccionar jugador —</option>
              {playerOptions.map(p => (
                <option key={p.id} value={p.id}>
                  {p.jersey_number ? `#${p.jersey_number} ` : ""}{p.full_name} {p.division ? `(${p.division})` : ""}
                </option>
              ))}
            </select>
            <button
              onClick={() => saveMapping(csvName)}
              disabled={!selections[csvName] || saving}
              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-orange-500/20 border border-orange-500/30 text-orange-300 hover:bg-orange-500/30 rounded-lg transition-colors disabled:opacity-40"
            >
              <UserCheck size={11} /> Vincular
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function MatchGpsReport({ match }) {
  const [data, setData] = useState(null); // { rows, unresolved_names, player_options }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [activeMetric, setActiveMetric] = useState("total_distance");
  const [showUnresolved, setShowUnresolved] = useState(true);

  async function loadData() {
    if (!match.csv_url) return;
    setLoading(true);
    setError(false);
    try {
      const res = await base44.functions.invoke("resolveMatchGpsCSV", {
        csv_url: match.csv_url,
        match_id: match.id,
        match_date: match.date,
        csv_label: match.csv_label,
      });
      setData(res.data);
      if (res.data?.unresolved > 0) setShowUnresolved(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [match.csv_url]);

  const rows = data?.rows || [];
  const resolvedRows = rows.filter(r => !r.unresolved);

  const metric = METRICS.find((m) => m.key === activeMetric);

  const teamAvgs = useMemo(() => {
    const out = {};
    METRICS.forEach(({ key }) => { out[key] = avg(resolvedRows.map((r) => r[key])); });
    return out;
  }, [resolvedRows]);

  const playerData = useMemo(() => {
    const byPlayer = {};
    rows.forEach((r) => {
      const key = r.player_id || r.player_name;
      if (!byPlayer[key]) byPlayer[key] = { ...r, _rows: [] };
      byPlayer[key]._rows.push(r);
    });
    return Object.values(byPlayer).map((p) => {
      const out = {
        player_name: p.player_name,
        player_id: p.player_id,
        photo_url: p.photo_url,
        jersey_number: p.jersey_number,
        csv_name: p.csv_name,
        unresolved: p.unresolved,
      };
      METRICS.forEach(({ key }) => { out[key] = avg(p._rows.map((r) => r[key])); });
      return out;
    });
  }, [rows]);

  const chartData = useMemo(() =>
    playerData
      .filter((p) => !p.unresolved && p[activeMetric] != null)
      .sort((a, b) => (b[activeMetric] || 0) - (a[activeMetric] || 0))
      .map((p) => ({ ...p, value: p[activeMetric] })),
    [playerData, activeMetric]
  );

  const tableData = useMemo(() =>
    [...playerData].sort((a, b) => (b.total_distance || 0) - (a.total_distance || 0)),
    [playerData]
  );

  if (!match.csv_url) return null;

  const teamAvg = teamAvgs[activeMetric];

  return (
    <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-zinc-800/80 border-b border-zinc-700/50 flex items-center gap-2">
        <FileSpreadsheet size={14} className="text-green-400" />
        <p className="text-sm font-semibold text-white">Informe GPS del partido</p>
        {!loading && data && (
          <div className="ml-auto flex items-center gap-2">
            {data.unresolved > 0 && (
              <span className="text-xs text-orange-400 flex items-center gap-1">
                <AlertTriangle size={11} /> {data.unresolved} sin ID
              </span>
            )}
            {data.resolved > 0 && (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <CheckCircle size={11} /> {data.resolved} resueltos
              </span>
            )}
            <span className="text-xs text-zinc-500">
              <Users size={11} className="inline mr-1" />{data.total} jugadores
            </span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="flex items-center gap-2 text-zinc-500 text-xs">
              <div className="w-4 h-4 border border-zinc-600 border-t-white rounded-full animate-spin" />
              Analizando y cruzando datos GPS...
            </div>
          </div>
        ) : error ? (
          <p className="text-red-400 text-xs text-center py-4">No se pudo procesar el archivo CSV.</p>
        ) : rows.length === 0 ? (
          <p className="text-zinc-500 text-xs text-center py-4">Sin datos de jugadores en el CSV.</p>
        ) : (
          <>
            {/* Panel de nombres no resueltos */}
            {data?.unresolved_names?.length > 0 && (
              <UnresolvedNamesPanel
                unresolvedNames={data.unresolved_names}
                playerOptions={data.player_options || []}
                onResolved={loadData}
                matchId={match.id}
                matchDate={match.date}
                csvUrl={match.csv_url}
                csvLabel={match.csv_label}
              />
            )}

            {/* KPIs del equipo (solo jugadores resueltos) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {METRICS.filter(({ key }) => teamAvgs[key] != null).slice(0, 4).map(({ key, label, color, fmt }) => (
                <div key={key} className="bg-zinc-900/80 border border-zinc-700/50 rounded-lg p-3 text-center">
                  <p className="text-zinc-500 text-[10px] tracking-wider uppercase">{label}</p>
                  <p className="font-bold text-base" style={{ color }}>{fmt(teamAvgs[key])}</p>
                  <p className="text-zinc-600 text-[10px]">prom. equipo</p>
                </div>
              ))}
            </div>

            {/* Selector métrica */}
            <div className="flex flex-wrap gap-1.5">
              {METRICS.map(({ key, label, color }) => (
                <button key={key} onClick={() => setActiveMetric(key)}
                  className="text-[10px] px-2.5 py-1 rounded-full border font-medium transition-all"
                  style={activeMetric === key
                    ? { backgroundColor: color, color: "#18181b", borderColor: color }
                    : { backgroundColor: "transparent", color: "#71717a", borderColor: "#3f3f46" }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Gráfico de barras */}
            {chartData.length > 0 && (
              <div className="bg-zinc-900/60 border border-zinc-700/50 rounded-xl p-4">
                <p className="text-xs font-semibold text-white mb-3 flex items-center gap-1.5">
                  <Activity size={12} style={{ color: metric?.color }} />
                  {metric?.label} — por jugador
                </p>
                <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 30)}>
                  <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 50, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 9, fill: "#71717a" }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="player_name" width={100} tick={{ fontSize: 9, fill: "#d4d4d8" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }}
                      formatter={(val) => [metric?.fmt(val), metric?.label]}
                      labelFormatter={(_, payload) => {
                        const p = payload?.[0]?.payload;
                        return p ? `${p.player_name}${p.csv_name && p.csv_name !== p.player_name ? ` (CSV: ${p.csv_name})` : ""}` : "";
                      }}
                    />
                    {teamAvg != null && (
                      <ReferenceLine x={teamAvg} stroke={metric?.color} strokeDasharray="4 4" strokeOpacity={0.6}
                        label={{ value: "prom", position: "top", fill: metric?.color, fontSize: 9 }} />
                    )}
                    <Bar dataKey="value" radius={[0, 3, 3, 0]}
                      label={{ position: "right", fontSize: 9, fill: "#a1a1aa", formatter: (v) => metric?.fmt(v) }}>
                      {chartData.map((_, i) => <Cell key={i} fill={metric?.color} fillOpacity={0.75} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Tabla de jugadores */}
            <div className="overflow-x-auto rounded-lg border border-zinc-700/50">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="bg-zinc-800/80">
                    <th className="px-2.5 py-2 text-left text-zinc-400 font-semibold whitespace-nowrap">Jugador</th>
                    {METRICS.filter(({ key }) => tableData.some((r) => r[key] != null)).map(({ key, label }) => (
                      <th key={key} className="px-2.5 py-2 text-right text-zinc-400 font-semibold whitespace-nowrap">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-zinc-800/40 border-b border-zinc-700/50">
                    <td className="px-2.5 py-1.5 text-zinc-500 font-bold whitespace-nowrap text-[10px] uppercase tracking-wider">Prom. Equipo</td>
                    {METRICS.filter(({ key }) => tableData.some((r) => r[key] != null)).map(({ key, fmt, color }) => (
                      <td key={key} className="px-2.5 py-1.5 text-right whitespace-nowrap font-mono font-bold" style={{ color }}>
                        {teamAvgs[key] != null ? fmt(teamAvgs[key]) : <span className="text-zinc-700">—</span>}
                      </td>
                    ))}
                  </tr>
                  {tableData.map((row, ri) => (
                    <tr key={ri} className={`${ri % 2 === 0 ? "bg-zinc-900" : "bg-zinc-800/10"} ${row.unresolved ? "opacity-50" : ""}`}>
                      <td className="px-2.5 py-1.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <PlayerPhoto
                            src={row.photo_url}
                            alt={row.player_name}
                            className="w-4 h-4 rounded-full object-cover border border-zinc-700 shrink-0"
                            fallbackClassName="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center shrink-0"
                            textClassName="text-[8px] font-bold text-zinc-400"
                          />
                          <span className="text-zinc-200 font-medium">{row.player_name}</span>
                          {row.unresolved && (
                            <span title={`CSV: "${row.csv_name}"`}>
                              <AlertTriangle size={9} className="text-orange-400 shrink-0" />
                            </span>
                          )}
                          {!row.unresolved && row.csv_name && row.csv_name !== row.player_name && (
                            <span className="text-zinc-600 text-[9px] truncate max-w-[60px]" title={`CSV: ${row.csv_name}`}>
                              ≡ {row.csv_name}
                            </span>
                          )}
                        </div>
                      </td>
                      {METRICS.filter(({ key }) => tableData.some((r) => r[key] != null)).map(({ key, fmt }) => {
                        const val = row[key];
                        const light = row.unresolved ? null : getTrafficLight(val, teamAvgs[key]);
                        return (
                          <td key={key} className="px-2.5 py-1.5 text-right whitespace-nowrap">
                            {val != null ? (
                              <span className={`inline-flex items-center gap-1 justify-end font-mono font-semibold px-1.5 py-0.5 rounded border ${light?.bg || "border-transparent"}`}
                                style={{ color: light?.color || "#a1a1aa" }}>
                                {light && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${light.dot}`} />}
                                {fmt(val)}
                              </span>
                            ) : (
                              <span className="text-zinc-700">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-zinc-600 text-[10px] text-center">
              {rows.length} registros · {resolvedRows.length} con ID · {data?.unresolved || 0} sin identificar
            </p>
          </>
        )}
      </div>
    </div>
  );
}
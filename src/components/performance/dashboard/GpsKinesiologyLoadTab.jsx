import React, { useMemo, useState } from "react";
import moment from "moment";
import "moment/locale/es";
import { ArrowUpDown, CalendarDays, ExternalLink, Filter, TrendingUp, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import PlayerPhoto from "@/components/player/PlayerPhoto";
import { COLUMN_DEFS } from "@/components/sessions/gps/gpsColumnsConfig";

moment.locale("es");

const METRICS = [
  { key: "total_distance", label: "Distancia Total", short: "Distancia", unit: "m", profileKey: "avg_total_distance" },
  { key: "player_load", label: "Player Load", short: "Player Load", unit: "u", profileKey: "avg_player_load" },
  { key: "distance_25", label: "D > 25 km/h", short: "D > 25", unit: "m", profileKey: "avg_distance_25" },
  { key: "sprints", label: "Sprints", short: "Sprints", unit: "", profileKey: "avg_sprints" },
  { key: "acc_3", label: "ACC +3", short: "ACC +3", unit: "", profileKey: "avg_acc_3" },
  { key: "dec_3", label: "DEC +3", short: "DEC +3", unit: "", profileKey: "avg_dec_3" },
];

const TABLE_METRICS = COLUMN_DEFS.filter((column) => !column.core).map((column) => ({
  key: column.field,
  label: column.label,
  unit: column.field.includes("distance") || column.field.includes("hmld") || column.field === "total_distance" ? "m" : column.field === "smax" ? "km/h" : "",
}));

const STAGE_COLORS = ["bg-emerald-500/15 text-emerald-300 border-emerald-500/30", "bg-yellow-500/15 text-yellow-300 border-yellow-500/30", "bg-orange-500/15 text-orange-300 border-orange-500/30", "bg-blue-500/15 text-blue-300 border-blue-500/30", "bg-violet-500/15 text-violet-300 border-violet-500/30"];

function normalize(value = "") {
  return String(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}
function isDifferentiatedPlayerRow(row) {
  const group = normalize(row?.gps_group || "");
  const reason = normalize(row?.exclusion_reason || "");
  const status = normalize(row?.row_status || "");
  return group === "diferenciado" || group === "kinesiologia" || reason === "diferenciado" || reason === "kinesiologia" || status.includes("diferenciado") || status.includes("kinesiologia");
}
function differentiatedLabel(row) {
  const value = normalize(row?.exclusion_reason || row?.gps_group || "");
  if (value === "kinesiologia") return "Kinesiología";
  if (value === "diferenciado") return "Diferenciado";
  return "Diferenciado";
}
function number(value) { return Number(value) || 0; }
function format(value, unit = "") {
  if (value == null || value === "") return "—";
  if (typeof value === "string") return value;
  if (Number.isNaN(Number(value))) return "—";
  const n = Number(value);
  const shown = n >= 100 ? Math.round(n).toLocaleString("es-AR") : n.toFixed(1);
  return `${shown}${unit ? ` ${unit}` : ""}`;
}
function pctColor(pct) {
  if (pct >= 80) return "bg-emerald-400";
  if (pct >= 60) return "bg-yellow-400";
  return "bg-red-400";
}
function stageColor(stage) {
  const index = Math.abs(normalize(stage).split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % STAGE_COLORS.length;
  return STAGE_COLORS[index];
}
function isProgressing(rows) {
  const ordered = [...rows].sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(-3);
  return ordered.length >= 2 && ordered[ordered.length - 1].total_distance > ordered[0].total_distance;
}
function hasExternalLoad(row) {
  return TABLE_METRICS.some((metric) => metric.key !== "duration" && row?.[metric.key] !== undefined && row?.[metric.key] !== null && row?.[metric.key] !== "");
}

export default function GpsKinesiologyLoadTab({ sessions = [], gpsBySession = {}, playerMap = {}, competitionProfiles = [], medicalEpisodes = [], medicalStatuses = [] }) {
  const [dateFilter, setDateFilter] = useState(moment().format("YYYY-MM-DD"));
  const [filters, setFilters] = useState({ player: "", position: "Todos", injury: "Todos", stage: "Todos", objective: "Todos" });
  const [sort, setSort] = useState({ key: "date", dir: "desc" });
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [selectedMetric, setSelectedMetric] = useState("total_distance");
  const [showAllMetrics, setShowAllMetrics] = useState(false);

  const sessionMap = useMemo(() => Object.fromEntries(sessions.map((s) => [s.id, s])), [sessions]);
  const profileMap = useMemo(() => Object.fromEntries(competitionProfiles.map((p) => [p.player_id, p])), [competitionProfiles]);
  const episodeById = useMemo(() => Object.fromEntries(medicalEpisodes.map((e) => [e.id, e])), [medicalEpisodes]);
  const medicalByPlayer = useMemo(() => {
    const map = {};
    medicalStatuses.forEach((status) => {
      const episode = episodeById[status.active_episode_id] || medicalEpisodes.filter((e) => e.player_id === status.player_id).sort((a, b) => String(b.fecha_inicio_tto || "").localeCompare(String(a.fecha_inicio_tto || "")))[0];
      if (episode) map[status.player_id] = { status, episode };
    });
    medicalEpisodes.forEach((episode) => { if (episode.player_id && !map[episode.player_id]) map[episode.player_id] = { status: null, episode }; });
    return map;
  }, [medicalStatuses, episodeById, medicalEpisodes]);

  const differentiatedRows = useMemo(() => {
    return Object.entries(gpsBySession).flatMap(([sessionId, rows]) => {
      const session = sessionMap[sessionId];
      if (!session?.date) return [];
      const rowsToUse = rows.filter((row) => isDifferentiatedPlayerRow(row) && hasExternalLoad(row));
      if (!rowsToUse.length) return [];
      return rowsToUse.map((row) => {
        const player = playerMap[row.player_id] || {};
        return { ...row, session_id: sessionId, date: session.date, session_title: session.title || "Sesión", objective: differentiatedLabel(row), player, player_name: row.player_name || player.full_name || player.name || "Jugador" };
      });
    }).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [gpsBySession, sessionMap, playerMap]);

  const allPlayerRows = useMemo(() => {
    const byPlayer = {};
    differentiatedRows.forEach((row) => {
      const id = row.player_id || row.player_name;
      if (!id) return;
      if (!byPlayer[id]) byPlayer[id] = { id, player: row.player, name: row.player_name, rows: [] };
      byPlayer[id].rows.push(row);
    });
    return Object.values(byPlayer).map((item) => {
      const medical = medicalByPlayer[item.id]?.episode || {};
      const profile = profileMap[item.id] || {};
      const latest = [...item.rows].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0] || {};
      const profilePct = profile.avg_total_distance && latest.total_distance ? Math.round((latest.total_distance / profile.avg_total_distance) * 100) : null;
      return {
        ...item,
        position: item.player?.position || "—",
        injury: medical.lesion_consulta || "—",
        days: new Set(item.rows.map((r) => r.date)).size,
        objective: latest.objective || "Trabajo Diferenciado",
        stage: medical.etapa_rhb || "Sin Etapa RHB",
        total_distance: item.rows.reduce((a, r) => a + number(r.total_distance), 0),
        distance_25: item.rows.reduce((a, r) => a + number(r.distance_25), 0),
        sprints: item.rows.reduce((a, r) => a + number(r.sprints), 0),
        player_load: item.rows.reduce((a, r) => a + number(r.player_load), 0),
        acc_3: item.rows.reduce((a, r) => a + number(r.acc_3), 0),
        dec_3: item.rows.reduce((a, r) => a + number(r.dec_3), 0),
        profilePct,
        progressing: isProgressing(item.rows),
      };
    });
  }, [differentiatedRows, medicalByPlayer, profileMap]);

  const sessionTableRows = useMemo(() => {
    return differentiatedRows.map((row) => {
      const playerId = row.player_id || row.player_name;
      const medical = medicalByPlayer[playerId]?.episode || {};
      const profile = profileMap[playerId] || {};
      return {
        ...row,
        id: row.id || `${row.session_id}-${playerId}`,
        player_id: playerId,
        player: row.player || playerMap[playerId] || {},
        name: row.player_name || row.player?.full_name || row.player?.name || "Jugador",
        position: row.player?.position || playerMap[playerId]?.position || "—",
        injury: medical.lesion_consulta || "—",
        stage: medical.etapa_rhb || "Sin Etapa RHB",
        profilePct: profile.avg_total_distance && row.total_distance ? Math.round((row.total_distance / profile.avg_total_distance) * 100) : null,
      };
    });
  }, [differentiatedRows, medicalByPlayer, profileMap, playerMap]);

  const options = useMemo(() => ({
    positions: ["Todos", ...new Set(allPlayerRows.map((p) => p.position).filter((v) => v && v !== "—"))],
    injuries: ["Todos", ...new Set(allPlayerRows.map((p) => p.injury).filter((v) => v && v !== "—"))],
    stages: ["Todos", ...new Set(allPlayerRows.map((p) => p.stage).filter(Boolean))],
    objectives: ["Todos", ...new Set(sessionTableRows.map((p) => p.objective).filter(Boolean))],
  }), [allPlayerRows, sessionTableRows]);

  const tableRows = useMemo(() => {
    const searched = normalize(filters.player);
    const filtered = sessionTableRows.filter((p) => {
      if (searched && !normalize(p.name).includes(searched)) return false;
      if (filters.position !== "Todos" && p.position !== filters.position) return false;
      if (filters.injury !== "Todos" && p.injury !== filters.injury) return false;
      if (filters.stage !== "Todos" && p.stage !== filters.stage) return false;
      if (filters.objective !== "Todos" && p.objective !== filters.objective) return false;
      return true;
    });
    return filtered.sort((a, b) => {
      const av = sort.key === "name" ? a.name : a[sort.key];
      const bv = sort.key === "name" ? b.name : b[sort.key];
      const result = typeof av === "string" ? String(av).localeCompare(String(bv)) : number(av) - number(bv);
      return sort.dir === "asc" ? result : -result;
    });
  }, [sessionTableRows, filters, sort]);

  const selected = allPlayerRows.find((p) => p.id === selectedPlayerId) || allPlayerRows[0];
  const selectedMetricConfig = METRICS.find((m) => m.key === selectedMetric) || METRICS[0];
  const chartData = useMemo(() => {
    const byDate = {};
    (selected?.rows || []).forEach((row) => {
      if (!row.date) return;
      if (!byDate[row.date]) byDate[row.date] = { rawDate: row.date, value: 0 };
      byDate[row.date].value += number(row[selectedMetric]);
    });
    return Object.values(byDate).sort((a, b) => String(a.rawDate).localeCompare(String(b.rawDate))).map((row, index) => ({ label: `Día ${index + 1}`, date: moment(row.rawDate).format("DD/MM"), value: row.value }));
  }, [selected, selectedMetric]);
  const selectedMetricTotals = useMemo(() => METRICS.map((metric) => ({ ...metric, value: (selected?.rows || []).reduce((sum, row) => sum + number(row[metric.key]), 0) })), [selected]);
  const selectedMedical = selected ? medicalByPlayer[selected.id]?.episode : null;
  const latestSelectedDate = [...(selected?.rows || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0]?.date;
  const injuryStart = selectedMedical?.fecha_inicio_tto || selectedMedical?.fecha_inicio || selectedMedical?.fecha;
  const daysSinceInjury = injuryStart && latestSelectedDate ? Math.max(1, moment(latestSelectedDate).diff(moment(injuryStart), "days") + 1) : null;
  const todayCount = new Set(differentiatedRows.filter((r) => r.date === dateFilter).map((r) => r.player_id || r.player_name)).size;
  const progressingCount = allPlayerRows.filter((p) => p.progressing).length;

  function changeSort(key) { setSort((prev) => ({ key, dir: prev.key === key && prev.dir === "desc" ? "asc" : "desc" })); }
  function openMedical(playerId) { window.location.href = `/performance/medical?player_id=${encodeURIComponent(playerId)}`; }

  if (!differentiatedRows.length) {
    return <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center"><p className="text-white font-bold">Sin cargas GPS diferenciadas</p><p className="text-zinc-500 text-sm mt-1">Esta sección solo muestra jugadores marcados como Diferenciado/Kinesiología con carga GPS en el CSV de la sesión.</p></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div><h2 className="text-2xl font-black text-white">Diferenciados en Kinesiología</h2><p className="text-zinc-500 text-sm">Monitoreo diario de jugadores con trabajos diferenciados, sin mezclar entrenamientos normales.</p></div>
        <div className="flex items-center gap-2"><CalendarDays size={15} className="text-zinc-500" /><input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white" /></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5"><div className="flex items-center gap-3 text-emerald-300"><Users size={22} /><span className="text-xs font-bold uppercase">Jugadores diferenciados hoy</span></div><p className="text-4xl font-black text-white mt-2">{todayCount}</p><p className="text-xs text-zinc-500">En la fecha seleccionada</p></div>
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-5"><div className="flex items-center gap-3 text-yellow-300"><TrendingUp size={22} /><span className="text-xs font-bold uppercase">En progresión</span></div><p className="text-4xl font-black text-white mt-2">{progressingCount}</p><p className="text-xs text-zinc-500">Aumentan carga en sus últimos trabajos diferenciados</p></div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase mb-3"><Filter size={14} /> Filtros</div>
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-2">
          <input placeholder="Jugador" value={filters.player} onChange={(e) => setFilters({ ...filters, player: e.target.value })} className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white" />
          {[ ["position", "Posición", options.positions], ["injury", "Tipo de lesión", options.injuries], ["stage", "Etapa RHB", options.stages], ["objective", "Objetivo", options.objectives] ].map(([key, label, values]) => <select key={key} value={filters[key]} onChange={(e) => setFilters({ ...filters, [key]: e.target.value })} className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white"><option value="Todos">{label}</option>{values.filter((v) => v !== "Todos").map((v) => <option key={v} value={v}>{v}</option>)}</select>)}
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800"><h3 className="text-white font-bold">Tabla de jugadores diferenciados</h3><p className="text-xs text-zinc-500 mt-1">Solo sesiones donde el jugador figura como diferenciado/Kinesiología y tiene carga GPS registrada en el CSV de esa sesión. La etapa se lee desde Área Médica.</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[2400px] text-xs">
            <thead className="bg-zinc-800/60 text-zinc-500 uppercase">
              <tr>{[
                ["photo", "Foto"], ["name", "Jugador"], ["date", "Fecha"], ["session_title", "Sesión"], ["position", "Posición"], ["injury", "Lesión / motivo"], ["objective", "Estado / objetivo"], ["stage", "Etapa RHB"], ...TABLE_METRICS.map((m) => [m.key, m.label]), ["profilePct", "% Perfil Competitivo"]
              ].map(([key, label]) => <th key={key} className="text-left px-3 py-3 whitespace-nowrap"><button onClick={() => key !== "photo" && changeSort(key)} className="inline-flex items-center gap-1 hover:text-white">{label}{key !== "photo" && <ArrowUpDown size={11} />}</button></th>)}</tr>
            </thead>
            <tbody>{tableRows.map((p) => <tr key={p.id} onClick={() => setSelectedPlayerId(p.player_id)} className={`border-t border-zinc-800/70 cursor-pointer ${selected?.id === p.player_id ? "bg-emerald-500/5" : "hover:bg-zinc-800/40"}`}>
              <td className="px-3 py-2"><PlayerPhoto player={p.player} className="w-9 h-9 rounded-full object-cover border border-zinc-700" fallbackClassName="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center" textClassName="text-xs font-bold text-zinc-400" /></td>
              <td className="px-3 py-2 text-white font-semibold whitespace-nowrap">{p.name}</td>
              <td className="px-3 py-2 text-zinc-300 whitespace-nowrap">{moment(p.date).format("DD/MM/YYYY")}</td>
              <td className="px-3 py-2 text-zinc-300 whitespace-nowrap">{p.session_title}</td>
              <td className="px-3 py-2 text-zinc-300 whitespace-nowrap">{p.position}</td>
              <td className="px-3 py-2 text-zinc-300 whitespace-nowrap">{p.injury}</td>
              <td className="px-3 py-2 text-zinc-300 whitespace-nowrap">{p.objective}</td>
              <td className="px-3 py-2"><button onClick={(e) => { e.stopPropagation(); openMedical(p.player_id); }} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border font-semibold whitespace-nowrap ${stageColor(p.stage)}`}>{p.stage}<ExternalLink size={11} /></button></td>
              {TABLE_METRICS.map((m) => <td key={m.key} className="px-3 py-2 text-zinc-300 whitespace-nowrap">{format(p[m.key], m.unit)}</td>)}
              <td className="px-3 py-2"><div className="flex items-center gap-2"><span className="text-white font-bold w-10">{p.profilePct != null ? `${p.profilePct}%` : "—"}</span><div className="h-1.5 w-16 bg-zinc-800 rounded-full"><div className={`h-1.5 rounded-full ${pctColor(p.profilePct || 0)}`} style={{ width: `${Math.min(100, p.profilePct || 0)}%` }} /></div></div></td>
            </tr>)}</tbody>
          </table>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div><h3 className="text-white font-bold">Evolución individual <span className="text-xs text-zinc-500 font-normal">(solo días con trabajo diferenciado)</span></h3></div>
          <button onClick={() => setShowAllMetrics((prev) => !prev)} className="self-start md:self-auto inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 hover:text-white"> <TrendingUp size={13} /> {showAllMetrics ? "Ocultar métricas" : "Ver todas las métricas"}</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1px_1fr] gap-5">
          <div className="space-y-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">Jugador</label>
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 flex items-center gap-3">
                <PlayerPhoto player={selected?.player} className="w-9 h-9 rounded-full object-cover border border-zinc-700" fallbackClassName="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center" textClassName="text-xs font-bold text-zinc-400" />
                <select value={selected?.id || ""} onChange={(e) => setSelectedPlayerId(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-white font-semibold outline-none">{allPlayerRows.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              </div>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 grid grid-cols-2 gap-3">
              <div><p className="text-[10px] uppercase text-zinc-500 font-bold">Días trabajo diferenciado</p><p className="text-2xl font-black text-white mt-2">{chartData.length}</p><p className="text-[11px] text-zinc-500">{daysSinceInjury ? `de ${daysSinceInjury} desde la lesión` : "días registrados"}</p></div>
              <div><p className="text-[10px] uppercase text-zinc-500 font-bold">% Perfil competitivo actual</p><p className="text-2xl font-black text-emerald-400 mt-2">{selected?.profilePct != null ? `${selected.profilePct}%` : "—"}</p><p className="text-[11px] text-zinc-500">última medición filtrada</p></div>
            </div>
          </div>
          <div className="hidden lg:block bg-zinc-800" />
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <label className="text-xs text-zinc-400">Métrica</label>
              <select value={selectedMetric} onChange={(e) => setSelectedMetric(e.target.value)} className="w-full max-w-xs bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white">{METRICS.map((m) => <option key={m.key} value={m.key}>{m.label} ({m.unit || "u"})</option>)}</select>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 24, right: 20, left: 0, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" stroke="#27272a" /><XAxis dataKey="label" interval={0} axisLine={false} tickLine={false} tick={({ x, y, payload, index }) => <g transform={`translate(${x},${y})`}><text textAnchor="middle" fill="#a1a1aa" fontSize="11"><tspan x="0" dy="12">{payload.value}</tspan><tspan x="0" dy="14">{chartData[index]?.date || ""}</tspan></text></g>} /><YAxis stroke="#71717a" fontSize={11} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 12, color: "#fff" }} formatter={(v) => format(v, selectedMetricConfig.unit)} /><Bar dataKey="value" name={selectedMetricConfig.label} fill="#10b981" radius={[8, 8, 0, 0]}><LabelList dataKey="value" position="top" fill="#fff" fontSize={11} formatter={(v) => format(v, selectedMetricConfig.unit)} /></Bar></BarChart></ResponsiveContainer>
            </div>
          </div>
        </div>
        {showAllMetrics && <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mt-4 pt-4 border-t border-zinc-800">{selectedMetricTotals.map((metric) => <button key={metric.key} onClick={() => setSelectedMetric(metric.key)} className={`text-left rounded-xl border p-3 ${selectedMetric === metric.key ? "bg-emerald-500/10 border-emerald-500/40" : "bg-zinc-950 border-zinc-800"}`}><p className="text-[10px] uppercase font-bold text-zinc-500">{metric.short}</p><p className="text-white font-black mt-1">{format(metric.value, metric.unit)}</p></button>)}</div>}
        <p className="text-xs text-zinc-500 mt-4">Solo se contabilizan los días con trabajo diferenciado.</p>
      </div>
    </div>
  );
}
import React, { useMemo, useState, useCallback } from "react";
import moment from "moment";
import * as XLSX from "xlsx";
import {
  Search, SlidersHorizontal, Download, FileText, TrendingUp, TrendingDown, Minus,
  ChevronUp, ChevronDown, ChevronsUpDown, Eye, Pencil,
  Users, Calendar, Activity, Percent,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import PlayerPhoto from "@/components/player/PlayerPhoto";
import PlayerEvolutionModal from "@/components/nutrition/PlayerEvolutionModal";
import NutritionAssessmentEditModal from "@/components/nutrition/NutritionAssessmentEditModal";
import NutritionPlayerPanel from "@/components/nutrition/NutritionPlayerPanel";
import { exportSkinfoldPdf } from "@/lib/reports/nutritionPdf";
import { useWorkspace } from "@/lib/WorkspaceContext";

function avg(rows, field) {
  const nums = rows.map((r) => Number(r[field])).filter(Number.isFinite);
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

function fmt(v, d = 1) {
  return v !== undefined && v !== null && v !== "" ? Number(v).toFixed(d) : "—";
}

function KpiCard({ icon: Icon, label, value, sub, accent = "blue" }) {
  const accents = {
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    orange: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    pink: "text-pink-400 bg-pink-500/10 border-pink-500/20",
    green: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  };
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${accents[accent]}`}>
        <Icon size={16} />
      </div>
      <p className="text-xl font-bold text-white mt-2">{value}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-emerald-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function SortIcon({ dir }) {
  if (dir === "asc") return <ChevronUp size={13} className="text-emerald-400" />;
  if (dir === "desc") return <ChevronDown size={13} className="text-emerald-400" />;
  return <ChevronsUpDown size={12} className="text-zinc-600" />;
}

function TrendIcon({ diff }) {
  if (diff == null) return <Minus size={13} className="text-zinc-600" />;
  if (diff > 0) return <TrendingUp size={13} className="text-red-400" />;
  if (diff < 0) return <TrendingDown size={13} className="text-emerald-400" />;
  return <Minus size={13} className="text-zinc-600" />;
}

const PAGE_SIZE = 20;

const POSITIONS = [
  "Arquero", "Defensor Central", "Lateral Derecho", "Lateral Izquierdo",
  "Mediocampista Central", "Volante Interno", "Extremo", "Delantero Centro",
];

export default function SkinfoldTab({ assessments, interpretations = [], referenceRanges = [], players, squads, onReload }) {
  const { can, activeSquad, activeSeasonId } = useWorkspace();
  const canEdit = can("edit");

  const [q, setQ] = useState("");
  const [squadFilter, setSquadFilter] = useState("all");
  const [seasonFilter, setSeasonFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("all");
  const [dateExact, setDateExact] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("fecha");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [evolutionPlayer, setEvolutionPlayer] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [editing, setEditing] = useState(null);
  const [exporting, setExporting] = useState(false);

  const playerMap = useMemo(
    () => Object.fromEntries(players.map((p) => [p.id, p])),
    [players]
  );
  const squadMap = useMemo(
    () => Object.fromEntries(squads.map((s) => [s.id, s])),
    [squads]
  );

  const playerName = (p) =>
    p?.full_name || `${p?.first_name || ""} ${p?.last_name || ""}`.trim();

  // Compute per-player sorted evaluations to get previous eval diff
  const playerEvalMap = useMemo(() => {
    const map = {};
    assessments.filter((a) => a.linked && a.player_id).forEach((a) => {
      if (!map[a.player_id]) map[a.player_id] = [];
      map[a.player_id].push(a);
    });
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""))
    );
    return map;
  }, [assessments]);

  const enriched = useMemo(() =>
    assessments.map((a) => {
      const arr = playerEvalMap[a.player_id] || [];
      const idx = arr.findIndex((e) => e.id === a.id);
      const prev = idx > 0 ? arr[idx - 1] : null;
      return {
        ...a,
        diff_sumatoria_6p:
          prev && a.sumatoria_6p != null && prev.sumatoria_6p != null
            ? Number(a.sumatoria_6p) - Number(prev.sumatoria_6p)
            : null,
        diff_peso:
          prev && a.peso != null && prev.peso != null
            ? Number(a.peso) - Number(prev.peso)
            : null,
        diff_grasa:
          prev && a.porcentaje_grasa != null && prev.porcentaje_grasa != null
            ? Number(a.porcentaje_grasa) - Number(prev.porcentaje_grasa)
            : null,
        diff_mm:
          prev && a.kg_masa_muscular != null && prev.kg_masa_muscular != null
            ? Number(a.kg_masa_muscular) - Number(prev.kg_masa_muscular)
            : null,
      };
    }),
    [assessments, playerEvalMap]
  );

  const seasons = useMemo(
    () => [...new Set(assessments.map((a) => a.season_id).filter(Boolean))].sort().reverse(),
    [assessments]
  );
  const evaluationTypes = useMemo(
    () => [...new Set(assessments.map((a) => a.tipo_medicion).filter(Boolean))].sort(),
    [assessments]
  );

  const filtered = useMemo(() => {
    let rows = enriched.filter((a) => a.linked && a.player_id);
    const p = playerMap;

    if (q) {
      const lq = q.toLowerCase();
      rows = rows.filter((a) => {
        const pData = p[a.player_id];
        const name = playerName(pData) || a.player_name_original || "";
        return name.toLowerCase().includes(lq);
      });
    }
    if (squadFilter !== "all") {
      rows = rows.filter((a) => a.squad_id === squadFilter || (playerMap[a.player_id]?.division === squadFilter));
    }
    if (seasonFilter !== "all") {
      rows = rows.filter((a) => a.season_id === seasonFilter);
    }
    if (positionFilter !== "all") {
      rows = rows.filter((a) => playerMap[a.player_id]?.position === positionFilter);
    }
    if (dateExact) rows = rows.filter((a) => a.fecha === dateExact);
    if (dateFrom) rows = rows.filter((a) => a.fecha >= dateFrom);
    if (dateTo) rows = rows.filter((a) => a.fecha <= dateTo);
    if (typeFilter !== "all") rows = rows.filter((a) => a.tipo_medicion === typeFilter);

    rows.sort((a, b) => {
      let va, vb;
      const pa = playerMap[a.player_id];
      const pb = playerMap[b.player_id];
      switch (sortBy) {
        case "jugador": va = playerName(pa) || a.player_name_original; vb = playerName(pb) || b.player_name_original; break;
        case "fecha": va = a.fecha || ""; vb = b.fecha || ""; break;
        case "peso": va = Number(a.peso || 0); vb = Number(b.peso || 0); break;
        case "sumatoria_6p": va = Number(a.sumatoria_6p || 0); vb = Number(b.sumatoria_6p || 0); break;
        case "porcentaje_grasa": va = Number(a.porcentaje_grasa || 0); vb = Number(b.porcentaje_grasa || 0); break;
        case "kg_masa_muscular": va = Number(a.kg_masa_muscular || 0); vb = Number(b.kg_masa_muscular || 0); break;
        case "diff": va = a.diff_sumatoria_6p ?? -Infinity; vb = b.diff_sumatoria_6p ?? -Infinity; break;
        case "posicion": va = pa?.position || ""; vb = pb?.position || ""; break;
        default: va = a.fecha || ""; vb = b.fecha || ""; break;
      }
      if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === "asc" ? va - vb : vb - va;
    });

    return rows;
  }, [enriched, q, squadFilter, seasonFilter, positionFilter, dateExact, dateFrom, dateTo, typeFilter, sortBy, sortDir, playerMap]);

  function toggleSort(col) {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortDir("asc"); }
    setPage(1);
  }

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // KPI data — use most recent eval per player
  const latestByPlayer = useMemo(() => {
    const map = new Map();
    enriched.filter((a) => a.linked && a.player_id).forEach((a) => {
      if (!map.has(a.player_id) || (a.fecha || "") > (map.get(a.player_id).fecha || ""))
        map.set(a.player_id, a);
    });
    return [...map.values()];
  }, [enriched]);

  const kpiRows = latestByPlayer;
  const evaluatedCount = kpiRows.length;
  const latestDate = kpiRows.map((a) => a.fecha).filter(Boolean).sort().pop();
  const avgSum6p = avg(kpiRows, "sumatoria_6p");
  const avgGrasa = avg(kpiRows, "porcentaje_grasa");

  // Excel export
  function handleExcelExport() {
    const headers = ["Jugador", "Posición", "Plantel", "Fecha", "Peso (kg)", "Talla", "Sum. 6P (mm)", "IMO", "% Grasa", "Kg grasa", "Masa Musc. (kg)", "Dif. 6P", "Observaciones"];
    const data = filtered.map((a) => {
      const p = playerMap[a.player_id];
      const pName = playerName(p) || a.player_name_original || "";
      const squad = squadMap[a.squad_id]?.name || p?.division || "";
      return [
        pName,
        p?.position || "—",
        squad,
        a.fecha || "",
        a.peso ?? "",
        a.talla ?? "",
        a.sumatoria_6p ?? "",
        a.imo ?? "",
        a.porcentaje_grasa ?? "",
        a.kg_grasa ?? "",
        a.kg_masa_muscular ?? "",
        a.diff_sumatoria_6p != null ? Number(a.diff_sumatoria_6p).toFixed(1) : "",
        a.observaciones || "",
      ];
    });
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    ws["!cols"] = [{ wch: 25 }, { wch: 22 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Seguimiento de Pliegues");
    XLSX.writeFile(wb, `nutricion-pliegues-${moment().format("YYYYMMDD-HHmm")}.xlsx`);
  }

  async function handlePdfExport() {
    setExporting(true);
    try {
      await exportSkinfoldPdf({
        rows: filtered,
        playerMap,
        squadName: activeSquad?.name || "",
        seasonLabel: activeSeasonId || activeSquad?.season || "",
        filters: { dateFrom, dateTo, position: positionFilter !== "all" ? positionFilter : "", search: q },
      });
    } finally {
      setExporting(false);
    }
  }

  // Get all assessments for a player (for evolution modal)
  function getPlayerAssessments(playerId) {
    return assessments.filter((a) => a.player_id === playerId && a.linked);
  }

  const Th = ({ col, label, className = "" }) => (
    <th
      className={`text-left p-3 text-[11px] font-semibold text-zinc-500 uppercase cursor-pointer select-none whitespace-nowrap hover:text-zinc-300 transition-colors ${className}`}
      onClick={() => toggleSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <SortIcon dir={sortBy === col ? sortDir : null} />
      </span>
    </th>
  );

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Users} label="Jugadores evaluados" value={evaluatedCount} accent="blue" />
        <KpiCard icon={Calendar} label="Última evaluación" value={latestDate ? moment(latestDate).format("DD/MM/YYYY") : "—"} accent="green" />
        <KpiCard icon={Activity} label="Prom. Sum. 6 Pliegues" value={avgSum6p != null ? `${fmt(avgSum6p)} mm` : "—"} accent="orange" />
        <KpiCard icon={Percent} label="Prom. % Grasa" value={avgGrasa != null ? `${fmt(avgGrasa)}%` : "—"} accent="pink" />
      </div>

      {/* Filters + Actions bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input
              placeholder="Buscar jugador..."
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              className="pl-9 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 text-sm h-9"
            />
          </div>

          {/* Squad filter */}
          <Select value={squadFilter} onValueChange={(v) => { setSquadFilter(v); setPage(1); }}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-300 text-sm h-9 w-full md:w-44">
              <SelectValue placeholder="Plantel" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="all" className="text-zinc-300">Todos los planteles</SelectItem>
              {squads.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-zinc-300">{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Season filter */}
          <Select value={seasonFilter} onValueChange={(v) => { setSeasonFilter(v); setPage(1); }}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-300 text-sm h-9 w-full md:w-36">
              <SelectValue placeholder="Temporada" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="all" className="text-zinc-300">Todas</SelectItem>
              {seasons.map((s) => (
                <SelectItem key={s} value={s} className="text-zinc-300">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={dateExact}
            onChange={(e) => { setDateExact(e.target.value); setPage(1); }}
            className="bg-zinc-800 border-zinc-700 text-white text-sm h-9 w-full md:w-40"
            title="Fecha exacta"
          />

          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 h-9 border rounded-lg text-xs font-medium transition-colors ${showFilters ? "bg-zinc-700 border-zinc-600 text-white" : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200"}`}
          >
            <SlidersHorizontal size={13} /> Filtros
          </button>

          <div className="flex gap-1.5">
            <button
              onClick={handleExcelExport}
              className="inline-flex items-center gap-1.5 px-3 h-9 bg-emerald-800/40 hover:bg-emerald-700/40 border border-emerald-700/50 text-emerald-300 text-xs rounded-lg font-medium transition-colors"
            >
              <Download size={13} /> Excel
            </button>
            <button
              onClick={handlePdfExport}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 px-3 h-9 bg-blue-900/40 hover:bg-blue-800/40 border border-blue-700/50 text-blue-300 text-xs rounded-lg font-medium transition-colors disabled:opacity-60"
            >
              <FileText size={13} /> {exporting ? "..." : "PDF"}
            </button>
          </div>
        </div>

        {/* Extended filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 pt-1 border-t border-zinc-800">
            {/* Position */}
            <Select value={positionFilter} onValueChange={(v) => { setPositionFilter(v); setPage(1); }}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-300 text-sm h-9">
                <SelectValue placeholder="Posición" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="all" className="text-zinc-300">Todas las posiciones</SelectItem>
                {POSITIONS.map((pos) => (
                  <SelectItem key={pos} value={pos} className="text-zinc-300">{pos}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-300 text-sm h-9">
                <SelectValue placeholder="Tipo de evaluación" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="all" className="text-zinc-300">Todos los tipos</SelectItem>
                {evaluationTypes.map((type) => <SelectItem key={type} value={type} className="text-zinc-300">{type}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Date from */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-500 whitespace-nowrap">Desde</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="bg-zinc-800 border-zinc-700 text-white text-sm h-9"
              />
            </div>

            {/* Date to */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-500 whitespace-nowrap">Hasta</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="bg-zinc-800 border-zinc-700 text-white text-sm h-9"
              />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[1250px]">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="w-12 p-3"></th>
                <Th col="jugador" label="Jugador" />
                <Th col="posicion" label="Posición" />
                <Th col="fecha" label="Fecha" />
                <Th col="peso" label="Peso" />
                <th className="p-3 text-[11px] font-semibold text-zinc-500 uppercase whitespace-nowrap">Talla</th>
                <Th col="sumatoria_6p" label="Sum. 6P" />
                <th className="p-3 text-[11px] font-semibold text-zinc-500 uppercase whitespace-nowrap">IMO</th>
                <Th col="porcentaje_grasa" label="% Grasa" />
                <th className="p-3 text-[11px] font-semibold text-zinc-500 uppercase whitespace-nowrap">Kg grasa</th>
                <Th col="kg_masa_muscular" label="Masa Musc." />
                <Th col="diff" label="Dif. Ant." />
                <th className="p-3 text-[11px] font-semibold text-zinc-500 uppercase">Tendencia</th>
                <th className="p-3 text-[11px] font-semibold text-zinc-500 uppercase text-left">Observaciones</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-zinc-600 text-sm">
                    No se encontraron evaluaciones con los filtros aplicados
                  </td>
                </tr>
              )}
              {pageRows.map((a) => {
                const p = playerMap[a.player_id];
                const name = playerName(p) || a.player_name_original || "";
                const d6p = a.diff_sumatoria_6p;
                return (
                  <tr key={a.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="p-3">
                      <PlayerPhoto
                        player={p || { full_name: name }}
                        photoUrl={p?.photo_url}
                        className="w-8 h-8 rounded-full object-cover"
                        fallbackClassName="w-8 h-8 rounded-full bg-zinc-800 text-zinc-500 text-[10px] flex items-center justify-center font-semibold"
                      />
                    </td>
                    <td className="p-3 text-zinc-200 font-medium whitespace-nowrap">
                      <button
                        className="hover:text-white underline-offset-2 hover:underline text-left"
                        onClick={() => setSelectedPlayerId(a.player_id) }
                      >
                        {name}
                      </button>
                    </td>
                    <td className="p-3 text-zinc-500 whitespace-nowrap">{p?.position || "—"}</td>
                    <td className="p-3 text-zinc-400 whitespace-nowrap">
                      {a.fecha ? moment(a.fecha).format("DD/MM/YYYY") : "—"}
                    </td>
                    <td className="p-3 text-center text-zinc-300">{a.peso != null ? `${fmt(a.peso)} kg` : "—"}</td>
                    <td className="p-3 text-center text-zinc-400">{a.talla != null ? fmt(a.talla) : "—"}</td>
                    <td className="p-3 text-center text-orange-400 font-semibold">{a.sumatoria_6p != null ? `${fmt(a.sumatoria_6p)} mm` : "—"}</td>
                    <td className="p-3 text-center text-emerald-400">{a.imo != null ? fmt(a.imo) : "—"}</td>
                    <td className="p-3 text-center text-pink-400">{a.porcentaje_grasa != null ? `${fmt(a.porcentaje_grasa)}%` : "—"}</td>
                    <td className="p-3 text-center text-amber-400">{a.kg_grasa != null ? `${fmt(a.kg_grasa)} kg` : "—"}</td>
                    <td className="p-3 text-center text-purple-400">{a.kg_masa_muscular != null ? `${fmt(a.kg_masa_muscular)} kg` : "—"}</td>
                    <td className="p-3 text-center">
                      {d6p != null ? (
                        <span className={`text-xs font-medium ${d6p > 0 ? "text-red-400" : d6p < 0 ? "text-emerald-400" : "text-zinc-500"}`}>
                          {d6p > 0 ? "+" : ""}{d6p.toFixed(1)}
                        </span>
                      ) : <span className="text-zinc-700">—</span>}
                    </td>
                    <td className="p-3 text-center">
                      <TrendIcon diff={d6p} />
                    </td>
                    <td className="p-3 text-zinc-600 max-w-[140px] truncate">{a.observaciones || ""}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedPlayerId(a.player_id) }
                          className="w-7 h-7 flex items-center justify-center rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                          title="Ver evolución"
                        >
                          <Eye size={12} />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => setEditing(a)}
                            className="w-7 h-7 flex items-center justify-center rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                            title="Editar"
                          >
                            <Pencil size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800 text-xs text-zinc-500">
          <span>
            {filtered.length === 0
              ? "Sin resultados"
              : `Mostrando ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} de ${filtered.length} evaluaciones`}
          </span>
          {totalPages > 1 && (
            <div className="flex gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-2.5 py-1 rounded border border-zinc-700 text-zinc-400 hover:bg-zinc-800 disabled:opacity-40"
              >
                Ant.
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const pg = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className={`px-2.5 py-1 rounded border ${pg === page ? "border-emerald-600 bg-emerald-900/30 text-emerald-400" : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"}`}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-2.5 py-1 rounded border border-zinc-700 text-zinc-400 hover:bg-zinc-800 disabled:opacity-40"
              >
                Sig.
              </button>
            </div>
          )}
        </div>
      </div>

      {selectedPlayerId && (
        <NutritionPlayerPanel
          player={playerMap[selectedPlayerId]}
          assessments={getPlayerAssessments(selectedPlayerId)}
          interpretations={interpretations.filter((r) => r.player_id === selectedPlayerId)}
          referenceRanges={referenceRanges}
        />
      )}

      {/* Player evolution modal */}
      {evolutionPlayer && (
        <PlayerEvolutionModal
          player={evolutionPlayer}
          assessments={getPlayerAssessments(evolutionPlayer.id)}
          squadName={activeSquad?.name}
          seasonLabel={activeSeasonId || activeSquad?.season}
          onClose={() => setEvolutionPlayer(null)}
        />
      )}

      {/* Edit assessment modal */}
      {editing && (
        <NutritionAssessmentEditModal
          assessment={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); onReload(); }}
        />
      )}
    </div>
  );
}
import React, { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  Search,
  FileText,
  FileSpreadsheet,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers,
  Users,
  Gauge,
  Zap,
  Wind,
} from "lucide-react";
import * as XLSX from "xlsx";
import moment from "moment";
import { avg, fmtInt, fmtSmax } from "../externalGpsLoadUtils";
import { isGoalkeeper } from "@/components/squad/squadConstants";

// ─── helpers ────────────────────────────────────────────────────────────────

function positionGroup(position, player) {
  if (isGoalkeeper(player || { position })) return "Arquero";
  const text = (position || "").toLowerCase();
  if (text.includes("central")) return "Central";
  if (text.includes("lateral")) return "Lateral";
  if (text.includes("volante") || text.includes("medio")) return "Volante";
  if (text.includes("extremo")) return "Extremo";
  if (text.includes("delantero") || text.includes("punta")) return "Delantero";
  return "";
}

function sessionEvent(session) {
  const text =
    `${session.session_type || ""} ${session.title || ""} ${session.match_day_code || ""}`.toLowerCase();
  return text.includes("partido") || session.match_day_code === "MD"
    ? "Partido"
    : "Entrenamiento";
}

const mdBadgeClass = (md) => {
  if (md === "MD") return "bg-red-500/20 text-red-300 border-red-500/30";
  if (md === "MD+1" || md === "MD+2") return "bg-orange-500/20 text-orange-300 border-orange-500/30";
  if (md === "MD-1") return "bg-amber-500/20 text-amber-300 border-amber-500/30";
  return "bg-zinc-800 text-zinc-300 border-zinc-700";
};

// ─── column definitions ──────────────────────────────────────────────────────

const SESSION_COLS = [
  { key: "date", label: "Fecha", sortable: true, align: "left" },
  { key: "match_day_code", label: "MD", sortable: true, align: "center" },
  { key: "title", label: "Nombre", sortable: true, align: "left" },
  { key: "type", label: "Tipo", sortable: true, align: "center" },
  { key: "objective", label: "Objetivo", sortable: false, align: "left" },
  { key: "duration", label: "Min.", sortable: true, align: "center" },
  { key: "playerCount", label: "Jugadores", sortable: true, align: "center" },
  { key: "avgDistance", label: "Dist.Prom (m)", sortable: true, align: "right" },
  { key: "avgD198", label: "D>19.8", sortable: true, align: "right" },
  { key: "avgD25", label: "D>25", sortable: true, align: "right" },
  { key: "avgSprints", label: "Sprints", sortable: true, align: "right" },
  { key: "avgAcc", label: "ACC", sortable: true, align: "right" },
  { key: "avgDec", label: "DEC", sortable: true, align: "right" },
  { key: "avgPlayerLoad", label: "P.Load", sortable: true, align: "right" },
  { key: "maxSmax", label: "S.Máx", sortable: true, align: "right" },
];

const NUMERIC_METRIC_KEYS = [
  "avgDistance",
  "avgD198",
  "avgD25",
  "avgSprints",
  "avgAcc",
  "avgDec",
  "avgPlayerLoad",
  "maxSmax",
];

const PAGE_SIZES = [10, 25, 50];

// ─── KPI mini card ───────────────────────────────────────────────────────────

function KpiMini({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color.bg} shrink-0`}>
        <Icon size={14} className={color.text} />
      </div>
      <div className="min-w-0">
        <p className={`text-base font-bold leading-tight ${color.text}`}>{value}</p>
        <p className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5 truncate">{label}</p>
      </div>
    </div>
  );
}

// ─── per-player sub-table (shown when a row is expanded) ─────────────────────

function PlayerSubTable({ rows }) {
  const maxByCol = useMemo(() => {
    const keys = [
      "total_distance",
      "distance_19_8",
      "distance_25",
      "sprints",
      "acc_3",
      "dec_3",
      "player_load",
      "smax",
    ];
    const map = {};
    const included = rows.filter((r) => r.include_in_session_average !== false);
    keys.forEach((key) => {
      const vals = included.map((r) => r[key]).filter((v) => v != null && !isNaN(v));
      map[key] = vals.length ? Math.max(...vals) : null;
    });
    return map;
  }, [rows]);

  if (!rows.length)
    return <p className="text-xs text-zinc-600 py-2">Sin datos GPS</p>;

  const included = rows.filter((r) => r.include_in_session_average !== false);
  const excluded = rows.filter((r) => r.include_in_session_average === false);

  const metricCols = [
    { key: "total_distance", label: "Dist.(m)", fmt: fmtInt },
    { key: "distance_19_8", label: "D>19.8", fmt: fmtInt },
    { key: "distance_25", label: "D>25", fmt: fmtInt },
    { key: "sprints", label: "Sprints", fmt: fmtInt },
    { key: "acc_3", label: "ACC", fmt: fmtInt },
    { key: "dec_3", label: "DEC", fmt: fmtInt },
    { key: "player_load", label: "P.Load", fmt: fmtInt },
    { key: "smax", label: "S.Máx", fmt: fmtSmax },
  ];

  function PlayerRow({ r }) {
    const isExcluded = r.include_in_session_average === false;
    return (
      <tr
        className={`border-t border-zinc-800/40 ${
          isExcluded ? "opacity-50" : "hover:bg-zinc-800/20"
        }`}
      >
        <td className="px-3 py-1.5 text-white font-medium whitespace-nowrap">
          {r.player_name || "—"}
        </td>
        <td className="px-2 py-1.5 text-zinc-400 whitespace-nowrap">
          {r.position || "—"}
        </td>
        {metricCols.map(({ key, fmt }) => {
          const val = r[key];
          const isMax =
            !isExcluded &&
            maxByCol[key] != null &&
            val != null &&
            val === maxByCol[key];
          return (
            <td
              key={key}
              className={`px-2 py-1.5 text-right whitespace-nowrap ${
                isMax ? "text-emerald-400 font-bold" : "text-zinc-300"
              }`}
            >
              {fmt(val)}
            </td>
          );
        })}
        <td className="px-2 py-1.5 text-center">
          {isExcluded ? (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
              Excluido
            </span>
          ) : (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Incluido
            </span>
          )}
        </td>
      </tr>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-[10px] text-zinc-500 uppercase bg-zinc-900/80">
            <th className="text-left px-3 py-2 font-semibold">Jugador</th>
            <th className="text-left px-2 py-2 font-semibold">Pos.</th>
            {metricCols.map((c) => (
              <th key={c.key} className="text-right px-2 py-2 font-semibold whitespace-nowrap">
                {c.label}
              </th>
            ))}
            <th className="text-center px-2 py-2 font-semibold">Estado</th>
          </tr>
        </thead>
        <tbody>
          {[...included, ...excluded].map((r, i) => (
            <PlayerRow key={r.player_id || i} r={r} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── sort icon ───────────────────────────────────────────────────────────────

function SortIcon({ colKey, sortKey, sortDir }) {
  if (sortKey !== colKey)
    return <ArrowUpDown size={11} className="text-zinc-600 ml-1 shrink-0" />;
  return sortDir === "asc" ? (
    <ArrowUp size={11} className="text-emerald-400 ml-1 shrink-0" />
  ) : (
    <ArrowDown size={11} className="text-emerald-400 ml-1 shrink-0" />
  );
}

// ─── main component ──────────────────────────────────────────────────────────

/**
 * GpsSessionsAdvancedTable
 *
 * Props:
 *  - sessions: filteredAnalyticsSessions (already enriched with playerCount & durationForFilter)
 *  - gpsBySession: allGpsBySession map { sessionId -> rows[] }
 *  - playerMap: { playerId -> player }
 *  - sessionFilters: the current filter state (used to filter GPS rows by player/position)
 *  - loading: boolean
 */
export default function GpsSessionsAdvancedTable({
  sessions,
  gpsBySession,
  playerMap,
  sessionFilters,
  loading,
}) {
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ── compute per-session row data ──────────────────────────────────────────
  const tableData = useMemo(() => {
    const selectedPlayers = sessionFilters?.playerIds || [];
    const positionFilter = sessionFilters?.position;

    return sessions.map((session) => {
      const allRows = gpsBySession[session.id] || [];

      // Enrich rows with player info
      const enriched = allRows.map((r) => {
        const player = playerMap[r.player_id];
        return {
          ...r,
          position: player?.position || r.position || "",
          player_name: r.player_name || player?.full_name || "",
        };
      });

      // Rows included in session average, filtered by active player/position filters
      const includedRows = enriched
        .filter((r) => r.include_in_session_average !== false)
        .filter(
          (r) =>
            selectedPlayers.length === 0 || selectedPlayers.includes(r.player_id)
        )
        .filter(
          (r) =>
            !positionFilter ||
            positionFilter === "Todos" ||
            positionGroup(r.position, playerMap[r.player_id]) === positionFilter
        );

      const smaxVals = includedRows
        .map((r) => r.smax)
        .filter((v) => v != null && !isNaN(v) && v > 0);

      return {
        id: session.id,
        date: session.date,
        match_day_code: session.match_day_code || "",
        title: session.title || "",
        type: sessionEvent(session),
        objective: session.session_objective || "",
        duration: session.durationForFilter || 0,
        playerCount: session.playerCount || 0,
        avgDistance: avg(includedRows.map((r) => r.total_distance)),
        avgD198: avg(includedRows.map((r) => r.distance_19_8)),
        avgD25: avg(includedRows.map((r) => r.distance_25)),
        avgSprints: avg(includedRows.map((r) => r.sprints)),
        avgAcc: avg(includedRows.map((r) => r.acc_3)),
        avgDec: avg(includedRows.map((r) => r.dec_3)),
        avgPlayerLoad: avg(includedRows.map((r) => r.player_load)),
        maxSmax: smaxVals.length ? Math.max(...smaxVals) : null,
        // full enriched rows for expandable detail
        playerRows: enriched,
      };
    });
  }, [sessions, gpsBySession, playerMap, sessionFilters]);

  // ── max value per numeric column (for highlighting) ───────────────────────
  const maxByCol = useMemo(() => {
    const map = {};
    NUMERIC_METRIC_KEYS.forEach((key) => {
      const vals = tableData
        .map((r) => r[key])
        .filter((v) => v != null && !isNaN(v));
      map[key] = vals.length ? Math.max(...vals) : null;
    });
    return map;
  }, [tableData]);

  // ── KPI summary ───────────────────────────────────────────────────────────
  const kpis = useMemo(
    () => ({
      sessions: tableData.length,
      avgPlayers: avg(tableData.map((r) => r.playerCount)),
      avgDistance: avg(
        tableData.filter((r) => r.avgDistance != null).map((r) => r.avgDistance)
      ),
      avgSprints: avg(
        tableData.filter((r) => r.avgSprints != null).map((r) => r.avgSprints)
      ),
      avgPlayerLoad: avg(
        tableData
          .filter((r) => r.avgPlayerLoad != null)
          .map((r) => r.avgPlayerLoad)
      ),
    }),
    [tableData]
  );

  // ── filter by inline search ───────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return tableData;
    return tableData.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.match_day_code.toLowerCase().includes(q) ||
        r.objective.toLowerCase().includes(q) ||
        r.playerRows.some((p) =>
          (p.player_name || "").toLowerCase().includes(q)
        )
    );
  }, [tableData, search]);

  // ── sort ──────────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp =
        typeof av === "string" ? av.localeCompare(bv) : av - bv;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  // ── pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(1);
  }

  function handleSearch(e) {
    setSearch(e.target.value);
    setPage(1);
  }

  function handlePageSize(e) {
    setPageSize(Number(e.target.value));
    setPage(1);
  }

  // ── export helpers ────────────────────────────────────────────────────────
  const csvHeaders = [
    "Fecha",
    "MD",
    "Nombre",
    "Tipo",
    "Objetivo",
    "Minutos",
    "Jugadores",
    "Dist.Prom(m)",
    "D>19.8",
    "D>25",
    "Sprints",
    "ACC",
    "DEC",
    "P.Load",
    "S.Máx",
  ];

  function buildExportRows() {
    return sorted.map((r) => [
      r.date ? moment(r.date).format("DD/MM/YYYY") : "",
      r.match_day_code,
      r.title,
      r.type,
      r.objective,
      r.duration || "",
      r.playerCount,
      r.avgDistance != null ? Math.round(r.avgDistance) : "",
      r.avgD198 != null ? Math.round(r.avgD198) : "",
      r.avgD25 != null ? Math.round(r.avgD25) : "",
      r.avgSprints != null ? Math.round(r.avgSprints) : "",
      r.avgAcc != null ? Math.round(r.avgAcc) : "",
      r.avgDec != null ? Math.round(r.avgDec) : "",
      r.avgPlayerLoad != null ? Math.round(r.avgPlayerLoad) : "",
      r.maxSmax != null ? Number(r.maxSmax.toFixed(1)) : "",
    ]);
  }

  function exportCSV() {
    const rows = buildExportRows();
    const csv = [csvHeaders, ...rows]
      .map((row) => row.map((v) => `"${v ?? ""}"`).join(","))
      .join("\n");
    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sesiones_gps_${moment().format("YYYYMMDD")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportExcel() {
    const rows = buildExportRows();
    const ws = XLSX.utils.aoa_to_sheet([csvHeaders, ...rows]);
    // Column widths
    ws["!cols"] = [
      { wch: 12 }, { wch: 8 }, { wch: 30 }, { wch: 14 }, { wch: 22 },
      { wch: 8 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 10 },
      { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 10 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sesiones GPS");
    XLSX.writeFile(wb, `sesiones_gps_${moment().format("YYYYMMDD")}.xlsx`);
  }

  // ── skeleton loading ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-3">
          <div className="h-8 bg-zinc-800/60 rounded-xl animate-pulse w-64" />
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-10 bg-zinc-800/40 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <KpiMini
          icon={Layers}
          label="Sesiones"
          value={kpis.sessions}
          color={{ bg: "bg-blue-500/15", text: "text-blue-400" }}
        />
        <KpiMini
          icon={Users}
          label="Jugadores prom."
          value={fmtInt(kpis.avgPlayers)}
          color={{ bg: "bg-violet-500/15", text: "text-violet-400" }}
        />
        <KpiMini
          icon={Gauge}
          label="Dist. prom."
          value={`${fmtInt(kpis.avgDistance)} m`}
          color={{ bg: "bg-amber-500/15", text: "text-amber-400" }}
        />
        <KpiMini
          icon={Wind}
          label="Sprints prom."
          value={fmtInt(kpis.avgSprints)}
          color={{ bg: "bg-cyan-500/15", text: "text-cyan-400" }}
        />
        <KpiMini
          icon={Zap}
          label="P.Load prom."
          value={fmtInt(kpis.avgPlayerLoad)}
          color={{ bg: "bg-pink-500/15", text: "text-pink-400" }}
        />
      </div>

      {/* Table card */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
        {/* Controls bar */}
        <div className="px-4 py-3 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <input
                value={search}
                onChange={handleSearch}
                placeholder="Buscar sesión o jugador..."
                className="bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/60 w-52"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span>Filas:</span>
              <select
                value={pageSize}
                onChange={handlePageSize}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">
              {sorted.length} sesión{sorted.length !== 1 ? "es" : ""}
            </span>
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
              title="Exportar CSV"
            >
              <FileText size={13} /> CSV
            </button>
            <button
              onClick={exportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
              title="Exportar Excel"
            >
              <FileSpreadsheet size={13} /> Excel
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] text-zinc-500 uppercase bg-zinc-900/80">
                {/* expand toggle column */}
                <th className="w-8 px-2" />
                {SESSION_COLS.map((col) => (
                  <th
                    key={col.key}
                    className={`px-3 py-2.5 font-semibold whitespace-nowrap
                      ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"}
                      ${col.sortable ? "cursor-pointer hover:text-zinc-300 select-none" : ""}`}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <span className="inline-flex items-center gap-0.5">
                      {col.label}
                      {col.sortable && (
                        <SortIcon
                          colKey={col.key}
                          sortKey={sortKey}
                          sortDir={sortDir}
                        />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {paginated.length === 0 && (
                <tr>
                  <td
                    colSpan={SESSION_COLS.length + 1}
                    className="text-center text-zinc-600 py-12 text-sm"
                  >
                    Sin sesiones GPS para los filtros seleccionados
                  </td>
                </tr>
              )}

              {paginated.map((row) => {
                const isExpanded = expandedId === row.id;
                return (
                  <React.Fragment key={row.id}>
                    <tr
                      className={`border-t border-zinc-800/70 hover:bg-zinc-800/30 cursor-pointer transition-colors ${
                        isExpanded ? "bg-zinc-800/40" : ""
                      }`}
                      onClick={() =>
                        setExpandedId(isExpanded ? null : row.id)
                      }
                    >
                      {/* expand icon */}
                      <td className="px-2 py-2.5 text-zinc-500 w-8">
                        {isExpanded ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                      </td>

                      {/* Fecha */}
                      <td className="px-3 py-2.5 text-zinc-300 whitespace-nowrap">
                        {row.date
                          ? moment(row.date).format("DD/MM/YY")
                          : "—"}
                      </td>

                      {/* MD */}
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        {row.match_day_code ? (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${mdBadgeClass(
                              row.match_day_code
                            )}`}
                          >
                            {row.match_day_code}
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>

                      {/* Nombre */}
                      <td
                        className="px-3 py-2.5 text-white font-medium max-w-[180px] truncate"
                        title={row.title}
                      >
                        {row.title || "—"}
                      </td>

                      {/* Tipo */}
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full border ${
                            row.type === "Partido"
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                              : "bg-blue-500/20 text-blue-300 border-blue-500/30"
                          }`}
                        >
                          {row.type}
                        </span>
                      </td>

                      {/* Objetivo */}
                      <td
                        className="px-3 py-2.5 text-zinc-400 max-w-[130px] truncate"
                        title={row.objective}
                      >
                        {row.objective || "—"}
                      </td>

                      {/* Min. */}
                      <td className="px-3 py-2.5 text-center text-zinc-300">
                        {row.duration || "—"}
                      </td>

                      {/* Jugadores */}
                      <td className="px-3 py-2.5 text-center text-zinc-300">
                        {row.playerCount || "—"}
                      </td>

                      {/* Numeric metric cells */}
                      {[
                        { key: "avgDistance", val: row.avgDistance, fmt: fmtInt },
                        { key: "avgD198", val: row.avgD198, fmt: fmtInt },
                        { key: "avgD25", val: row.avgD25, fmt: fmtInt },
                        { key: "avgSprints", val: row.avgSprints, fmt: fmtInt },
                        { key: "avgAcc", val: row.avgAcc, fmt: fmtInt },
                        { key: "avgDec", val: row.avgDec, fmt: fmtInt },
                        {
                          key: "avgPlayerLoad",
                          val: row.avgPlayerLoad,
                          fmt: fmtInt,
                        },
                        { key: "maxSmax", val: row.maxSmax, fmt: fmtSmax },
                      ].map(({ key, val, fmt }) => {
                        const isMax =
                          maxByCol[key] != null &&
                          val != null &&
                          Math.abs(val - maxByCol[key]) < 0.05;
                        return (
                          <td
                            key={key}
                            className={`px-3 py-2.5 text-right whitespace-nowrap ${
                              isMax
                                ? "text-emerald-400 font-bold"
                                : "text-zinc-300"
                            }`}
                          >
                            {fmt(val)}
                          </td>
                        );
                      })}
                    </tr>

                    {/* Expandable player detail */}
                    {isExpanded && (
                      <tr className="border-t border-zinc-800/30">
                        <td
                          colSpan={SESSION_COLS.length + 1}
                          className="px-4 py-3 bg-zinc-900/50"
                        >
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-2">
                            Jugadores — {row.title}
                          </p>
                          <PlayerSubTable rows={row.playerRows} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs text-zinc-500">
            {sorted.length === 0
              ? "0 resultados"
              : `${(page - 1) * pageSize + 1}–${Math.min(
                  page * pageSize,
                  sorted.length
                )} de ${sorted.length}`}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2 py-1 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← Anterior
            </button>
            {(() => {
              const pages = [];
              let start = Math.max(1, page - 2);
              const end = Math.min(totalPages, start + 4);
              start = Math.max(1, end - 4);
              for (let p = start; p <= end; p++) pages.push(p);
              return pages.map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded-lg text-xs transition-colors ${
                    page === p
                      ? "bg-emerald-600 text-white"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  {p}
                </button>
              ));
            })()}
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-2 py-1 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

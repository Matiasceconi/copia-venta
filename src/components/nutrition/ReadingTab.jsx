import React, { useMemo, useState } from "react";
import moment from "moment";
import * as XLSX from "xlsx";
import {
  Search, Download, FileText, Pencil, Eye,
  CheckCircle2, AlertTriangle, Activity, ChevronUp, ChevronDown, ChevronsUpDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import PlayerPhoto from "@/components/player/PlayerPhoto";
import ReadingStatusBadge from "@/components/nutrition/ReadingStatusBadge";
import NutritionReadingEditModal from "@/components/nutrition/NutritionReadingEditModal";
import NutritionAssessmentEditModal from "@/components/nutrition/NutritionAssessmentEditModal";
import { exportReadingPdf } from "@/lib/reports/nutritionPdf";
import { useWorkspace } from "@/lib/WorkspaceContext";

const PAGE_SIZE = 20;

function KpiCard({ icon: Icon, label, value, sub, accent = "blue" }) {
  const accents = {
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    green: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    yellow: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    red: "text-red-400 bg-red-500/10 border-red-500/20",
    orange: "text-orange-400 bg-orange-500/10 border-orange-500/20",
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

export default function ReadingTab({ interpretations, assessments = [], players, readingStatuses, squads, onReload }) {
  const { can, activeSquad, activeSeasonId } = useWorkspace();
  const canEdit = can("edit");

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [squadFilter, setSquadFilter] = useState("all");
  const [sortBy, setSortBy] = useState("fecha");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [assessmentDetail, setAssessmentDetail] = useState(null);
  const [exporting, setExporting] = useState(false);

  const playerMap = useMemo(
    () => Object.fromEntries(players.map((p) => [p.id, p])),
    [players]
  );
  const statusMap = useMemo(
    () => Object.fromEntries((readingStatuses || []).map((s) => [s.id, s])),
    [readingStatuses]
  );
  const squadMap = useMemo(
    () => Object.fromEntries(squads.map((s) => [s.id, s])),
    [squads]
  );
  const assessmentMap = useMemo(() => {
    const map = {};
    assessments.forEach((assessment) => {
      if (assessment.id) map[assessment.id] = assessment;
      if (assessment.nutrition_assessment_key) map[assessment.nutrition_assessment_key] = assessment;
    });
    return map;
  }, [assessments]);

  const playerName = (p) =>
    p?.full_name || `${p?.first_name || ""} ${p?.last_name || ""}`.trim();

  // KPI calculations
  const linked = useMemo(
    () => interpretations.filter((r) => r.linked && r.player_id),
    [interpretations]
  );

  const kpiCounts = useMemo(() => {
    const counts = { optimal: 0, observe: 0, improve: 0 };
    linked.forEach((r) => {
      const status = statusMap[r.reading_status_id];
      if (!status) return;
      const n = status.name?.toLowerCase() || "";
      if (n.includes("ptimo") || n.includes("decuado")) counts.optimal++;
      else if (n.includes("bservar") || n.includes("seguimiento")) counts.observe++;
      else if (n.includes("mejorar") || n.includes("prioritario")) counts.improve++;
    });
    return counts;
  }, [linked, statusMap]);

  const filtered = useMemo(() => {
    let rows = linked;

    if (q) {
      const lq = q.toLowerCase();
      rows = rows.filter((r) => {
        const p = playerMap[r.player_id];
        const name = playerName(p) || r.player_name_original || "";
        return name.toLowerCase().includes(lq);
      });
    }
    if (statusFilter !== "all") {
      rows = rows.filter((r) => r.reading_status_id === statusFilter);
    }
    if (squadFilter !== "all") {
      rows = rows.filter((r) => r.squad_id === squadFilter);
    }

    rows.sort((a, b) => {
      let va, vb;
      const pa = playerMap[a.player_id];
      const pb = playerMap[b.player_id];
      switch (sortBy) {
        case "jugador": va = playerName(pa) || a.player_name_original; vb = playerName(pb) || b.player_name_original; break;
        case "fecha": va = a.fecha || ""; vb = b.fecha || ""; break;
        case "lectura": va = statusMap[a.reading_status_id]?.name || ""; vb = statusMap[b.reading_status_id]?.name || ""; break;
        case "nextControl": va = a.next_control_date || ""; vb = b.next_control_date || ""; break;
        default: va = a.fecha || ""; vb = b.fecha || ""; break;
      }
      if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === "asc" ? va - vb : vb - va;
    });

    return rows;
  }, [linked, q, statusFilter, squadFilter, sortBy, sortDir, playerMap, statusMap]);

  function toggleSort(col) {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortDir("asc"); }
    setPage(1);
  }

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleExcelExport() {
    const headers = ["Jugador", "Fecha", "Lectura", "Observación", "Responsable", "Próximo Control", "Sum. 6P", "% Grasa"];
    const data = filtered.map((r) => {
      const p = playerMap[r.player_id];
      const status = statusMap[r.reading_status_id];
      return [
        playerName(p) || r.player_name_original || "",
        r.fecha || "",
        status?.name || r.interpretation_note || "",
        r.observation || r.interpretation_note || "",
        r.responsible_user_id || "",
        r.next_control_date || "",
        r.sumatoria_6p ?? "",
        "",
      ];
    });
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    ws["!cols"] = [{ wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 35 }, { wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Informe de Lectura");
    XLSX.writeFile(wb, `nutricion-lectura-${moment().format("YYYYMMDD-HHmm")}.xlsx`);
  }

  async function handlePdfExport() {
    setExporting(true);
    try {
      await exportReadingPdf({
        rows: filtered,
        playerMap,
        readingStatusMap: statusMap,
        squadName: activeSquad?.name || "",
        seasonLabel: activeSeasonId || activeSquad?.season || "",
      });
    } finally {
      setExporting(false);
    }
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
        <KpiCard icon={Activity} label="Total lecturas" value={linked.length} accent="blue" />
        <KpiCard icon={CheckCircle2} label="Óptimo / Adecuado" value={kpiCounts.optimal} accent="green" />
        <KpiCard icon={AlertTriangle} label="A observar / Seguimiento" value={kpiCounts.observe} accent="yellow" />
        <KpiCard icon={AlertTriangle} label="A mejorar / Prioritarios" value={kpiCounts.improve} accent="red" />
      </div>

      {/* Filters + actions */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input
              placeholder="Buscar jugador..."
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              className="pl-9 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 text-sm h-9"
            />
          </div>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-300 text-sm h-9 w-full md:w-48">
              <SelectValue placeholder="Lectura" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="all" className="text-zinc-300">Todas las lecturas</SelectItem>
              {(readingStatuses || []).filter((s) => s.active !== false).map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-zinc-300">{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

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
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[800px]">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="w-12 p-3"></th>
                <Th col="jugador" label="Jugador" />
                <Th col="fecha" label="Fecha" />
                <Th col="lectura" label="Lectura" />
                <th className="text-left p-3 text-[11px] font-semibold text-zinc-500 uppercase">Observación</th>
                <th className="text-left p-3 text-[11px] font-semibold text-zinc-500 uppercase">Responsable</th>
                <Th col="nextControl" label="Próx. Control" />
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-600 text-sm">
                    No se encontraron lecturas con los filtros aplicados
                  </td>
                </tr>
              )}
              {pageRows.map((r) => {
                const p = playerMap[r.player_id];
                const name = playerName(p) || r.player_name_original || "";
                return (
                  <tr key={r.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="p-3">
                      <PlayerPhoto
                        player={p || { full_name: name }}
                        photoUrl={p?.photo_url}
                        className="w-8 h-8 rounded-full object-cover"
                        fallbackClassName="w-8 h-8 rounded-full bg-zinc-800 text-zinc-500 text-[10px] flex items-center justify-center font-semibold"
                      />
                    </td>
                    <td className="p-3 text-zinc-200 font-medium whitespace-nowrap">{name}</td>
                    <td className="p-3 text-zinc-400 whitespace-nowrap">
                      {r.fecha ? moment(r.fecha).format("DD/MM/YYYY") : "—"}
                    </td>
                    <td className="p-3">
                      <ReadingStatusBadge statusId={r.reading_status_id} statusMap={statusMap} />
                    </td>
                    <td className="p-3 text-zinc-500 max-w-[180px]">
                      <p className="truncate">{r.observation || r.interpretation_note || "—"}</p>
                    </td>
                    <td className="p-3 text-zinc-500 whitespace-nowrap">{r.responsible_user_id || "—"}</td>
                    <td className="p-3 text-zinc-400 whitespace-nowrap">
                      {r.next_control_date ? moment(r.next_control_date).format("DD/MM/YYYY") : "—"}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                      {(assessmentMap[r.nutrition_assessment_id] || assessmentMap[r.nutrition_assessment_key]) && (
                        <button
                          onClick={() => setAssessmentDetail(assessmentMap[r.nutrition_assessment_id] || assessmentMap[r.nutrition_assessment_key])}
                          className="w-7 h-7 flex items-center justify-center rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                          title="Ver evaluación vinculada"
                        >
                          <Eye size={12} />
                        </button>
                      )}
                      {canEdit && (
                        <button
                          onClick={() => setEditing(r)}
                          className="w-7 h-7 flex items-center justify-center rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                          title="Editar lectura"
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
              : `Mostrando ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} de ${filtered.length} lecturas`}
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

      {/* Status catalog help */}
      {readingStatuses && readingStatuses.length > 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3">
          <p className="text-[11px] text-zinc-500 mb-2 font-medium uppercase">Estados configurados</p>
          <div className="flex flex-wrap gap-2">
            {readingStatuses.filter((s) => s.active !== false).map((s) => (
              <ReadingStatusBadge key={s.id} name={s.name} color={s.color} small />
            ))}
          </div>
        </div>
      )}

      {assessmentDetail && (
        <NutritionAssessmentEditModal
          assessment={assessmentDetail}
          onClose={() => setAssessmentDetail(null)}
          onSaved={() => { setAssessmentDetail(null); onReload(); }}
        />
      )}

      {/* Edit reading modal */}
      {editing && (
        <NutritionReadingEditModal
          reading={editing}
          readingStatuses={readingStatuses}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); onReload(); }}
        />
      )}
    </div>
  );
}
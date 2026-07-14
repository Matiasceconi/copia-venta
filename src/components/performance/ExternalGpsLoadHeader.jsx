import React from "react";
import moment from "moment";
import "moment/locale/es";
import { ChevronLeft, ChevronRight, Download, RefreshCw, CalendarDays, Calculator, FileUp } from "lucide-react";

moment.locale("es");

export default function ExternalGpsLoadHeader({ activeSquad, weekStart, weekEnd, onPrevWeek, onNextWeek, onThisWeek, onExport, onRefresh, refreshing, onRecalculate, recalculating, onImportHistorical }) {
  const isCurrentWeek = moment().isBetween(weekStart, weekEnd, "day", "[]");
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CalendarDays size={18} className="text-amber-400" />
            Carga Externa GPS
          </h2>
          <p className="text-zinc-500 text-sm mt-0.5">
            {activeSquad ? activeSquad.name : "Todos los planteles"} · Semana {weekStart.format("DD/MM")} - {weekEnd.format("DD/MM/YYYY")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onExport} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors">
            <Download size={14} /> Exportar reporte
          </button>
          <button onClick={onRefresh} disabled={refreshing} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors">
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Actualizar
          </button>
          <button onClick={onRecalculate} disabled={recalculating} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-amber-300 text-sm font-medium transition-colors disabled:opacity-50">
            <Calculator size={14} className={recalculating ? "animate-spin" : ""} /> Recalcular promedios GPS
          </button>
          <button onClick={onImportHistorical} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-300 text-sm font-medium transition-colors">
            <FileUp size={14} /> Importar historial GPS desde Excel
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onPrevWeek} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"><ChevronLeft size={15} /></button>
        <button onClick={onThisWeek} disabled={isCurrentWeek}
          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors disabled:opacity-40">
          Semana actual
        </button>
        <button onClick={onNextWeek} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"><ChevronRight size={15} /></button>
      </div>
    </div>
  );
}
import React from "react";
import { ChevronLeft, ChevronRight, Save, Copy, CheckSquare, Download, MessageSquare, Shield } from "lucide-react";
import moment from "moment";
import "moment/locale/es";
moment.locale("es");

export default function DailySquadHeader({
  selectedDate, setSelectedDate, hasPending, saving,
  onSave, onCopyYesterday, onMarkAllAvailable, onExport, onWhatsApp,
  squads = [], selectedSquadId, onSquadChange,
}) {
  function changeDay(delta) {
    setSelectedDate(moment(selectedDate).add(delta, "day").format("YYYY-MM-DD"));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Estado del Plantel</h1>
          <p className="text-zinc-500 text-sm mt-1">Gestión diaria del estado de los jugadores</p>
        </div>

        {/* Squad selector */}
        {squads.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Shield size={15} className="text-zinc-500 shrink-0" />
            <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded-xl p-1 gap-1 flex-wrap">
              <button
                onClick={() => onSquadChange("")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  !selectedSquadId ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"
                }`}>
                Todos
              </button>
              {squads.map(sq => (
                <button key={sq.id}
                  onClick={() => onSquadChange(sq.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedSquadId === sq.id ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"
                  }`}>
                  {sq.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Date selector */}
        <div className="flex items-center gap-2">
          <button onClick={() => changeDay(-1)} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white transition-colors">
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2">
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-transparent text-white text-sm font-semibold focus:outline-none"
            />
          </div>
          <button onClick={() => changeDay(1)} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white transition-colors">
            <ChevronRight size={16} />
          </button>
          <button onClick={() => setSelectedDate(moment().format("YYYY-MM-DD"))}
            className="px-3 py-2 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors font-medium">
            Hoy
          </button>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap gap-2">
        <button onClick={onSave} disabled={!hasPending || saving}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            hasPending ? "bg-white text-zinc-900 hover:bg-zinc-200" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
          }`}>
          <Save size={14} />
          {saving ? "Guardando..." : `Guardar${hasPending ? "" : ""}`}
        </button>
        <button onClick={onCopyYesterday}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors font-medium">
          <Copy size={14} /> Copiar de ayer
        </button>
        <button onClick={onMarkAllAvailable}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors font-medium">
          <CheckSquare size={14} /> Todos disponibles
        </button>
        <button onClick={onExport}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors font-medium">
          <Download size={14} /> Exportar
        </button>
        <button onClick={onWhatsApp}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-600/30 transition-colors font-medium">
          <MessageSquare size={14} /> Resumen Staff
        </button>
      </div>

      {hasPending && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2 text-amber-300 text-xs font-medium">
          Tenés cambios sin guardar. Presioná "Guardar" para confirmar.
        </div>
      )}
    </div>
  );
}
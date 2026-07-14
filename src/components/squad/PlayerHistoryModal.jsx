import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, AlertCircle, Activity, ArrowUp, ArrowDown } from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS } from "@/components/squad/squadConstants";
import moment from "moment";
import PlayerPhoto from "@/components/player/PlayerPhoto";
import "moment/locale/es";
moment.locale("es");

const HIGHLIGHT_STATUSES = {
  lesionado:    { label: "Lesionado",    color: "text-red-400",    icon: AlertCircle },
  diferenciado: { label: "Diferenciado", color: "text-amber-400",  icon: Activity },
  "subió":      { label: "Subió",        color: "text-violet-400", icon: ArrowUp },
  "bajó":       { label: "Bajó",         color: "text-pink-400",   icon: ArrowDown },
};

export default function PlayerHistoryModal({ player, onClose }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    async function load() {
      const data = await base44.entities.DailySquadStatus.filter(
        { player_id: player.id }, "-date", 200
      );
      setRecords(data);
      setLoading(false);
    }
    load();
  }, [player.id]);

  const filters = [
    { id: "all", label: "Todo" },
    { id: "lesionado", label: "Lesiones" },
    { id: "diferenciado", label: "Diferenciado" },
    { id: "subió", label: "Subió" },
    { id: "bajó", label: "Bajó" },
  ];

  const filtered = activeFilter === "all"
    ? records
    : records.filter(r => r.status === activeFilter);

  // Streak: consecutive injured days
  let injuryStreak = 0;
  for (const r of records) {
    if (r.status === "lesionado") injuryStreak++;
    else break;
  }

  const stats = {
    total: records.length,
    disponibles: records.filter(r => r.status === "disponible").length,
    lesionados: records.filter(r => r.status === "lesionado").length,
    diferenciados: records.filter(r => r.status === "diferenciado").length,
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl" style={{ maxHeight: "90vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <PlayerPhoto
              player={player}
              className="w-10 h-10 rounded-full object-cover border border-zinc-700"
              fallbackClassName="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center"
              textClassName="text-sm font-bold text-zinc-400"
            />
            <div>
              <h2 className="text-base font-bold text-white">{player.full_name}</h2>
              <p className="text-xs text-zinc-500">Historial de estados diarios</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Summary */}
        {!loading && (
          <div className="grid grid-cols-4 gap-2 px-5 py-3 border-b border-zinc-800 shrink-0">
            <div className="text-center">
              <p className="text-xl font-bold text-white">{stats.total}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Días reg.</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-emerald-400">{stats.disponibles}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Disponible</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-red-400">{stats.lesionados}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Lesionado</p>
            </div>
            {injuryStreak > 0 ? (
              <div className="text-center">
                <p className="text-xl font-bold text-red-300">{injuryStreak}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">Días racha</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-xl font-bold text-amber-400">{stats.diferenciados}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">Diferenciado</p>
              </div>
            )}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-1 px-5 py-2 border-b border-zinc-800 shrink-0">
          {filters.map(f => (
            <button key={f.id} onClick={() => setActiveFilter(f.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeFilter === f.id ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-zinc-600 text-sm text-center py-8">Sin registros</p>
          ) : (
            <div className="space-y-2">
              {filtered.map(r => {
                const statusClass = STATUS_COLORS[r.status] || "bg-zinc-800 text-zinc-300 border-zinc-700";
                return (
                  <div key={r.id} className="flex items-start gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                    <div className="shrink-0 text-right w-20">
                      <p className="text-xs font-semibold text-white">{moment(r.date).format("DD/MM/YYYY")}</p>
                      <p className="text-[10px] text-zinc-500 capitalize">{moment(r.date).format("ddd")}</p>
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusClass}`}>
                        {STATUS_LABELS[r.status] || r.status}
                      </span>
                      {r.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {r.tags.map(t => (
                            <span key={t} className="text-[9px] px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded-full border border-zinc-700">{t}</span>
                          ))}
                        </div>
                      )}
                      {r.notes && (
                        <p className="text-xs text-zinc-400 italic">"{r.notes}"</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
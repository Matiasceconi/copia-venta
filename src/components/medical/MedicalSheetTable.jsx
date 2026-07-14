import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Pencil } from "lucide-react";
import moment from "moment";
import "moment/locale/es";
import { useToast } from "@/components/ui/use-toast";
import { usePlayers } from "@/hooks/usePlayers";
import MedicalSheetFilters from "./MedicalSheetFilters";
import MedicalEpisodeEditModal from "./MedicalEpisodeEditModal";
import { STATUS_LABELS, STATUS_BADGE, getRowColorClasses } from "./medicalStatusConfig";
moment.locale("es");

const EMPTY_FILTERS = { player: "", category: "all", status: "all", injuryType: "", date: "", season: "all" };

export default function MedicalSheetTable({ squadPlayerIds }) {
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const { getPlayer } = usePlayers();
  const { toast } = useToast();

  async function load() {
    setLoading(true);
    const recs = await base44.entities.MedicalEpisode.list("-fecha_inicio_tto", 2000);
    setEpisodes(recs);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke("syncMedicalFromSheet", {});
      toast({ title: `Sincronizado: ${res.data?.created || 0} nuevos, ${res.data?.updated || 0} actualizados` });
      await load();
    } catch {
      toast({ title: "Error al sincronizar", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  }

  const baseFiltered = squadPlayerIds instanceof Set
    ? episodes.filter((e) => !e.player_id || squadPlayerIds.has(e.player_id))
    : episodes;

  const categories = useMemo(() => [...new Set(baseFiltered.map((e) => e.categoria_division).filter(Boolean))], [baseFiltered]);
  const seasons = useMemo(() => [...new Set(baseFiltered.map((e) => e.season_id).filter(Boolean))], [baseFiltered]);

  const filtered = baseFiltered.filter((e) => {
    if (filters.player) {
      const playerData = getPlayer(e.player_id, e.player_name_original);
      const name = (playerData?.name || e.player_name_original || "").toLowerCase();
      if (!name.includes(filters.player.toLowerCase())) return false;
    }
    if (filters.category !== "all" && e.categoria_division !== filters.category) return false;
    if (filters.status !== "all" && e.medical_status !== filters.status) return false;
    if (filters.injuryType && !(e.lesion_consulta || "").toLowerCase().includes(filters.injuryType.toLowerCase())) return false;
    if (filters.date && e.fecha_inicio_tto !== filters.date) return false;
    if (filters.season !== "all" && e.season_id !== filters.season) return false;
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <MedicalSheetFilters filters={filters} setFilters={setFilters} categories={categories} seasons={seasons} />
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs text-white shrink-0"
        >
          <RefreshCw size={13} className={syncing ? "animate-spin" : ""} /> {syncing ? "Sincronizando..." : "Sincronizar con Sheets"}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center text-zinc-500 text-sm">Sin registros que coincidan con los filtros</div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-wider">
                <th className="text-left p-2.5 font-medium">Jugador</th>
                <th className="text-left p-2.5 font-medium">Categoría</th>
                <th className="text-left p-2.5 font-medium">Lesión / Consulta</th>
                <th className="text-left p-2.5 font-medium">MMII</th>
                <th className="text-left p-2.5 font-medium">Inicio TTO</th>
                <th className="text-left p-2.5 font-medium">Final TTO</th>
                <th className="text-left p-2.5 font-medium">Días</th>
                <th className="text-left p-2.5 font-medium">Etapa RHB</th>
                <th className="text-left p-2.5 font-medium">Observaciones</th>
                <th className="text-left p-2.5 font-medium">Estado</th>
                <th className="text-left p-2.5 font-medium">Origen</th>
                <th className="p-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const playerData = getPlayer(e.player_id, e.player_name_original);
                const displayName = playerData?.name || e.player_name_original;
                return (
                  <tr key={e.id} className={`border-b border-zinc-800/60 ${getRowColorClasses(e.medical_status)} cursor-pointer hover:brightness-125`} onClick={() => setEditing(e)}>
                    <td className="p-2.5 text-white font-medium whitespace-nowrap">{displayName}{!e.linked && <span className="ml-1 text-[10px] text-zinc-500">(sin vincular)</span>}</td>
                    <td className="p-2.5 text-zinc-300 whitespace-nowrap">{e.categoria_division}</td>
                    <td className="p-2.5 text-zinc-200 min-w-[160px]">{e.lesion_consulta}</td>
                    <td className="p-2.5 text-zinc-400 whitespace-nowrap">{e.mmii_afectado}</td>
                    <td className="p-2.5 text-zinc-400 whitespace-nowrap">{e.fecha_inicio_tto ? moment(e.fecha_inicio_tto).format("DD/MM/YYYY") : ""}</td>
                    <td className="p-2.5 text-zinc-400 whitespace-nowrap">{e.fecha_final_tto ? moment(e.fecha_final_tto).format("DD/MM/YYYY") : ""}</td>
                    <td className="p-2.5 text-zinc-300">{e.perdida_dias ?? ""}</td>
                    <td className="p-2.5 text-zinc-400 whitespace-nowrap">{e.etapa_rhb}</td>
                    <td className="p-2.5 text-zinc-500 min-w-[160px]">{e.observaciones}</td>
                    <td className="p-2.5 whitespace-nowrap">
                      <span className={`text-[10px] px-2 py-0.5 rounded border ${STATUS_BADGE[e.medical_status] || "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>
                        {STATUS_LABELS[e.medical_status] || e.medical_status}
                      </span>
                    </td>
                    <td className="p-2.5 text-zinc-500 whitespace-nowrap">
                      <div>{e.source === "app" ? "Editado en app" : "Google Sheets"}</div>
                      <div className="text-[10px] text-zinc-600">
                        {e.source === "app"
                          ? (e.edited_at ? `${e.edited_by || ""} · ${moment(e.edited_at).format("DD/MM HH:mm")}` : "")
                          : (e.last_synced_at ? moment(e.last_synced_at).format("DD/MM HH:mm") : "")}
                      </div>
                    </td>
                    <td className="p-2.5">
                      <Pencil size={13} className="text-zinc-600" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <MedicalEpisodeEditModal
          episode={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}
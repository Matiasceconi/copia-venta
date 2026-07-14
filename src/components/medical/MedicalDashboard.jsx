import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Clock, CheckCircle, TrendingUp, User, Calendar, ChevronRight } from "lucide-react";
import moment from "moment";
import "moment/locale/es";
import PlayerMedicalHistory from "@/components/medical/PlayerMedicalHistory";
import { usePlayers } from "@/hooks/usePlayers";
import { STATUS_LABELS, STATUS_BADGE } from "./medicalStatusConfig";
moment.locale("es");

const rehabStageOrder = ["Etapa inicial", "Etapa intermedia", "Etapa avanzada", "Readaptación", "Retorno con el grupo"];

function RehabProgress({ stage }) {
  const idx = rehabStageOrder.findIndex(s => s.toLowerCase() === (stage || "").toLowerCase());
  const current = idx >= 0 ? idx : -1;
  return (
    <div className="mt-2">
      <p className="text-xs text-zinc-500 mb-1.5">Etapa RHB</p>
      <div className="flex items-center gap-1">
        {rehabStageOrder.map((s, i) => (
          <div key={s} className="flex items-center gap-1 flex-1">
            <div className={`h-1.5 flex-1 rounded-full transition-all ${i <= current ? "bg-orange-400" : "bg-zinc-700"}`} />
            {i === rehabStageOrder.length - 1 && (
              <div className={`w-2.5 h-2.5 rounded-full border-2 flex-shrink-0 ${i <= current ? "bg-orange-400 border-orange-400" : "bg-transparent border-zinc-600"}`} />
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-orange-300 mt-1">{stage || "Sin etapa definida"}</p>
    </div>
  );
}

function DaysCounter({ injuryDate, expectedReturn }) {
  const today = moment();
  const start = moment(injuryDate);
  const end = expectedReturn ? moment(expectedReturn) : null;
  const daysSince = today.diff(start, "days");
  const daysLeft = end ? end.diff(today, "days") : null;
  return (
    <div className="flex gap-3 mt-2">
      <div className="bg-zinc-800 rounded-lg px-3 py-1.5 text-center">
        <p className="text-lg font-bold text-white">{daysSince}</p>
        <p className="text-xs text-zinc-500">días lesionado</p>
      </div>
      {daysLeft !== null && (
        <div className={`rounded-lg px-3 py-1.5 text-center ${daysLeft < 0 ? "bg-green-500/10" : "bg-zinc-800"}`}>
          <p className={`text-lg font-bold ${daysLeft < 0 ? "text-green-400" : daysLeft <= 7 ? "text-yellow-400" : "text-white"}`}>
            {daysLeft < 0 ? "Alta" : daysLeft}
          </p>
          <p className="text-xs text-zinc-500">{daysLeft < 0 ? "disponible" : "días restantes"}</p>
        </div>
      )}
    </div>
  );
}

export default function MedicalDashboard({ squadPlayerIds }) {
  const [episodes, setEpisodes] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const openedFromQueryRef = useRef(false);
  const { getPlayer } = usePlayers();

  useEffect(() => {
    async function load() {
      const [eps, sts] = await Promise.all([
        base44.entities.MedicalEpisode.list("-fecha_inicio_tto", 2000),
        base44.entities.MedicalCurrentStatus.list("-updated_at", 2000),
      ]);
      setEpisodes(eps);
      setStatuses(sts);
      setLoading(false);
    }
    load();
  }, []);

  // Filtrar por plantel activo si se pasan IDs de jugadores
  const filteredStatuses = squadPlayerIds instanceof Set
    ? statuses.filter(s => squadPlayerIds.has(s.player_id))
    : statuses;

  const activeEpisodeById = {};
  episodes.forEach(e => { activeEpisodeById[e.id] = e; });

  // Jugadores lesionados / en recuperación / kinesiología según MedicalCurrentStatus
  const activeInjured = filteredStatuses
    .filter(s => ["lesionado", "en_recuperacion", "kinesiologia"].includes(s.current_status))
    .map(s => ({ status: s, episode: activeEpisodeById[s.active_episode_id] }))
    .filter(x => x.episode);

  // Seguimiento
  const seguimiento = filteredStatuses.filter(s => s.current_status === "seguimiento");

  const relevantPlayerIds = new Set(filteredStatuses.map(s => s.player_id));
  const relevantEpisodes = episodes.filter(e => e.player_id && relevantPlayerIds.has(e.player_id));

  useEffect(() => {
    if (openedFromQueryRef.current || loading) return;
    const playerId = new URLSearchParams(window.location.search).get("player_id");
    if (!playerId) return;
    const episode = episodes.find((e) => e.player_id === playerId);
    if (!episode) return;
    const playerData = getPlayer(playerId, episode.player_name_original);
    setSelectedPlayer({ id: playerId, name: playerData?.name || episode.player_name_original, photo_url: playerData?.photo_url, position: playerData?.position, number: playerData?.number, category_division: episode.categoria_division });
    openedFromQueryRef.current = true;
  }, [loading, episodes, getPlayer]);

  // Stats
  const totalInjured = activeInjured.length;
  const totalSeguimiento = seguimiento.length;
  const totalDaysLost = relevantEpisodes.reduce((acc, e) => acc + (e.perdida_dias || 0), 0);
  const withDaysLost = relevantEpisodes.filter(e => e.perdida_dias > 0);
  const avgDaysLost = withDaysLost.length ? Math.round(totalDaysLost / withDaysLost.length) : 0;

  // Most common injuries
  const diagnosisCounts = {};
  relevantEpisodes.forEach(e => {
    if (!e.lesion_consulta) return;
    const key = e.lesion_consulta.toLowerCase().trim();
    diagnosisCounts[key] = (diagnosisCounts[key] || 0) + 1;
  });
  const topInjuries = Object.entries(diagnosisCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([diag, count]) => ({ diag, count }));

  // Build list of players with any medical episode, for the history panel
  const playersWithRecords = (() => {
    const seen = new Map();
    relevantEpisodes.forEach(e => {
      const key = e.player_id || e.player_name_original;
      if (!seen.has(key)) {
        const playerData = getPlayer(e.player_id, e.player_name_original);
        seen.set(key, {
          id: e.player_id,
          name: playerData?.name || e.player_name_original,
          photo_url: playerData?.photo_url || null,
          position: playerData?.position || "",
          number: playerData?.number || null,
          category_division: e.categoria_division || "",
          count: 0,
          lastDate: e.fecha_inicio_tto || "",
        });
      }
      seen.get(key).count += 1;
    });
    return Array.from(seen.values()).sort((a, b) => b.lastDate.localeCompare(a.lastDate));
  })();

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" /></div>;

  return (
    <>
    {selectedPlayer && <PlayerMedicalHistory player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />}
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-zinc-900 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-red-400" />
            <span className="text-xs text-zinc-500">Actualmente lesionados</span>
          </div>
          <p className="text-3xl font-bold text-red-400">{totalInjured}</p>
        </div>
        <div className="bg-zinc-900 border border-yellow-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={16} className="text-yellow-400" />
            <span className="text-xs text-zinc-500">En seguimiento</span>
          </div>
          <p className="text-3xl font-bold text-yellow-400">{totalSeguimiento}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={16} className="text-zinc-400" />
            <span className="text-xs text-zinc-500">Días perdidos (total)</span>
          </div>
          <p className="text-3xl font-bold text-white">{totalDaysLost}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-blue-400" />
            <span className="text-xs text-zinc-500">Prom. días por lesión</span>
          </div>
          <p className="text-3xl font-bold text-blue-400">{avgDaysLost}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Active injured cards */}
        <div className="md:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse inline-block" />
            Jugadores lesionados / en recuperación
          </h2>
          {activeInjured.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
              <CheckCircle size={32} className="text-green-500 mx-auto mb-2" />
              <p className="text-zinc-400 text-sm">¡Plantel sin lesiones activas!</p>
            </div>
          ) : (
            activeInjured.map(({ status: s, episode: e }) => {
              const sc = STATUS_BADGE[s.current_status] || STATUS_BADGE.lesionado;
              const playerData = getPlayer(s.player_id, e.player_name_original);
              const displayName = playerData?.name || e.player_name_original;
              const displayPhoto = playerData?.photo_url;
              return (
                <div key={s.id} className={`bg-zinc-900 border rounded-xl p-4 ${sc.split(" ").find(c => c.startsWith("border-"))}`}>
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => setSelectedPlayer({ id: s.player_id, name: displayName, photo_url: displayPhoto, position: playerData?.position, number: playerData?.number, category_division: e.categoria_division })}
                      className="shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                      title="Ver historial médico"
                    >
                      {displayPhoto ? (
                        <img src={displayPhoto} alt={displayName} className="w-10 h-10 rounded-full object-cover border-2 border-zinc-600 hover:border-white transition-all" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-zinc-600 hover:border-white transition-all flex items-center justify-center">
                          <span className="text-sm font-bold text-zinc-500">{displayName?.charAt(0)}</span>
                        </div>
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-semibold text-sm">{displayName}</span>
                        {e.categoria_division && <span className="text-xs text-zinc-500">{e.categoria_division}</span>}
                        <span className={`text-xs px-2 py-0.5 rounded border ${sc}`}>{STATUS_LABELS[s.current_status]}</span>
                      </div>
                      <p className="text-zinc-300 text-sm mt-0.5">{e.lesion_consulta}</p>
                      {e.mmii_afectado && (
                        <p className="text-xs text-zinc-500 mt-0.5">MMII: {e.mmii_afectado}</p>
                      )}
                      {e.fecha_inicio_tto && <DaysCounter injuryDate={e.fecha_inicio_tto} expectedReturn={e.fecha_final_tto} />}
                      {e.etapa_rhb && <RehabProgress stage={e.etapa_rhb} />}
                      {e.observaciones && <p className="text-xs text-zinc-600 mt-2 italic">{e.observaciones}</p>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Seguimiento */}
          <div>
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
              Seguimiento activo
            </h2>
            {seguimiento.length === 0 ? (
              <p className="text-xs text-zinc-600">Sin jugadores en seguimiento</p>
            ) : (
              <div className="space-y-2">
                {seguimiento.map(s => {
                  const e = activeEpisodeById[s.active_episode_id];
                  const playerData = getPlayer(s.player_id, e?.player_name_original);
                  const displayName = playerData?.name || e?.player_name_original || "";
                  return (
                    <div key={s.id} className="bg-zinc-900 border border-yellow-500/20 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />
                        <span className="text-white text-sm font-medium">{displayName}</span>
                      </div>
                      {e?.lesion_consulta && <p className="text-zinc-400 text-xs mt-0.5 ml-4">{e.lesion_consulta}</p>}
                      {e?.observaciones && <p className="text-zinc-600 text-xs mt-0.5 ml-4 italic">{e.observaciones}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top lesiones */}
          <div>
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2 mb-3">
              <TrendingUp size={13} className="text-zinc-500" />
              Lesiones más frecuentes
            </h2>
            <div className="space-y-2">
              {topInjuries.map(({ diag, count }) => (
                <div key={diag} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-zinc-300 text-xs capitalize">{diag}</p>
                    <span className="text-xs font-bold text-white bg-zinc-700 rounded px-1.5 py-0.5">{count}x</span>
                  </div>
                  <div className="mt-1.5 h-1 bg-zinc-800 rounded-full">
                    <div
                      className="h-1 bg-blue-500 rounded-full"
                      style={{ width: `${Math.min(100, (count / Math.max(1, relevantEpisodes.length)) * 100 * 3)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Historial médico por jugador */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2 mb-3">
          <User size={13} className="text-zinc-500" />
          Historial médico por jugador
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {playersWithRecords.map(p => (
            <button
              key={p.id || p.name}
              onClick={() => setSelectedPlayer(p)}
              className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl p-3 flex items-center gap-3 transition-all text-left group"
            >
              {p.photo_url ? (
                <img src={p.photo_url} alt={p.name} className="w-10 h-10 rounded-full object-cover border border-zinc-700 shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-zinc-500">{p.name?.charAt(0)}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{p.name}</p>
                <p className="text-zinc-500 text-xs">{p.count} registro{p.count !== 1 ? "s" : ""}</p>
              </div>
              <ChevronRight size={14} className="text-zinc-600 group-hover:text-zinc-400 shrink-0 transition-colors" />
            </button>
          ))}
        </div>
      </div>
    </div>
    </>
  );
}
import React, { useMemo, useState } from "react";
import { Calendar, Users, Clock, Trash2, Dumbbell, Goal, LocateFixed, Zap, Video, Eye, Heart, Activity, RotateCcw, BarChart3, PlaySquare, Footprints } from "lucide-react";
import VideoPreviewModal from "@/components/sessions/VideoPreviewModal";
import moment from "moment";
import { effectiveSessionMeta, findPlanDay } from "@/components/planning/microcycleSync";

const DEFAULT_OBJECTIVE = { color: "#22c55e", text_color: "#ffffff", border_color: "#22c55e" };
const actionBtn = "flex flex-col items-center justify-center gap-1 min-w-[70px] px-3 py-2 rounded-xl text-[11px] font-semibold border transition-colors whitespace-nowrap";

function iconForObjective(name) {
  const value = String(name || "").toLowerCase();
  if (value.includes("tensión") || value.includes("neuromuscular")) return Zap;
  if (value.includes("duración") || value.includes("metab")) return Heart;
  if (value.includes("recuper") || value.includes("readapt")) return RotateCcw;
  if (value.includes("velocidad")) return Footprints;
  if (value.includes("volumen")) return BarChart3;
  return Activity;
}

function statusText(ok, yes, no) {
  return <span className={ok ? "text-emerald-400" : "text-red-400"}>{ok ? `✓ ${yes}` : `✕ ${no}`}</span>;
}

function buildObjectiveMap(physicalObjectives = []) {
  return Object.fromEntries(physicalObjectives.map((o) => [String(o.name || "").toLowerCase(), o]));
}

export default function SessionList({ sessions, onSelect, onDelete, hasFilters = false, exerciseCounts = {}, videoLinksBySession = {}, weeklyPlans = [], physicalObjectives = [] }) {
  const [preview, setPreview] = useState(null);
  const objectiveMap = useMemo(() => buildObjectiveMap(physicalObjectives), [physicalObjectives]);

  if (sessions.length === 0) {
    return <div className="text-center py-16 text-zinc-600"><p className="text-sm">{hasFilters ? "No se encontraron sesiones" : "Sin sesiones creadas"}</p>{!hasFilters && <p className="text-xs mt-1">Creá la primera sesión para comenzar</p>}</div>;
  }

  return (
    <div className="space-y-2">
      {sessions.map((session, index) => {
        const exercisesCount = exerciseCounts[session.id] || 0;
        const hasGPS = !!session.csv_label;
        const sessionVideoLinks = videoLinksBySession[session.id] || [];
        const hasVideo = !!session.video_url || sessionVideoLinks.length > 0;
        const effectiveMeta = effectiveSessionMeta(session, findPlanDay(weeklyPlans, { date: session.date, squadId: session.squad_id, seasonId: session.season_id }));
        const objectiveName = effectiveMeta.session_objective || session.session_objective || "Sesión";
        const objective = objectiveMap[String(objectiveName).toLowerCase()] || DEFAULT_OBJECTIVE;
        const Icon = iconForObjective(objectiveName);
        const sessionNumber = session.session_number || sessions.length - index;
        const period = session.period || "Competencia";

        return (
          <div key={session.id} className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-950 via-zinc-950 to-zinc-900/95 hover:border-zinc-700 transition-colors">
            <div className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: objective.color || DEFAULT_OBJECTIVE.color }} />
            <div className="flex flex-col xl:flex-row xl:items-stretch">
              <button onClick={() => onSelect(session, "players")} className="flex flex-1 items-stretch text-left min-w-0">
                <div className="w-14 sm:w-16 shrink-0 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${objective.color || DEFAULT_OBJECTIVE.color}33, transparent)` }}>
                  <Icon size={27} style={{ color: objective.color || DEFAULT_OBJECTIVE.color }} />
                </div>
                <div className="flex-1 min-w-0 px-4 py-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-white font-extrabold tracking-wide text-lg">SESIÓN {sessionNumber}</h3>
                    <span className="px-3 py-1 rounded-lg text-xs font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">{period}</span>
                    {effectiveMeta.match_day_code && <span className="px-3 py-1 rounded-lg text-xs font-bold" style={{ color: objective.text_color || "#fff", backgroundColor: `${objective.color || DEFAULT_OBJECTIVE.color}55` }}>{effectiveMeta.match_day_code}</span>}
                  </div>
                  <p className="text-sm font-semibold mt-0.5" style={{ color: objective.color || DEFAULT_OBJECTIVE.color }}>{objectiveName}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-zinc-400 flex-wrap">
                    <span className="flex items-center gap-1"><Calendar size={12} />{moment(session.date).format("DD/MM/YYYY")}</span>
                    {session.duration_minutes && <span className="flex items-center gap-1"><Clock size={12} />{session.duration_minutes} min</span>}
                    {session.squad_name && <span>{session.squad_name}</span>}
                  </div>
                </div>
              </button>

              <div className="flex flex-wrap xl:flex-nowrap items-center gap-0 border-t xl:border-t-0 xl:border-l border-zinc-800/80 px-3 py-3 xl:py-0" onClick={(e) => e.stopPropagation()}>
                <div className="grid grid-cols-2 sm:grid-cols-4 xl:flex gap-0 w-full xl:w-auto">
                  <div className="px-4 py-2 border-r border-zinc-800/80 text-center"><p className="text-white font-bold flex items-center justify-center gap-1"><Users size={13} />{session.players_selected || 0}</p><p className="text-[11px] text-zinc-500">Jugadores</p></div>
                  <div className="px-4 py-2 border-r border-zinc-800/80 text-center"><p className="text-white font-bold flex items-center justify-center gap-1"><Goal size={13} />{exercisesCount}</p><p className="text-[11px] text-zinc-500">Ejercicios</p></div>
                  <div className="px-4 py-2 border-r border-zinc-800/80 text-center"><p className="text-white font-bold flex items-center justify-center gap-1"><LocateFixed size={13} />GPS</p><p className="text-[11px] font-semibold">{statusText(hasGPS, "Cargado", "Sin GPS")}</p></div>
                  <div className="px-4 py-2 border-r border-zinc-800/80 text-center"><p className="text-xs font-bold text-zinc-300">Video</p><p className="text-[11px] font-semibold">{statusText(hasVideo, "Cargado", "Sin video")}</p></div>
                </div>
                <div className="flex gap-2 flex-wrap justify-end ml-auto pt-3 xl:pt-0">
                  <button onClick={() => onSelect(session, "players")} className={`${actionBtn} bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800`}><Eye size={16} className="text-sky-400" />Ver sesión</button>
                  <button onClick={() => onSelect(session, "exercises")} className={`${actionBtn} bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800`}><Goal size={16} />Ejercicios</button>
                  <button onClick={() => onSelect(session, "strength")} className={`${actionBtn} bg-orange-500/10 border-orange-500/30 text-orange-300 hover:bg-orange-500/20`}><Dumbbell size={16} />Fuerza</button>
                  <button onClick={() => onSelect(session, "gps")} className={`${actionBtn} ${hasGPS ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800"}`}><LocateFixed size={16} />GPS</button>
                  {hasVideo ? <button onClick={() => setPreview({ url: session.video_url || sessionVideoLinks[0].video_url, title: session.video_url ? session.title : sessionVideoLinks[0].title })} className={`${actionBtn} bg-violet-500/10 border-violet-500/30 text-violet-300 hover:bg-violet-500/20`}><PlaySquare size={16} />Video</button> : <button onClick={() => onSelect(session, "video")} className={`${actionBtn} bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800`}><Video size={16} />Video</button>}
                  <button onClick={() => onDelete(session.id)} className="self-center p-2 rounded-lg text-zinc-700 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-100 xl:opacity-0 xl:group-hover:opacity-100"><Trash2 size={15} /></button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      {preview && <VideoPreviewModal url={preview.url} title={preview.title} onClose={() => setPreview(null)} />}
    </div>
  );
}
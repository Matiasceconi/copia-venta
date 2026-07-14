import React, { useState } from "react";
import PlayerAvatar from "@/components/player/PlayerAvatar";
import { isGoalkeeper } from "@/components/squad/squadConstants";
import { STATUS_LABELS, STATUS_COLORS } from "./sessionPlayerUtils";
import { Check, HeartPulse, Moon, UserX, Trash2, ChevronDown, ChevronUp, Save } from "lucide-react";

// Solo estos estados aportan información relevante como etiqueta en la tarjeta
const KEEP_STATUS_TAGS = ["disponible", "diferenciado", "lesionado", "molestia", "suspendido", "bajó", "subió"];

const STATUS_OPTIONS = ["disponible", "lesionado", "molestia", "suspendido", "diferenciado", "reintegro", "bajó", "subió"];

const ACTIONS = [
  { key: "presente", label: "Presente", icon: Check, activeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  { key: "diferenciado", label: "Diferenciado", icon: Moon, activeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  { key: "kinesiologia", label: "Kinesiología", icon: HeartPulse, activeClass: "bg-sky-500/20 text-sky-300 border-sky-500/40" },
  { key: "ausente", label: "Ausente", icon: UserX, activeClass: "bg-zinc-600/30 text-zinc-300 border-zinc-500" },
];

export default function SessionPlayerCard({ sp, photoUrl, onAction, onSaveDetails, onStatusChange }) {
  const [expanded, setExpanded] = useState(false);
  const [minutes, setMinutes] = useState(sp.minutes || "");
  const [rpe, setRpe] = useState(sp.rpe || "");
  const [notes, setNotes] = useState(sp.notes || "");
  const gk = isGoalkeeper({ position: sp.position });
  const statusTag = sp.attendance !== "kinesiologia" && KEEP_STATUS_TAGS.includes(sp.status_at_session)
    ? STATUS_LABELS[sp.status_at_session]
    : null;

  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-3 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <PlayerAvatar player={{ id: sp.player_id, full_name: sp.player_name, photo_url: photoUrl }} size="md" showName className="min-w-0" />
        <button onClick={() => onAction(sp, "remove")} title="Quitar de la sesión" className="text-zinc-600 hover:text-red-400 transition-colors shrink-0">
          <Trash2 size={13} />
        </button>
      </div>

      <p className="text-[11px] text-zinc-400 -mt-1.5">{sp.position || "—"}</p>

      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
        {gk && (
          <span className="px-2 py-0.5 rounded-full border font-medium bg-yellow-500/15 text-yellow-300 border-yellow-500/30">
            ARQ
          </span>
        )}
        {sp.attendance === "kinesiologia" && (
          <span className="px-2 py-0.5 rounded-full border font-medium bg-sky-500/15 text-sky-300 border-sky-500/30">
            Kinesiología
          </span>
        )}
        {statusTag && (
          <span className={`px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[sp.status_at_session] || "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>
            {statusTag}
          </span>
        )}
        {sp.squad_name && <span className="text-zinc-600 truncate">{sp.squad_name}</span>}
      </div>

      <select
        value={sp.status_at_session || "disponible"}
        onChange={(e) => onStatusChange(sp, e.target.value)}
        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none"
        title="Cambiar estado del jugador"
      >
        {STATUS_OPTIONS.map(s => (
          <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
        ))}
      </select>

      <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-zinc-700/60">
        {ACTIONS.map(({ key, label, icon: Icon, activeClass }) => (
          <button key={key} onClick={() => onAction(sp, key)} title={label}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-medium transition-colors ${
              sp.attendance === key ? activeClass : "text-zinc-500 border-zinc-700 hover:text-white"
            }`}>
            <Icon size={11} /> {label}
          </button>
        ))}
        <button onClick={() => setExpanded(e => !e)} title="Minutos / RPE / Notas"
          className="ml-auto flex items-center gap-1 text-[10px] text-zinc-500 hover:text-white transition-colors">
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {expanded && (
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          <input type="number" min={0} max={180} value={minutes} onChange={e => setMinutes(e.target.value)}
            placeholder="Min." className="bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-[11px] text-white focus:outline-none" />
          <input type="number" min={1} max={10} value={rpe} onChange={e => setRpe(e.target.value)}
            placeholder="RPE" className="bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-[11px] text-white focus:outline-none" />
          <button onClick={() => onSaveDetails(sp, { minutes: parseInt(minutes) || 0, rpe: parseInt(rpe) || undefined, notes })}
            className="flex items-center justify-center gap-1 bg-zinc-700 hover:bg-zinc-600 rounded px-1.5 py-1 text-[10px] text-white transition-colors">
            <Save size={11} />
          </button>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={1} placeholder="Observación..."
            className="col-span-3 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-[11px] text-white focus:outline-none resize-none" />
        </div>
      )}
    </div>
  );
}
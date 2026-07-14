import React, { useState } from "react";
import { ChevronDown, Tag, FileText, Clock, X, ArrowUp, ArrowDown, RotateCcw, LogOut } from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS, ALL_TAGS } from "@/components/squad/squadConstants";
import PlayerHistoryModal from "@/components/squad/PlayerHistoryModal";
import PlayerAvatar from "@/components/player/PlayerAvatar";

const STATUS_LIST = Object.keys(STATUS_LABELS);

export default function PlayerDayCard({
  player, dayStatus, hasPending, onChange, selectedDate,
  squads = [], selectedSquadId,
  onApplyMovement, onEndTemporaryMovement,
}) {
  const [expanded, setExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showMovePanel, setShowMovePanel] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const { status, tags, notes, temporary, active_in_target_squad, base_squad_name, target_squad_name, movement_type } = dayStatus;
  const statusClass = STATUS_COLORS[status] || "bg-zinc-700 text-zinc-300 border-zinc-600";

  const isTemporaryVisitor = temporary && active_in_target_squad;
  const otherSquads = squads.filter(s => s.id !== selectedSquadId);

  function addTag(tag) { if (!tags.includes(tag)) onChange({ tags: [...tags, tag] }); }
  function removeTag(tag) { onChange({ tags: tags.filter(t => t !== tag) }); }
  function handleCustomTag(e) {
    e.preventDefault();
    if (tagInput.trim() && !tags.includes(tagInput.trim())) onChange({ tags: [...tags, tagInput.trim()] });
    setTagInput("");
  }

  return (
    <>
      <div className={`bg-zinc-900 border rounded-xl transition-all ${
        hasPending ? "border-amber-500/40" : isTemporaryVisitor ? "border-sky-500/30" : "border-zinc-800"
      }`}>
        {/* Temporary visitor badge */}
        {isTemporaryVisitor && (
          <div className="px-3 pt-2 flex items-center gap-1.5 flex-wrap">
            {movement_type === "sube_temporal" ? (
              <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-full px-2 py-0.5 font-medium">
                ↑ Sube desde {base_squad_name || "otro plantel"}
                {target_squad_name ? ` → ${target_squad_name}` : ""}
              </span>
            ) : movement_type === "baja_temporal" ? (
              <span className="text-[10px] bg-orange-500/20 text-orange-300 border border-orange-500/30 rounded-full px-2 py-0.5 font-medium">
                ↓ Baja desde {base_squad_name || "otro plantel"}
                {target_squad_name ? ` → ${target_squad_name}` : ""}
              </span>
            ) : (
              <span className="text-[10px] bg-zinc-700/40 text-zinc-300 border border-zinc-700 rounded-full px-2 py-0.5 font-medium">
                Temporal · {base_squad_name || "otro plantel"}
              </span>
            )}
          </div>
        )}

        {/* Card header */}
        <div className="p-3">
          <div className="flex items-center gap-2.5">
            <PlayerAvatar player={player} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{player.full_name}</p>
              <p className="text-xs text-zinc-500 truncate">
                {player.position}
                {player.category ? ` · ${player.category}` : ""}
                {base_squad_name && base_squad_name !== target_squad_name ? ` · ${base_squad_name}` : ""}
              </p>
            </div>
            {hasPending && <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Cambio pendiente" />}
          </div>

          {/* Status selector */}
          <div className="mt-2.5">
            <select
              value={status}
              onChange={e => onChange({ status: e.target.value })}
              className={`w-full text-xs font-semibold rounded-lg px-2 py-1.5 border focus:outline-none bg-transparent ${statusClass}`}
            >
              {STATUS_LIST.map(s => (
                <option key={s} value={s} className="bg-zinc-900 text-white">{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {tags.map(t => (
                <span key={t} className="flex items-center gap-0.5 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-full px-2 py-0.5 text-[10px]">
                  {t}
                  <button onClick={() => removeTag(t)} className="ml-0.5 text-zinc-500 hover:text-red-400 transition-colors">
                    <X size={9} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Notes preview */}
          {notes && !expanded && (
            <p className="text-xs text-zinc-500 italic mt-1.5 truncate">"{notes}"</p>
          )}
        </div>

        {/* Quick actions bar */}
        <div className="border-t border-zinc-800 flex">
          <button onClick={() => onChange({ status: "lesionado" })}
            className="flex-1 py-1.5 text-[10px] text-red-400 hover:bg-red-500/10 transition-colors font-medium">
            Lesión
          </button>
          <button onClick={() => onChange({ status: "diferenciado" })}
            className="flex-1 py-1.5 text-[10px] text-amber-400 hover:bg-amber-500/10 transition-colors font-medium border-l border-zinc-800">
            Dif.
          </button>
          <button onClick={() => onChange({ status: "disponible", tags: [] })}
            className="flex-1 py-1.5 text-[10px] text-emerald-400 hover:bg-emerald-500/10 transition-colors font-medium border-l border-zinc-800">
            Disp.
          </button>
          {squads.length > 0 && (
            <button onClick={() => setShowMovePanel(!showMovePanel)}
              className={`flex-1 py-1.5 text-[10px] transition-colors font-medium border-l border-zinc-800 ${
                showMovePanel ? "text-sky-300 bg-sky-500/10" : "text-sky-400 hover:bg-sky-500/10"
              }`}>
              Mover
            </button>
          )}
          <button onClick={() => setExpanded(!expanded)}
            className="px-2 py-1.5 text-zinc-500 hover:text-white transition-colors border-l border-zinc-800">
            <ChevronDown size={13} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Movement panel */}
        {showMovePanel && squads.length > 0 && (
          <div className="border-t border-zinc-800 p-3 space-y-2">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Movimiento temporal</p>

            {isTemporaryVisitor ? (
              <button
                onClick={() => { onEndTemporaryMovement(player); setShowMovePanel(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-300 text-xs font-medium hover:bg-orange-500/25 transition-colors">
                <RotateCcw size={12} /> Finalizar movimiento · volver a {base_squad_name || "plantel base"}
              </button>
            ) : (
              <div className="space-y-1">
                {otherSquads.map(sq => (
                  <div key={sq.id} className="flex gap-1">
                    <button
                      onClick={() => { onApplyMovement(player, sq.id, "sube_temporal", "subió"); setShowMovePanel(false); }}
                      className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[10px] font-medium hover:bg-sky-500/25 transition-colors">
                      <ArrowUp size={10} /> Sube a {sq.name}
                    </button>
                    <button
                      onClick={() => { onApplyMovement(player, sq.id, "baja_temporal", "bajó"); setShowMovePanel(false); }}
                      className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-300 text-[10px] font-medium hover:bg-orange-500/25 transition-colors">
                      <ArrowDown size={10} /> Baja a {sq.name}
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => { onChange({ status: "ausente", movement_type: "fuera_temporal", temporary: true, active_in_target_squad: false }); setShowMovePanel(false); }}
                  className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-zinc-700/30 border border-zinc-700 text-zinc-400 text-[10px] font-medium hover:bg-zinc-700/50 transition-colors">
                  <LogOut size={10} /> Fuera del plantel del día
                </button>
              </div>
            )}
          </div>
        )}

        {/* Expanded panel */}
        {expanded && (
          <div className="border-t border-zinc-800 p-3 space-y-3">
            {/* Etiquetas rápidas */}
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1">
                <Tag size={9} /> Etiquetas
              </p>
              <div className="flex flex-wrap gap-1 mb-2">
                {ALL_TAGS.map(t => (
                  <button key={t} onClick={() => tags.includes(t) ? removeTag(t) : addTag(t)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                      tags.includes(t) ? "bg-zinc-600 text-white border-zinc-500" : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white"
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
              <form onSubmit={handleCustomTag} className="flex gap-1">
                <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                  placeholder="Etiqueta personalizada..."
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none" />
                <button type="submit" className="px-2 py-1 bg-zinc-700 rounded-lg text-xs text-white hover:bg-zinc-600 transition-colors">+</button>
              </form>
            </div>

            {/* Nota */}
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1">
                <FileText size={9} /> Nota
              </p>
              <textarea
                value={notes}
                onChange={e => onChange({ notes: e.target.value })}
                placeholder="Observación del día..."
                rows={2}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none resize-none"
              />
            </div>

            {/* Historial */}
            <button onClick={() => setShowHistory(true)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">
              <Clock size={11} /> Ver historial del jugador
            </button>
          </div>
        )}
      </div>

      {showHistory && (
        <PlayerHistoryModal player={player} onClose={() => setShowHistory(false)} />
      )}
    </>
  );
}
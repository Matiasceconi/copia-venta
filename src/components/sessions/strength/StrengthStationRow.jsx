import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Trash2, Copy, ChevronUp, ChevronDown, GripVertical, Play } from "lucide-react";
import StrengthExercisePicker from "./StrengthExercisePicker";

function getYouTubeId(url = "") {
  const match = String(url).match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return match?.[1] || null;
}

function ExercisePreview({ station }) {
  const youtubeId = getYouTubeId(station.video_url);
  const previewUrl = youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : station.image_url;
  const content = previewUrl ? (
    <img src={previewUrl} alt="" className="w-10 h-10 object-cover rounded border border-zinc-700" />
  ) : (
    <div className="w-10 h-10 rounded border border-zinc-700 bg-zinc-800 flex items-center justify-center text-zinc-600">
      <Play size={14} />
    </div>
  );

  if (station.video_url) {
    return (
      <a href={station.video_url} target="_blank" rel="noreferrer" className="relative shrink-0 group" title="Abrir video">
        {content}
        <span className="absolute inset-0 flex items-center justify-center bg-black/35 rounded opacity-90 group-hover:bg-black/15 transition-colors">
          <Play size={13} className="text-white fill-white" />
        </span>
      </a>
    );
  }

  return <div className="shrink-0">{content}</div>;
}

export default function StrengthStationRow({ station, index, squadId, onChange, onBlurField, onPickLibrary, onDuplicate, onDelete, onMoveUp, onMoveDown, isLast, compact = false }) {
  const middleFields = ["sets", "time", "rest_time", "rir", "objective", "muscle_group", "vector_pattern"];

  return (
    <Draggable draggableId={station.id} index={index}>
      {(provided, snapshot) => (
        <tr ref={provided.innerRef} {...provided.draggableProps}
          className={`border-b border-zinc-800/60 ${snapshot.isDragging ? "bg-zinc-800" : "hover:bg-zinc-800/30"}`}>
          <td className="py-1.5 px-2 text-center align-middle">
            <div className="flex items-center gap-1 justify-center">
              <span {...provided.dragHandleProps} className="text-zinc-600 hover:text-zinc-300 cursor-grab"><GripVertical size={13} /></span>
              <span className="text-xs font-bold text-white w-4">{index + 1}</span>
            </div>
          </td>
          {!compact && (
            <>
              <td className="py-1.5 px-2 align-middle">
                <input list="strength-method-options" value={station.method || ""}
                  onChange={e => onChange(station.id, "method", e.target.value)}
                  onBlur={() => onBlurField(station)}
                  placeholder="Método..."
                  className="w-32 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-zinc-500" />
              </td>
              <td className="py-1.5 px-2 align-middle">
                <input list="strength-type-options" value={station.exercise_type || ""}
                  onChange={e => onChange(station.id, "exercise_type", e.target.value)}
                  onBlur={() => onBlurField(station)}
                  placeholder="Tipo..."
                  className="w-36 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-zinc-500" />
              </td>
            </>
          )}
          <td className="py-1.5 px-2 align-middle">
            <div className="flex items-start gap-2">
              <ExercisePreview station={station} />
              <StrengthExercisePicker squadId={squadId} onPick={ex => onPickLibrary(station.id, ex)} />
              <div className="space-y-1">
                <input value={station.exercise_name || ""} onChange={e => onChange(station.id, "exercise_name", e.target.value)}
                  onBlur={() => onBlurField(station)}
                  placeholder="Ejercicio..."
                  className="w-44 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-zinc-500" />
                <input value={station.video_url || ""} onChange={e => onChange(station.id, "video_url", e.target.value)}
                  onBlur={() => onBlurField(station)}
                  placeholder="URL YouTube/video..."
                  className="w-44 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-[10px] text-zinc-400 focus:outline-none focus:border-zinc-500" />
                {(station.library_strength_exercise_id || station.library_exercise_id) && (
                  <p className="text-[9px] text-emerald-300">Vinculado a biblioteca</p>
                )}
              </div>
            </div>
          </td>
          <td className="py-1.5 px-2 align-middle">
            <input value={station.volume || ""} onChange={e => onChange(station.id, "volume", e.target.value)}
              onBlur={() => onBlurField(station)}
              placeholder="3x8, 3+3..."
              className="w-24 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-amber-300 font-semibold focus:outline-none focus:border-zinc-500" />
          </td>
          {middleFields.map((field) => (
            <td key={field} className="py-1.5 px-2 align-middle">
              <input value={station[field] || ""} onChange={e => onChange(station.id, field, e.target.value)}
                onBlur={() => onBlurField(station)}
                placeholder="—"
                className="w-24 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-zinc-500" />
            </td>
          ))}
          {compact && (
            <>
              <td className="py-1.5 px-2 align-middle">
                <input list="strength-method-options" value={station.method || ""}
                  onChange={e => onChange(station.id, "method", e.target.value)}
                  onBlur={() => onBlurField(station)}
                  placeholder="Método..."
                  className="w-28 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-zinc-500" />
              </td>
              <td className="py-1.5 px-2 align-middle">
                <input list="strength-type-options" value={station.exercise_type || ""}
                  onChange={e => onChange(station.id, "exercise_type", e.target.value)}
                  onBlur={() => onBlurField(station)}
                  placeholder="Tipo..."
                  className="w-32 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-zinc-500" />
              </td>
            </>
          )}
          <td className="py-1.5 px-2 align-middle">
            <input value={station.notes || ""} onChange={e => onChange(station.id, "notes", e.target.value)}
              onBlur={() => onBlurField(station)}
              placeholder="Observaciones..."
              className="w-48 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-zinc-500" />
          </td>
          <td className="py-1.5 px-2 align-middle sticky right-0 bg-zinc-900 border-l border-zinc-800">
            <div className="flex items-center gap-1 justify-end">
              <button onClick={() => onMoveUp(index)} disabled={index === 0} title="Subir fila" className="p-1 text-zinc-600 hover:text-white disabled:opacity-30 transition-colors"><ChevronUp size={12} /></button>
              <button onClick={() => onMoveDown(index)} disabled={isLast} title="Bajar fila" className="p-1 text-zinc-600 hover:text-white disabled:opacity-30 transition-colors"><ChevronDown size={12} /></button>
              <button onClick={() => onDuplicate(station)} title="Duplicar fila" className="p-1 text-zinc-600 hover:text-blue-400 transition-colors"><Copy size={12} /></button>
              <button onClick={() => onDelete(station.id)} title="Eliminar fila" className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-colors"><Trash2 size={12} /><span className="text-[10px] font-semibold">Eliminar</span></button>
            </div>
          </td>
        </tr>
      )}
    </Draggable>
  );
}
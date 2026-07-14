import React, { useEffect, useState } from "react";
import { Droppable } from "@hello-pangea/dnd";
import { ChevronDown, ChevronUp, Copy, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import StrengthStationRow from "@/components/sessions/strength/StrengthStationRow";

const ICON_OPTIONS = [
  { value: "dumbbell", label: "Mancuerna" },
  { value: "activity", label: "Actividad" },
  { value: "zap", label: "Potencia" },
  { value: "shield", label: "Escudo" },
  { value: "target", label: "Objetivo" },
  { value: "users", label: "Grupo" },
  { value: "rotate", label: "Restaura" },
];

export default function StrengthGroupTable({ block, index, totalBlocks, stations, summary, icons, squadId, handlers }) {
  const [draft, setDraft] = useState({ name: block.name || "", color: block.color || "#22c55e", icon: block.icon || "dumbbell", description: block.description || "" });
  const Icon = icons[draft.icon] || icons.dumbbell;
  const hidden = !!block.hidden;

  useEffect(() => {
    setDraft({ name: block.name || "", color: block.color || "#22c55e", icon: block.icon || "dumbbell", description: block.description || "" });
  }, [block.id, block.name, block.color, block.icon, block.description]);

  function commitDraft(patch) {
    const changed = Object.fromEntries(Object.entries(patch).filter(([key, value]) => value !== (block[key] || (key === "color" ? "#22c55e" : key === "icon" ? "dumbbell" : ""))));
    if (Object.keys(changed).length) handlers.updateBlock(block.id, changed);
  }

  return (
    <div className={`bg-zinc-900 border rounded-xl overflow-hidden min-w-0 ${hidden ? "border-zinc-800 opacity-60" : "border-zinc-700"}`} style={{ borderColor: hidden ? undefined : `${draft.color || "#22c55e"}80` }}>
      <div className="px-4 py-3 border-b border-zinc-800" style={{ background: hidden ? "rgba(39,39,42,.55)" : `${draft.color || "#22c55e"}18` }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${draft.color || "#22c55e"}22`, color: draft.color || "#22c55e" }}><Icon size={19} /></span>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <input value={draft.name} onChange={e => setDraft(prev => ({ ...prev, name: e.target.value }))} onBlur={() => commitDraft({ name: draft.name })} className="min-w-[150px] flex-1 bg-zinc-950/40 border border-zinc-700 rounded-lg px-2 py-1 text-sm font-bold text-white focus:outline-none focus:border-zinc-500" />
                <input type="color" value={draft.color} onChange={e => setDraft(prev => ({ ...prev, color: e.target.value }))} onBlur={() => commitDraft({ color: draft.color })} className="w-8 h-8 bg-transparent border border-zinc-700 rounded-lg overflow-hidden" />
                <select value={draft.icon} onChange={e => { setDraft(prev => ({ ...prev, icon: e.target.value })); commitDraft({ icon: e.target.value }); }} className="bg-zinc-950/40 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-200 focus:outline-none">
                  {ICON_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <input value={draft.description} onChange={e => setDraft(prev => ({ ...prev, description: e.target.value }))} onBlur={() => commitDraft({ description: draft.description })} placeholder="Descripción del cuadro..." className="w-full bg-zinc-950/30 border border-zinc-800 rounded-lg px-2 py-1 text-[11px] text-zinc-300 focus:outline-none focus:border-zinc-600" />
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => handlers.moveBlock(index, -1)} disabled={index === 0} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 disabled:opacity-30"><ChevronUp size={14} /></button>
            <button onClick={() => handlers.moveBlock(index, 1)} disabled={index === totalBlocks - 1} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 disabled:opacity-30"><ChevronDown size={14} /></button>
            <button onClick={() => handlers.updateBlock(block.id, { hidden: !hidden })} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800">{hidden ? <Eye size={14} /> : <EyeOff size={14} />}</button>
            <button onClick={() => handlers.duplicateBlock(block)} className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-300 hover:bg-zinc-800"><Copy size={14} /></button>
            <button onClick={() => handlers.deleteBlock(block)} className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800"><Trash2 size={14} /></button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <Summary label="Ejercicios" value={summary.exercises} />
          <Summary label="Cantidad de series totales" value={summary.sets || "—"} />
        </div>
      </div>

      {!hidden && <>
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-950/20">
          <button onClick={() => handlers.addRow(block.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold"><Plus size={13} /> Agregar ejercicio</button>
          <span className="text-[10px] text-zinc-500">Los ejercicios se guardan dentro de este cuadro.</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/80">
                <th className="text-center py-2 px-2 text-zinc-500 font-medium w-12">N°</th>
                <th className="text-left py-2 px-2 text-zinc-500 font-medium">Ejercicio</th>
                <th className="text-left py-2 px-2 text-zinc-500 font-medium">Volumen</th>
                <th className="text-left py-2 px-2 text-zinc-500 font-medium">Series</th>
                <th className="text-left py-2 px-2 text-zinc-500 font-medium">Tiempo</th>
                <th className="text-left py-2 px-2 text-zinc-500 font-medium">Pausa</th>
                <th className="text-left py-2 px-2 text-zinc-500 font-medium">RIR</th>
                <th className="text-left py-2 px-2 text-zinc-500 font-medium">Objetivo</th>
                <th className="text-left py-2 px-2 text-zinc-500 font-medium">Grupo</th>
                <th className="text-left py-2 px-2 text-zinc-500 font-medium">Vector</th>
                <th className="text-left py-2 px-2 text-zinc-500 font-medium">Método</th>
                <th className="text-left py-2 px-2 text-zinc-500 font-medium">Tipo</th>
                <th className="text-left py-2 px-2 text-zinc-500 font-medium">Obs.</th>
                <th className="py-2 px-2 text-right text-zinc-500 font-medium sticky right-0 bg-zinc-900 border-l border-zinc-800">Acciones</th>
              </tr>
            </thead>
            <Droppable droppableId={block.id}>
              {(provided) => <tbody ref={provided.innerRef} {...provided.droppableProps}>
                {stations.map((station, rowIndex) => <StrengthStationRow key={station.id} station={station} index={rowIndex} squadId={squadId} compact onChange={handlers.onChange} onBlurField={handlers.onBlurField} onPickLibrary={handlers.onPickLibrary} onDuplicate={handlers.onDuplicate} onDelete={handlers.onDelete} onMoveUp={() => handlers.onMoveInBlock(block.id, rowIndex, -1)} onMoveDown={() => handlers.onMoveInBlock(block.id, rowIndex, 1)} isLast={rowIndex === stations.length - 1} />)}
                {stations.length === 0 && <tr><td colSpan={14} className="text-center text-zinc-600 py-6">Sin ejercicios en este cuadro</td></tr>}
                {provided.placeholder}
              </tbody>}
            </Droppable>
          </table>
        </div>
      </>}
    </div>
  );
}

function Summary({ label, value }) {
  return <div className="rounded-lg border border-zinc-800 bg-zinc-950/35 px-2 py-1.5"><p className="text-[9px] text-zinc-500">{label}</p><p className="text-xs font-bold text-zinc-100 mt-0.5">{value}</p></div>;
}
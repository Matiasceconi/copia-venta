import React from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function ExerciseTypeSelector({ value, options, onChange, onAdd, onEdit, onDelete }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] text-zinc-400 block">Tipo</label>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onAdd} title="Agregar tipo" className="p-1 rounded text-zinc-500 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors">
            <Plus size={11} />
          </button>
          <button type="button" onClick={() => onEdit(value)} title="Editar tipo" className="p-1 rounded text-zinc-500 hover:text-blue-300 hover:bg-blue-500/10 transition-colors">
            <Pencil size={11} />
          </button>
          <button type="button" onClick={() => onDelete(value)} title="Eliminar tipo" className="p-1 rounded text-zinc-500 hover:text-red-300 hover:bg-red-500/10 transition-colors">
            <Trash2 size={11} />
          </button>
        </div>
      </div>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-2 text-xs text-white focus:outline-none">
        {options.map(type => <option key={type} value={type}>{type}</option>)}
      </select>
    </div>
  );
}
import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Eye, EyeOff, GripVertical, Plus, Trash2 } from "lucide-react";

const DEFAULT_COLOR = { color: "#fef3c7", text_color: "#92400e", border_color: "#fcd34d" };

function textForColor(hex) {
  const clean = String(hex || "#ffffff").replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#0f172a" : "#ffffff";
}

export default function PhysicalObjectiveManager({ objectives = [], onRefresh, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [drafts, setDrafts] = useState([]);
  const sorted = [...drafts].sort((a, b) => (a.order || 0) - (b.order || 0));

  useEffect(() => {
    setDrafts(objectives.map((item, index) => ({ order: index + 1, active: true, hidden: false, ...item })));
  }, [objectives]);

  async function saveField(item, patch) {
    await base44.entities.PhysicalObjective.update(item.id, patch);
    onRefresh?.();
  }

  async function createObjective() {
    const maxOrder = Math.max(0, ...objectives.map((item) => Number(item.order || 0)));
    await base44.entities.PhysicalObjective.create({ name: "Nuevo objetivo", ...DEFAULT_COLOR, order: maxOrder + 1, hidden: false, active: true });
    onRefresh?.();
    setOpen(true);
  }

  async function move(item, direction) {
    const idx = sorted.findIndex((row) => row.id === item.id);
    const other = sorted[idx + direction];
    if (!other) return;
    await Promise.all([
      base44.entities.PhysicalObjective.update(item.id, { order: other.order || idx + 1 }),
      base44.entities.PhysicalObjective.update(other.id, { order: item.order || idx + 1 }),
    ]);
    onRefresh?.();
  }

  async function remove(item) {
    await base44.entities.PhysicalObjective.delete(item.id);
    onRefresh?.();
  }

  function updateDraft(id, patch) {
    setDrafts((prev) => prev.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-zinc-50">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-zinc-500">Administrar objetivos físicos</p>
          <p className="text-sm font-bold text-zinc-900">Crear, editar colores, ordenar y ocultar objetivos</p>
        </div>
        <span className="text-xs font-black text-emerald-700">{open ? "Cerrar" : "Abrir"}</span>
      </button>
      {open && (
        <div className="border-t border-zinc-100 p-3 space-y-2">
          {sorted.map((item, index) => (
            <div key={item.id} className="grid grid-cols-[24px_1fr_76px_74px_86px_64px] gap-2 items-center rounded-xl border border-zinc-100 bg-zinc-50 p-2">
              <GripVertical size={16} className="text-zinc-300" />
              <input
                value={item.name || ""}
                onChange={(e) => updateDraft(item.id, { name: e.target.value })}
                onBlur={() => saveField(item, { name: item.name })}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <input
                type="color"
                value={item.color || DEFAULT_COLOR.color}
                onChange={(e) => updateDraft(item.id, { color: e.target.value, border_color: e.target.value, text_color: textForColor(e.target.value) })}
                onBlur={() => saveField(item, { color: item.color, border_color: item.color, text_color: item.text_color })}
                className="h-9 w-full rounded-lg border border-zinc-200 bg-white p-1"
              />
              <div className="rounded-lg px-2 py-2 text-[10px] font-black text-center truncate" style={{ backgroundColor: item.color || DEFAULT_COLOR.color, color: item.text_color || DEFAULT_COLOR.text_color, border: `1px solid ${item.border_color || item.color || DEFAULT_COLOR.border_color}` }}>
                Vista
              </div>
              <div className="flex gap-1">
                <button onClick={() => move(item, -1)} disabled={index === 0} className="px-2 py-1.5 rounded-lg bg-white border border-zinc-200 text-xs font-black disabled:opacity-30">↑</button>
                <button onClick={() => move(item, 1)} disabled={index === sorted.length - 1} className="px-2 py-1.5 rounded-lg bg-white border border-zinc-200 text-xs font-black disabled:opacity-30">↓</button>
                <button onClick={() => saveField(item, { hidden: !item.hidden })} className="px-2 py-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-500">{item.hidden ? <EyeOff size={14} /> : <Eye size={14} />}</button>
              </div>
              <button onClick={() => remove(item)} className="px-2 py-2 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs font-black flex items-center justify-center gap-1"><Trash2 size={13} /> Borrar</button>
            </div>
          ))}
          <button onClick={createObjective} className="w-full rounded-xl border border-dashed border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 flex items-center justify-center gap-2"><Plus size={14} /> Crear objetivo físico</button>
        </div>
      )}
    </div>
  );
}
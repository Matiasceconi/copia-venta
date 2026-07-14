import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { GripVertical, Plus, Trash2 } from "lucide-react";

export default function PlannerDropdownOptionManager({ title, group, options = [], onRefresh }) {
  const [drafts, setDrafts] = useState([]);
  const sorted = [...drafts].sort((a, b) => (a.order || 0) - (b.order || 0));

  useEffect(() => {
    setDrafts(options.map((item, index) => ({ order: index + 1, active: true, ...item })));
  }, [options]);

  async function saveField(item, patch) {
    await base44.entities.PlannerDropdownOption.update(item.id, patch);
    onRefresh?.();
  }

  async function createOption() {
    const maxOrder = Math.max(0, ...options.map((item) => Number(item.order || 0)));
    await base44.entities.PlannerDropdownOption.create({ group, label: "Nueva opción", order: maxOrder + 1, active: true });
    onRefresh?.();
  }

  async function move(item, direction) {
    const idx = sorted.findIndex((row) => row.id === item.id);
    const other = sorted[idx + direction];
    if (!other) return;
    await Promise.all([
      base44.entities.PlannerDropdownOption.update(item.id, { order: other.order || idx + 1 }),
      base44.entities.PlannerDropdownOption.update(other.id, { order: item.order || idx + 1 }),
    ]);
    onRefresh?.();
  }

  async function remove(item) {
    await base44.entities.PlannerDropdownOption.delete(item.id);
    onRefresh?.();
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <p className="text-xs font-black uppercase tracking-wide text-zinc-500">{title}</p>
        <p className="text-sm text-zinc-500">Agregar, editar, eliminar y ordenar opciones.</p>
      </div>
      <div className="space-y-2">
        {sorted.map((item, index) => (
          <div key={item.id} className="grid grid-cols-[24px_1fr_82px_56px] gap-2 items-center rounded-xl border border-zinc-100 bg-zinc-50 p-2">
            <GripVertical size={16} className="text-zinc-300" />
            <input value={item.label || ""} onChange={(e) => setDrafts(prev => prev.map(row => row.id === item.id ? { ...row, label: e.target.value } : row))} onBlur={() => saveField(item, { label: item.label })} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
            <div className="flex gap-1">
              <button onClick={() => move(item, -1)} disabled={index === 0} className="px-2 py-1.5 rounded-lg bg-white border border-zinc-200 text-xs font-black disabled:opacity-30">↑</button>
              <button onClick={() => move(item, 1)} disabled={index === sorted.length - 1} className="px-2 py-1.5 rounded-lg bg-white border border-zinc-200 text-xs font-black disabled:opacity-30">↓</button>
            </div>
            <button onClick={() => remove(item)} className="px-2 py-2 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs font-black flex items-center justify-center"><Trash2 size={13} /></button>
          </div>
        ))}
        <button onClick={createOption} className="w-full rounded-xl border border-dashed border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 flex items-center justify-center gap-2"><Plus size={14} /> Agregar opción</button>
      </div>
    </section>
  );
}
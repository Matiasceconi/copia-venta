import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X } from "lucide-react";

const EMPTY_FORM = { title: "", type: "", time: "", duration_minutes: "", location: "", notes: "", color: "blue" };
const COLORS = ["blue", "green", "yellow", "orange", "red", "purple", "pink", "cyan"];
const COLOR_DOT = {
  blue: "bg-blue-500", green: "bg-emerald-500", yellow: "bg-yellow-500", orange: "bg-orange-500",
  red: "bg-red-500", purple: "bg-violet-500", pink: "bg-pink-500", cyan: "bg-cyan-500",
};

export default function QuickEventModal({ open, onClose, onSaved, event, date, squadId, squadName }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(event ? { ...EMPTY_FORM, ...event } : { ...EMPTY_FORM, date });
  }, [open, event, date]);

  if (!open) return null;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.title) return;
    setSaving(true);
    const payload = {
      ...form,
      date: event ? (event.date || date) : date,
      duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : undefined,
      squad_id: squadId,
      squad_name: squadName,
    };
    if (event?.id) {
      await base44.entities.DayEvent.update(event.id, payload);
    } else {
      await base44.entities.DayEvent.create(payload);
    }
    setSaving(false);
    onSaved();
    onClose();
  }

  async function handleDelete() {
    if (!event?.id) return;
    setSaving(true);
    await base44.entities.DayEvent.delete(event.id);
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 w-full max-w-sm mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-sm">{event ? "Editar actividad" : "Nueva actividad"}</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={16} /></button>
        </div>
        <div className="space-y-2.5">
          <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500" placeholder="Título *" value={form.title} onChange={(e) => set("title", e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <input className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500" placeholder="Tipo (ej: Comida)" value={form.type} onChange={(e) => set("type", e.target.value)} />
            <input type="time" className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" value={form.time} onChange={(e) => set("time", e.target.value)} />
            <input type="number" className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500" placeholder="Duración (min)" value={form.duration_minutes} onChange={(e) => set("duration_minutes", e.target.value)} />
            <input className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500" placeholder="Lugar" value={form.location} onChange={(e) => set("location", e.target.value)} />
          </div>
          <textarea rows={2} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none" placeholder="Notas..." value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          <div className="flex gap-1.5 items-center pt-1">
            {COLORS.map((c) => (
              <button key={c} onClick={() => set("color", c)} className={`w-5 h-5 rounded-full border-2 transition-all ${COLOR_DOT[c]} ${form.color === c ? "border-white scale-110" : "border-transparent opacity-50 hover:opacity-100"}`} />
            ))}
          </div>
        </div>
        <div className="flex justify-between items-center gap-2 mt-5">
          {event ? (
            <button onClick={handleDelete} disabled={saving} className="px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors">Eliminar</button>
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={!form.title || saving} className="px-4 py-2 rounded-lg text-sm bg-white text-zinc-900 font-semibold hover:bg-zinc-200 disabled:opacity-40 transition-colors">
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
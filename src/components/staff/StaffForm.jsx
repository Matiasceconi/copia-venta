import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const ALL_ROLES = ["entrenador", "PF", "analista", "médico", "kinesiólogo", "nutricionista", "utilero", "coordinador", "dirigente", "admin"];

export default function StaffForm({ member, squads, onSaved, onClose }) {
  const isEdit = !!member;
  const [form, setForm] = useState({
    first_name: member?.first_name || "",
    last_name: member?.last_name || "",
    email: member?.email || "",
    phone: member?.phone || "",
    role: member?.role || "entrenador",
    job_title: member?.job_title || "",
    squad_ids: member?.squad_ids || [],
    active: member?.active !== false,
    notes: member?.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function toggleSquad(id) {
    setForm(f => ({
      ...f,
      squad_ids: f.squad_ids.includes(id)
        ? f.squad_ids.filter(s => s !== id)
        : [...f.squad_ids, id],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    const selectedSquads = squads.filter(s => form.squad_ids.includes(s.id));
    const payload = {
      ...form,
      squad_names: selectedSquads.map(s => s.name),
    };
    let saved;
    if (isEdit) {
      saved = await base44.entities.StaffMember.update(member.id, payload);
    } else {
      saved = await base44.entities.StaffMember.create(payload);
    }
    toast({ title: isEdit ? "✓ Miembro actualizado" : "✓ Miembro creado" });
    onSaved({ ...payload, id: saved.id || member?.id }, isEdit);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <p className="text-sm font-semibold text-white">{isEdit ? "Editar miembro" : "Nuevo miembro del staff"}</p>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-zinc-400 mb-1 block">Nombre *</label>
              <input required value={form.first_name} onChange={e => setF("first_name", e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 mb-1 block">Apellido *</label>
              <input required value={form.last_name} onChange={e => setF("last_name", e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 mb-1 block">Email</label>
              <input type="email" value={form.email} onChange={e => setF("email", e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 mb-1 block">Teléfono</label>
              <input value={form.phone} onChange={e => setF("phone", e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 mb-1 block">Rol *</label>
              <select value={form.role} onChange={e => setF("role", e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                {ALL_ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 mb-1 block">Cargo / Título</label>
              <input value={form.job_title} onChange={e => setF("job_title", e.target.value)}
                placeholder="ej: Preparador Físico Principal"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
            </div>
          </div>

          {/* Squad assignment */}
          <div>
            <label className="text-[10px] text-zinc-400 mb-2 block">Planteles asignados</label>
            <div className="flex flex-wrap gap-2">
              {squads.map(s => {
                const selected = form.squad_ids.includes(s.id);
                return (
                  <button key={s.id} type="button" onClick={() => toggleSquad(s.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      selected
                        ? "bg-yellow-500 text-zinc-900 border-yellow-500"
                        : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500"
                    }`}>
                    {s.name}
                  </button>
                );
              })}
              {squads.length === 0 && <p className="text-xs text-zinc-600">Sin planteles creados</p>}
            </div>
          </div>

          <div>
            <label className="text-[10px] text-zinc-400 mb-1 block">Notas</label>
            <textarea value={form.notes} onChange={e => setF("notes", e.target.value)}
              rows={2} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none resize-none" />
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setF("active", !form.active)}
              className={`w-10 h-5 rounded-full transition-colors relative ${form.active ? "bg-emerald-500" : "bg-zinc-700"}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.active ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
            <span className="text-xs text-zinc-400">{form.active ? "Activo" : "Inactivo"}</span>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm hover:bg-zinc-700 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 bg-white text-zinc-900 font-semibold rounded-lg text-sm hover:bg-zinc-200 transition-colors disabled:opacity-50">
              {saving ? "Guardando..." : isEdit ? "Actualizar" : "Crear miembro"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
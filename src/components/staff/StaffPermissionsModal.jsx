import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Shield, Check, Mail } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function StaffPermissionsModal({ member, squads, existingAccess, onSaved, onClose }) {
  const [roles, setRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [form, setForm] = useState(() => ({
    user_email: existingAccess?.user_email || member.email || "",
    role_ids: existingAccess?.role_ids || [],
    all_squads: existingAccess?.all_squads || false,
    squad_ids: existingAccess?.squad_ids || member.squad_ids || [],
    squad_names: existingAccess?.squad_names || member.squad_names || [],
    active: existingAccess ? existingAccess.active !== false : true,
    notes: existingAccess?.notes || "",
  }));

  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.AppRole.filter({ active: true }, "name", 200).then(r => {
      setRoles(r);
      setLoadingRoles(false);
    });
  }, []);

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function toggleSquad(id) {
    setForm(f => {
      const ids = f.squad_ids.includes(id) ? f.squad_ids.filter(s => s !== id) : [...f.squad_ids, id];
      const names = squads.filter(s => ids.includes(s.id)).map(s => s.name);
      return { ...f, squad_ids: ids, squad_names: names };
    });
  }

  function toggleRole(id) {
    setForm(f => ({
      ...f,
      role_ids: f.role_ids.includes(id) ? f.role_ids.filter(r => r !== id) : [...f.role_ids, id],
    }));
  }

  async function handleSave() {
    if (!form.user_email) {
      toast({ title: "El email es obligatorio para crear un acceso", variant: "destructive" });
      return;
    }
    setSaving(true);
    const roleNames = roles.filter(r => form.role_ids.includes(r.id)).map(r => r.name);
    const payload = {
      ...form,
      role: roleNames.join(", "),
      staff_id: member.id,
      staff_name: `${member.first_name} ${member.last_name}`,
      user_name: `${member.first_name} ${member.last_name}`,
    };
    let saved;
    if (existingAccess) {
      saved = await base44.entities.UserAccess.update(existingAccess.id, payload);
      toast({ title: "✓ Permisos actualizados" });
    } else {
      saved = await base44.entities.UserAccess.create(payload);
      toast({ title: "✓ Cuenta de acceso creada" });
    }
    setSaving(false);
    onSaved({ ...payload, id: saved?.id || existingAccess?.id });
  }

  async function handleInvite() {
    if (!form.user_email) return;
    setInviting(true);
    try {
      await base44.users.inviteUser(form.user_email, "user");
      toast({ title: `✓ Invitación enviada a ${form.user_email}` });
    } catch (e) {
      toast({ title: "Error al invitar: " + e.message, variant: "destructive" });
    }
    setInviting(false);
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg my-4">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-blue-400" />
              <p className="text-sm font-bold text-white">Acceso y Permisos</p>
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">{member.first_name} {member.last_name} · {member.role}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Email + invite */}
          <div>
            <label className="text-[10px] text-zinc-400 mb-1 block">Email de usuario *</label>
            <div className="flex gap-2">
              <input
                value={form.user_email}
                onChange={e => setF("user_email", e.target.value)}
                placeholder="usuario@email.com"
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={handleInvite}
                disabled={!form.user_email || inviting}
                className="flex items-center gap-1.5 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg text-xs transition-colors disabled:opacity-40"
              >
                <Mail size={11} /> {inviting ? "..." : "Invitar"}
              </button>
            </div>
            <p className="text-[10px] text-zinc-600 mt-1">Envía una invitación para que el usuario pueda ingresar a la plataforma.</p>
          </div>

          {/* Roles (multi) */}
          <div>
            <label className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block mb-2">
              Roles asignados <span className="text-zinc-600 normal-case font-normal">(un usuario puede tener varios)</span>
            </label>
            {loadingRoles ? (
              <p className="text-[10px] text-zinc-600">Cargando roles...</p>
            ) : roles.length === 0 ? (
              <p className="text-[10px] text-zinc-600">
                No hay roles creados. Creá roles desde Administración → Roles, Áreas y Permisos.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {roles.map(r => (
                  <button key={r.id} type="button" onClick={() => toggleRole(r.id)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors ${
                      form.role_ids.includes(r.id)
                        ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                    }`}>
                    {form.role_ids.includes(r.id) && <Check size={8} className="inline mr-1" />}
                    {r.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Planteles */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Planteles</label>
              <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-zinc-400">
                <input type="checkbox" checked={form.all_squads} onChange={e => setF("all_squads", e.target.checked)}
                  className="w-3 h-3 accent-yellow-400" />
                Todos los planteles
              </label>
            </div>
            {!form.all_squads && (
              <div className="flex flex-wrap gap-1.5">
                {squads.map(s => (
                  <button key={s.id} type="button" onClick={() => toggleSquad(s.id)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors ${
                      form.squad_ids.includes(s.id)
                        ? "bg-yellow-400/20 border-yellow-400/40 text-yellow-300"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                    }`}>
                    {form.squad_ids.includes(s.id) && <Check size={8} className="inline mr-1" />}
                    {s.name}
                  </button>
                ))}
                {squads.length === 0 && <p className="text-[10px] text-zinc-600">No hay planteles creados.</p>}
              </div>
            )}
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3 pt-1">
            <button type="button" onClick={() => setF("active", !form.active)}
              className={`w-9 h-5 rounded-full relative transition-colors ${form.active ? "bg-emerald-500" : "bg-zinc-700"}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.active ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
            <span className="text-xs text-zinc-400">Cuenta {form.active ? "activa" : "desactivada"}</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2 border-t border-zinc-800">
            <button type="button" onClick={onClose}
              className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-xs hover:bg-zinc-700 transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 bg-white text-zinc-900 font-semibold rounded-lg text-xs hover:bg-zinc-200 transition-colors disabled:opacity-50">
              {saving ? "Guardando..." : existingAccess ? "Actualizar permisos" : "Crear acceso"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
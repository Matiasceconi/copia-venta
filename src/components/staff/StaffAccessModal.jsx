import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Shield } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const MODULES = [
  "Dashboard", "Estado del Plantel", "Planteles", "Sesiones",
  "Partidos", "GPS", "Rendimiento", "Lesiones",
  "Calendario", "Administración", "Bibliotecas"
];

const ROLE_ACCESS = ["admin", "editor", "lectura", "restringido"];

const EMPTY_ACCESS = {
  role_access: "lectura",
  allowed_squads: [],
  allowed_modules: [],
  can_create: false,
  can_edit: false,
  can_delete: false,
  can_export: false,
  active: true,
  user_email: "",
};

export default function StaffAccessModal({ member, squads, onClose }) {
  const [access, setAccess] = useState(null);
  const [form, setForm] = useState(EMPTY_ACCESS);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.StaffAccess.filter({ staff_id: member.id }, "-created_date", 5).then(rows => {
      if (rows.length > 0) {
        setAccess(rows[0]);
        setForm({
          role_access: rows[0].role_access || "lectura",
          allowed_squads: rows[0].allowed_squads || [],
          allowed_modules: rows[0].allowed_modules || [],
          can_create: rows[0].can_create || false,
          can_edit: rows[0].can_edit || false,
          can_delete: rows[0].can_delete || false,
          can_export: rows[0].can_export || false,
          active: rows[0].active !== false,
          user_email: rows[0].user_email || "",
        });
      }
    });
  }, [member.id]);

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function toggleArr(key, val) {
    setForm(f => ({
      ...f,
      [key]: f[key].includes(val) ? f[key].filter(x => x !== val) : [...f[key], val],
    }));
  }

  async function handleSave() {
    setSaving(true);
    const payload = {
      ...form,
      staff_id: member.id,
      staff_name: `${member.first_name} ${member.last_name}`,
    };
    if (access) {
      await base44.entities.StaffAccess.update(access.id, payload);
    } else {
      const created = await base44.entities.StaffAccess.create(payload);
      setAccess(created);
    }
    toast({ title: "✓ Permisos guardados" });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Shield size={15} className="text-blue-400" />
            <p className="text-sm font-semibold text-white">Permisos — {member.first_name} {member.last_name}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Email */}
          <div>
            <label className="text-[10px] text-zinc-400 mb-1 block">Email de usuario en la app</label>
            <input value={form.user_email} onChange={e => setF("user_email", e.target.value)}
              placeholder="usuario@email.com"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
          </div>

          {/* Role */}
          <div>
            <label className="text-[10px] text-zinc-400 mb-2 block">Nivel de acceso</label>
            <div className="flex gap-2 flex-wrap">
              {ROLE_ACCESS.map(r => (
                <button key={r} type="button" onClick={() => setF("role_access", r)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    form.role_access === r
                      ? "bg-blue-500 text-white border-blue-500"
                      : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500"
                  }`}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Squads */}
          <div>
            <label className="text-[10px] text-zinc-400 mb-2 block">Planteles con acceso</label>
            <div className="flex flex-wrap gap-2">
              {squads.map(s => (
                <button key={s.id} type="button" onClick={() => toggleArr("allowed_squads", s.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    form.allowed_squads.includes(s.id)
                      ? "bg-yellow-500 text-zinc-900 border-yellow-500"
                      : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500"
                  }`}>
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* Modules */}
          <div>
            <label className="text-[10px] text-zinc-400 mb-2 block">Módulos habilitados</label>
            <div className="flex flex-wrap gap-2">
              {MODULES.map(mod => (
                <button key={mod} type="button" onClick={() => toggleArr("allowed_modules", mod)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    form.allowed_modules.includes(mod)
                      ? "bg-emerald-500/80 text-white border-emerald-500"
                      : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500"
                  }`}>
                  {mod}
                </button>
              ))}
            </div>
          </div>

          {/* Permissions */}
          <div>
            <label className="text-[10px] text-zinc-400 mb-3 block">Permisos de acción</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "can_create", label: "Puede crear" },
                { key: "can_edit", label: "Puede editar" },
                { key: "can_delete", label: "Puede eliminar" },
                { key: "can_export", label: "Puede exportar" },
              ].map(({ key, label }) => (
                <button key={key} type="button" onClick={() => setF(key, !form[key])}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors text-left ${
                    form[key]
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                      : "bg-zinc-800 text-zinc-500 border-zinc-700"
                  }`}>
                  <span className={`w-3 h-3 rounded border flex-shrink-0 ${form[key] ? "bg-emerald-400 border-emerald-400" : "border-zinc-600"}`} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Active */}
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setF("active", !form.active)}
              className={`w-10 h-5 rounded-full transition-colors relative ${form.active ? "bg-emerald-500" : "bg-zinc-700"}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.active ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
            <span className="text-xs text-zinc-400">Acceso {form.active ? "activo" : "desactivado"}</span>
          </div>

          <div className="flex gap-2 justify-end pt-2 border-t border-zinc-800">
            <button type="button" onClick={onClose}
              className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm hover:bg-zinc-700 transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 bg-white text-zinc-900 font-semibold rounded-lg text-sm hover:bg-zinc-200 transition-colors disabled:opacity-50">
              {saving ? "Guardando..." : "Guardar permisos"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
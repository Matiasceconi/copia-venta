import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { AREAS, MODULES, MODULE_ACTIONS, PAGES } from "@/lib/areasConfig";

function initialModulePermissions(role) {
  const stored = role?.module_permissions || {};
  const out = {};
  MODULES.forEach((m) => {
    const legacyVisible = (role?.allowed_pages || []).some((p) => PAGES.find((page) => page.path === p)?.module_id === m.id);
    out[m.id] = {
      can_view: stored[m.id]?.can_view ?? legacyVisible,
      can_create: stored[m.id]?.can_create ?? !!role?.can_create,
      can_edit: stored[m.id]?.can_edit ?? !!role?.can_edit,
      can_delete: stored[m.id]?.can_delete ?? !!role?.can_delete,
      can_export: stored[m.id]?.can_export ?? !!role?.can_export,
      can_admin: stored[m.id]?.can_admin ?? false,
    };
  });
  return out;
}

export default function RoleFormModal({ existingRole, onSaved, onClose }) {
  const [form, setForm] = useState(() => ({
    name: existingRole?.name || "",
    description: existingRole?.description || "",
    areas: existingRole?.areas || [],
    module_permissions: initialModulePermissions(existingRole),
    can_admin: existingRole?.can_admin || false,
    active: existingRole ? existingRole.active !== false : true,
  }));
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  function setF(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  function toggleArea(id) { setForm((f) => ({ ...f, areas: f.areas.includes(id) ? f.areas.filter((a) => a !== id) : [...f.areas, id] })); }
  function toggleModulePermission(moduleId, key) { setForm((f) => ({ ...f, module_permissions: { ...f.module_permissions, [moduleId]: { ...f.module_permissions[moduleId], [key]: !f.module_permissions[moduleId]?.[key] } } })); }

  async function handleSave() {
    if (!form.name.trim()) { toast({ title: "El nombre del rol es obligatorio", variant: "destructive" }); return; }
    const allowed_pages = PAGES.filter((p) => form.module_permissions[p.module_id]?.can_view).map((p) => p.path);
    const aggregate = Object.values(form.module_permissions).reduce((acc, p) => ({
      can_create: acc.can_create || !!p.can_create,
      can_edit: acc.can_edit || !!p.can_edit,
      can_delete: acc.can_delete || !!p.can_delete,
      can_export: acc.can_export || !!p.can_export,
    }), { can_create: false, can_edit: false, can_delete: false, can_export: false });
    const payload = { ...form, allowed_pages, can_view: allowed_pages.length > 0, ...aggregate };
    setSaving(true);
    if (existingRole) { await base44.entities.AppRole.update(existingRole.id, payload); toast({ title: "✓ Rol actualizado" }); }
    else { await base44.entities.AppRole.create(payload); toast({ title: "✓ Rol creado" }); }
    setSaving(false); onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-5xl my-4">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800"><p className="text-sm font-bold text-white">{existingRole ? "Editar rol" : "Nuevo rol"}</p><button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={16} /></button></div>
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="text-[10px] text-zinc-400 mb-1 block">Nombre del rol *</label><input value={form.name} onChange={(e) => setF("name", e.target.value)} placeholder="Ej: Preparador Físico" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none" /></div><div><label className="text-[10px] text-zinc-400 mb-1 block">Descripción</label><input value={form.description} onChange={(e) => setF("description", e.target.value)} placeholder="Descripción breve del rol" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none" /></div></div>
          <div><label className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block mb-2">Áreas organizativas</label><div className="flex flex-wrap gap-1.5">{AREAS.map((a) => <button key={a.id} type="button" onClick={() => toggleArea(a.id)} className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors ${form.areas.includes(a.id) ? "bg-violet-500/20 border-violet-500/40 text-violet-300" : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}>{form.areas.includes(a.id) && <Check size={8} className="inline mr-1" />}{a.name}</button>)}</div><p className="text-[10px] text-zinc-600 mt-1.5">Las áreas son organizativas; la navegación se controla por módulos independientes.</p></div>
          <div><div className="flex items-center justify-between mb-2"><label className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Módulos y permisos</label><button type="button" onClick={() => setF("can_admin", !form.can_admin)} className={`px-3 py-1 rounded-lg text-[10px] font-bold border ${form.can_admin ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-300" : "bg-zinc-800 border-zinc-700 text-zinc-500"}`}>Administrador total</button></div><div className="overflow-x-auto border border-zinc-800 rounded-xl"><table className="w-full text-xs"><thead><tr className="bg-zinc-950 text-zinc-400"><th className="text-left p-3 min-w-48">Módulo</th>{MODULE_ACTIONS.map((a) => <th key={a.key} className="p-3 text-center min-w-24">{a.label}</th>)}</tr></thead><tbody>{MODULES.map((m) => <tr key={m.id} className="border-t border-zinc-800"><td className="p-3 text-white font-semibold">{m.label}</td>{MODULE_ACTIONS.map((a) => <td key={a.key} className="p-3 text-center"><button type="button" onClick={() => toggleModulePermission(m.id, a.key)} className={`w-5 h-5 rounded border ${form.module_permissions[m.id]?.[a.key] ? "bg-emerald-400 border-emerald-400" : "border-zinc-600 bg-zinc-800"}`}>{form.module_permissions[m.id]?.[a.key] && <Check size={12} className="text-zinc-950 mx-auto" />}</button></td>)}</tr>)}</tbody></table></div></div>
          <div className="flex items-center gap-3 pt-1"><button type="button" onClick={() => setF("active", !form.active)} className={`w-9 h-5 rounded-full relative transition-colors ${form.active ? "bg-emerald-500" : "bg-zinc-700"}`}><span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.active ? "translate-x-4" : "translate-x-0.5"}`} /></button><span className="text-xs text-zinc-400">Rol {form.active ? "activo" : "desactivado"}</span></div>
          <div className="flex gap-2 justify-end pt-2 border-t border-zinc-800"><button type="button" onClick={onClose} className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-xs hover:bg-zinc-700 transition-colors">Cancelar</button><button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-white text-zinc-900 font-semibold rounded-lg text-xs hover:bg-zinc-200 transition-colors disabled:opacity-50">{saving ? "Guardando..." : existingRole ? "Actualizar rol" : "Crear rol"}</button></div>
        </div>
      </div>
    </div>
  );
}
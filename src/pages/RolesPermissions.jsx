import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Edit2, Trash2, Shield } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { AREAS } from "@/lib/areasConfig";
import RoleFormModal from "@/components/admin/RoleFormModal";

export default function RolesPermissions() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const { toast } = useToast();

  async function load() {
    setLoading(true);
    const r = await base44.entities.AppRole.list("name", 200);
    setRoles(r);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(role) {
    await base44.entities.AppRole.update(role.id, { active: !role.active });
    setRoles(prev => prev.map(r => r.id === role.id ? { ...r, active: !role.active } : r));
  }

  async function remove(role) {
    if (!confirm(`¿Eliminar el rol "${role.name}"? Los usuarios que lo tengan asignado perderán esos permisos.`)) return;
    await base44.entities.AppRole.delete(role.id);
    toast({ title: "Rol eliminado" });
    load();
  }

  function areaName(id) { return AREAS.find(a => a.id === id)?.name || id; }

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><Shield size={16} className="text-blue-400" /> Roles, Áreas y Permisos</h2>
          <p className="text-zinc-500 text-xs mt-0.5">Definí roles con sus áreas, páginas permitidas y permisos por acción</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30 rounded-lg text-sm font-medium transition-colors">
          <Plus size={15} /> Nuevo rol
        </button>
      </div>

      {roles.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-10 text-center">
          <p className="text-zinc-500 text-sm">No hay roles creados todavía</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {roles.map(role => (
            <div key={role.id} className={`bg-zinc-900 border rounded-xl p-4 ${role.active === false ? "border-zinc-800 opacity-50" : "border-zinc-800"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-white font-semibold text-sm">{role.name}</p>
                  {role.description && <p className="text-zinc-500 text-xs mt-0.5">{role.description}</p>}
                </div>
                {role.can_admin && (
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 shrink-0">Admin total</span>
                )}
              </div>

              <div className="flex flex-wrap gap-1 mt-3">
                {(role.areas || []).map(a => (
                  <span key={a} className="text-[9px] px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/25 text-violet-300">{areaName(a)}</span>
                ))}
                {(role.areas || []).length === 0 && <span className="text-[9px] text-zinc-600">Sin áreas asignadas</span>}
              </div>

              <p className="text-[10px] text-zinc-500 mt-2">{(role.allowed_pages || []).length} página(s) permitida(s)</p>

              <div className="flex flex-wrap gap-1 mt-2">
                {["can_view", "can_create", "can_edit", "can_delete", "can_export"].filter(k => role[k]).map(k => (
                  <span key={k} className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">
                    {{ can_view: "Ver", can_create: "Crear", can_edit: "Editar", can_delete: "Eliminar", can_export: "Exportar" }[k]}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-800">
                <button onClick={() => toggleActive(role)} className={`text-[10px] font-medium ${role.active === false ? "text-zinc-500 hover:text-white" : "text-emerald-400 hover:text-emerald-300"}`}>
                  {role.active === false ? "Activar" : "Desactivar"}
                </button>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditing(role); setShowForm(true); }} className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors">
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => remove(role)} className="p-1.5 rounded hover:bg-red-900/40 text-zinc-500 hover:text-red-400 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <RoleFormModal
          existingRole={editing}
          onSaved={() => { setShowForm(false); setEditing(null); load(); }}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}
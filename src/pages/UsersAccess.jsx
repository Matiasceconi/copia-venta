import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useToast } from "@/components/ui/use-toast";
import { Shield, UserX, UserCheck, Mail, Edit2, AlertTriangle, Users } from "lucide-react";
import moment from "moment";
import StaffPermissionsModal from "@/components/staff/StaffPermissionsModal";

export default function UsersAccess() {
  const { squads, reloadWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [accesses, setAccesses] = useState([]);
  const [staffMap, setStaffMap] = useState({}); // staffId → StaffMember
  const [roleMap, setRoleMap] = useState({}); // roleId → AppRole
  const [orphanStaff, setOrphanStaff] = useState([]); // StaffMember sin UserAccess
  const [loading, setLoading] = useState(true);
  const [editAccess, setEditAccess] = useState(null); // { access, member }
  const [inviting, setInviting] = useState(null);

  async function load() {
    setLoading(true);
    const [allAccesses, allStaff, allRoles] = await Promise.all([
      base44.entities.UserAccess.list("-created_date", 200),
      base44.entities.StaffMember.filter({ active: true }, "first_name", 200),
      base44.entities.AppRole.list("name", 200),
    ]);

    // Build staffMap
    const sMap = {};
    allStaff.forEach(s => { sMap[s.id] = s; });
    setStaffMap(sMap);

    // Build roleMap
    const rMap = {};
    allRoles.forEach(r => { rMap[r.id] = r; });
    setRoleMap(rMap);

    // StaffMember ids that have a UserAccess
    const withAccess = new Set(allAccesses.map(a => a.staff_id).filter(Boolean));

    // Orphan = active staff without any UserAccess
    setOrphanStaff(allStaff.filter(s => !withAccess.has(s.id)));
    setAccesses(allAccesses);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(access) {
    await base44.entities.UserAccess.update(access.id, { active: !access.active });
    setAccesses(prev => prev.map(a => a.id === access.id ? { ...a, active: !access.active } : a));
    reloadWorkspace();
  }

  async function handleInvite(email) {
    setInviting(email);
    try {
      await base44.users.inviteUser(email, "user");
      toast({ title: `✓ Invitación enviada a ${email}` });
    } catch (e) {
      toast({ title: "Error al invitar: " + e.message, variant: "destructive" });
    }
    setInviting(null);
  }

  function handleSaved(savedAccess) {
    setAccesses(prev => {
      const idx = prev.findIndex(a => a.id === savedAccess.id);
      if (idx >= 0) return prev.map(a => a.id === savedAccess.id ? savedAccess : a);
      return [savedAccess, ...prev];
    });
    // Remove from orphan list if it was there
    setOrphanStaff(prev => prev.filter(s => s.id !== savedAccess.staff_id));
    setEditAccess(null);
    reloadWorkspace();
  }

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white">Usuarios y Accesos</h2>
        <p className="text-zinc-500 text-xs mt-0.5">
          Seguridad, roles y permisos · Todos los usuarios deben estar vinculados a un miembro del staff
        </p>
      </div>

      {/* Orphan staff warning */}
      {orphanStaff.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={15} className="text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-300 mb-1">
                {orphanStaff.length} miembro{orphanStaff.length > 1 ? "s" : ""} del staff sin cuenta de acceso
              </p>
              <div className="flex flex-wrap gap-2">
                {orphanStaff.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setEditAccess({ access: null, member: s })}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 rounded-full text-[10px] text-amber-300 hover:bg-amber-500/25 transition-colors"
                  >
                    <Shield size={9} /> {s.first_name} {s.last_name} — Crear acceso
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accounts table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
          <Users size={13} className="text-zinc-500" />
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Cuentas de usuario</span>
          <span className="ml-auto text-[10px] text-zinc-600">{accesses.length} registros</span>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left py-3 px-4 text-zinc-500 font-medium">Miembro del staff</th>
              <th className="text-left py-3 px-3 text-zinc-500 font-medium">Rol</th>
              <th className="text-left py-3 px-3 text-zinc-500 font-medium hidden sm:table-cell">Planteles</th>
              <th className="text-left py-3 px-3 text-zinc-500 font-medium hidden md:table-cell">Último acceso</th>
              <th className="text-left py-3 px-3 text-zinc-500 font-medium">Estado</th>
              <th className="py-3 px-3 text-zinc-500 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {accesses.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-zinc-600">
                  Sin cuentas de usuario configuradas
                </td>
              </tr>
            )}
            {accesses.map(acc => {
              const staff = staffMap[acc.staff_id];
              return (
                <tr key={acc.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      {staff?.photo_url
                        ? <img src={staff.photo_url} className="w-7 h-7 rounded-full object-cover shrink-0" alt="" />
                        : <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-300 shrink-0">
                            {(staff?.first_name?.[0] || acc.user_name?.[0] || "?")}
                          </div>
                      }
                      <div>
                        <p className="font-semibold text-white">{acc.staff_name || acc.user_name || "—"}</p>
                        <p className="text-zinc-500 text-[10px]">{acc.user_email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex flex-wrap gap-1">
                      {(acc.role_ids || []).length > 0 ? (acc.role_ids || []).map(rid => (
                        <span key={rid} className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded-full text-zinc-300 text-[10px] font-medium">
                          {roleMap[rid]?.name || "—"}
                        </span>
                      )) : (
                        <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded-full text-zinc-500 text-[10px]">
                          {acc.role || "Sin rol"}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 hidden sm:table-cell">
                    {acc.all_squads
                      ? <span className="text-emerald-400 text-[10px] font-semibold">Todos</span>
                      : <span className="text-zinc-400 text-[10px]">{(acc.squad_names || []).join(", ") || "—"}</span>
                    }
                  </td>
                  <td className="py-3 px-3 text-zinc-500 text-[10px] hidden md:table-cell">
                    {acc.last_seen ? moment(acc.last_seen).fromNow() : "Nunca"}
                  </td>
                  <td className="py-3 px-3">
                    <span className={`text-[10px] font-semibold ${acc.active ? "text-emerald-400" : "text-zinc-600"}`}>
                      {acc.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => handleInvite(acc.user_email)}
                        disabled={inviting === acc.user_email}
                        title="Reenviar invitación"
                        className="p-1.5 text-zinc-500 hover:text-blue-400 transition-colors"
                      >
                        <Mail size={12} />
                      </button>
                      <button
                        onClick={() => setEditAccess({ access: acc, member: staffMap[acc.staff_id] || { id: acc.staff_id, first_name: acc.user_name || "", last_name: "", role: "", squad_ids: acc.squad_ids || [], squad_names: acc.squad_names || [], email: acc.user_email } })}
                        title="Editar permisos"
                        className="p-1.5 text-zinc-500 hover:text-white transition-colors"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => toggleActive(acc)}
                        title={acc.active ? "Desactivar cuenta" : "Activar cuenta"}
                        className="p-1.5 text-zinc-500 hover:text-amber-400 transition-colors"
                      >
                        {acc.active ? <UserX size={12} /> : <UserCheck size={12} />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Permissions modal */}
      {editAccess && (
        <StaffPermissionsModal
          member={editAccess.member}
          squads={squads}
          existingAccess={editAccess.access}
          onSaved={handlePermsSaved}
          onClose={() => setEditAccess(null)}
        />
      )}
    </div>
  );

  function handlePermsSaved(savedAccess) {
    handleSaved(savedAccess);
  }
}
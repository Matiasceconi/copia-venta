import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Edit2, UserCheck, UserX, Shield, ChevronDown, Mail, Phone, Briefcase } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import StaffForm from "@/components/staff/StaffForm";
import StaffPermissionsModal from "@/components/staff/StaffPermissionsModal";

const ROLE_COLORS = {
  entrenador:    "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  PF:            "bg-blue-500/15 text-blue-300 border-blue-500/30",
  analista:      "bg-purple-500/15 text-purple-300 border-purple-500/30",
  "médico":      "bg-red-500/15 text-red-300 border-red-500/30",
  "kinesiólogo": "bg-orange-500/15 text-orange-300 border-orange-500/30",
  "nutricionista":"bg-green-500/15 text-green-300 border-green-500/30",
  utilero:       "bg-zinc-500/15 text-zinc-300 border-zinc-600",
  coordinador:   "bg-sky-500/15 text-sky-300 border-sky-500/30",
  dirigente:     "bg-pink-500/15 text-pink-300 border-pink-500/30",
  admin:         "bg-white/10 text-white border-white/20",
};

const ALL_ROLES = ["entrenador","PF","analista","médico","kinesiólogo","nutricionista","utilero","coordinador","dirigente","admin"];

export default function StaffManager() {
  const [members, setMembers] = useState([]);
  const [squads, setSquads] = useState([]);
  const [accessMap, setAccessMap] = useState({}); // staffId → UserAccess record
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [permsMember, setPermsMember] = useState(null);
  const [filterSquad, setFilterSquad] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const { toast } = useToast();

  async function load() {
    setLoading(true);
    const [m, s, accesses] = await Promise.all([
      base44.entities.StaffMember.list("-created_date", 200),
      base44.entities.Squad.list("name", 50),
      base44.entities.UserAccess.list("-created_date", 200),
    ]);
    setMembers(m);
    setSquads(s);
    // Build a map staffId → access record for quick lookup
    const map = {};
    accesses.forEach(a => { if (a.staff_id) map[a.staff_id] = a; });
    setAccessMap(map);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(member) {
    const updated = await base44.entities.StaffMember.update(member.id, { active: !member.active });
    setMembers(prev => prev.map(m => m.id === member.id ? { ...m, ...updated } : m));
    toast({ title: member.active ? "Miembro desactivado" : "Miembro activado" });
  }

  function openEdit(m) { setEditMember(m); setShowForm(true); }
  function openNew() { setEditMember(null); setShowForm(true); }

  function handleSaved(member, isEdit) {
    setMembers(prev => isEdit
      ? prev.map(m => m.id === member.id ? member : m)
      : [member, ...prev]);
    setShowForm(false);
    setEditMember(null);
  }

  function handlePermsSaved(access) {
    setAccessMap(prev => ({ ...prev, [access.staff_id]: access }));
    setPermsMember(null);
  }

  const filtered = members.filter(m => {
    if (filterRole && m.role !== filterRole) return false;
    if (filterSquad && !(m.squad_ids || []).includes(filterSquad)) return false;
    return true;
  });

  const active = filtered.filter(m => m.active);
  const inactive = filtered.filter(m => !m.active);

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Cuerpo Técnico y Staff</h2>
          <p className="text-xs text-zinc-500 mt-0.5">{active.length} miembros activos · Identidad laboral del equipo</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-white text-zinc-900 font-semibold text-sm rounded-lg hover:bg-zinc-200 transition-colors">
          <Plus size={14} /> Agregar miembro
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select value={filterSquad} onChange={e => setFilterSquad(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none">
          <option value="">Todos los planteles</option>
          {squads.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none">
          <option value="">Todos los roles</option>
          {ALL_ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </select>
      </div>

      {/* Active members */}
      {active.map(m => (
        <MemberCard key={m.id} member={m} squads={squads}
          access={accessMap[m.id] || null}
          onEdit={openEdit}
          onToggle={toggleActive}
          onPerms={() => setPermsMember(m)}
        />
      ))}

      {/* Inactive */}
      {inactive.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-xs text-zinc-500 uppercase tracking-wider font-medium py-2 select-none list-none flex items-center gap-1">
            <ChevronDown size={12} className="group-open:rotate-180 transition-transform" />
            Inactivos ({inactive.length})
          </summary>
          <div className="space-y-2 mt-2 opacity-60">
            {inactive.map(m => (
              <MemberCard key={m.id} member={m} squads={squads}
                access={accessMap[m.id] || null}
                onEdit={openEdit}
                onToggle={toggleActive}
                onPerms={() => setPermsMember(m)}
              />
            ))}
          </div>
        </details>
      )}

      {filtered.length === 0 && (
        <p className="text-zinc-600 text-sm text-center py-8">Sin miembros para los filtros seleccionados</p>
      )}

      {showForm && (
        <StaffForm
          member={editMember}
          squads={squads}
          onSaved={handleSaved}
          onClose={() => { setShowForm(false); setEditMember(null); }}
        />
      )}

      {permsMember && (
        <StaffPermissionsModal
          member={permsMember}
          squads={squads}
          existingAccess={accessMap[permsMember.id] || null}
          onSaved={handlePermsSaved}
          onClose={() => setPermsMember(null)}
        />
      )}
    </div>
  );
}

function MemberCard({ member, squads, access, onEdit, onToggle, onPerms }) {
  const roleClass = ROLE_COLORS[member.role] || ROLE_COLORS["utilero"];
  const squadNames = (member.squad_names || []).join(", ") || "Sin plantel";
  const hasAccess = !!access;

  return (
    <div className="flex items-center gap-4 p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl flex-wrap">
      {member.photo_url
        ? <img src={member.photo_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
        : <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center shrink-0 text-sm font-bold text-zinc-300">
            {(member.first_name?.[0] || "") + (member.last_name?.[0] || "")}
          </div>
      }
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{member.first_name} {member.last_name}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleClass}`}>{member.role}</span>
          {member.job_title && (
            <span className="flex items-center gap-1 text-[10px] text-zinc-400"><Briefcase size={9} />{member.job_title}</span>
          )}
          <span className="text-[10px] text-zinc-500">{squadNames}</span>
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {member.email && (
            <span className="flex items-center gap-1 text-[10px] text-zinc-600"><Mail size={9} />{member.email}</span>
          )}
          {member.phone && (
            <span className="flex items-center gap-1 text-[10px] text-zinc-600"><Phone size={9} />{member.phone}</span>
          )}
          {/* Access status indicator */}
          <span className={`flex items-center gap-1 text-[10px] font-medium ${hasAccess && access.active ? "text-emerald-400" : "text-zinc-600"}`}>
            <Shield size={9} />
            {hasAccess ? (access.active ? `Acceso: ${access.role}` : "Acceso inactivo") : "Sin cuenta de usuario"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onPerms} title="Gestionar acceso y permisos"
          className={`p-1.5 rounded-lg transition-colors ${hasAccess ? "text-blue-400 hover:text-blue-300" : "text-zinc-500 hover:text-blue-400"}`}>
          <Shield size={14} />
        </button>
        <button onClick={() => onEdit(member)} title="Editar datos del staff"
          className="p-1.5 rounded-lg text-zinc-500 hover:text-white transition-colors">
          <Edit2 size={14} />
        </button>
        <button onClick={() => onToggle(member)} title={member.active ? "Desactivar" : "Activar"}
          className={`p-1.5 rounded-lg transition-colors ${member.active ? "text-zinc-500 hover:text-red-400" : "text-zinc-600 hover:text-emerald-400"}`}>
          {member.active ? <UserX size={14} /> : <UserCheck size={14} />}
        </button>
      </div>
    </div>
  );
}
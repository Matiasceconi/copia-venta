import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ClipboardList, RefreshCw, Search } from "lucide-react";
import moment from "moment";
import "moment/locale/es";
moment.locale("es");

export default function AdminAudit() {
  const [accesses, setAccesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const records = await base44.entities.UserAccess.list("-last_seen", 200);
    setAccesses(records.filter(r => r.last_seen));
    setLoading(false);
  }

  const filtered = accesses.filter(a => {
    const q = search.toLowerCase();
    return !q || (a.user_email || "").toLowerCase().includes(q) || (a.staff_name || "").toLowerCase().includes(q) || (a.role || "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Auditoría</h2>
          <p className="text-zinc-500 text-xs mt-0.5">Registro de último acceso por usuario</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar usuario..."
              className="bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white w-44 focus:outline-none focus:border-zinc-600"
            />
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded-lg text-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Actualizar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <ClipboardList size={32} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">Sin registros de auditoría disponibles</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 grid grid-cols-4 gap-3 text-xs text-zinc-500 uppercase tracking-wider font-medium">
            <span>Usuario</span>
            <span>Rol</span>
            <span className="hidden sm:block">Módulo / Plantel</span>
            <span>Último acceso</span>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {filtered.map(a => (
              <div key={a.id} className="px-4 py-3 grid grid-cols-4 gap-3 items-center hover:bg-zinc-800/30 transition-colors">
                <div>
                  <p className="text-sm text-white font-medium truncate">{a.staff_name || a.user_name || "—"}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{a.user_email}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 w-fit">{a.role}</span>
                <div className="hidden sm:block">
                  <p className="text-xs text-zinc-400">{a.all_squads ? "Todos los planteles" : (a.squad_names || []).join(", ") || "—"}</p>
                  <p className="text-[10px] text-zinc-600">{(a.allowed_modules || []).length} módulos</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-300">{moment(a.last_seen).fromNow()}</p>
                  <p className="text-[10px] text-zinc-600">{moment(a.last_seen).format("DD/MM/YY HH:mm")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-4">
        <p className="text-xs text-zinc-500">
          <span className="font-semibold text-zinc-400">Nota:</span> La auditoría registra automáticamente el último acceso de cada usuario al iniciar sesión en la plataforma. Para auditoría completa de acciones (crear, editar, eliminar), los registros se almacenan en los campos de cada entidad con campos <code className="text-yellow-400 bg-zinc-800 px-1 rounded text-[10px]">created_by</code> y <code className="text-yellow-400 bg-zinc-800 px-1 rounded text-[10px]">updated_by</code>.
        </p>
      </div>
    </div>
  );
}
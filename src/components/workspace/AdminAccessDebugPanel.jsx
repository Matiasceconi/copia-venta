import React from "react";
import { X, Bug } from "lucide-react";
import { useWorkspace } from "@/lib/WorkspaceContext";

// Panel de diagnóstico: muestra por qué Administración se ve u oculta.
// Se abre manualmente desde el ícono de "bug" en el pie del Sidebar.
export default function AdminAccessDebugPanel({ onClose }) {
  const { debugInfo, isAdmin } = useWorkspace();

  const rows = [
    ["Usuario", debugInfo.user_email],
    ["Rol de plataforma", debugInfo.platform_role],
    ["Roles asignados (AppRole)", (debugInfo.role_names || []).join(", ") || "—"],
    ["can_admin (última carga)", String(debugInfo.can_admin)],
    ["Admin confirmado en sesión (sticky)", String(debugInfo.admin_locked_for_session)],
    ["Áreas permitidas", (debugInfo.allowed_areas || []).join(", ") || "—"],
    ["active_squad_id", debugInfo.active_squad_id || "—"],
    ["active_season_id", debugInfo.active_season_id || "—"],
    ["Workspace recargando", String(debugInfo.loading_workspace)],
  ];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Bug size={16} className="text-yellow-400" />
            <p className="text-sm font-semibold text-white">Diagnóstico de acceso — Administración</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 space-y-2">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 text-xs">
              <span className="text-zinc-500">{label}</span>
              <span className="text-white font-mono text-right break-all">{value}</span>
            </div>
          ))}
          <div className={`mt-3 p-2.5 rounded-lg text-xs font-semibold text-center ${isAdmin ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30" : "bg-red-500/10 text-red-300 border border-red-500/30"}`}>
            {isAdmin ? "Administración VISIBLE — permiso confirmado" : "Administración OCULTA — el usuario no tiene permiso de admin"}
          </div>
        </div>
      </div>
    </div>
  );
}
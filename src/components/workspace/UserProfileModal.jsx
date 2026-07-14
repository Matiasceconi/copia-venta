import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Lock, Eye, EyeOff, CheckCircle, Loader2, User } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useWorkspace } from "@/lib/WorkspaceContext";

export default function UserProfileModal({ onClose }) {
  const { user, logout } = useAuth();
  const { userAccess } = useWorkspace();
  const [tab, setTab] = useState("info");
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleChangePassword(e) {
    e.preventDefault();
    setError("");
    if (newPwd.length < 8) { setError("La nueva contraseña debe tener al menos 8 caracteres."); return; }
    if (newPwd !== confirmPwd) { setError("Las contraseñas no coinciden."); return; }
    setSaving(true);
    try {
      await base44.auth.changePassword(currentPwd, newPwd);
      setSuccess(true);
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch {
      setError("La contraseña actual es incorrecta.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center">
              {user?.photo_url
                ? <img src={user.photo_url} className="w-10 h-10 rounded-full object-cover" alt="" />
                : <User size={18} className="text-zinc-400" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{user?.full_name || user?.email}</p>
              <p className="text-xs text-zinc-500">{userAccess?.role || "Usuario"}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800">
          {[
            { key: "info", label: "Mi perfil" },
            { key: "password", label: "Cambiar contraseña" },
          ].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setError(""); setSuccess(false); }}
              className={`flex-1 py-3 text-xs font-semibold transition-colors border-b-2 ${
                tab === t.key ? "border-blue-500 text-blue-400" : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === "info" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-zinc-500 text-xs mb-0.5">Email</p>
                  <p className="text-white font-medium truncate">{user?.email}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs mb-0.5">Rol</p>
                  <p className="text-white font-medium">{userAccess?.role || "—"}</p>
                </div>
                {userAccess?.squad_names?.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-zinc-500 text-xs mb-0.5">Planteles asignados</p>
                    <p className="text-white font-medium">{userAccess.all_squads ? "Todos los planteles" : userAccess.squad_names.join(", ")}</p>
                  </div>
                )}
                {userAccess?.last_seen && (
                  <div className="col-span-2">
                    <p className="text-zinc-500 text-xs mb-0.5">Último acceso</p>
                    <p className="text-white font-medium">{new Date(userAccess.last_seen).toLocaleString("es-AR")}</p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-zinc-800">
                <button
                  onClick={() => logout(true)}
                  className="w-full py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}

          {tab === "password" && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              {success && (
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-300 text-sm">
                  <CheckCircle size={14} /> Contraseña actualizada correctamente.
                </div>
              )}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm">{error}</div>
              )}

              {[
                { id: "current", label: "Contraseña actual", val: currentPwd, set: setCurrentPwd },
                { id: "new", label: "Nueva contraseña", val: newPwd, set: setNewPwd },
                { id: "confirm", label: "Confirmar nueva contraseña", val: confirmPwd, set: setConfirmPwd },
              ].map(f => (
                <div key={f.id} className="space-y-1">
                  <label className="text-xs text-zinc-400 font-medium">{f.label}</label>
                  <div className="relative">
                    <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type={showPwd ? "text" : "password"}
                      value={f.val}
                      onChange={e => f.set(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-8 pr-9 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                    {f.id === "new" && (
                      <button type="button" onClick={() => setShowPwd(v => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                        {showPwd ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <button type="submit" disabled={saving}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
                {saving ? <><Loader2 size={14} className="inline mr-2 animate-spin" /> Guardando...</> : "Cambiar contraseña"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
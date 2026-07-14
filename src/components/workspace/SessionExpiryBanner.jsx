import React, { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

/**
 * Banner shown when session is about to expire (fired by SessionTimeoutWatcher).
 */
export default function SessionExpiryBanner() {
  const { logout } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = () => setShow(true);
    window.addEventListener("session-expiring-soon", handler);
    return () => window.removeEventListener("session-expiring-soon", handler);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
      <div className="flex items-center gap-3 bg-amber-500 text-zinc-900 px-4 py-3 rounded-xl shadow-xl font-medium text-sm">
        <AlertTriangle size={16} className="shrink-0" />
        <span className="flex-1">Tu sesión expirará en 5 minutos por inactividad.</span>
        <button onClick={() => setShow(false)} className="text-zinc-800 hover:text-zinc-900">
          <X size={15} />
        </button>
        <button
          onClick={() => { setShow(false); logout(true); }}
          className="shrink-0 bg-zinc-900 text-white rounded-lg px-3 py-1 text-xs font-semibold hover:bg-zinc-700 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
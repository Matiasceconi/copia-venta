import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useOrganization } from "@/lib/OrganizationContext";
import { useAuth } from "@/lib/AuthContext";
import { ShieldCheck, Building2, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";

// Pantalla de acceso suspendido
function SuspendedScreen() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto">
          <AlertTriangle className="text-red-400" size={22} />
        </div>
        <h2 className="text-white font-bold text-lg">Acceso suspendido</h2>
        <p className="text-zinc-400 text-sm">
          Tu acceso a este club está suspendido. Contactá al administrador del club para más información.
        </p>
        <button
          onClick={() => base44.auth.logout(window.location.origin)}
          className="w-full px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-xl transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

// Selector de organización cuando hay múltiples
function OrganizationSelector() {
  const { organizations, setActiveOrganization, memberships } = useOrganization();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
            <Building2 className="text-emerald-400" size={26} />
          </div>
          <h2 className="text-white font-bold text-xl">Seleccioná un club</h2>
          <p className="text-zinc-500 text-sm mt-1">Elegí con qué club querés trabajar</p>
        </div>
        <div className="space-y-3">
          {organizations.map((org) => {
            const membership = memberships.find((m) => m.organization_id === org.id);
            const isSuspended = membership?.status === "suspended" || org.subscription_status === "suspended";
            return (
              <button
                key={org.id}
                onClick={() => !isSuspended && setActiveOrganization(org.id)}
                disabled={isSuspended}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-colors text-left ${
                  isSuspended
                    ? "border-zinc-800 bg-zinc-900 opacity-50 cursor-not-allowed"
                    : "border-zinc-800 bg-zinc-900 hover:border-emerald-500/50 hover:bg-zinc-800"
                }`}
              >
                <div className="w-11 h-11 rounded-lg bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                  {org.logo_url ? (
                    <img src={org.logo_url} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-sm font-black text-emerald-400">
                      {org.short_name || org.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{org.name}</p>
                  <p className="text-zinc-500 text-xs truncate">
                    {isSuspended ? "Suspendido" : org.active_season || "Sin temporada"}
                  </p>
                </div>
                {membership?.is_owner && (
                  <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => base44.auth.logout(window.location.origin)}
          className="w-full mt-6 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-xl transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

// Gate principal
export default function OrganizationGate() {
  const { organizations, activeOrganization, activeOrganizationId, loadingOrganizations, activeMembership } = useOrganization();
  const { isAuthenticated, isLoadingAuth, isLoadingPublicSettings } = useAuth();

  // Esperar auth y carga de organizaciones
  if (isLoadingPublicSettings || isLoadingAuth || loadingOrganizations) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Outlet />;
  }

  // Sin organización → onboarding
  if (organizations.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }

  // Organización con onboarding incompleto → onboarding
  if (activeOrganization && !activeOrganization.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  // Organización suspendida → pantalla de suspendido
  if (
    activeMembership?.status === "suspended" ||
    activeOrganization?.subscription_status === "suspended"
  ) {
    return <SuspendedScreen />;
  }

  // Múltiples organizaciones sin selección → selector
  if (organizations.length > 1 && !activeOrganizationId) {
    return <OrganizationSelector />;
  }

  // Organización activa → app normal
  return <Outlet />;
}
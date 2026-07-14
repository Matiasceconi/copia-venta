import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const OrganizationContext = createContext(null);

export function OrganizationProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [activeOrganizationId, setActiveOrganizationIdState] = useState(null);
  const [loadingOrganizations, setLoadingOrganizations] = useState(true);
  const [organizationError, setOrganizationError] = useState(null);

  const loadOrganizations = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setOrganizations([]);
      setMemberships([]);
      setActiveOrganizationIdState(null);
      setLoadingOrganizations(false);
      return;
    }
    setLoadingOrganizations(true);
    setOrganizationError(null);
    try {
      // 1. Buscar OrganizationMember activas del usuario (nunca Organization.list global)
      const myMemberships = await base44.entities.OrganizationMember.filter({
        user_id: user.id,
        status: "active",
      }, "-created_date", 100);

      setMemberships(myMemberships);

      if (myMemberships.length === 0) {
        setOrganizations([]);
        setActiveOrganizationIdState(null);
        localStorage.removeItem("activeOrganizationId");
        localStorage.removeItem("activeOrganizationUserId");
        setLoadingOrganizations(false);
        return;
      }

      // 2. Obtener solo las organizaciones de esas membresías
      const orgIds = [...new Set(myMemberships.map((m) => m.organization_id))];
      const orgs = [];
      for (const oid of orgIds) {
        try {
          const org = await base44.entities.Organization.get(oid);
          if (org && org.active !== false) orgs.push(org);
        } catch (e) {
          // org podría haber sido eliminada
        }
      }
      setOrganizations(orgs);

      // 3. Restaurar organización activa desde localStorage
      const savedOrgId = localStorage.getItem("activeOrganizationId");
      const savedOrgUser = localStorage.getItem("activeOrganizationUserId");

      // Si cambió el usuario, limpiar selección anterior
      if (savedOrgUser && savedOrgUser !== user.id) {
        localStorage.removeItem("activeOrganizationId");
        localStorage.removeItem("activeOrganizationUserId");
      }

      const validSavedId =
        savedOrgUser === user.id && orgs.some((o) => o.id === savedOrgId)
          ? savedOrgId
          : null;

      if (validSavedId) {
        setActiveOrganizationIdState(validSavedId);
      } else if (orgs.length === 1) {
        setActiveOrganizationIdState(orgs[0].id);
        localStorage.setItem("activeOrganizationId", orgs[0].id);
        localStorage.setItem("activeOrganizationUserId", user.id);
      } else if (orgs.length > 1) {
        // Múltiples: no seleccionar automáticamente, mostrar selector
        setActiveOrganizationIdState(null);
      } else {
        setActiveOrganizationIdState(null);
      }
    } catch (err) {
      console.error("OrganizationContext error:", err);
      setOrganizationError(err?.message || "Error al cargar organizaciones.");
    } finally {
      setLoadingOrganizations(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  function setActiveOrganization(orgId) {
    setActiveOrganizationIdState(orgId);
    if (orgId) {
      localStorage.setItem("activeOrganizationId", orgId);
      localStorage.setItem("activeOrganizationUserId", user?.id || "");
      // Limpiar plantel activo al cambiar de organización
      localStorage.removeItem("activeSquadId");
      localStorage.removeItem("activeSquadUserId");
    } else {
      localStorage.removeItem("activeOrganizationId");
      localStorage.removeItem("activeOrganizationUserId");
    }
  }

  const activeOrganization = organizations.find((o) => o.id === activeOrganizationId) || null;
  const activeMembership = memberships.find((m) => m.organization_id === activeOrganizationId) || null;

  const hasOrganization = organizations.length > 0;
  const isOrganizationOwner = !!activeMembership?.is_owner;

  async function createOrganization(data) {
    const response = await base44.functions.invoke("createOrganizationForCurrentUser", data);
    return response.data;
  }

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        memberships,
        activeOrganization,
        activeOrganizationId,
        activeMembership,
        loadingOrganizations,
        organizationError,
        setActiveOrganization,
        reloadOrganizations: loadOrganizations,
        createOrganization,
        hasOrganization,
        isOrganizationOwner,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const ctx = useContext(OrganizationContext);
  if (!ctx) throw new Error("useOrganization must be used within OrganizationProvider");
  return ctx;
}
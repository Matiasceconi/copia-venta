import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const OrganizationContext = createContext(null);

export function OrganizationProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [roles, setRoles] = useState([]);
  const [userAccessRecords, setUserAccessRecords] = useState([]);
  const [activeOrganizationId, setActiveOrganizationIdState] = useState(null);
  const [loadingOrganizations, setLoadingOrganizations] = useState(true);
  const [organizationError, setOrganizationError] = useState(null);

  const loadOrganizations = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setOrganizations([]);
      setMemberships([]);
      setRoles([]);
      setUserAccessRecords([]);
      setActiveOrganizationIdState(null);
      setLoadingOrganizations(false);
      return;
    }
    setLoadingOrganizations(true);
    setOrganizationError(null);
    try {
      // 1. Cargar contexto completo desde backend (service role verifica membresía)
      //    Nunca consulta Organization/OrganizationMember directamente.
      const response = await base44.functions.invoke("getMyOrganizationContext", {});
      const data = response.data || {};
      const orgs = data.organizations || [];
      const myMemberships = data.memberships || [];
      const myRoles = data.roles || [];
      const myUserAccess = data.user_access || [];

      setOrganizations(orgs);
      setMemberships(myMemberships);
      setRoles(myRoles);
      setUserAccessRecords(myUserAccess);

      if (myMemberships.length === 0) {
        setActiveOrganizationIdState(null);
        localStorage.removeItem("activeOrganizationId");
        localStorage.removeItem("activeOrganizationUserId");
        setLoadingOrganizations(false);
        return;
      }

      // 2. Restaurar organización activa desde localStorage (preferencia de UI)
      const savedOrgId = localStorage.getItem("activeOrganizationId");
      const savedOrgUser = localStorage.getItem("activeOrganizationUserId");

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

  // Cambiar organización activa — valida membresía en backend (setActiveOrganization)
  async function setActiveOrganization(orgId) {
    if (!orgId) {
      setActiveOrganizationIdState(null);
      localStorage.removeItem("activeOrganizationId");
      localStorage.removeItem("activeOrganizationUserId");
      return;
    }
    try {
      // El backend verifica membresía activa con service role antes de permitir el cambio
      const response = await base44.functions.invoke("setActiveOrganization", {
        organization_id: orgId,
      });
      if (response.data?.verified) {
        setActiveOrganizationIdState(orgId);
        localStorage.setItem("activeOrganizationId", orgId);
        localStorage.setItem("activeOrganizationUserId", user?.id || "");
        localStorage.removeItem("activeSquadId");
        localStorage.removeItem("activeSquadUserId");
      }
    } catch (err) {
      console.error("setActiveOrganization error:", err);
      throw err;
    }
  }

  const activeOrganization = organizations.find((o) => o.id === activeOrganizationId) || null;
  const activeMembership = memberships.find((m) => m.organization_id === activeOrganizationId) || null;
  const activeOrganizationRoles = roles.filter((r) => r.organization_id === activeOrganizationId) || [];

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
        roles,
        activeOrganizationRoles,
        userAccessRecords,
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
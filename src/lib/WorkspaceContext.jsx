import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import SquadSelectModal from "@/components/workspace/SquadSelectModal";
import AreaSelectScreen from "@/components/workspace/AreaSelectScreen";
import { AREAS, PAGES, MODULE_ACTIONS } from "@/lib/areasConfig";

const WorkspaceContext = createContext(null);

const EMPTY_PERMS = { can_view: false, can_create: false, can_edit: false, can_delete: false, can_export: false, can_admin: false };

const LEGACY_MODULE_PATHS = {
  dashboard: ["/"],
  daily_squad: ["/daily-squad"],
  jugadores: ["/players", "/player-names"],
  players: ["/players", "/player-names"],
  sessions: ["/sessions"],
  gps: ["/performance/external-load"],
  performance: ["/performance/external-load", "/performance/internal-load", "/performance/minutes", "/performance/microcycle-history"],
  medical: ["/performance/medical"],
  nutrition: ["/performance/nutrition"],
  field_library: ["/field-library"],
  strength_library: ["/strength-library"],
  matches: ["/matches"],
  tactical: ["/tactical"],
  schedule: ["/schedule"],
  weekly_planner: ["/weekly-planner"],
  team: ["/team"],
  admin: ["/admin"],
  squad_manager: ["/squad-manager"],
};

export function WorkspaceProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [squads, setSquads] = useState([]);
  const [activeSquad, setActiveSquadState] = useState(null);
  const [userAccess, setUserAccess] = useState(null);
  const [roleNames, setRoleNames] = useState([]);
  const [permissions, setPermissions] = useState(EMPTY_PERMS);
  const [modulePermissions, setModulePermissions] = useState({});
  const [allowedPages, setAllowedPages] = useState([]);
  const [pagesByArea, setPagesByArea] = useState({}); // compatibilidad: areaId -> [paths]
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [workspaceError, setWorkspaceError] = useState(null);
  const [needSquadSelection, setNeedSquadSelection] = useState(false);
  const [adminAccess, setAdminAccess] = useState(false);
  const [myAreas, setMyAreas] = useState([]);
  const [activeAreaId, setActiveAreaIdState] = useState(null);
  const [needAreaSelection, setNeedAreaSelection] = useState(false);

  // Solo la primera carga bloquea toda la pantalla. Recargas posteriores (reloadWorkspace)
  // no deben desmontar el Sidebar ni ocultar módulos globales como Administración.
  const hasLoadedOnceRef = useRef(false);
  // Una vez confirmado el permiso de admin en la sesión, queda "trabado" en true:
  // así una falla transitoria al recargar el workspace (red, rate limit, etc.)
  // nunca hace que Administración desaparezca del menú a mitad de sesión.
  const adminLockRef = useRef(false);

  const loadWorkspace = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setLoadingWorkspace(false);
      return;
    }
    setLoadingWorkspace(true);
    setWorkspaceError(null);

    try {
      // 1. Fetch all active squads
      const allSquads = await base44.entities.Squad.filter({ active: true }, "name", 100);
      setSquads(allSquads);

      // 2. Find user access record by email
      const accessRecords = await base44.entities.UserAccess.filter({ user_email: user.email }, "-created_date", 1);
      let access = accessRecords[0] || null;

      const platformAdmin = user.role === "admin";

      // 3. If platform admin with no access record → full access, no roles needed
      if (!access && platformAdmin) {
        access = {
          user_email: user.email,
          role: "Administrador",
          role_ids: [],
          all_squads: true,
          squad_ids: [],
          squad_names: [],
          active: true,
        };
      }
      setUserAccess(access);

      // 4. Fetch assigned AppRole records (permissions/areas/pages come from here)
      const roleIds = access?.role_ids || [];
      let roles = [];
      if (roleIds.length > 0) {
        const allRoles = await base44.entities.AppRole.list("name", 200);
        roles = allRoles.filter(r => roleIds.includes(r.id) && r.active !== false);
      }
      setRoleNames(roles.map(r => r.name));

      // 5. Merge permissions across all assigned roles (OR)
      const mergedPerms = roles.reduce((acc, r) => ({
        can_view: acc.can_view || !!r.can_view,
        can_create: acc.can_create || !!r.can_create,
        can_edit: acc.can_edit || !!r.can_edit,
        can_delete: acc.can_delete || !!r.can_delete,
        can_export: acc.can_export || !!r.can_export,
        can_admin: acc.can_admin || !!r.can_admin,
      }), { ...EMPTY_PERMS });
      setPermissions(mergedPerms);

      // Fallback: usuarios migrados que tenían rol Administrador o can_admin=true directo en UserAccess
      // conservan su acceso de administrador aunque todavía no se les haya asignado un rol nuevo.
      const normalizedAccessRole = String(access?.role || "").toLowerCase();
      const legacyAdminRole = normalizedAccessRole.includes("admin") || normalizedAccessRole.includes("administrador");
      const resolvedAdmin = platformAdmin || legacyAdminRole || mergedPerms.can_admin || !!access?.can_admin;
      if (resolvedAdmin) adminLockRef.current = true;
      setAdminAccess(adminLockRef.current);

      // 6. Merge modules, pages and organizational areas across assigned roles.
      // Navigation is module-based and no longer depends on a parent category like "Rendimiento".
      const allowedAreaIds = new Set();
      const pagesMap = {};
      const allowedPageSet = new Set();
      const mergedModulePermissions = {};
      roles.forEach(r => {
        (r.areas || []).forEach(areaId => allowedAreaIds.add(areaId));
        (r.allowed_pages || []).forEach(p => allowedPageSet.add(p));
        Object.entries(r.module_permissions || {}).forEach(([moduleId, perms]) => {
          if (!mergedModulePermissions[moduleId]) mergedModulePermissions[moduleId] = {};
          MODULE_ACTIONS.forEach(action => { mergedModulePermissions[moduleId][action.key] = !!mergedModulePermissions[moduleId][action.key] || !!perms?.[action.key]; });
        });
      });
      (access?.allowed_pages || []).forEach(p => allowedPageSet.add(p));
      (access?.allowed_modules || []).forEach(moduleId => (LEGACY_MODULE_PATHS[moduleId] || []).forEach(path => allowedPageSet.add(path)));
      PAGES.forEach(page => { if (mergedModulePermissions[page.module_id]?.can_view) allowedPageSet.add(page.path); });
      if (adminLockRef.current) {
        AREAS.forEach(a => allowedAreaIds.add(a.id));
        PAGES.forEach(page => allowedPageSet.add(page.path));
      }
      AREAS.forEach(a => { pagesMap[a.id] = new Set(Array.from(allowedPageSet)); });
      setModulePermissions(mergedModulePermissions);
      setAllowedPages(Array.from(allowedPageSet));
      const pagesByAreaArrays = {};
      Object.entries(pagesMap).forEach(([areaId, set]) => { pagesByAreaArrays[areaId] = Array.from(set); });
      setPagesByArea(pagesByAreaArrays);

      const resolvedAreaIds = Array.from(allowedAreaIds);
      const resolvedAreas = AREAS.filter(a => resolvedAreaIds.includes(a.id));
      setMyAreas(resolvedAreas);

      console.info("[Workspace] Diagnóstico de acceso", {
        user_email: user.email,
        platform_role: user.role,
        role_names: roles.map(r => r.name),
        can_admin_this_load: resolvedAdmin,
        admin_locked_for_session: adminLockRef.current,
        allowed_areas: resolvedAreaIds,
      });

      const savedAreaId = localStorage.getItem("activeAreaId");
      const savedAreaUser = localStorage.getItem("activeAreaUserId");
      if (savedAreaUser && savedAreaUser !== user.id) {
        localStorage.removeItem("activeAreaId");
        localStorage.removeItem("activeAreaUserId");
      }
      const validSavedAreaId = savedAreaUser === user.id && resolvedAreaIds.includes(savedAreaId) ? savedAreaId : null;

      if (validSavedAreaId) {
        setActiveAreaIdState(validSavedAreaId);
        setNeedAreaSelection(false);
      } else if (resolvedAreaIds.length === 1) {
        setActiveAreaIdState(resolvedAreaIds[0]);
        localStorage.setItem("activeAreaId", resolvedAreaIds[0]);
        localStorage.setItem("activeAreaUserId", user.id);
        setNeedAreaSelection(false);
      } else if (resolvedAreaIds.length > 1) {
        setNeedAreaSelection(true);
      } else {
        setActiveAreaIdState(null);
        setNeedAreaSelection(false);
      }

      // 7. Determine which squads this user can access
      const mySquads = access?.all_squads
        ? allSquads
        : allSquads.filter(s => (access?.squad_ids || []).includes(s.id));

      // 8. Restore last active squad or prompt selection
      const savedId = localStorage.getItem("activeSquadId");
      const savedUser = localStorage.getItem("activeSquadUserId");
      if (savedUser && savedUser !== user.id) {
        localStorage.removeItem("activeSquadId");
        localStorage.removeItem("activeSquadUserId");
      }

      const validSavedId = savedUser === user.id ? savedId : null;
      const restoredSquad = mySquads.find(s => s.id === validSavedId) || null;

      if (restoredSquad) {
        setActiveSquadState(restoredSquad);
        setNeedSquadSelection(false);
      } else if (mySquads.length === 1) {
        setActiveSquadState(mySquads[0]);
        localStorage.setItem("activeSquadId", mySquads[0].id);
        localStorage.setItem("activeSquadUserId", user.id);
        setNeedSquadSelection(false);
      } else if (mySquads.length > 1) {
        setNeedSquadSelection(true);
      } else {
        setActiveSquadState(null);
        setNeedSquadSelection(false);
      }

      // 9. Update last_seen (fire and forget)
      if (accessRecords[0]) {
        base44.entities.UserAccess.update(accessRecords[0].id, {
          last_seen: new Date().toISOString(),
        }).catch(() => {});
      }
    } catch (err) {
      const emptyJsonParse = err instanceof SyntaxError && err.message === "Unexpected end of input";
      if (!emptyJsonParse) {
        console.error("WorkspaceContext error:", err);
        console.warn("[Workspace] Falla al cargar el workspace — Administración se mantiene según el último estado confirmado (admin_locked_for_session):", adminLockRef.current);
        if (!hasLoadedOnceRef.current) {
          setWorkspaceError(err?.message || "Error al cargar el espacio de trabajo.");
        }
      }
    } finally {
      hasLoadedOnceRef.current = true;
      setLoadingWorkspace(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => { loadWorkspace(); }, [loadWorkspace]);

  function setActiveSquad(squad) {
    setActiveSquadState(squad);
    setNeedSquadSelection(false);
    if (squad) {
      localStorage.setItem("activeSquadId", squad.id);
      localStorage.setItem("activeSquadUserId", user?.id || "");
    }
  }

  const mySquads = userAccess?.all_squads
    ? squads
    : squads.filter(s => (userAccess?.squad_ids || []).includes(s.id));

  const effectiveAdminAccess = adminAccess || user?.role === "admin" || !!userAccess?.can_admin || String(userAccess?.role || "").toLowerCase().includes("admin") || String(userAccess?.role || "").toLowerCase().includes("administrador");

  function can(action, path = null) {
    if (effectiveAdminAccess) return true;
    const key = `can_${action}`;
    if (path) {
      const page = PAGES.find(p => p.path === path);
      const moduleId = page?.module_id;
      if (moduleId && modulePermissions[moduleId]?.[key] !== undefined) return !!modulePermissions[moduleId][key];
    }
    return !!permissions[key];
  }

  function canAccessSquad(squadId) {
    if (!userAccess) return false;
    if (userAccess.all_squads) return true;
    return (userAccess.squad_ids || []).includes(squadId);
  }

  function setActiveArea(areaId) {
    setActiveAreaIdState(areaId);
    setNeedAreaSelection(false);
    if (areaId) {
      localStorage.setItem("activeAreaId", areaId);
      localStorage.setItem("activeAreaUserId", user?.id || "");
    }
  }

  function requestAreaChange() {
    setNeedAreaSelection(true);
  }

  // Seguridad: valida si una página puede verse por módulo independiente.
  // Administradores tienen acceso total; ya no depende del área activa ni de un módulo padre.
  function canSeePath(path) {
    if (effectiveAdminAccess) return true;
    return allowedPages.includes(path);
  }

  // ── Loading state (solo bloquea en la carga inicial de la sesión) ───────
  if (loadingWorkspace && !hasLoadedOnceRef.current) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-zinc-700 border-t-blue-400 rounded-full animate-spin mx-auto" />
          <p className="text-zinc-500 text-sm">Cargando espacio de trabajo…</p>
        </div>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────
  if (workspaceError) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto">
            <span className="text-red-400 text-xl">!</span>
          </div>
          <h2 className="text-white font-bold text-lg">Error al cargar</h2>
          <p className="text-zinc-400 text-sm">{workspaceError}</p>
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={loadWorkspace}
              className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors">
              Reintentar
            </button>
            <button
              onClick={() => base44.auth.logout(window.location.origin)}
              className="w-full px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-xl transition-colors">
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── No access record (non-admin user with no UserAccess) ────────────────
  if (!userAccess) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center mx-auto">
            <span className="text-yellow-400 text-xl">⚠</span>
          </div>
          <h2 className="text-white font-bold text-lg">Sin permisos configurados</h2>
          <p className="text-zinc-400 text-sm">
            Tu usuario no tiene permisos configurados en la plataforma. Contactá al administrador.
          </p>
          <button
            onClick={() => base44.auth.logout(window.location.origin)}
            className="w-full px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-xl transition-colors">
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  // ── No modules/areas assigned ───────────────────────────────────────────
  if (!effectiveAdminAccess && myAreas.length === 0 && allowedPages.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center mx-auto">
            <span className="text-yellow-400 text-xl">⚠</span>
          </div>
          <h2 className="text-white font-bold text-lg">Sin módulos asignados</h2>
          <p className="text-zinc-400 text-sm">
            Tu usuario no tiene módulos habilitados. Contactá al administrador para que te asigne permisos en Configuración.
          </p>
          <button
            onClick={() => base44.auth.logout(window.location.origin)}
            className="w-full px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-xl transition-colors">
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  // ── No squads assigned ──────────────────────────────────────────────────
  if (!effectiveAdminAccess && mySquads.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto">
            <span className="text-blue-400 text-xl">🏟</span>
          </div>
          <h2 className="text-white font-bold text-lg">Sin planteles asignados</h2>
          <p className="text-zinc-400 text-sm">
            Tu usuario no tiene planteles asignados. Contactá al administrador para que te asigne acceso.
          </p>
          <button
            onClick={() => base44.auth.logout(window.location.origin)}
            className="w-full px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-xl transition-colors">
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  // ── Area selection required (antes de entrar al sistema general) ───────
  if (needAreaSelection) {
    return (
      <AreaSelectScreen
        areas={myAreas}
        userName={user?.full_name || ""}
        currentAreaId={activeAreaId}
        onSelect={setActiveArea}
      />
    );
  }

  // ── Squad selection required ────────────────────────────────────────────
  if (needSquadSelection) {
    return (
      <SquadSelectModal
        squads={mySquads}
        userName={user?.full_name || ""}
        onSelect={setActiveSquad}
      />
    );
  }

  return (
    <WorkspaceContext.Provider value={{
      squads,
      mySquads,
      activeSquad,
      setActiveSquad,
      userAccess,
      loadingWorkspace,
      reloadWorkspace: loadWorkspace,
      can,
      canAccessSquad,
      myAreas,
      activeAreaId,
      activeAreaName: myAreas.find(a => a.id === activeAreaId)?.name || "",
      setActiveArea,
      requestAreaChange,
      canSeePath,
      modulePermissions,
      allowedPages,
      activeSquadId: activeSquad?.id || null,
      activeSquadName: activeSquad?.name || "",
      activeSeasonId: activeSquad?.season || null,
      // Global, sticky para la sesión — nunca depende del plantel ni del área activa.
      isAdmin: effectiveAdminAccess,
      canManageUsers: effectiveAdminAccess,
      roleNames,
      permissions,
      debugInfo: {
        user_email: user?.email || null,
        platform_role: user?.role || null,
        role_names: roleNames,
        can_admin: permissions.can_admin || false,
        admin_locked_for_session: adminLockRef.current,
        allowed_areas: myAreas.map(a => a.id),
        allowed_pages: allowedPages,
        module_permissions: modulePermissions,
        active_squad_id: activeSquad?.id || null,
        active_season_id: activeSquad?.season || null,
        loading_workspace: loadingWorkspace,
      },
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
import { useWorkspace } from "@/lib/WorkspaceContext";

/**
 * usePermission — global permission validation hook.
 *
 * Usage:
 *   const { can, canModule, canAccessSquad, guard } = usePermission();
 *
 *   // Check before rendering UI
 *   if (!can("edit")) return <ReadOnlyView />;
 *
 *   // Check before an action — guard() returns true if allowed, false + shows reason otherwise
 *   const ok = guard({ action: "delete", module: "sessions", squadId: activeSquadId });
 *   if (!ok) return;
 *
 * Actions: "create" | "edit" | "delete" | "export" | "admin" | "manage_users"
 */
export function usePermission() {
  const { userAccess, can, canModule, canAccessSquad, activeSquadId, isAdmin } = useWorkspace();

  /**
   * guard({ action, module?, squadId? }) → boolean
   * Returns true if all checks pass. When false, logs reason to console (no toast — caller decides UX).
   */
  function guard({ action, module: moduleKey, squadId }) {
    if (!userAccess) {
      console.warn("[Permission] No user access record loaded.");
      return false;
    }
    if (!userAccess.active) {
      console.warn("[Permission] User account is inactive.");
      return false;
    }
    if (action && !can(action)) {
      return false;
    }
    if (moduleKey && !canModule(moduleKey)) {
      return false;
    }
    const targetSquad = squadId ?? activeSquadId;
    if (targetSquad && !canAccessSquad(targetSquad)) {
      return false;
    }
    return true;
  }

  return {
    can,
    canModule,
    canAccessSquad,
    guard,
    isAdmin,
    userAccess,
  };
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Devuelve exclusivamente organizaciones, membresías y roles del usuario autenticado.
// Usa service role para verificar membresías — nunca confía en active_organization_id.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. Buscar membresías activas con service role (no confía en RLS ni en active_organization_id)
    const memberships = await base44.asServiceRole.entities.OrganizationMember.filter({
      user_id: user.id,
      status: 'active',
    }, '-created_date', 100);

    if (memberships.length === 0) {
      return Response.json({ organizations: [], memberships: [], roles: [], user_access: [] });
    }

    // 2. Obtener solo las organizaciones de esas membresías
    const orgIds = [...new Set(memberships.map((m) => m.organization_id))];
    const orgs = [];
    for (const oid of orgIds) {
      try {
        const org = await base44.asServiceRole.entities.Organization.get(oid);
        if (org && org.active !== false) orgs.push(org);
      } catch (e) {
        // org pudo haber sido eliminada; ignorar
      }
    }

    // 3. Obtener roles de la organización para verificar permisos
    const allRoles = await base44.asServiceRole.entities.AppRole.filter({
      organization_id: { $in: orgIds },
      active: { $ne: false },
    }, 'name', 500).catch(() => []);

    // 4. Obtener UserAccess del usuario (para permisos de módulo/plantel)
    const userAccessRecords = await base44.asServiceRole.entities.UserAccess.filter({
      organization_id: { $in: orgIds },
      user_email: user.email,
      active: true,
    }, '-created_date', 100).catch(() => []);

    return Response.json({
      organizations: orgs,
      memberships,
      roles: allRoles,
      user_access: userAccessRecords,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
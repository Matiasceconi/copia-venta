import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Valida que el usuario tiene membresía activa en la organización antes de
// permitir cambiar la organización activa. Rechaza cualquier organización
// donde el usuario no tenga membresía activa verificada en backend.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const orgId = (body.organization_id || '').trim();
    if (!orgId) return Response.json({ error: 'organization_id requerido.' }, { status: 400 });

    // 1. Verificar membresía activa con service role — nunca confía en active_organization_id
    const memberships = await base44.asServiceRole.entities.OrganizationMember.filter({
      user_id: user.id,
      organization_id: orgId,
      status: 'active',
    }, '-created_date', 1);

    if (memberships.length === 0) {
      return Response.json({
        error: 'No tenés membresía activa en esta organización. No se puede activar.',
      }, { status: 403 });
    }

    const membership = memberships[0];

    // 2. Verificar que la organización existe y está activa
    let org;
    try {
      org = await base44.asServiceRole.entities.Organization.get(orgId);
    } catch (e) {
      return Response.json({ error: 'Organización no encontrada.' }, { status: 404 });
    }

    if (org.active === false) {
      return Response.json({ error: 'Organización inactiva.' }, { status: 403 });
    }

    // 3. Verificar estado de suscripción
    if (org.subscription_status === 'suspended') {
      return Response.json({ error: 'Organización suspendida.' }, { status: 403 });
    }

    // 4. Obtener roles del usuario en esta organización
    const roleIds = membership.role_ids || [];
    let roles = [];
    if (roleIds.length > 0) {
      const allRoles = await base44.asServiceRole.entities.AppRole.filter({
        organization_id: orgId,
        active: { $ne: false },
      }, 'name', 200).catch(() => []);
      roles = allRoles.filter((r) => roleIds.includes(r.id));
    }

    // 5. Sincronizar active_organization_id como preferencia de UI (no autoriza acceso por sí solo)
    await base44.auth.updateMe({ active_organization_id: orgId }).catch((err) => {
      console.warn('No se pudo sincronizar preferencia active_organization_id:', err?.message);
    });

    return Response.json({
      organization: org,
      membership,
      roles,
      active_organization_id: orgId,
      verified: true,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
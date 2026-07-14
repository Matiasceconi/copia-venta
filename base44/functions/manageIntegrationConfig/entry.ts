import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Gestiona la configuración de integraciones por organización.
// GET: devuelve todas las configuraciones de la org (requiere membresía).
// SET: crea o actualiza una configuración (requiere can_admin o ser propietario).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action, organization_id, key, value, label } = body;

    if (!organization_id) {
      return Response.json({ error: 'organization_id requerido.' }, { status: 400 });
    }

    // 1. Verificar membresía activa con service role
    const memberships = await base44.asServiceRole.entities.OrganizationMember.filter({
      user_id: user.id,
      organization_id,
      status: 'active',
    }, '-created_date', 1);

    if (memberships.length === 0) {
      return Response.json({ error: 'Sin membresía activa en la organización.' }, { status: 403 });
    }

    const membership = memberships[0];

    // 2. Para SET, verificar permiso de admin o propietario
    if (action === 'set') {
      if (!membership.is_owner) {
        const roleIds = membership.role_ids || [];
        if (roleIds.length === 0) {
          return Response.json({ error: 'Solo propietarios o administradores pueden modificar la configuración.' }, { status: 403 });
        }
        const allRoles = await base44.asServiceRole.entities.AppRole.filter({
          organization_id,
          active: { $ne: false },
        }, 'name', 200).catch(() => []);
        const myRoles = allRoles.filter((r) => roleIds.includes(r.id));
        const canAdmin = myRoles.some((r) => r.can_admin === true);
        if (!canAdmin) {
          return Response.json({ error: 'Se requiere permiso de administrador.' }, { status: 403 });
        }
      }

      if (!key || !value) {
        return Response.json({ error: 'key y value son requeridos.' }, { status: 400 });
      }

      // Upsert: buscar existente por organization_id + key
      const existing = await base44.asServiceRole.entities.IntegrationConfig.filter({
        organization_id,
        key,
      }, '-created_date', 1);

      const payload = {
        organization_id,
        key,
        value: value.trim(),
        label: label || '',
        updated_by: user.id,
        updated_by_email: user.email,
        updated_at: new Date().toISOString(),
      };

      if (existing.length > 0) {
        await base44.asServiceRole.entities.IntegrationConfig.update(existing[0].id, payload);
        return Response.json({ data: { ...existing[0], ...payload }, action: 'updated' });
      } else {
        const created = await base44.asServiceRole.entities.IntegrationConfig.create(payload);
        return Response.json({ data: created, action: 'created' });
      }
    }

    // 3. GET: devolver todas las configuraciones de la org
    if (action === 'get' || !action) {
      const configs = await base44.asServiceRole.entities.IntegrationConfig.filter({
        organization_id,
      }, '-updated_at', 100);
      return Response.json({ data: configs });
    }

    return Response.json({ error: 'Acción no reconocida.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
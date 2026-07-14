import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// ── Lista explícita de entidades y operaciones permitidas ──────────────────
// Cada entrada define qué operaciones están permitidas y qué permiso se requiere.
// operations: true = solo membresía; string = nombre del permiso requerido en AppRole.
const ENTITY_ALLOWLIST = {
  MedicalRecord: {
    operations: { list: true, get: true, create: 'can_create', update: 'can_edit', delete: 'can_delete' },
    orgField: 'organization_id',
  },
  MedicalEpisode: {
    operations: { list: true, get: true, create: 'can_create', update: 'can_edit', delete: 'can_delete' },
    orgField: 'organization_id',
  },
  MedicalCurrentStatus: {
    operations: { list: true, get: true, create: 'can_create', update: 'can_edit', delete: 'can_delete' },
    orgField: 'organization_id',
  },
  NutritionAssessment: {
    operations: { list: true, get: true, create: 'can_create', update: 'can_edit', delete: 'can_delete' },
    orgField: 'organization_id',
  },
  NutritionInterpretation: {
    operations: { list: true, get: true, create: 'can_create', update: 'can_edit', delete: 'can_delete' },
    orgField: 'organization_id',
  },
  NutritionRecord: {
    operations: { list: true, get: true, create: 'can_create', update: 'can_edit', delete: 'can_delete' },
    orgField: 'organization_id',
  },
  NutritionSyncState: {
    operations: { list: true, get: true },
    orgField: 'organization_id',
  },
  Organization: {
    operations: { get: true, update: 'can_admin' },
    orgField: 'id',
  },
  OrganizationMember: {
    operations: { list: 'can_admin', get: 'can_admin', create: 'can_admin', update: 'can_admin', delete: 'can_admin' },
    orgField: 'organization_id',
  },
  AppRole: {
    operations: { list: true, get: true, create: 'can_admin', update: 'can_admin', delete: 'can_admin' },
    orgField: 'organization_id',
  },
};

// ── Verificación de membresía y permisos ───────────────────────────────────
async function verifyAccess(base44, user, orgId, requiredPermission) {
  // 1. Verificar membresía activa con service role
  const memberships = await base44.asServiceRole.entities.OrganizationMember.filter({
    user_id: user.id,
    organization_id: orgId,
    status: 'active',
  }, '-created_date', 10);

  if (memberships.length === 0) {
    return { ok: false, status: 403, error: 'Sin membresía activa en la organización.' };
  }

  const membership = memberships[0];

  // 2. Si no se requiere permiso específico, la membresía es suficiente
  if (requiredPermission === true || !requiredPermission) {
    return { ok: true, membership };
  }

  // 3. Propietarios bypass permisos (pero no membresía)
  if (membership.is_owner) {
    return { ok: true, membership };
  }

  // 4. Obtener roles y verificar permisos
  const roleIds = memberships.flatMap((m) => m.role_ids || []);
  if (roleIds.length === 0) {
    return { ok: false, status: 403, error: 'Sin roles asignados para esta operación.' };
  }

  const allRoles = await base44.asServiceRole.entities.AppRole.filter({
    organization_id: orgId,
    active: { $ne: false },
  }, 'name', 200).catch(() => []);

  const myRoles = allRoles.filter((r) => roleIds.includes(r.id));
  if (myRoles.length === 0) {
    return { ok: false, status: 403, error: 'Roles no encontrados o inactivos.' };
  }

  // 5. Verificar permiso (can_admin siempre otorga acceso)
  const hasPermission = myRoles.some((r) => r[requiredPermission] === true || r.can_admin === true);
  if (!hasPermission) {
    return { ok: false, status: 403, error: `Sin permiso '${requiredPermission}' en esta organización.` };
  }

  return { ok: true, membership, roles: myRoles };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { entity_name, operation, data, query, record_id, org_id, sort, limit } = body;

    // 1. Verificar entidad en allowlist
    const config = ENTITY_ALLOWLIST[entity_name];
    if (!config) {
      return Response.json({ error: `Entidad '${entity_name}' no permitida.` }, { status: 403 });
    }

    // 2. Verificar operación permitida
    const requiredPermission = config.operations[operation];
    if (requiredPermission === undefined) {
      return Response.json({ error: `Operación '${operation}' no permitida para '${entity_name}'.` }, { status: 403 });
    }

    // 3. Determinar organization_id
    let organizationId = org_id;
    if (!organizationId) {
      if (operation === 'create' && data) {
        organizationId = data[config.orgField];
      } else if (operation === 'list' && query) {
        organizationId = query[config.orgField];
      }
    }

    if (!organizationId) {
      return Response.json({ error: 'organization_id requerido para verificar membresía.' }, { status: 400 });
    }

    // 4. Verificar membresía y permisos
    const access = await verifyAccess(base44, user, organizationId, requiredPermission);
    if (!access.ok) {
      return Response.json({ error: access.error }, { status: access.status });
    }

    // 5. Ejecutar operación con service role, forzando filtro por organization_id
    const entity = base44.asServiceRole.entities[entity_name];

    if (operation === 'list') {
      const filter = { ...query, [config.orgField]: organizationId };
      delete filter[config.orgField]; // ya filtrado
      filter[config.orgField] = organizationId;
      const results = await entity.filter(filter, sort || '-created_date', limit || 200);
      return Response.json({ data: results });
    }

    if (operation === 'get') {
      if (!record_id) return Response.json({ error: 'record_id requerido.' }, { status: 400 });
      const record = await entity.get(record_id);
      if (record[config.orgField] !== organizationId) {
        return Response.json({ error: 'Registro no pertenece a la organización.' }, { status: 403 });
      }
      return Response.json({ data: record });
    }

    if (operation === 'create') {
      const createData = { ...data, [config.orgField]: organizationId };
      const record = await entity.create(createData);
      return Response.json({ data: record });
    }

    if (operation === 'update') {
      if (!record_id) return Response.json({ error: 'record_id requerido.' }, { status: 400 });
      // Verificar que el registro pertenece a la organización
      const existing = await entity.get(record_id);
      if (existing[config.orgField] !== organizationId) {
        return Response.json({ error: 'Registro no pertenece a la organización.' }, { status: 403 });
      }
      // No permitir cambiar organization_id
      const safeData = { ...data };
      delete safeData[config.orgField];
      const record = await entity.update(record_id, safeData);
      return Response.json({ data: record });
    }

    if (operation === 'delete') {
      if (!record_id) return Response.json({ error: 'record_id requerido.' }, { status: 400 });
      const existing = await entity.get(record_id);
      if (existing[config.orgField] !== organizationId) {
        return Response.json({ error: 'Registro no pertenece a la organización.' }, { status: 403 });
      }
      await entity.delete(record_id);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Operación no reconocida.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
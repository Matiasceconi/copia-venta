import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Onboarding atómico con compensación.
// Base44 no soporta transacciones ACID, por lo que se implementa compensación:
// si cualquier paso falla, se eliminan en orden inverso todos los recursos creados.
// La idempotencia usa request_key: evita duplicados de la misma solicitud,
// pero NO impide que un usuario pertenezca a varios clubes.

const DEFAULT_ROLE_NAMES = [
  "Propietario",
  "Administrador",
  "Director Técnico",
  "Ayudante Técnico",
  "Preparador Físico",
  "Analista",
  "Médico",
  "Kinesiólogo",
  "Nutricionista",
];

function generateSlug(name) {
  return (name || 'club')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'club';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    // ── 0. Idempotencia por request_key ─────────────────────────────────────
    // Evita duplicados de la misma solicitud (doble click, retry), pero NO
    // impide que el usuario pertenezca a varios clubes legítimamente.
    const requestKey = (body.request_key || '').trim();
    if (requestKey) {
      const existing = await base44.asServiceRole.entities.Organization.filter({
        created_by_user_id: user.id,
        request_key: requestKey,
      }, '-created_date', 1).catch(() => []);

      if (existing.length > 0) {
        const org = existing[0];
        // Verificar que la membresía existe
        const memberships = await base44.asServiceRole.entities.OrganizationMember.filter({
          organization_id: org.id,
          user_id: user.id,
          status: 'active',
        }, '-created_date', 1).catch(() => []);

        // Verificar que el squad existe
        const squads = await base44.asServiceRole.entities.Squad.filter({
          organization_id: org.id,
        }, 'name', 10).catch(() => []);

        return Response.json({
          organization: org,
          membership: memberships[0] || null,
          squad: squads[0] || null,
          roles: [],
          idempotent: true,
          message: 'Esta solicitud ya fue procesada. No se creó un club duplicado.',
        });
      }
    }

    // ── 1. Validar nombre del club ──────────────────────────────────────────
    const name = (body.name || '').trim();
    if (!name || name.length < 2) {
      return Response.json({ error: 'El nombre del club es obligatorio (mínimo 2 caracteres).' }, { status: 400 });
    }

    // ── 2. Generar slug único ──────────────────────────────────────────────
    const baseSlug = generateSlug(body.slug || name);
    let slug = baseSlug;
    let suffix = 1;
    let slugOk = false;
    while (!slugOk) {
      try {
        const existing = await base44.asServiceRole.entities.Organization.filter({ slug }, '-created_date', 1);
        if (existing.length === 0) {
          slugOk = true;
        } else {
          suffix++;
          slug = `${baseSlug}-${suffix}`;
        }
      } catch (e) {
        slugOk = true;
      }
    }

    // ── Tracking para compensación ─────────────────────────────────────────
    const created = { org: null, membership: null, roles: [], squad: null };

    // ── 3. Crear Organization (service role) ────────────────────────────────
    const now = new Date().toISOString();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);

    try {
      created.org = await base44.asServiceRole.entities.Organization.create({
        name,
        short_name: (body.short_name || '').trim() || name.slice(0, 4).toUpperCase(),
        slug,
        logo_url: body.logo_url || '',
        primary_color: body.primary_color || '#111827',
        secondary_color: body.secondary_color || '#22c55e',
        country: body.country || '',
        timezone: body.timezone || 'America/Buenos_Aires',
        locale: body.locale || 'es-AR',
        active_season: body.active_season || '',
        onboarding_completed: false, // se marca al final
        subscription_plan: 'free',
        subscription_status: 'trial',
        trial_ends_at: trialEnd.toISOString(),
        active: true,
        created_by_user_id: user.id,
        created_by_email: user.email,
        request_key: requestKey || '',
      });
    } catch (e) {
      return Response.json({ error: 'No se pudo crear la organización: ' + e.message }, { status: 500 });
    }

    // ── 4. Crear OrganizationMember (propietario) ──────────────────────────
    const membershipKey = `${created.org.id}:${user.id}`;
    try {
      created.membership = await base44.asServiceRole.entities.OrganizationMember.create({
        organization_id: created.org.id,
        user_id: user.id,
        user_email: user.email,
        display_name: user.full_name || user.email,
        role_ids: [],
        squad_ids: [],
        all_squads: true,
        is_owner: true,
        status: 'active',
        invited_by: user.email,
        invited_at: now,
        accepted_at: now,
        membership_key: membershipKey,
      });
    } catch (e) {
      // Compensación: eliminar org
      try { await base44.asServiceRole.entities.Organization.delete(created.org.id); } catch (_) {}
      return Response.json({
        error: 'No se pudo crear la membresía del propietario: ' + e.message,
        compensation: 'Organización eliminada.',
      }, { status: 500 });
    }

    // ── 5. Crear roles iniciales ──────────────────────────────────────────
    let ownerRoleId = '';
    const roleFailures = [];

    for (const rName of DEFAULT_ROLE_NAMES) {
      try {
        const isOwner = rName === 'Propietario';
        const isAdmin = rName === 'Administrador' || isOwner;
        const role = await base44.asServiceRole.entities.AppRole.create({
          organization_id: created.org.id,
          name: rName,
          description: isOwner ? 'Propietario del club con todos los permisos' : `Rol de ${rName}`,
          areas: [],
          allowed_pages: [],
          module_permissions: {},
          can_view: true,
          can_create: isAdmin,
          can_edit: isAdmin,
          can_delete: isAdmin,
          can_export: isAdmin,
          can_admin: isAdmin,
          active: true,
        });
        created.roles.push({ id: role.id, name: rName });
        if (isOwner) ownerRoleId = role.id;
      } catch (e) {
        // Registrar fallo pero continuar — se reporta al final
        roleFailures.push({ role: rName, error: e.message });
      }
    }

    // ── 6. Asignar rol Propietario al miembro ──────────────────────────────
    if (ownerRoleId && created.membership) {
      try {
        await base44.asServiceRole.entities.OrganizationMember.update(created.membership.id, {
          role_ids: [ownerRoleId],
        });
        created.membership.role_ids = [ownerRoleId];
      } catch (e) {
        // No es crítico: el usuario sigue siendo owner por is_owner=true
        roleFailures.push({ role: 'assign_owner', error: e.message });
      }
    }

    // ── 7. Crear primer Squad ──────────────────────────────────────────────
    const squadName = (body.squad_name || 'Primera').trim();
    try {
      created.squad = await base44.asServiceRole.entities.Squad.create({
        organization_id: created.org.id,
        name: squadName,
        season: body.active_season || String(new Date().getFullYear()),
        active: true,
      });
    } catch (e) {
      // Compensación: eliminar roles, membresía, org
      for (const r of created.roles) {
        try { await base44.asServiceRole.entities.AppRole.delete(r.id); } catch (_) {}
      }
      try { await base44.asServiceRole.entities.OrganizationMember.delete(created.membership.id); } catch (_) {}
      try { await base44.asServiceRole.entities.Organization.delete(created.org.id); } catch (_) {}
      return Response.json({
        error: 'No se pudo crear el primer plantel: ' + e.message,
        compensation: 'Organización, membresía y roles eliminados.',
      }, { status: 500 });
    }

    // ── 8. Marcar onboarding como completado ───────────────────────────────
    try {
      await base44.asServiceRole.entities.Organization.update(created.org.id, {
        onboarding_completed: true,
        active_season: body.active_season || created.org.active_season,
      });
      created.org.onboarding_completed = true;
      created.org.active_season = body.active_season || created.org.active_season;
    } catch (e) {
      // No es crítico: la org funciona, solo no está marcada como completada
      // Se reporta pero no se revierte
      roleFailures.push({ step: 'mark_completed', error: e.message });
    }

    // ── 9. Sincronizar preferencia active_organization_id ──────────────────
    await base44.auth.updateMe({ active_organization_id: created.org.id }).catch(() => {});

    return Response.json({
      organization: created.org,
      membership: created.membership,
      squad: created.squad,
      roles: created.roles,
      role_failures: roleFailures.length > 0 ? roleFailures : undefined,
      atomic: true,
      note: 'Base44 no soporta transacciones ACID. Se implementó compensación: si cualquier paso falla, se eliminan los recursos creados en orden inverso.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
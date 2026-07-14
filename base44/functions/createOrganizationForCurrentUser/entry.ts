import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    // 1. Validar nombre del club
    const name = (body.name || "").trim();
    if (!name || name.length < 2) {
      return Response.json({ error: 'El nombre del club es obligatorio (mínimo 2 caracteres).' }, { status: 400 });
    }

    // 2. Generar slug único
    const baseSlug = (body.slug || name)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'club';

    let slug = baseSlug;
    let suffix = 1;
    let slugOk = false;
    while (!slugOk) {
      try {
        const existing = await base44.asServiceRole.entities.Organization.filter({ slug }, "-created_date", 1);
        if (existing.length === 0) {
          slugOk = true;
        } else {
          suffix++;
          slug = `${baseSlug}-${suffix}`;
        }
      } catch (e) {
        slugOk = true; // si no se puede verificar, asumimos único
      }
    }

    // 3. Crear Organization
    const now = new Date().toISOString();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);

    let org;
    try {
      org = await base44.entities.Organization.create({
        name,
        short_name: (body.short_name || "").trim() || name.slice(0, 4).toUpperCase(),
        slug,
        logo_url: body.logo_url || "",
        primary_color: body.primary_color || "#111827",
        secondary_color: body.secondary_color || "#22c55e",
        country: body.country || "",
        timezone: body.timezone || "America/Buenos_Aires",
        locale: body.locale || "es-AR",
        active_season: body.active_season || "",
        onboarding_completed: body.onboarding_completed || false,
        subscription_plan: "free",
        subscription_status: "trial",
        trial_ends_at: trialEnd.toISOString(),
        active: true,
        created_by_user_id: user.id,
        created_by_email: user.email,
      });
    } catch (e) {
      return Response.json({ error: 'No se pudo crear la organización: ' + e.message }, { status: 500 });
    }

    // 4. Crear OrganizationMember del usuario como propietario
    const membershipKey = `${org.id}:${user.id}`;
    let membership;
    try {
      membership = await base44.entities.OrganizationMember.create({
        organization_id: org.id,
        user_id: user.id,
        user_email: user.email,
        display_name: user.full_name || user.email,
        role_ids: [],
        squad_ids: [],
        all_squads: true,
        is_owner: true,
        status: "active",
        invited_by: user.email,
        invited_at: now,
        accepted_at: now,
        membership_key: membershipKey,
      });
    } catch (e) {
      // Si falla la membresía, eliminar la organización huérfana
      try { await base44.asServiceRole.entities.Organization.delete(org.id); } catch (_) {}
      return Response.json({ error: 'No se pudo crear la membresía del propietario: ' + e.message }, { status: 500 });
    }

    // 5. Crear roles iniciales vinculados a organization_id
    const roleNames = [
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

    const createdRoles = [];
    for (const rName of roleNames) {
      try {
        const isOwner = rName === "Propietario";
        const isAdmin = rName === "Administrador" || isOwner;
        const role = await base44.entities.AppRole.create({
          organization_id: org.id,
          name: rName,
          description: isOwner ? "Propietario del club con todos los permisos" : `Rol de ${rName}`,
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
        createdRoles.push({ id: role.id, name: rName });
        // Asignar el rol Propietario al usuario creador
        if (isOwner) {
          await base44.entities.OrganizationMember.update(membership.id, {
            role_ids: [role.id],
          });
          membership.role_ids = [role.id];
        }
      } catch (e) {
        // Continuar aunque un rol falle
      }
    }

    return Response.json({
      organization: org,
      membership,
      roles: createdRoles,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
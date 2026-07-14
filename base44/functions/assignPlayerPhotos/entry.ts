import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const activeOrgId = (body.organization_id || '').trim();
    if (!activeOrgId) return Response.json({ error: 'organization_id requerido.' }, { status: 400 });

    // ── Autorización multi-tenant: verificar membresía Y permisos ──────────
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const memberships = await base44.asServiceRole.entities.OrganizationMember.filter({
      user_id: user.id, organization_id: activeOrgId, status: 'active',
    }, '-created_date', 1);
    if (memberships.length === 0) return Response.json({ error: 'Sin membresía activa en la organización.' }, { status: 403 });
    const membership = memberships[0];
    if (!membership.is_owner) {
      const roleIds = membership.role_ids || [];
      if (roleIds.length === 0) return Response.json({ error: 'Se requiere permiso de administrador.' }, { status: 403 });
      const allRoles = await base44.asServiceRole.entities.AppRole.filter({ organization_id: activeOrgId, active: { $ne: false } }, 'name', 200).catch(() => []);
      const myRoles = allRoles.filter((r) => roleIds.includes(r.id));
      if (!myRoles.some((r) => r.can_admin === true)) return Response.json({ error: 'Se requiere permiso de administrador para asignar fotos masivamente.' }, { status: 403 });
    }

    const { photoMappings } = body;

    if (!photoMappings || !Array.isArray(photoMappings)) {
      return Response.json({ error: 'photoMappings must be an array' }, { status: 400 });
    }

    // ── Solo jugadores de la organización activa ────────────────────────────
    const allPlayers = await base44.asServiceRole.entities.Player.filter({ organization_id: activeOrgId }, '-created_date', 500);

    const results = {
      updated: 0,
      failed: 0,
      notFound: [],
    };

    for (const mapping of photoMappings) {
      const { number, firstName, lastName, photoUrl } = mapping;

      // Find player by number and name within the active organization only
      const player = allPlayers.find(p => {
        const playerFirstName = p.first_name?.toLowerCase().trim() || '';
        const playerLastName = p.last_name?.toLowerCase().trim() || '';
        const targetFirstName = firstName?.toLowerCase().trim() || '';
        const targetLastName = lastName?.toLowerCase().trim() || '';

        return p.number === number ||
               (playerFirstName === targetFirstName && playerLastName === targetLastName);
      });

      if (player) {
        try {
          await base44.asServiceRole.entities.Player.update(player.id, { photo_url: photoUrl });
          results.updated++;
        } catch (e) {
          results.failed++;
          results.notFound.push(`${number} - ${firstName} ${lastName}`);
        }
      } else {
        results.failed++;
        results.notFound.push(`${number} - ${firstName} ${lastName}`);
      }
    }

    return Response.json({ ...results, organization_id: activeOrgId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
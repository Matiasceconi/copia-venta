import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { jsPDF } from 'npm:jspdf@4.0.0';

const BRAND = {
  name: 'Defensa y Justicia',
  logoUrl: 'https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/36f6c4008_defensa.png',
  green: [0, 132, 61],
  greenDark: [0, 90, 52],
  greenDeep: [0, 61, 37],
  yellow: [255, 212, 0],
  ink: [17, 24, 39],
  muted: [107, 114, 128],
  line: [216, 222, 210],
  panel: [246, 247, 243],
  white: [255, 255, 255],
};

const TOTALS = {
  reserva: 1727,
  juveniles: 1252,
  amistosos: 182,
};

function norm(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function tournamentBucket(tournament) {
  const t = norm(tournament);
  if (t.includes('juveniles')) return 'juveniles';
  if (t.includes('amistoso')) return 'amistosos';
  if (t.includes('clausura') || t.includes('apertura') || t.includes('proyeccion')) return 'reserva';
  return 'reserva';
}

function pct(value, total) {
  return total > 0 ? Math.round((Number(value || 0) / total) * 100) : 0;
}

function minutes(value) {
  return `${Math.round(Number(value || 0))}'`;
}

function safeText(value, fallback = '') {
  return String(value || fallback).replace(/\s+/g, ' ').trim();
}

async function loadImage(url) {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || '';
    const bytes = new Uint8Array(await response.arrayBuffer());
    const lower = url.toLowerCase();
    const format = contentType.includes('png') || lower.includes('.png') ? 'PNG' : 'JPEG';
    return { bytes, format };
  } catch (_) {
    return null;
  }
}

function setColor(doc, color, mode = 'text') {
  if (mode === 'fill') doc.setFillColor(color[0], color[1], color[2]);
  else if (mode === 'draw') doc.setDrawColor(color[0], color[1], color[2]);
  else doc.setTextColor(color[0], color[1], color[2]);
}

function addProgress(doc, x, y, w, value, total) {
  const width = Math.min(w, Math.max(0, w * (pct(value, total) / 100)));
  setColor(doc, [229, 231, 235], 'fill');
  doc.roundedRect(x, y, w, 2.2, 1, 1, 'F');
  setColor(doc, pct(value, total) >= 70 ? BRAND.green : pct(value, total) >= 40 ? BRAND.yellow : [245, 158, 11], 'fill');
  doc.roundedRect(x, y, width, 2.2, 1, 1, 'F');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const squadId = body?.squadId || '';
    const torneoId = body?.torneoId || 'all';

    const [records, players, matches] = await Promise.all([
      base44.asServiceRole.entities.MinutesRecord.list('-created_date', 1000),
      base44.asServiceRole.entities.Player.list('-created_date', 500),
      base44.asServiceRole.entities.MatchReport.list('-date', 500),
    ]);

    const playerMap = Object.fromEntries(players.map((player) => [player.id, player]));
    const activeMatches = matches.filter((match) => match.status !== 'archivado' && (!squadId || match.squad_id === squadId));
    const activeMatchMap = Object.fromEntries(activeMatches.map((match) => [match.id, match]));
    const squadName = safeText(activeMatches.find((match) => match.squad_name)?.squad_name, 'Plantel activo');

    const seen = new Set();
    const consolidated = {};
    [...records].sort((a, b) => String(b.created_date || '').localeCompare(String(a.created_date || ''))).forEach((record) => {
      if (!record.minutes || record.minutes <= 0) return;
      if (!record.match_id || !activeMatchMap[record.match_id]) return;
      if (torneoId !== 'all' && record.tournament !== torneoId) return;
      const playerKey = record.player_id || `name:${norm(record.player_name)}`;
      const dedupeKey = `${playerKey}|${record.match_id}|${norm(record.tournament)}`;
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);

      const player = record.player_id ? playerMap[record.player_id] : null;
      if (!consolidated[playerKey]) {
        consolidated[playerKey] = {
          player_id: record.player_id || null,
          player_name: safeText(record.player_name || player?.full_name, 'Jugador'),
          jersey_number: player?.jersey_number || record.player_number || '',
          position: player?.position || '',
          photo_url: player?.photo_url || '',
          reserva: 0,
          juveniles: 0,
          amistosos: 0,
          partidos: new Set(),
        };
      }
      const bucket = tournamentBucket(record.tournament);
      consolidated[playerKey][bucket] += Number(record.minutes || 0);
      consolidated[playerKey].partidos.add(record.match_id);
    });

    const data = Object.values(consolidated)
      .map((player) => ({ ...player, total: player.reserva + player.juveniles + player.amistosos, partidos_count: player.partidos.size }))
      .filter((player) => player.total > 0)
      .sort((a, b) => b.total - a.total);

    const totalsUsed = data.reduce((acc, player) => ({
      reserva: acc.reserva + player.reserva,
      juveniles: acc.juveniles + player.juveniles,
      amistosos: acc.amistosos + player.amistosos,
      total: acc.total + player.total,
    }), { reserva: 0, juveniles: 0, amistosos: 0, total: 0 });

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = 297;
    const pageH = 210;
    const margin = 12;
    const logo = await loadImage(BRAND.logoUrl);
    const photoCache = {};

    const columns = [
      { label: '#', x: 14, w: 8, align: 'center' },
      { label: 'Foto', x: 24, w: 12, align: 'center' },
      { label: 'Jugador', x: 39, w: 55, align: 'left' },
      { label: 'Posición', x: 96, w: 35, align: 'left' },
      { label: 'PJ', x: 133, w: 10, align: 'center' },
      { label: 'Reserva', x: 145, w: 32, align: 'center' },
      { label: 'Juveniles', x: 180, w: 32, align: 'center' },
      { label: 'Amistosos', x: 215, w: 26, align: 'center' },
      { label: 'Total', x: 244, w: 20, align: 'center' },
      { label: '% total', x: 267, w: 16, align: 'center' },
    ];

    function drawHeader(page = 1) {
      setColor(doc, BRAND.greenDeep, 'fill');
      doc.rect(0, 0, pageW, 28, 'F');
      setColor(doc, BRAND.yellow, 'fill');
      doc.rect(0, 27, pageW, 2, 'F');
      if (logo) {
        try { doc.addImage(logo.bytes, logo.format, margin, 5, 17, 17); } catch (_) {}
      }
      setColor(doc, BRAND.white);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(17);
      doc.text('Exportación de minutos jugados', 34, 12);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`${BRAND.name} · ${squadName} · ${torneoId === 'all' ? 'Todos los torneos' : torneoId}`, 34, 18);
      doc.text(`Generado: ${new Date().toLocaleDateString('es-AR')} · Página ${page}`, pageW - margin, 12, { align: 'right' });
    }

    function drawSummary() {
      const cards = [
        { label: 'Jugadores', value: data.length, color: BRAND.green },
        { label: 'Minutos Reserva', value: minutes(totalsUsed.reserva), color: BRAND.greenDark },
        { label: 'Minutos Juveniles', value: minutes(totalsUsed.juveniles), color: [245, 158, 11] },
        { label: 'Minutos Totales', value: minutes(totalsUsed.total), color: BRAND.ink },
      ];
      cards.forEach((card, index) => {
        const x = margin + index * 68;
        setColor(doc, BRAND.panel, 'fill');
        setColor(doc, BRAND.line, 'draw');
        doc.roundedRect(x, 36, 62, 18, 4, 4, 'FD');
        setColor(doc, card.color);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text(String(card.value), x + 5, 45);
        setColor(doc, BRAND.muted);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(card.label.toUpperCase(), x + 5, 50);
      });
    }

    function drawTableHeader(y) {
      setColor(doc, BRAND.greenDark, 'fill');
      doc.roundedRect(margin, y, pageW - margin * 2, 8, 2, 2, 'F');
      setColor(doc, BRAND.white);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      columns.forEach((col) => {
        const tx = col.align === 'left' ? col.x + 1 : col.x + col.w / 2;
        doc.text(col.label, tx, y + 5.2, { align: col.align });
      });
    }

    function drawPhoto(player, x, y) {
      const initial = safeText(player.player_name, '?').charAt(0).toUpperCase();
      if (player.photo_url && photoCache[player.photo_url]) {
        try {
          doc.addImage(photoCache[player.photo_url].bytes, photoCache[player.photo_url].format, x, y, 8, 8);
          return;
        } catch (_) {}
      }
      setColor(doc, BRAND.green, 'fill');
      doc.circle(x + 4, y + 4, 4, 'F');
      setColor(doc, BRAND.yellow);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.text(initial, x + 4, y + 5.2, { align: 'center' });
    }

    function drawRow(player, index, y) {
      if (index % 2 === 0) {
        setColor(doc, [249, 250, 251], 'fill');
        doc.rect(margin, y - 1.5, pageW - margin * 2, 10.5, 'F');
      }
      setColor(doc, [229, 231, 235], 'draw');
      doc.line(margin, y + 9, pageW - margin, y + 9);
      setColor(doc, BRAND.ink);
      doc.setFontSize(7.2);
      doc.setFont('helvetica', 'bold');
      doc.text(String(index + 1), columns[0].x + columns[0].w / 2, y + 5.5, { align: 'center' });
      drawPhoto(player, columns[1].x + 2, y);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.4);
      doc.text(safeText(player.player_name), columns[2].x + 1, y + 3.8, { maxWidth: columns[2].w - 2 });
      setColor(doc, BRAND.muted);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.3);
      doc.text(player.jersey_number ? `#${player.jersey_number}` : '—', columns[2].x + 1, y + 7.5);
      doc.text(safeText(player.position, '—'), columns[3].x + 1, y + 5.5, { maxWidth: columns[3].w - 2 });

      setColor(doc, BRAND.ink);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.text(String(player.partidos_count || 0), columns[4].x + columns[4].w / 2, y + 5.5, { align: 'center' });

      const metricCells = [
        { col: 5, value: player.reserva, total: TOTALS.reserva },
        { col: 6, value: player.juveniles, total: TOTALS.juveniles },
        { col: 7, value: player.amistosos, total: TOTALS.amistosos },
      ];
      metricCells.forEach((cell) => {
        const col = columns[cell.col];
        setColor(doc, BRAND.ink);
        doc.setFont('helvetica', 'bold');
        doc.text(minutes(cell.value), col.x + col.w / 2, y + 3.7, { align: 'center' });
        setColor(doc, BRAND.muted);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.8);
        doc.text(`${pct(cell.value, cell.total)}%`, col.x + col.w / 2, y + 7.2, { align: 'center' });
        addProgress(doc, col.x + 3, y + 8, col.w - 6, cell.value, cell.total);
      });

      setColor(doc, BRAND.greenDark);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(minutes(player.total), columns[8].x + columns[8].w / 2, y + 5.5, { align: 'center' });
      setColor(doc, BRAND.ink);
      doc.setFontSize(7.2);
      doc.text(`${pct(player.total, Math.max(1, totalsUsed.total))}%`, columns[9].x + columns[9].w / 2, y + 5.5, { align: 'center' });
    }

    for (const player of data.slice(0, 80)) {
      if (player.photo_url && !photoCache[player.photo_url]) photoCache[player.photo_url] = await loadImage(player.photo_url);
    }

    let page = 1;
    drawHeader(page);
    drawSummary();
    let y = 62;
    drawTableHeader(y);
    y += 11;

    data.forEach((player, index) => {
      if (y > pageH - 18) {
        doc.addPage();
        page += 1;
        drawHeader(page);
        y = 36;
        drawTableHeader(y);
        y += 11;
      }
      drawRow(player, index, y);
      y += 10.5;
    });

    setColor(doc, BRAND.muted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Los porcentajes se calculan sobre los minutos disponibles por competencia y el total exportado.', margin, pageH - 8);

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=minutos-jugados-defensa-y-justicia.pdf'
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
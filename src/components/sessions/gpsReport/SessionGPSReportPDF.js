import jsPDF from "jspdf";
import moment from "moment";
import { REPORT_METRICS, fmtMetricVal } from "./sessionGpsReportData";

const CLUB_LOGO = "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/4379a507a_defensa.png";
const YELLOW = [240, 200, 0];
const DARK = [20, 20, 20];
const GRAY = [110, 110, 110];
const LIGHT = [244, 244, 246];
const WHITE = [255, 255, 255];
const GREEN = [16, 150, 100];
const GREEN_BG = [209, 250, 229];
const RED = [220, 38, 38];
const RED_BG = [254, 226, 226];
const BLUE = [37, 99, 235];

async function toDataURL(url) {
  if (!url) return null;
  try {
    const resp = await fetch(url, { mode: "cors" });
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function pctColor(pct) {
  if (pct == null) return [161, 161, 170];
  if (pct >= 90) return GREEN;
  if (pct >= 70) return [217, 160, 10];
  return RED;
}

export async function generateSessionGPSReportPDF({ session, reportData, observations }) {
  const { summary, teamAverages, weekAverages, highlights, comparison, alerts, insights, principal, excluded } = reportData;

  const [logoData, playerPhotos] = await Promise.all([
    toDataURL(CLUB_LOGO),
    Promise.all(
      [...highlights, ...comparison].map(async (item) => [item.photo_url, item.photo_url ? await toDataURL(item.photo_url) : null])
    ),
  ]);
  const photoMap = Object.fromEntries(playerPhotos.filter(([url]) => url));

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210, pageH = 297, margin = 12, contentW = pageW - margin * 2;
  let y = 0;

  function addPageIfNeeded(needed = 20) {
    if (y + needed > pageH - 10) { doc.addPage(); y = 14; drawHeader(); }
  }
  function drawHeader() {
    doc.setFillColor(...DARK); doc.rect(0, 0, pageW, 22, "F");
    doc.setFillColor(...YELLOW); doc.rect(0, 22, pageW, 1.2, "F");
    if (logoData) doc.addImage(logoData, "PNG", margin, 4, 14, 14);
    doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(...WHITE);
    doc.text("INFORME DE SESIÓN GPS", margin + 18, 10);
    doc.setFontSize(7.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...YELLOW);
    doc.text(`${session.title}  ·  ${session.squad_name || ""}`, margin + 18, 15);
    doc.setFontSize(8); doc.setTextColor(...WHITE);
    doc.text(moment(session.date).format("dddd DD/MM/YYYY"), pageW - margin, 12, { align: "right" });
    y = 28;
  }
  function sectionTitle(title) {
    addPageIfNeeded(14);
    doc.setFillColor(...DARK); doc.rect(margin, y, contentW, 8, "F");
    doc.setFillColor(...YELLOW); doc.rect(margin, y, 3, 8, "F");
    doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(...WHITE);
    doc.text(title.toUpperCase(), margin + 6, y + 5.5);
    y += 11;
  }

  drawHeader();

  // ── Resumen general ────────────────────────────────
  sectionTitle("1. Resumen general");
  const summaryBadges = [
    ["Con GPS", summary.conGps], ["Excluidos", summary.excluidos], ["Diferenciados", summary.diferenciados],
    ["Kinesiología", summary.kinesiologia], ["Arqueros", summary.arqueros], ["Duración", summary.duracion ? `${summary.duracion}'` : "—"],
  ];
  addPageIfNeeded(22);
  let bx = margin;
  const bw = contentW / summaryBadges.length;
  summaryBadges.forEach(([label, val]) => {
    doc.setFillColor(...DARK); doc.roundedRect(bx, y, bw - 2, 20, 2, 2, "F");
    doc.setFillColor(...YELLOW); doc.rect(bx, y, bw - 2, 1.2, "F");
    doc.setFontSize(6.5); doc.setTextColor(...YELLOW); doc.setFont("helvetica", "normal");
    doc.text(label, bx + (bw - 2) / 2, y + 7, { align: "center" });
    doc.setFontSize(16); doc.setTextColor(...WHITE); doc.setFont("helvetica", "bold");
    doc.text(String(val), bx + (bw - 2) / 2, y + 16, { align: "center" });
    bx += bw;
  });
  y += 26;

  addPageIfNeeded(10);
  doc.setFontSize(8.5); doc.setFont("helvetica", "bold"); doc.setTextColor(...GRAY);
  doc.text("PROMEDIOS DEL GRUPO PRINCIPAL (vs. promedio semanal)", margin, y + 4);
  y += 8;
  const metricColW = contentW / 3;
  REPORT_METRICS.forEach((m, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    if (col === 0) addPageIfNeeded(22);
    const mx = margin + col * metricColW;
    const my = y + row * 20;
    doc.setFillColor(...LIGHT); doc.roundedRect(mx, my, metricColW - 3, 18, 1.5, 1.5, "F");
    const val = teamAverages[m.key], wk = weekAverages[m.key];
    const diff = (val != null && wk) ? Math.round(((val - wk) / wk) * 100) : null;
    doc.setFontSize(7); doc.setTextColor(...GRAY); doc.setFont("helvetica", "normal");
    doc.text(m.label, mx + 3, my + 6);
    doc.setFontSize(14); doc.setTextColor(...DARK); doc.setFont("helvetica", "bold");
    doc.text(`${fmtMetricVal(m.key, val)}`, mx + 3, my + 14);
    doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(...GRAY);
    doc.text(m.unit, mx + 3 + doc.getTextWidth(`${fmtMetricVal(m.key, val)}`) + 2, my + 14);
    if (diff != null) {
      doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(...(diff >= 0 ? GREEN : RED));
      doc.text(`${diff >= 0 ? "▲" : "▼"} ${Math.abs(diff)}%`, mx + metricColW - 8, my + 14, { align: "right" });
    }
  });
  y += Math.ceil(REPORT_METRICS.length / 3) * 20 + 4;

  // ── Destacados ─────────────────────────────────────
  sectionTitle("2. Jugadores destacados");
  const hCols = 2, hw = contentW / hCols;
  let hx = margin, hy = y;
  highlights.forEach((h, idx) => {
    if (idx % hCols === 0) addPageIfNeeded(26);
    doc.setFillColor(...DARK); doc.roundedRect(hx, hy, hw - 3, 24, 2, 2, "F");
    const photo = photoMap[h.photo_url];
    if (photo) { doc.addImage(photo, "JPEG", hx + 2.5, hy + 2.5, 19, 19); }
    else { doc.setFillColor(60, 60, 60); doc.roundedRect(hx + 2.5, hy + 2.5, 19, 19, 1, 1, "F"); }
    const tx = hx + 24;
    doc.setFontSize(6.5); doc.setTextColor(...YELLOW); doc.setFont("helvetica", "normal");
    doc.text(h.label.toUpperCase(), tx, hy + 6.5, { maxWidth: hw - 27 });
    doc.setFontSize(9.5); doc.setFont("helvetica", "bold"); doc.setTextColor(...WHITE);
    doc.text(h.player_name || "—", tx, hy + 12, { maxWidth: hw - 27 });
    doc.setFontSize(6.5); doc.setFont("helvetica", "normal"); doc.setTextColor(200, 200, 200);
    doc.text(h.position || "", tx, hy + 16);
    doc.setFontSize(13); doc.setFont("helvetica", "bold"); doc.setTextColor(...YELLOW);
    doc.text(h.value, tx, hy + 22);
    hx += hw;
    if ((idx + 1) % hCols === 0) { hx = margin; hy += 27; }
  });
  y = hy + (highlights.length % hCols ? 27 : 0) + 3;

  // ── Tabla general ──────────────────────────────────
  sectionTitle("3. Tabla general (grupo principal)");
  const cols = [
    { label: "Jugador", w: 42 },
    { label: "Pos.", w: 20 },
    ...REPORT_METRICS.map((m) => ({ label: m.label, w: (contentW - 62) / REPORT_METRICS.length })),
  ];
  function drawTableHeader() {
    addPageIfNeeded(8);
    doc.setFillColor(...DARK); doc.rect(margin, y, contentW, 7, "F");
    doc.setFontSize(6.5); doc.setFont("helvetica", "bold"); doc.setTextColor(...WHITE);
    let cx = margin;
    cols.forEach((c) => { doc.text(c.label, cx + 1.5, y + 4.7, { maxWidth: c.w - 2 }); cx += c.w; });
    y += 7;
  }
  drawTableHeader();
  const rankByKey = {};
  REPORT_METRICS.forEach((m) => {
    rankByKey[m.key] = [...principal].sort((a, b) => (b[m.key] || 0) - (a[m.key] || 0)).map((r) => r.player_id).slice(0, 3);
  });
  principal.forEach((r, idx) => {
    addPageIfNeeded(7);
    doc.setFillColor(...(idx % 2 === 0 ? LIGHT : WHITE)); doc.rect(margin, y, contentW, 6.2, "F");
    let cx = margin;
    doc.setFontSize(6.5); doc.setFont("helvetica", "bold"); doc.setTextColor(...DARK);
    doc.text(r.player_name || "—", cx + 1.5, y + 4.2, { maxWidth: cols[0].w - 2 }); cx += cols[0].w;
    doc.setFont("helvetica", "normal"); doc.setTextColor(...GRAY);
    doc.text(r._player?.position || "—", cx + 1.5, y + 4.2, { maxWidth: cols[1].w - 2 }); cx += cols[1].w;
    REPORT_METRICS.forEach((m, i) => {
      const isTop3 = rankByKey[m.key].includes(r.player_id);
      doc.setFont("helvetica", isTop3 ? "bold" : "normal");
      doc.setTextColor(...(isTop3 ? GREEN : DARK));
      doc.text(fmtMetricVal(m.key, r[m.key]), cx + 1.5, y + 4.2, { maxWidth: cols[2 + i].w - 2 });
      cx += cols[2 + i].w;
    });
    y += 6.2;
  });
  y += 5;

  if (excluded.length > 0) {
    addPageIfNeeded(12);
    doc.setFillColor(...RED_BG); doc.roundedRect(margin, y, contentW, 6 + excluded.length * 4.5, 1.5, 1.5, "F");
    doc.setFontSize(7.5); doc.setFont("helvetica", "bold"); doc.setTextColor(...RED);
    doc.text(`EXCLUIDOS DE LOS PROMEDIOS (${excluded.length})`, margin + 3, y + 5);
    let ey = y + 9.5;
    excluded.forEach((r) => {
      doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(...DARK);
      doc.text(`${r.player_name} — ${r.exclusion_reason || "excluido"}`, margin + 3, ey);
      ey += 4.5;
    });
    y += 8 + excluded.length * 4.5 + 4;
  }

  // ── Comparación competitiva ────────────────────────
  if (comparison.length > 0) {
    sectionTitle("4. Comparación vs. perfil competitivo");
    comparison.forEach((c) => {
      addPageIfNeeded(20);
      doc.setFontSize(8.5); doc.setFont("helvetica", "bold"); doc.setTextColor(...DARK);
      doc.text(c.player_name || "—", margin, y + 4);
      y += 5.5;
      let cx = margin;
      const mw = contentW / c.metrics.length;
      c.metrics.forEach((m) => {
        const color = pctColor(m.pct);
        doc.setFillColor(...color); doc.roundedRect(cx, y, mw - 2, 14, 1.5, 1.5, "F");
        doc.setFontSize(5.5); doc.setTextColor(...WHITE);
        doc.text(m.label, cx + 1.5, y + 4.5, { maxWidth: mw - 3 });
        doc.setFontSize(10); doc.setFont("helvetica", "bold");
        doc.text(m.pct != null ? `${Math.round(m.pct)}%` : "—", cx + 1.5, y + 11);
        doc.setFont("helvetica", "normal");
        cx += mw;
      });
      y += 17;
    });
    y += 2;
  }

  // ── Análisis automático ────────────────────────────
  sectionTitle("5. Análisis automático");
  addPageIfNeeded(8 + insights.length * 6);
  doc.setFillColor(...LIGHT); doc.roundedRect(margin, y, contentW, insights.length * 6 + 4, 2, 2, "F");
  let iy2 = y + 5.5;
  insights.forEach((line) => {
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...DARK);
    const lines = doc.splitTextToSize(`•  ${line}`, contentW - 6);
    doc.text(lines, margin + 3, iy2);
    iy2 += lines.length * 4.5 + 1;
  });
  y = iy2 + 4;

  // ── Alertas ────────────────────────────────────────
  if (alerts.length > 0) {
    sectionTitle("6. Alertas");
    alerts.forEach((a) => {
      addPageIfNeeded(7);
      doc.setFillColor(...RED_BG); doc.roundedRect(margin, y, contentW, 5.8, 1.2, 1.2, "F");
      doc.setFontSize(7.5); doc.setFont("helvetica", "bold"); doc.setTextColor(...RED);
      doc.text("⚠", margin + 2, y + 4);
      doc.setFont("helvetica", "normal"); doc.setTextColor(...DARK);
      doc.text(a.text, margin + 7, y + 4, { maxWidth: contentW - 10 });
      y += 6.8;
    });
    y += 2;
  }

  // ── Observaciones ──────────────────────────────────
  sectionTitle("7. Observaciones");
  if (observations) {
    addPageIfNeeded(20);
    doc.setFillColor(...LIGHT); doc.setDrawColor(...YELLOW); doc.setLineWidth(0.6);
    const lines = doc.splitTextToSize(observations, contentW - 6);
    const boxH = lines.length * 4.6 + 6;
    doc.roundedRect(margin, y, contentW, boxH, 2, 2, "FD");
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...DARK);
    doc.text(lines, margin + 3, y + 5.5);
    y += boxH + 4;
  } else {
    addPageIfNeeded(8);
    doc.setFontSize(8); doc.setFont("helvetica", "italic"); doc.setTextColor(...GRAY);
    doc.text("Sin observaciones", margin, y + 4);
    y += 8;
  }

  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFillColor(...YELLOW); doc.rect(0, pageH - 4, pageW, 4, "F");
    doc.setFontSize(6.5); doc.setTextColor(...DARK);
    doc.text(`${p} / ${totalPages}`, pageW - margin, pageH - 6.5, { align: "right" });
  }

  const filename = `informe_gps_${moment(session.date).format("YYYY-MM-DD")}_${(session.title || "sesion").replace(/\s+/g, "_")}.pdf`;
  doc.save(filename);
}
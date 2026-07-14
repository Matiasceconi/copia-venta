import moment from "moment";
import { jsPDF } from "jspdf";
import { fmt } from "./gpsMicrocycleReportUtils";

const CLUB_LOGO_URL = "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/36f6c4008_defensa.png";
const PAGE = { w: 297, h: 210, m: 12 };

export async function imageToDataUrl(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

function setText(doc, color = [40, 40, 40], size = 9, style = "normal") {
  doc.setTextColor(...color); doc.setFontSize(size); doc.setFont("helvetica", style);
}
function addImage(doc, dataUrl, x, y, w, h) {
  if (!dataUrl) return false;
  try { doc.addImage(dataUrl, dataUrl.includes("image/png") ? "PNG" : "JPEG", x, y, w, h); return true; } catch { return false; }
}
function hexToRgb(hex) { const clean = String(hex || "#22c55e").replace("#", ""); const n = parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function chunks(arr, size) { const out = []; for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size)); return out; }

function header(doc, logo, meta) {
  doc.setFillColor(248, 250, 248); doc.rect(0, 0, PAGE.w, PAGE.h, "F");
  doc.setFillColor(0, 114, 54); doc.rect(0, 0, PAGE.w, 10, "F");
  doc.setFillColor(250, 204, 21); doc.rect(0, 10, PAGE.w, 2.5, "F");
  addImage(doc, logo, 12, 16, 18, 18);
  setText(doc, [0, 80, 42], 14, "bold"); doc.text("PerformancePitch", 36, 22);
  setText(doc, [35, 35, 35], 10, "bold"); doc.text("Informe profesional de rendimiento · Carga del Microciclo", 36, 29);
  setText(doc, [90, 90, 90], 7.5); doc.text(`Plantel: ${meta.squadName || "—"} · Temporada: ${meta.season || "—"}`, 36, 35);
}
function footer(doc, page, total, meta) {
  doc.setDrawColor(220, 225, 220); doc.line(PAGE.m, 198, PAGE.w - PAGE.m, 198);
  setText(doc, [95, 95, 95], 7);
  doc.text(`Página ${page} de ${total}`, PAGE.m, 203);
  doc.text(`Generado ${moment().format("DD/MM/YYYY HH:mm")} · ${meta.squadName || "Plantel"}`, 102, 203);
  doc.text("PerformancePitch", 260, 203);
}
function addPage(doc, logo, meta) { if (doc.__started) doc.addPage("a4", "landscape"); doc.__started = true; header(doc, logo, meta); }

function drawFallbackShield(doc, x, y, w, h, text) {
  doc.setFillColor(235, 238, 235); doc.roundedRect(x, y, w, h, 4, 4, "F");
  setText(doc, [0, 80, 42], 14, "bold"); doc.text(String(text || "R").slice(0, 2).toUpperCase(), x + w / 2, y + h / 2 + 4, { align: "center" });
}

function drawCover(doc, logo, rivalLogo, meta) {
  doc.setFillColor(0, 45, 28); doc.rect(0, 0, PAGE.w, PAGE.h, "F");
  doc.setFillColor(250, 204, 21); doc.rect(0, 0, PAGE.w, 5, "F");
  setText(doc, [255, 255, 255], 22, "bold"); doc.text("Informe de Carga del Microciclo", 18, 32);
  setText(doc, [190, 210, 200], 11); doc.text(`${meta.squadName || "Plantel"} · Temporada ${meta.season || "—"} · ${meta.start} - ${meta.end}`, 18, 42);
  doc.setFillColor(255, 255, 255); doc.roundedRect(42, 66, 82, 78, 6, 6, "F"); addImage(doc, logo, 66, 78, 34, 34);
  doc.setFillColor(255, 255, 255); doc.roundedRect(173, 66, 82, 78, 6, 6, "F"); if (!addImage(doc, rivalLogo, 197, 78, 34, 34)) drawFallbackShield(doc, 197, 78, 34, 34, meta.rival);
  setText(doc, [255, 255, 255], 18, "bold"); doc.text(`${meta.squadName || "Defensa y Justicia"} vs. ${meta.rival || "Rival"}`, 148.5, 158, { align: "center" });
  setText(doc, [210, 225, 215], 10); doc.text([meta.time, meta.competition, meta.homeAway].filter(Boolean).join(" · ") || "Datos de partido no cargados", 148.5, 169, { align: "center" });
  doc.__started = true;
}

function drawCycleDays(doc, logo, meta, days = []) {
  addPage(doc, logo, meta); setText(doc, [20, 20, 20], 12, "bold"); doc.text("Días del microciclo", 12, 48);
  let y = 58;
  days.forEach((d, idx) => {
    doc.setFillColor(idx % 2 ? 248 : 238, idx % 2 ? 250 : 244, idx % 2 ? 248 : 240); doc.roundedRect(12, y, PAGE.w - 24, 12, 2, 2, "F");
    const cells = [d.md || "—", moment(d.date).format("dddd DD/MM"), d.objetivo || d.objective || "—", `${d.sessions?.length || 0} sesiones`, d.rival ? `Partido vs. ${d.rival}` : "", d.gpsPlayers ? `GPS ${d.gpsPlayers}` : ""];
    const widths = [18, 42, 56, 34, 78, 40]; let x = 14;
    cells.forEach((cell, i) => { setText(doc, [35, 35, 35], 7.2, i === 0 ? "bold" : "normal"); doc.text(String(cell), x, y + 8, { maxWidth: widths[i] - 2 }); x += widths[i]; });
    y += 14; if (y > 184) { addPage(doc, logo, meta); y = 48; }
  });
}

function drawChart(doc, metric, data, x, y, w, h, type = "bar") {
  doc.setFillColor(255, 255, 255); doc.roundedRect(x, y, w, h, 3, 3, "F"); doc.setDrawColor(220, 226, 220); doc.roundedRect(x, y, w, h, 3, 3, "S");
  setText(doc, [20, 20, 20], 10, "bold"); doc.text(metric.label, x + 5, y + 8);
  setText(doc, [95, 95, 95], 6.5); doc.text(`${metric.group || "Métrica"} · ${metric.unit || "sin unidad"}`, x + 5, y + 14);
  const plot = { x: x + 12, y: y + 24, w: w - 20, h: h - 42 };
  const values = data.map((d) => Number(d[metric.key])).filter(Number.isFinite); const max = Math.max(...values, 1) * 1.18; const gap = 3; const barW = Math.max(5, (plot.w - gap * (data.length + 1)) / Math.max(data.length, 1));
  const points = data.map((d, i) => { const value = Number(d[metric.key]) || 0; const px = plot.x + gap + i * (barW + gap) + barW / 2; const py = plot.y + plot.h - (value / max) * plot.h; return { x: px, y: py, value, label: d.md || "—" }; });
  if (type === "line" || type === "area") {
    doc.setDrawColor(...hexToRgb(metric.color)); doc.setLineWidth(1.2);
    points.slice(1).forEach((p, i) => doc.line(points[i].x, points[i].y, p.x, p.y));
    points.forEach((p) => { doc.setFillColor(...hexToRgb(metric.color)); doc.circle(p.x, p.y, 1.8, "F"); });
  } else {
    data.forEach((d, i) => { const value = Number(d[metric.key]) || 0; const bh = Math.max(1.5, (value / max) * plot.h); const bx = plot.x + gap + i * (barW + gap); const by = plot.y + plot.h - bh; doc.setFillColor(...hexToRgb(metric.color)); doc.roundedRect(bx, by, barW, bh, 1.5, 1.5, "F"); });
  }
  points.forEach((p) => { setText(doc, [40, 40, 40], 6.5, "bold"); doc.text(fmt(p.value, metric.unit), p.x, Math.max(plot.y - 2, p.y - 2), { align: "center" }); setText(doc, [90, 90, 90], 6); doc.text(String(p.label), p.x, plot.y + plot.h + 5, { align: "center" }); });
}
function drawCharts(doc, logo, meta, metrics, dailySummaries, chartConfig = {}) { chunks(metrics.flatMap((metric) => chunks(dailySummaries, 8).map((data) => ({ metric, data, type: chartConfig.chartTypes?.[metric.key] || "bar" }))), 2).forEach((pair) => { addPage(doc, logo, meta); pair.forEach((job, i) => drawChart(doc, job.metric, job.data, i === 0 ? 12 : 153.5, 46, 131.5, 132, job.type)); }); }

function rowDuration(row) { const direct = Number(row.duration_minutes || row.minutes || row.duration || 0); if (direct) return direct; const distance = Number(row.total_distance || 0); const mMin = Number(row.m_min || 0); return distance && mMin ? distance / mMin : 0; }
function aggregatePlayerRows(rows, metrics) {
  const byPlayer = {};
  rows.forEach((row) => { const id = row.player_id; if (!id) return; const current = byPlayer[id] || { name: row.player_name || row.player?.full_name || "Jugador", position: row.position || row.player?.position || "", values: {}, distanceDuration: 0, loadDuration: 0, total_distance: 0, player_load: 0, sessions: new Set() }; metrics.forEach((m) => { const value = Number(row[m.key]); if (m.rankMode === "weightedDistanceDuration") { const d = rowDuration(row); if (d && row.total_distance) { current.distanceDuration += d; current.total_distance += Number(row.total_distance); } } else if (m.rankMode === "weightedPlayerLoadDuration") { const d = rowDuration(row); if (d && row.player_load) { current.loadDuration += d; current.player_load += Number(row.player_load); } } else if (m.rankMode === "countSessions") { if (row.session_id) current.sessions.add(row.session_id); } else if (m.rankMode === "max" || m.mode === "max") current.values[m.key] = Number.isFinite(value) ? Math.max(current.values[m.key] || 0, value) : current.values[m.key]; else if (Number.isFinite(value)) current.values[m.key] = (current.values[m.key] || 0) + value; }); byPlayer[id] = current; });
  return Object.values(byPlayer).map((p) => ({ ...p, values: Object.fromEntries(metrics.map((m) => [m.key, m.rankMode === "weightedDistanceDuration" ? (p.distanceDuration ? p.total_distance / p.distanceDuration : null) : m.rankMode === "weightedPlayerLoadDuration" ? (p.loadDuration ? p.player_load / p.loadDuration : null) : m.rankMode === "countSessions" ? p.sessions.size : p.values[m.key]])) })).sort((a, b) => (b.values.total_distance || 0) - (a.values.total_distance || 0));
}
function drawPlayerTable(doc, logo, meta, rows, metrics) {
  const players = aggregatePlayerRows(rows, metrics).slice(0, 32);
  chunks(metrics, 6).forEach((metricSet) => { addPage(doc, logo, meta); setText(doc, [20, 20, 20], 12, "bold"); doc.text("Tabla acumulada de jugadores", 12, 48); const headers = ["Jugador", "Pos.", ...metricSet.map((m) => m.short || m.label)]; const widths = [58, 18, ...metricSet.map(() => (PAGE.w - 24 - 76) / metricSet.length)]; let y = 56; doc.setFillColor(0, 114, 54); doc.rect(12, y, PAGE.w - 24, 8, "F"); let x = 12; headers.forEach((h, i) => { setText(doc, [255, 255, 255], 7, "bold"); doc.text(h, x + widths[i] / 2, y + 5.2, { align: "center" }); x += widths[i]; }); y += 8; players.forEach((p, idx) => { x = 12; doc.setFillColor(idx % 2 ? 248 : 238, idx % 2 ? 250 : 244, idx % 2 ? 248 : 240); doc.rect(12, y, PAGE.w - 24, 8, "F"); const cells = [p.name, p.position || "—", ...metricSet.map((m) => fmt(p.values[m.key], m.unit))]; cells.forEach((c, i) => { setText(doc, [35, 35, 35], 6.8, i === 0 ? "bold" : "normal"); doc.text(String(c), x + widths[i] / 2, y + 5.5, { align: "center", maxWidth: widths[i] - 2 }); x += widths[i]; }); y += 8; }); });
}

async function drawRankings(doc, logo, meta, highlights) {
  for (const group of chunks(highlights || [], 4)) { addPage(doc, logo, meta); setText(doc, [20, 20, 20], 12, "bold"); doc.text("Rankings seleccionados", 12, 48); group.forEach((h, i) => { const x = i % 2 === 0 ? 12 : 153.5; const y = i < 2 ? 56 : 122; doc.setFillColor(255, 255, 255); doc.roundedRect(x, y, 131.5, 56, 3, 3, "F"); doc.setFillColor(...hexToRgb(h.metric.color)); doc.rect(x, y, 131.5, 4, "F"); setText(doc, [20, 20, 20], 9, "bold"); doc.text(`${h.metric.label} · ${h.scope || "Microciclo"}`, x + 5, y + 12); (h.top || []).slice(0, h.topCount || 3).forEach((p, r) => { setText(doc, [0, 114, 54], 8, "bold"); doc.text(`#${r + 1}`, x + 5, y + 24 + r * 10); setText(doc, [20, 20, 20], 7, "bold"); doc.text(p.name || "Jugador", x + 17, y + 23 + r * 10, { maxWidth: 52 }); setText(doc, [0, 114, 54], 7, "bold"); doc.text(fmt(p.value, h.metric.unit), x + 118, y + 23 + r * 10, { align: "right" }); }); }); }
}
function drawComparison(doc, logo, meta, comparison) { addPage(doc, logo, meta); setText(doc, [20, 20, 20], 12, "bold"); doc.text("Comparación con la semana anterior", 12, 48); (comparison || []).slice(0, 10).forEach((c, i) => { const x = 12 + (i % 5) * 55; const y = 60 + Math.floor(i / 5) * 52; doc.setFillColor(255, 255, 255); doc.roundedRect(x, y, 50, 42, 3, 3, "F"); setText(doc, [25, 25, 25], 7, "bold"); doc.text(c.metric.label, x + 4, y + 7, { maxWidth: 42 }); setText(doc, [0, 114, 54], 10, "bold"); doc.text(fmt(c.current, c.metric.unit), x + 4, y + 19); setText(doc, [95, 95, 95], 6.5); doc.text(`Prev.: ${fmt(c.previous, c.metric.unit)}`, x + 4, y + 29); }); }
function drawAiAnalysis(doc, logo, meta, aiText) { if (!aiText) return; addPage(doc, logo, meta); setText(doc, [20, 20, 20], 12, "bold"); doc.text("Conclusiones", 12, 48); setText(doc, [35, 35, 35], 9); doc.text(doc.splitTextToSize(aiText, 265), 12, 60); }

export async function generateMicrocyclePdf({ squadName, season, dailySummaries = [], highlights = [], comparison = [], metrics = [], cycleDays = [], matchContext = {}, cycleRows = [], options = {}, chartConfig = {}, aiText = "" }) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
  const logo = await imageToDataUrl(CLUB_LOGO_URL);
  const rivalLogo = await imageToDataUrl(matchContext?.rival_logo_url);
  const firstDay = dailySummaries?.[0]; const lastDay = dailySummaries?.[dailySummaries.length - 1];
  const meta = { squadName: squadName || "Defensa y Justicia", season, start: firstDay?.date ? moment(firstDay.date).format("DD/MM/YYYY") : "—", end: lastDay?.date ? moment(lastDay.date).format("DD/MM/YYYY") : "—", rival: matchContext?.rival || "", competition: matchContext?.competition || "", homeAway: matchContext?.home_away || "", time: matchContext?.time || "" };
  if (options.includeCover) drawCover(doc, logo, rivalLogo, meta);
  if (options.includeCycleDays) drawCycleDays(doc, logo, meta, dailySummaries.map((d) => ({ ...d, ...(cycleDays.find((day) => day.date === d.date) || {}) })));
  if (options.includePlayerTable) drawPlayerTable(doc, logo, meta, cycleRows, metrics);
  if (options.includeCharts) drawCharts(doc, logo, meta, metrics, dailySummaries, chartConfig);
  if (options.includeRankings) await drawRankings(doc, logo, meta, highlights);
  if (options.includeHighlightedPlayers) await drawRankings(doc, logo, meta, highlights.slice(0, 3));
  if (options.includeWeeklyComparison) drawComparison(doc, logo, meta, comparison);
  if (options.includeConclusions) drawAiAnalysis(doc, logo, meta, aiText);
  if (!doc.__started) addPage(doc, logo, meta);
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) { doc.setPage(p); footer(doc, p, total, meta); }
  doc.save(`informe-microciclo-${firstDay?.date || "gps"}.pdf`);
}
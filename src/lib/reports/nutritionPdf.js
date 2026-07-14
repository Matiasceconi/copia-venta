import { jsPDF } from "jspdf";
import moment from "moment";
import { CLUB_BRAND } from "@/lib/clubBrand";

function hexToRgb(hex) {
  const value = String(hex || "#000000").replace("#", "");
  const normalized = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  return [0, 2, 4].map((i) => parseInt(normalized.slice(i, i + 2), 16));
}
function setColor(doc, method, hex) {
  const [r, g, b] = hexToRgb(hex);
  doc[method](r, g, b);
}
function fmt(v, unit = "", decimals = 1) {
  return v !== undefined && v !== null && v !== "" ? `${Number(v).toFixed(decimals)}${unit}` : "—";
}
async function imageToDataUrl(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function drawHeader(doc, { logo, title, subtitle, dateLabel, pageW, margin }) {
  const contentW = pageW - margin * 2;
  setColor(doc, "setFillColor", CLUB_BRAND.colors.panel);
  doc.roundedRect(margin, margin, contentW, 34, 4, 4, "F");
  setColor(doc, "setFillColor", CLUB_BRAND.colors.green);
  doc.rect(margin, margin + 32, contentW, 2, "F");
  if (logo) doc.addImage(logo, "PNG", margin + 5, margin + 5, 22, 22);
  setColor(doc, "setTextColor", CLUB_BRAND.colors.greenDark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(CLUB_BRAND.name.toUpperCase(), margin + 32, margin + 9);
  setColor(doc, "setTextColor", CLUB_BRAND.colors.ink);
  doc.setFontSize(18);
  doc.text(title, margin + 32, margin + 19);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setColor(doc, "setTextColor", CLUB_BRAND.colors.muted);
  doc.text(subtitle, margin + 32, margin + 27);
  doc.text(`Generado: ${dateLabel}`, pageW - margin - 55, margin + 9);
}

function drawSmallHeader(doc, { title, page, total, pageW, margin }) {
  setColor(doc, "setTextColor", CLUB_BRAND.colors.greenDeep);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(title, margin, margin + 2);
  doc.setFont("helvetica", "normal");
  setColor(doc, "setTextColor", CLUB_BRAND.colors.muted);
  doc.text(`Página ${page} de ${total}`, pageW - margin - 25, margin + 2);
  setColor(doc, "setDrawColor", CLUB_BRAND.colors.line);
  doc.line(margin, margin + 6, pageW - margin, margin + 6);
}

function drawTableHeader(doc, { cols, y, margin, contentW }) {
  setColor(doc, "setFillColor", CLUB_BRAND.colors.greenDark);
  doc.roundedRect(margin, y, contentW, 8, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  let x = margin;
  cols.forEach((col) => {
    doc.text(col.label.toUpperCase(), x + 2, y + 5.3);
    x += col.w;
  });
}

function drawTableRow(doc, { cols, row, index, y, margin, contentW, pageW }) {
  const rowH = 8;
  if (index % 2 === 0) {
    setColor(doc, "setFillColor", CLUB_BRAND.colors.panel);
    doc.rect(margin, y, contentW, rowH, "F");
  }
  setColor(doc, "setDrawColor", CLUB_BRAND.colors.line);
  doc.line(margin, y + rowH, pageW - margin, y + rowH);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setColor(doc, "setTextColor", CLUB_BRAND.colors.ink);
  let x = margin;
  cols.forEach((col) => {
    const text = doc.splitTextToSize(String(row[col.key] ?? "—"), col.w - 4)[0] || "";
    doc.text(text, x + 2, y + 5.2);
    x += col.w;
  });
}

function addPageNumber(doc, { page, total, pageW, pageH, margin }) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setColor(doc, "setTextColor", CLUB_BRAND.colors.muted);
  doc.text(`Página ${page} de ${total}`, pageW - margin - 25, pageH - 7);
}

export async function exportSkinfoldPdf({
  rows,
  playerMap,
  squadName,
  seasonLabel,
  filters = {},
}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const logo = await imageToDataUrl(CLUB_BRAND.logoUrl);
  const margin = 12;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - margin * 2;
  const dateLabel = moment().format("DD/MM/YYYY HH:mm");

  const filterText = [
    squadName ? `Plantel: ${squadName}` : null,
    seasonLabel ? `Temporada: ${seasonLabel}` : null,
    filters.dateFrom || filters.dateTo ? `Período: ${filters.dateFrom || "—"} → ${filters.dateTo || "—"}` : null,
    filters.position ? `Posición: ${filters.position}` : null,
    filters.search ? `Búsqueda: ${filters.search}` : null,
  ]
    .filter(Boolean)
    .join("  ·  ");

  const subtitle = [squadName, seasonLabel, filterText].filter(Boolean).join("  ·  ");

  const cols = [
    { key: "idx", label: "#", w: 8 },
    { key: "player", label: "Jugador", w: 55 },
    { key: "position", label: "Posición", w: 36 },
    { key: "fecha", label: "Fecha", w: 24 },
    { key: "peso", label: "Peso (kg)", w: 22 },
    { key: "sum6p", label: "Sum 6P", w: 20 },
    { key: "grasa", label: "% Grasa", w: 20 },
    { key: "masaMuscular", label: "MM (kg)", w: 22 },
    { key: "diff", label: "Dif. 6P", w: 18 },
    { key: "observaciones", label: "Observaciones", w: 67 },
  ];

  const tableRows = rows.map((a, i) => {
    const p = playerMap[a.player_id];
    const name = p?.full_name || `${p?.first_name || ""} ${p?.last_name || ""}`.trim() || a.player_name_original || "";
    return {
      idx: String(i + 1),
      player: name,
      position: p?.position || "—",
      fecha: a.fecha ? moment(a.fecha).format("DD/MM/YY") : "—",
      peso: fmt(a.peso, " kg"),
      sum6p: fmt(a.sumatoria_6p),
      grasa: fmt(a.porcentaje_grasa, "%"),
      masaMuscular: fmt(a.kg_masa_muscular, " kg"),
      diff: a.diff_sumatoria_6p != null ? (a.diff_sumatoria_6p >= 0 ? "+" : "") + Number(a.diff_sumatoria_6p).toFixed(1) : "—",
      observaciones: a.observaciones || "",
    };
  });

  // Stats cards
  const linked = rows.filter((a) => a.linked && a.player_id);
  const evaluated = new Set(linked.map((a) => a.player_id)).size;
  const latestDate = rows.map((a) => a.fecha).filter(Boolean).sort().pop();
  const avg6p = linked.length ? (linked.reduce((s, a) => s + Number(a.sumatoria_6p || 0), 0) / linked.length).toFixed(1) : "—";
  const avgGrasa = linked.length ? (linked.reduce((s, a) => s + Number(a.porcentaje_grasa || 0), 0) / linked.length).toFixed(1) : "—";

  drawHeader(doc, { logo, title: "Seguimiento de Pliegues", subtitle, dateLabel, pageW, margin });

  // KPI row
  const kpiY = margin + 40;
  const kpiCards = [
    { label: "Jugadores Evaluados", value: String(evaluated) },
    { label: "Última Evaluación", value: latestDate ? moment(latestDate).format("DD/MM/YYYY") : "—" },
    { label: "Prom. Sumatoria 6P", value: `${avg6p} mm` },
    { label: "Prom. % Grasa", value: `${avgGrasa}%` },
  ];
  const kpiW = (contentW - 9) / 4;
  kpiCards.forEach(({ label, value }, i) => {
    const x = margin + i * (kpiW + 3);
    setColor(doc, "setDrawColor", CLUB_BRAND.colors.line);
    doc.roundedRect(x, kpiY, kpiW, 14, 2, 2, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    setColor(doc, "setTextColor", CLUB_BRAND.colors.muted);
    doc.text(label.toUpperCase(), x + 3, kpiY + 5);
    doc.setFontSize(11);
    setColor(doc, "setTextColor", CLUB_BRAND.colors.greenDark);
    doc.text(value, x + 3, kpiY + 11);
  });

  let y = kpiY + 20;
  drawTableHeader(doc, { cols, y, margin, contentW });
  y += 8;

  tableRows.forEach((row, index) => {
    if (y + 8 > pageH - margin - 10) {
      doc.addPage();
      y = margin + 18;
      drawTableHeader(doc, { cols, y, margin, contentW });
      y += 8;
    }
    drawTableRow(doc, { cols, row, index, y, margin, contentW, pageW });
    y += 8;
  });

  const totalPages = doc.getNumberOfPages();
  for (let pg = 1; pg <= totalPages; pg++) {
    doc.setPage(pg);
    if (pg > 1) drawSmallHeader(doc, { title: "Seguimiento de Pliegues", page: pg, total: totalPages, pageW, margin });
    addPageNumber(doc, { page: pg, total: totalPages, pageW, pageH, margin });
  }

  doc.save(`nutricion-pliegues-${moment().format("YYYYMMDD-HHmm")}.pdf`);
}

export async function exportReadingPdf({
  rows,
  playerMap,
  readingStatusMap,
  squadName,
  seasonLabel,
}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const logo = await imageToDataUrl(CLUB_BRAND.logoUrl);
  const margin = 12;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - margin * 2;
  const dateLabel = moment().format("DD/MM/YYYY HH:mm");
  const subtitle = [squadName, seasonLabel].filter(Boolean).join("  ·  ");

  const cols = [
    { key: "idx", label: "#", w: 8 },
    { key: "player", label: "Jugador", w: 60 },
    { key: "fecha", label: "Fecha", w: 24 },
    { key: "lectura", label: "Lectura", w: 32 },
    { key: "observation", label: "Observación", w: 60 },
    { key: "responsible", label: "Responsable", w: 35 },
    { key: "nextControl", label: "Próx. Control", w: 24 },
    { key: "sum6p", label: "Sum 6P", w: 25 },
  ];

  const tableRows = rows.map((r, i) => {
    const p = playerMap[r.player_id];
    const name = p?.full_name || `${p?.first_name || ""} ${p?.last_name || ""}`.trim() || r.player_name_original || "";
    const status = readingStatusMap[r.reading_status_id];
    return {
      idx: String(i + 1),
      player: name,
      fecha: r.fecha ? moment(r.fecha).format("DD/MM/YY") : "—",
      lectura: status?.name || r.interpretation_note || "—",
      observation: r.observation || r.interpretation_note || "",
      responsible: r.responsible_user_id || "—",
      nextControl: r.next_control_date ? moment(r.next_control_date).format("DD/MM/YY") : "—",
      sum6p: fmt(r.sumatoria_6p),
    };
  });

  drawHeader(doc, { logo, title: "Informe de Lectura Nutricional", subtitle, dateLabel, pageW, margin });

  let y = margin + 40;
  drawTableHeader(doc, { cols, y, margin, contentW });
  y += 8;

  tableRows.forEach((row, index) => {
    if (y + 8 > pageH - margin - 10) {
      doc.addPage();
      y = margin + 18;
      drawTableHeader(doc, { cols, y, margin, contentW });
      y += 8;
    }
    drawTableRow(doc, { cols, row, index, y, margin, contentW, pageW });
    y += 8;
  });

  const totalPages = doc.getNumberOfPages();
  for (let pg = 1; pg <= totalPages; pg++) {
    doc.setPage(pg);
    if (pg > 1) drawSmallHeader(doc, { title: "Informe de Lectura Nutricional", page: pg, total: totalPages, pageW, margin });
    addPageNumber(doc, { page: pg, total: totalPages, pageW, pageH, margin });
  }

  doc.save(`nutricion-lectura-${moment().format("YYYYMMDD-HHmm")}.pdf`);
}

export async function exportPlayerEvolutionPdf({
  player,
  assessments,
  squadName,
  seasonLabel,
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const logo = await imageToDataUrl(CLUB_BRAND.logoUrl);
  const margin = 14;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - margin * 2;
  const dateLabel = moment().format("DD/MM/YYYY HH:mm");
  const playerName = player?.full_name || `${player?.first_name || ""} ${player?.last_name || ""}`.trim() || "—";
  const subtitle = [squadName, seasonLabel, player?.position].filter(Boolean).join("  ·  ");
  const sorted = [...assessments].sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""));
  const latest = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];

  drawHeader(doc, { logo, title: `Evolución: ${playerName}`, subtitle, dateLabel, pageW, margin });

  const kpiY = margin + 40;
  const metrics = [
    { label: "Último Peso", value: fmt(latest?.peso, " kg") },
    { label: "Última Sum. 6P", value: fmt(latest?.sumatoria_6p, " mm") },
    { label: "Último % Grasa", value: fmt(latest?.porcentaje_grasa, "%") },
    { label: "Última Masa Musc.", value: fmt(latest?.kg_masa_muscular, " kg") },
  ];
  const kpiW = (contentW - 9) / 4;
  metrics.forEach(({ label, value }, i) => {
    const x = margin + i * (kpiW + 3);
    setColor(doc, "setDrawColor", CLUB_BRAND.colors.line);
    doc.roundedRect(x, kpiY, kpiW, 16, 2, 2, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    setColor(doc, "setTextColor", CLUB_BRAND.colors.muted);
    doc.text(label.toUpperCase(), x + 3, kpiY + 5);
    doc.setFontSize(12);
    setColor(doc, "setTextColor", CLUB_BRAND.colors.greenDark);
    doc.text(value, x + 3, kpiY + 12);
  });

  // Table of evaluations
  let y = kpiY + 24;
  setColor(doc, "setTextColor", CLUB_BRAND.colors.greenDeep);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Historial de evaluaciones", margin, y);
  y += 6;

  const cols = [
    { key: "fecha", label: "Fecha", w: 28 },
    { key: "peso", label: "Peso (kg)", w: 26 },
    { key: "sum6p", label: "Sum. 6P (mm)", w: 28 },
    { key: "grasa", label: "% Grasa", w: 24 },
    { key: "masaMuscular", label: "MM (kg)", w: 26 },
    { key: "diff6p", label: "Δ 6P", w: 22 },
  ];
  drawTableHeader(doc, { cols, y, margin, contentW });
  y += 8;

  sorted.forEach((a, index) => {
    const prevA = index > 0 ? sorted[index - 1] : null;
    const d6p = prevA && a.sumatoria_6p != null && prevA.sumatoria_6p != null ? a.sumatoria_6p - prevA.sumatoria_6p : null;
    const row = {
      fecha: a.fecha ? moment(a.fecha).format("DD/MM/YYYY") : "—",
      peso: fmt(a.peso, " kg"),
      sum6p: fmt(a.sumatoria_6p, " mm"),
      grasa: fmt(a.porcentaje_grasa, "%"),
      masaMuscular: fmt(a.kg_masa_muscular, " kg"),
      diff6p: d6p != null ? (d6p >= 0 ? "+" : "") + d6p.toFixed(1) : "—",
    };
    if (y + 8 > pageH - margin - 10) {
      doc.addPage();
      y = margin + 10;
    }
    drawTableRow(doc, { cols, row, index, y, margin, contentW, pageW });
    y += 8;
  });

  const totalPages = doc.getNumberOfPages();
  for (let pg = 1; pg <= totalPages; pg++) {
    doc.setPage(pg);
    if (pg > 1) drawSmallHeader(doc, { title: `Evolución: ${playerName}`, page: pg, total: totalPages, pageW, margin });
    addPageNumber(doc, { page: pg, total: totalPages, pageW, pageH, margin });
  }

  const safeName = playerName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  doc.save(`nutricion-evolucion-${safeName}-${moment().format("YYYYMMDD-HHmm")}.pdf`);
}

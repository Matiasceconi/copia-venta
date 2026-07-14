import { jsPDF } from "jspdf";
import moment from "moment";
import { CLUB_BRAND } from "@/lib/clubBrand";

function hexToRgb(hex) {
  const value = String(hex || "#000000").replace("#", "");
  const normalized = value.length === 3 ? value.split("").map((char) => char + char).join("") : value;
  return [0, 2, 4].map((index) => parseInt(normalized.slice(index, index + 2), 16));
}

function setColor(doc, method, hex) {
  const [r, g, b] = hexToRgb(hex);
  doc[method](r, g, b);
}

function formatMinutes(value) {
  return `${Math.round(Number(value || 0)).toLocaleString("es-AR")}'`;
}

function formatPercent(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

async function imageToDataUrl(url) {
  if (!url) return null;
  try {
    const response = await fetch(url);
    const blob = await response.blob();
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

export async function generateMinutesPdf({ filters, availableMinutes, includedMatches, playersWithMinutes, pendingMatches, rows }) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const logo = await imageToDataUrl(CLUB_BRAND.logoUrl);
  const margin = 12;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - margin * 2;
  const generatedAt = moment().format("DD/MM/YYYY HH:mm");
  const columns = [
    { label: "#", width: 10 },
    { label: "Jugador", width: 58 },
    { label: "Posición", width: 36 },
    { label: "Partidos", width: 20 },
    { label: "Titularidades", width: 28 },
    { label: "Ingresos", width: 22 },
    { label: "Minutos", width: 24 },
    { label: "Disponibles", width: 28 },
    { label: "%", width: 18 },
  ];

  function drawHeader() {
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
    doc.setFontSize(20);
    doc.text("Minutos jugados", margin + 32, margin + 19);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setColor(doc, "setTextColor", CLUB_BRAND.colors.muted);
    doc.text(`Plantel: ${filters.squad} · Temporada: ${filters.season} · Competencia: ${filters.competition}`, margin + 32, margin + 26);
    doc.text(`Tipo: ${filters.type} · Rango: ${filters.range} · Generado: ${generatedAt}`, margin + 32, margin + 31);
  }

  function drawCards(y) {
    const items = [
      ["Minutos disponibles", formatMinutes(availableMinutes)],
      ["Partidos incluidos", String(includedMatches)],
      ["Jugadores con minutos", String(playersWithMinutes)],
      ["Partidos pendientes", String(pendingMatches)],
    ];
    const gap = 4;
    const width = (contentW - gap * 3) / 4;
    items.forEach(([label, value], index) => {
      const x = margin + index * (width + gap);
      doc.roundedRect(x, y, width, 16, 3, 3, "S");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      setColor(doc, "setTextColor", CLUB_BRAND.colors.muted);
      doc.text(label.toUpperCase(), x + 4, y + 5);
      doc.setFontSize(13);
      setColor(doc, "setTextColor", CLUB_BRAND.colors.ink);
      doc.text(value, x + 4, y + 12);
    });
  }

  function drawTableHeader(y) {
    setColor(doc, "setFillColor", CLUB_BRAND.colors.greenDark);
    doc.roundedRect(margin, y, contentW, 8, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    let x = margin;
    columns.forEach((column) => {
      doc.text(column.label.toUpperCase(), x + 3, y + 5.3);
      x += column.width;
    });
  }

  function drawRow(row, index, y) {
    if (index % 2 === 0) {
      setColor(doc, "setFillColor", CLUB_BRAND.colors.panel);
      doc.rect(margin, y, contentW, 8, "F");
    }
    setColor(doc, "setDrawColor", CLUB_BRAND.colors.line);
    doc.line(margin, y + 8, pageW - margin, y + 8);
    const values = [
      String(row.rank),
      row.player_name,
      row.position,
      String(row.matchesCount),
      String(row.starts),
      String(row.subEntries),
      formatMinutes(row.accumulatedMinutes),
      formatMinutes(row.availableMinutes),
      formatPercent(row.percentage),
    ];
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setColor(doc, "setTextColor", CLUB_BRAND.colors.ink);
    let x = margin;
    values.forEach((value, indexValue) => {
      const text = doc.splitTextToSize(String(value || "—"), columns[indexValue].width - 6)[0] || "";
      doc.text(text, x + 3, y + 5.2);
      x += columns[indexValue].width;
    });
  }

  drawHeader();
  drawCards(margin + 40);
  let y = margin + 62;
  drawTableHeader(y);
  y += 8;

  rows.forEach((row, index) => {
    if (y + 8 > pageH - margin - 8) {
      doc.addPage();
      y = margin;
      drawTableHeader(y);
      y += 8;
    }
    drawRow(row, index, y);
    y += 8;
  });

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setColor(doc, "setTextColor", CLUB_BRAND.colors.muted);
    doc.text(`Página ${page} de ${totalPages}`, pageW - margin - 24, pageH - 6);
  }

  doc.save(`minutos-jugados-${moment().format("YYYYMMDD-HHmm")}.pdf`);
}
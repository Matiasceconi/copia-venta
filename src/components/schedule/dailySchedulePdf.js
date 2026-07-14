import { jsPDF } from "jspdf";
import { CLUB_BRAND } from "@/lib/clubBrand";

const BRAND = CLUB_BRAND.colors;
const DAYS = ["DOMINGO", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO"];

function rgb(hex) {
  const clean = String(hex || "#000000").replace("#", "");
  return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
}
function setFill(doc, hex) { doc.setFillColor(...rgb(hex)); }
function setStroke(doc, hex) { doc.setDrawColor(...rgb(hex)); }
function setText(doc, hex) { doc.setTextColor(...rgb(hex)); }

async function imageData(url) {
  const response = await fetch(url);
  const blob = await response.blob();
  return await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}
async function loadSafeImage(url) {
  if (!url) return null;
  try { return await imageData(url); } catch { return null; }
}
function imageFormat(dataUrl) {
  if (String(dataUrl).includes("image/jpeg") || String(dataUrl).includes("image/jpg")) return "JPEG";
  if (String(dataUrl).includes("image/webp")) return "WEBP";
  return "PNG";
}
function addImageSafe(doc, dataUrl, x, y, w, h) {
  try { doc.addImage(dataUrl, imageFormat(dataUrl), x, y, w, h, undefined, "FAST"); return true; } catch { return false; }
}

function normalize(text) {
  return String(text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function eventKey(event) {
  const text = normalize(`${event.event_type || ""} ${event.type || ""} ${event.title || ""} ${event.location || ""}`);
  if (text.includes("desayuno") || text.includes("cafe") || text.includes("café")) return "coffee";
  if (text.includes("almuerzo") || text.includes("cena") || text.includes("comida") || text.includes("comedor")) return "plate";
  if (text.includes("gimnasio") || text.includes("fuerza") || text.includes("gym")) return "gym";
  if (text.includes("campo") || text.includes("cancha") || text.includes("entrenamiento")) return "field";
  if (text.includes("formulario") || text.includes("wellness") || text.includes("percepcion") || text.includes("rpe")) return "phone";
  return "activity";
}
function timeText(event) {
  const time = event.time || event.start_time || "";
  const end = event.end_time || "";
  const text = normalize(event.title || "");
  if (!time && !end) return "—";
  if ((text.includes("formulario") || text.includes("percepcion")) && time) return `HASTA\n${time} HS`;
  if (time && end) return `${time}\n${end} HS`;
  return `${time || end} HS`;
}

function drawPhone(doc, x, y) {
  setStroke(doc, BRAND.greenDeep); setFill(doc, BRAND.greenDeep); doc.setLineWidth(1.1);
  doc.roundedRect(x - 4.5, y - 8, 9, 16, 1.3, 1.3, "S");
  doc.circle(x, y + 5.6, 0.7, "F");
  doc.line(x - 2.3, y - 5.6, x + 2.3, y - 5.6);
}
function drawCoffee(doc, x, y) {
  setStroke(doc, BRAND.greenDeep); doc.setLineWidth(1.2);
  doc.roundedRect(x - 7, y - 1, 11, 8, 1.3, 1.3, "S");
  doc.circle(x + 6, y + 3, 3, "S");
  doc.line(x - 8, y + 8, x + 6, y + 8);
  doc.line(x - 4, y - 8, x - 4, y - 4);
  doc.line(x, y - 8, x, y - 4);
  doc.line(x + 4, y - 8, x + 4, y - 4);
}
function drawPlate(doc, x, y) {
  setStroke(doc, BRAND.greenDeep); setFill(doc, BRAND.greenDeep); doc.setLineWidth(0.9);
  doc.circle(x, y, 8.2, "S");
  doc.circle(x, y, 4.4, "S");
  doc.line(x - 12, y - 6, x - 12, y + 6);
  doc.line(x - 13.8, y - 6, x - 13.8, y - 2.3);
  doc.line(x - 10.2, y - 6, x - 10.2, y - 2.3);
  doc.line(x + 12, y - 6, x + 12, y + 6);
  doc.line(x + 10.4, y - 6, x + 13.5, y - 1.3);
}
function drawGym(doc, x, y) {
  setStroke(doc, BRAND.greenDeep); setFill(doc, BRAND.greenDeep); doc.setLineWidth(1.3);
  doc.line(x - 7.5, y, x + 7.5, y);
  doc.roundedRect(x - 11, y - 4, 3, 8, 0.6, 0.6, "F");
  doc.roundedRect(x - 7.8, y - 3, 2.4, 6, 0.5, 0.5, "F");
  doc.roundedRect(x + 5.4, y - 3, 2.4, 6, 0.5, 0.5, "F");
  doc.roundedRect(x + 8, y - 4, 3, 8, 0.6, 0.6, "F");
}
function drawField(doc, x, y) {
  setStroke(doc, BRAND.greenDeep); doc.setLineWidth(1);
  doc.roundedRect(x - 11, y - 7, 22, 14, 1.2, 1.2, "S");
  doc.line(x, y - 7, x, y + 7);
  doc.circle(x, y, 2.4, "S");
  doc.rect(x - 11, y - 3.5, 3.2, 7, "S");
  doc.rect(x + 7.8, y - 3.5, 3.2, 7, "S");
}
function drawActivityIcon(doc, key, x, y) {
  if (key === "coffee") return drawCoffee(doc, x, y);
  if (key === "plate") return drawPlate(doc, x, y);
  if (key === "gym") return drawGym(doc, x, y);
  if (key === "field") return drawField(doc, x, y);
  return drawPhone(doc, x, y);
}
function drawPin(doc, x, y) {
  setFill(doc, BRAND.yellow); setStroke(doc, BRAND.yellow); doc.circle(x, y - 1.5, 3.7, "F"); doc.triangle(x - 3.1, y + 0.5, x + 3.1, y + 0.5, x, y + 7, "F"); setFill(doc, "#FFFFFF"); doc.circle(x, y - 1.5, 1.45, "F");
}
function drawFallbackLogo(doc, x, y, size) {
  setFill(doc, BRAND.green); setStroke(doc, BRAND.yellow); doc.setLineWidth(1.2); doc.circle(x, y, size / 2, "FD"); setText(doc, BRAND.yellow); doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text(CLUB_BRAND.shortName, x, y + 3, { align: "center" });
}

function drawHeader(doc, day, squadName, logo) {
  const pw = doc.internal.pageSize.getWidth();
  setFill(doc, BRAND.greenDeep); doc.rect(0, 0, pw, 52, "F");
  setFill(doc, BRAND.greenDark); doc.triangle(0, 0, pw * 0.62, 0, 0, 52, "F");
  setFill(doc, BRAND.green); doc.triangle(pw * 0.58, 0, pw, 0, pw * 0.78, 52, "F");
  setFill(doc, BRAND.yellow); doc.triangle(pw - 38, 0, pw, 0, pw, 18, "F");
  setFill(doc, BRAND.yellow); doc.triangle(0, 52, 14, 52, 0, 66, "F");

  if (logo && addImageSafe(doc, logo, 7, 15, 28, 28)) {} else drawFallbackLogo(doc, 21, 29, 25);

  setText(doc, "#FFFFFF"); doc.setFont("helvetica", "bolditalic"); doc.setFontSize(20);
  doc.text("CRONOGRAMA DIARIO", 43, 27);
  setFill(doc, BRAND.yellow); doc.rect(43, 34, 43, 11, "F");
  setFill(doc, BRAND.green); doc.triangle(86, 34, 124, 34, 116, 45, "F");
  setText(doc, BRAND.greenDeep); doc.setFont("helvetica", "bold"); doc.setFontSize(10.5);
  doc.text(String(squadName || "PLANTEL").toUpperCase(), 49, 42);

  setFill(doc, BRAND.greenDeep); doc.roundedRect(154, 8, 48, 28, 4, 4, "F");
  setStroke(doc, "#FFFFFF"); doc.setLineWidth(1); doc.roundedRect(163, 18, 8, 8, 1.2, 1.2, "S"); doc.line(163, 21, 171, 21); doc.line(165, 16, 165, 20); doc.line(169, 16, 169, 20);
  setText(doc, "#FFFFFF"); doc.setFont("helvetica", "bold"); doc.setFontSize(13.5);
  doc.text(day.format("DD/MM/YY"), 176, 23);
  setText(doc, BRAND.yellow); doc.setFontSize(9);
  doc.text(DAYS[day.day()], 176, 32);
}

function drawTable(doc, events) {
  const x = 7; const y = 66; const w = 196; const rows = Math.max(events.length, 1); const rowH = events.length ? Math.max(20, Math.min(38, 185 / rows)) : 30; const h = 14 + rowH * rows;
  const cols = [24, 68, 48, 56];
  setFill(doc, "#FFFFFF"); setStroke(doc, "#DCDCDC"); doc.roundedRect(x, y, w, h, 2.2, 2.2, "FD");
  setFill(doc, BRAND.greenDeep); doc.roundedRect(x, y, w, 14, 2.2, 2.2, "F");
  setText(doc, "#FFFFFF"); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
  ["ACT.", "DESCRIPCIÓN", "HORA", "LUGAR"].forEach((label, i) => doc.text(label, x + cols.slice(0, i).reduce((a, b) => a + b, 0) + cols[i] / 2, y + 9.3, { align: "center" }));
  let cx = x;
  cols.slice(0, -1).forEach((cw) => { cx += cw; setStroke(doc, BRAND.yellow); doc.setLineWidth(0.25); doc.line(cx, y, cx, y + h); });

  for (let i = 0; i < rows; i++) {
    const ev = events[i]; const ry = y + 14 + i * rowH;
    setStroke(doc, "#E2E2E2"); doc.setLineWidth(0.25); doc.line(x, ry, x + w, ry);
    if (!ev) continue;
    const key = eventKey(ev);
    drawActivityIcon(doc, key, x + cols[0] / 2, ry + rowH / 2);
    setText(doc, BRAND.greenDeep); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text(doc.splitTextToSize(String(ev.title || ev.event_type || ev.type || "ACTIVIDAD").toUpperCase(), cols[1] - 12).slice(0, 3), x + cols[0] + 7, ry + rowH / 2 - 1.5);

    setFill(doc, BRAND.greenDeep); doc.roundedRect(x + cols[0] + cols[1] + 4, ry + rowH / 2 - 8, 40, 16, 3.5, 3.5, "F");
    setText(doc, "#FFFFFF"); doc.setFont("helvetica", "bold"); doc.setFontSize(String(timeText(ev)).includes("\n") ? 7.8 : 10);
    const t = String(timeText(ev)).split("\n");
    if (t.length > 1) { doc.text(t[0], x + cols[0] + cols[1] + 24, ry + rowH / 2 - 2.2, { align: "center" }); doc.text(t[1], x + cols[0] + cols[1] + 24, ry + rowH / 2 + 5.1, { align: "center" }); }
    else doc.text(t[0], x + cols[0] + cols[1] + 24, ry + rowH / 2 + 3.2, { align: "center" });

    drawPin(doc, x + cols[0] + cols[1] + cols[2] + cols[3] / 2, ry + rowH / 2 - 6);
    setText(doc, BRAND.greenDeep); doc.setFont("helvetica", "bold"); doc.setFontSize(8.4);
    doc.text(doc.splitTextToSize(String(ev.location || "—").toUpperCase(), cols[3] - 10).slice(0, 3), x + cols[0] + cols[1] + cols[2] + cols[3] / 2, ry + rowH / 2 + 9, { align: "center" });
  }
}

function drawFooter(doc, logo) {
  const pw = doc.internal.pageSize.getWidth(); const ph = doc.internal.pageSize.getHeight();
  setStroke(doc, BRAND.green); doc.setLineWidth(0.5); doc.line(64, ph - 32, 94, ph - 32); doc.line(116, ph - 32, 146, ph - 32);
  if (logo && addImageSafe(doc, logo, 98, ph - 39, 14, 14)) {} else drawFallbackLogo(doc, 105, ph - 32, 13);
  setText(doc, BRAND.greenDeep); doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.text("D E F E N S A   Y   J U S T I C I A", pw / 2, ph - 18, { align: "center" });
  setText(doc, BRAND.green); doc.setFontSize(5.5); doc.text("R E S E R V A", pw / 2, ph - 13.5, { align: "center" });
  setFill(doc, BRAND.greenDeep); doc.rect(0, ph - 8, pw, 8, "F");
  setFill(doc, BRAND.green); doc.triangle(0, ph - 8, 76, ph - 8, 54, ph, "F");
  setFill(doc, BRAND.yellow); doc.triangle(pw - 28, ph - 8, pw, ph - 8, pw, ph, "F");
}

export async function buildDailySchedulePDF({ day, events, squadName }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const logo = await loadSafeImage(CLUB_BRAND.logoUrl);
  setFill(doc, "#F7F7F5"); doc.rect(0, 0, 210, 297, "F");
  drawHeader(doc, day, squadName, logo);
  drawTable(doc, [...events].sort((a, b) => (a.time || a.start_time || "").localeCompare(b.time || b.start_time || "")));
  drawFooter(doc, logo);
  return doc;
}
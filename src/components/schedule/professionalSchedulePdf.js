import { jsPDF } from "jspdf";
import { CLUB_BRAND } from "@/lib/clubBrand";

const BRAND = CLUB_BRAND.colors;

const DAYS_ES = ["DOMINGO", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO"];
const MONTHS_ES = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

const TYPE_STYLES = {
  Comida: { color: "#FFE45C", soft: "#FFF7CC", text: "#111827", label: "Comida" },
  Video: { color: "#F97316", soft: "#FFE6D4", text: "#FFFFFF", label: "Video" },
  Gimnasio: { color: "#07182C", soft: "#DDE8F3", text: "#FFFFFF", label: "Gimnasio / Fuerza" },
  Cancha: { color: "#23A942", soft: "#DDF7E3", text: "#FFFFFF", label: "Cancha" },
  Viaje: { color: "#8B3FDB", soft: "#EFE3FF", text: "#FFFFFF", label: "Viaje" },
  Partido: { color: BRAND.greenDark, soft: "#DFF2E5", text: "#FFFFFF", label: "Partido" },
  Descanso: { color: "#8D7AD9", soft: "#EFEAFE", text: "#FFFFFF", label: "Descanso" },
  Reunión: { color: "#D9A400", soft: "#FFF4C2", text: "#111827", label: "Reunión" },
  Otro: { color: "#64748B", soft: "#EEF2F7", text: "#FFFFFF", label: "Actividad" },
};

function rgb(hex) {
  const clean = String(hex || "#000000").replace("#", "");
  return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
}

function setFill(doc, hex) { doc.setFillColor(...rgb(hex)); }
function setText(doc, hex) { doc.setTextColor(...rgb(hex)); }
function setStroke(doc, hex) { doc.setDrawColor(...rgb(hex)); }

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
  try {
    doc.addImage(dataUrl, imageFormat(dataUrl), x, y, w, h, undefined, "FAST");
    return true;
  } catch {
    return false;
  }
}

async function drawLogo(doc, x, y, size) {
  const logo = await loadSafeImage(CLUB_BRAND.logoUrl);
  if (logo && addImageSafe(doc, logo, x - size / 2, y - size / 2, size, size)) return;
  setFill(doc, BRAND.green);
  doc.circle(x, y, size / 2, "F");
  setText(doc, BRAND.yellow);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(CLUB_BRAND.shortName, x, y + 2, { align: "center" });
}

function normalize(text) {
  return String(text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function typeKey(ev) {
  const text = normalize(`${ev.event_type || ""} ${ev.type || ""} ${ev.title || ""} ${ev.location || ""}`);
  if (text.includes("partido") || text.includes(" vs ")) return "Partido";
  if (text.includes("descanso") || text.includes("libre")) return "Descanso";
  if (text.includes("viaje") || text.includes("salida") || text.includes("traslado")) return "Viaje";
  if (text.includes("desayuno") || text.includes("almuerzo") || text.includes("cena") || text.includes("comida")) return "Comida";
  if (text.includes("video") || text.includes("auditorio")) return "Video";
  if (text.includes("gimnasio") || text.includes("fuerza") || text.includes("gym")) return "Gimnasio";
  if (text.includes("cancha") || text.includes("entrenamiento")) return "Cancha";
  if (text.includes("reunion") || text.includes("charla")) return "Reunión";
  return TYPE_STYLES[ev.event_type || ev.type] ? (ev.event_type || ev.type) : "Otro";
}

function styleFor(ev) {
  return TYPE_STYLES[typeKey(ev)] || TYPE_STYLES.Otro;
}

function eventTime(ev) {
  return ev.time || ev.start_time || "";
}

function minutesFromTime(time, fallback = 8 * 60) {
  const match = String(time || "").match(/^(\d{1,2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : fallback;
}

function eventStart(ev) {
  return minutesFromTime(eventTime(ev));
}

function eventDuration(ev) {
  const value = Number(ev.duration_minutes || 45);
  return Math.max(30, Math.min(value, 120));
}

function eventTitle(ev) {
  const title = String(ev.title || ev.event_type || ev.type || "Actividad").trim();
  const location = String(ev.location || "").trim();
  if (location && normalize(title) === "entrenamiento") return location;
  return title;
}

function dayName(day) {
  return DAYS_ES[day.day()];
}

function shortMonth(day) {
  return MONTHS_ES[day.month()];
}

function rangeLabel(days) {
  const first = days[0];
  const last = days[days.length - 1];
  if (first.month() === last.month()) return `${dayName(first)} ${first.date()} AL ${dayName(last)} ${last.date()} DE ${MONTHS_ES[first.month()]}`;
  return `${dayName(first)} ${first.date()} DE ${MONTHS_ES[first.month()]} AL ${dayName(last)} ${last.date()} DE ${MONTHS_ES[last.month()]}`;
}

function exportedDate() {
  const now = new Date();
  return `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
}

function extractMeta(ev) {
  const notes = String(ev.notes || "");
  const competition = ev.competition || ev.competencia || (notes.match(/competencia\s*:?\s*([^\n·|]+)/i)?.[1] || "");
  const round = ev.round || ev.fecha_numero || ev.fecha || (notes.match(/fecha\s*:?\s*(\d+)/i)?.[1] || "");
  return { competition: String(competition || "").trim(), round: String(round || "").trim() };
}

function drawIcon(doc, key, x, y, color = "#111827") {
  setStroke(doc, color);
  setFill(doc, color);
  doc.setLineWidth(0.5);
  if (key === "Comida") {
    doc.line(x - 1.8, y - 2.2, x - 1.8, y + 2.3);
    doc.line(x - 2.5, y - 2.2, x - 2.5, y - 0.6);
    doc.line(x - 1.1, y - 2.2, x - 1.1, y - 0.6);
    doc.line(x + 1.6, y - 2.1, x + 1.6, y + 2.3);
    doc.line(x + 0.7, y - 2.1, x + 2.2, y - 0.4);
  } else if (key === "Video") {
    doc.circle(x, y, 2.5, "S");
    doc.triangle(x - 0.8, y - 1.3, x - 0.8, y + 1.3, x + 1.4, y, "F");
  } else if (key === "Gimnasio") {
    doc.line(x - 3, y, x + 3, y);
    doc.rect(x - 3.8, y - 1.4, 0.9, 2.8, "F");
    doc.rect(x + 2.9, y - 1.4, 0.9, 2.8, "F");
    doc.rect(x - 2.3, y - 1, 0.7, 2, "F");
    doc.rect(x + 1.6, y - 1, 0.7, 2, "F");
  } else if (key === "Cancha") {
    doc.rect(x - 3, y - 2, 6, 4, "S");
    doc.line(x, y - 2, x, y + 2);
    doc.circle(x, y, 0.9, "S");
  } else if (key === "Viaje") {
    doc.roundedRect(x - 3, y - 2, 6, 4, 0.8, 0.8, "S");
    doc.circle(x - 1.8, y + 2, 0.45, "F");
    doc.circle(x + 1.8, y + 2, 0.45, "F");
    doc.line(x - 2, y - 0.4, x + 2, y - 0.4);
  } else if (key === "Partido") {
    doc.circle(x, y, 2.4, "S");
    doc.circle(x, y, 0.75, "F");
    doc.line(x, y - 2.4, x, y + 2.4);
    doc.line(x - 2.4, y, x + 2.4, y);
  } else if (key === "Descanso") {
    setFill(doc, color);
    doc.circle(x - 0.5, y, 2.5, "F");
    setFill(doc, "#FFFFFF");
    doc.circle(x + 0.7, y - 0.5, 2.4, "F");
  } else {
    doc.circle(x, y, 2.2, "F");
  }
}

function drawHeader(doc, days, squadName, season) {
  const pw = doc.internal.pageSize.getWidth();
  setFill(doc, BRAND.greenDark);
  doc.rect(0, 0, pw, 31, "F");
  setFill(doc, BRAND.green);
  doc.triangle(0, 0, pw * 0.58, 0, 0, 31, "F");
  setFill(doc, BRAND.yellow);
  doc.rect(0, 31, pw, 2.2, "F");

  setText(doc, "#FFFFFF");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15.5);
  doc.text("CRONOGRAMA SEMANAL", 29, 12);
  setText(doc, BRAND.yellow);
  doc.setFontSize(8.5);
  doc.text(`${String(squadName || "Plantel").toUpperCase()} · TEMPORADA ${season || "—"}`, 29, 18.5);

  setText(doc, "#FFFFFF");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.4);
  doc.text("PLANIFICACIÓN OPERATIVA · SEMANA", 29, 24.1);
  doc.setFont("helvetica", "bold");
  doc.text(rangeLabel(days), 76, 24.1);

  setStroke(doc, "#FFFFFF");
  doc.setLineWidth(0.2);
  doc.line(184, 9, 184, 23);
  setText(doc, "#FFFFFF");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.text(CLUB_BRAND.name.toUpperCase(), 192, 15);
  doc.setFontSize(6.2);
  doc.text("PERFORMANCEPITCH", 241, 15);
  setFill(doc, "#5FD13D");
  doc.roundedRect(281, 10.5, 5, 7, 1.2, 1.2, "F");
}

function timeSlots(events) {
  const times = events.map(eventStart).filter(Boolean);
  const min = Math.min(8 * 60, ...times);
  const max = Math.max(17 * 60, ...events.map((e) => eventStart(e) + eventDuration(e)));
  const startHour = Math.max(6, Math.floor(min / 60));
  const endHour = Math.min(22, Math.ceil(max / 60));
  return Array.from({ length: endHour - startHour + 1 }, (_, i) => (startHour + i) * 60);
}

function yFor(mins, slots, y, h) {
  const start = slots[0];
  const end = slots[slots.length - 1];
  return y + ((mins - start) / Math.max(60, end - start)) * h;
}

function drawScheduleGrid(doc, days, eventsForDate, imageCache) {
  const margin = 7;
  const top = 39;
  const gridW = 283;
  const gap = 3;
  const rowGap = 4;
  const rowH = 66;
  const headerH = 17;
  const topDays = days.slice(0, 4);
  const bottomDays = days.slice(4);

  function drawDay(day, idx, row, total) {
    const dayW = (gridW - gap * (total - 1)) / total;
    const x = margin + idx * (dayW + gap);
    const y0 = top + row * (rowH + rowGap);
    const isWeekend = [0, 6].includes(day.day());
    const events = [...eventsForDate(day.format("YYYY-MM-DD"))].sort((a, b) => eventStart(a) - eventStart(b));
    const bodyY = y0 + headerH;
    const bodyH = rowH - headerH;

    setFill(doc, "#FFFFFF");
    setStroke(doc, "#D7E2CF");
    doc.setLineWidth(0.45);
    doc.roundedRect(x, y0, dayW, rowH, 3.2, 3.2, "FD");

    setFill(doc, isWeekend ? BRAND.greenDark : BRAND.green);
    doc.roundedRect(x, y0, dayW, headerH, 3.2, 3.2, "F");
    setFill(doc, BRAND.yellow);
    doc.rect(x, y0 + headerH - 1.8, dayW, 1.8, "F");

    setText(doc, "#FFFFFF");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.text(dayName(day), x + 5, y0 + 6);
    setText(doc, BRAND.yellow);
    doc.setFontSize(13.8);
    doc.text(String(day.date()), x + dayW - 7, y0 + 9.5, { align: "right" });
    setText(doc, "#FFFFFF");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(4.8);
    doc.text(shortMonth(day), x + dayW - 7, y0 + 14, { align: "right" });

    if (!events.length) {
      setFill(doc, "#F4F7F1");
      doc.roundedRect(x + 3, bodyY + 5, dayW - 6, 31, 2.3, 2.3, "F");
      drawIcon(doc, "Descanso", x + dayW / 2, bodyY + 17, "#8D7AD9");
      setText(doc, "#6B7280");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6);
      doc.text("SIN ACTIVIDADES", x + dayW / 2, bodyY + 28, { align: "center" });
      return;
    }

    const visibleLimit = total === 4 ? 4 : 5;
    const visible = events.slice(0, visibleLimit);
    const cardGap = 1.8;
    const cardH = Math.max(8.8, Math.min(11.2, (bodyH - 5 - cardGap * (visible.length - 1)) / visible.length));
    visible.forEach((ev, j) => {
      const cardY = bodyY + 3 + j * (cardH + cardGap);
      drawActivityCard(doc, ev, x + 3, cardY, dayW - 6, cardH, imageCache);
    });
    if (events.length > visible.length) {
      setFill(doc, "#EEF2F7");
      doc.roundedRect(x + 3, y0 + rowH - 6.4, dayW - 6, 4.8, 1.3, 1.3, "F");
      setText(doc, BRAND.muted);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(4.7);
      doc.text(`+${events.length - visible.length} actividades más`, x + dayW / 2, y0 + rowH - 3, { align: "center" });
    }
  }

  topDays.forEach((day, idx) => drawDay(day, idx, 0, topDays.length));
  bottomDays.forEach((day, idx) => drawDay(day, idx, 1, bottomDays.length));
}

function drawActivityCard(doc, ev, x, y, w, h, imageCache) {
  const key = typeKey(ev);
  if (key === "Partido") return drawMatchCard(doc, ev, x, y, w, h, imageCache);

  const st = styleFor(ev);
  setFill(doc, st.color);
  setStroke(doc, "#FFFFFF");
  doc.roundedRect(x, y, w, h, 1.6, 1.6, "FD");

  const iconBg = st.text === "#FFFFFF" ? "#FFFFFF" : "#111827";
  const iconColor = st.text === "#FFFFFF" ? st.color : "#FFFFFF";
  setFill(doc, iconBg);
  doc.roundedRect(x + 1.5, y + 1.5, 6.5, 6.5, 1.4, 1.4, "F");
  drawIcon(doc, key, x + 4.75, y + 4.75, iconColor);

  setText(doc, st.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(h < 11 ? 5.2 : 6.2);
  doc.text(doc.splitTextToSize(eventTitle(ev).toUpperCase(), w - 12).slice(0, 2), x + 9.5, y + 4.6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.8);
  const time = eventTime(ev);
  if (time) doc.text(`${time} HS`, x + 9.5, y + h - 2.4);
  if (ev.location && h > 12) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.1);
    doc.text(doc.splitTextToSize(String(ev.location).toUpperCase(), w - 12).slice(0, 1), x + 9.5, y + h - 7.1);
  }
}

function drawMatchCard(doc, ev, x, y, w, h, imageCache) {
  const logo = imageCache[ev.rival_logo_url];
  setFill(doc, BRAND.greenDark);
  setStroke(doc, "#FFFFFF");
  doc.roundedRect(x, y, w, h, 2, 2, "FD");
  setFill(doc, BRAND.green);
  doc.rect(x, y, w, 5.2, "F");

  if (logo && addImageSafe(doc, logo, x + w / 2 - 4.8, y + 6, 9.6, 9.6)) {}
  else {
    setFill(doc, "#FFFFFF");
    doc.circle(x + w / 2, y + 11, 5, "F");
    drawIcon(doc, "Partido", x + w / 2, y + 11, BRAND.greenDark);
  }

  const meta = extractMeta(ev);
  setText(doc, "#FFFFFF");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(4.8);
  doc.text("PARTIDO", x + w / 2, y + 3.7, { align: "center" });
  doc.setFontSize(6.2);
  doc.text(doc.splitTextToSize((ev.rival ? `VS ${ev.rival}` : eventTitle(ev)).toUpperCase(), w - 4).slice(0, 2), x + w / 2, y + 20, { align: "center" });
  doc.setFontSize(5.4);
  const details = [ev.home_away, eventTime(ev) && `${eventTime(ev)} HS`, meta.competition, meta.round && `FECHA ${meta.round}`].filter(Boolean).join(" · ");
  if (details) doc.text(doc.splitTextToSize(details.toUpperCase(), w - 4).slice(0, 2), x + w / 2, y + h - 4.3, { align: "center" });
}

function drawLegend(doc, x, y, w) {
  setFill(doc, "#FFFFFF");
  setStroke(doc, "#D8E1D1");
  doc.roundedRect(x, y, w, 10, 3, 3, "FD");
  const keys = ["Comida", "Gimnasio", "Cancha", "Viaje", "Partido", "Descanso"];
  const gap = w / keys.length;
  keys.forEach((key, idx) => {
    const st = TYPE_STYLES[key];
    const cx = x + idx * gap + 6;
    setFill(doc, st.color);
    doc.roundedRect(cx, y + 2.2, 5.5, 5.5, 1.2, 1.2, "F");
    drawIcon(doc, key, cx + 2.75, y + 4.95, st.text === "#FFFFFF" ? "#FFFFFF" : "#111827");
    setText(doc, BRAND.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5);
    doc.text(st.label.toUpperCase(), cx + 7.5, y + 6);
  });
}

function findNextMatch(events) {
  return events.find((e) => typeKey(e) === "Partido") || null;
}

function drawBottomPanels(doc, days, events, imageCache) {
  const y = 161;
  const match = findNextMatch(events);
  drawMatchSummary(doc, match, 5, y, 98, 25, imageCache);
  drawObservations(doc, events, 107, y, 84, 25);
  drawWeekType(doc, events, 195, y, 97, 25);
}

function drawMatchSummary(doc, match, x, y, w, h, imageCache) {
  setFill(doc, "#FFFFFF");
  setStroke(doc, "#D8E1D1");
  doc.roundedRect(x, y, w, h, 3, 3, "FD");
  setText(doc, BRAND.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.6);
  doc.text("PARTIDO DESTACADO", x + 5, y + 5.5);
  if (!match) {
    setText(doc, BRAND.muted);
    doc.setFont("helvetica", "normal");
    doc.text("No hay partidos cargados para esta semana.", x + 5, y + 14);
    return;
  }
  const logo = imageCache[match.rival_logo_url];
  if (logo && addImageSafe(doc, logo, x + 5, y + 8, 14, 14)) {}
  else drawIcon(doc, "Partido", x + 12, y + 15, BRAND.greenDark);
  const meta = extractMeta(match);
  setText(doc, BRAND.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  doc.text(doc.splitTextToSize((match.rival ? `VS ${match.rival}` : eventTitle(match)).toUpperCase(), 35).slice(0, 2), x + 23, y + 12);
  setText(doc, BRAND.muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.2);
  doc.text([match.home_away, eventTime(match) && `${eventTime(match)} HS`, meta.round && `FECHA ${meta.round}`, meta.competition].filter(Boolean).join(" · ").toUpperCase(), x + 23, y + 20, { maxWidth: w - 28 });
}

function drawObservations(doc, events, x, y, w, h) {
  setFill(doc, "#FFFFFF");
  setStroke(doc, "#D8E1D1");
  doc.roundedRect(x, y, w, h, 3, 3, "FD");
  setText(doc, BRAND.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.6);
  doc.text("OBSERVACIONES", x + 5, y + 5.5);
  const notes = events.map((e) => e.notes).filter(Boolean).slice(0, 2);
  const bullets = notes.length ? notes : ["Horarios sujetos a modificación.", "Confirmar actividades con el cuerpo técnico.", "Documento generado automáticamente desde Calendario."];
  setText(doc, BRAND.ink);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.7);
  bullets.slice(0, 4).forEach((b, idx) => doc.text(`• ${String(b).slice(0, 78)}`, x + 5, y + 10.5 + idx * 4.3));
}

function weekType(events) {
  const matches = events.filter((e) => typeKey(e) === "Partido").length;
  const load = events.filter((e) => ["Cancha", "Gimnasio"].includes(typeKey(e))).length;
  const rests = events.filter((e) => typeKey(e) === "Descanso").length;
  if (matches) return { label: "SEMANA COMPETITIVA", level: 5 };
  if (rests >= 2) return { label: "SEMANA REGENERATIVA", level: 2 };
  if (load >= 6) return { label: "SEMANA DE CARGA", level: 5 };
  if (load >= 3) return { label: "SEMANA MIXTA", level: 3 };
  return { label: "SEMANA OPERATIVA", level: 3 };
}

function drawWeekType(doc, events, x, y, w, h) {
  const type = weekType(events);
  setFill(doc, "#FFFFFF");
  setStroke(doc, "#D8E1D1");
  doc.roundedRect(x, y, w, h, 3, 3, "FD");
  setText(doc, BRAND.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.6);
  doc.text("TIPO DE SEMANA", x + 18, y + 5.5);
  setFill(doc, BRAND.green);
  [0, 1, 2, 3].forEach((i) => doc.rect(x + 6 + i * 2.2, y + 7 - i * 1.1, 1.3, 5 + i * 1.1, "F"));
  setText(doc, BRAND.greenDark);
  doc.setFontSize(7.2);
  doc.text(type.label, x + 18, y + 14.3);
  for (let i = 0; i < 6; i++) {
    setFill(doc, i < type.level ? BRAND.greenDark : "#D1D5DB");
    doc.circle(x + 18 + i * 7, y + 20, 1.6, "F");
  }
}

function drawFooter(doc) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  setFill(doc, BRAND.greenDark);
  doc.rect(0, ph - 8, pw, 8, "F");
  setText(doc, "#FFFFFF");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.7);
  doc.text("Documento operativo del cuerpo técnico", 6, ph - 3.2);
  doc.text(`Exportado el ${exportedDate()} por PerformancePitch`, pw - 6, ph - 3.2, { align: "right" });
}

async function buildImageCache(events) {
  const urls = [...new Set(events.map((e) => e.rival_logo_url).filter(Boolean))];
  const entries = await Promise.all(urls.map(async (url) => [url, await loadSafeImage(url)]));
  return Object.fromEntries(entries.filter(([, value]) => value));
}

export async function buildProfessionalWeekSchedulePDF({ days, eventsForDate, weekLabel, squadName, season, planMetaByDate = {} }) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
  const allEvents = days.flatMap((d) => eventsForDate(d.format("YYYY-MM-DD")));
  const imageCache = await buildImageCache(allEvents);

  setFill(doc, "#F6F8F2");
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), "F");
  drawHeader(doc, days, squadName, season || "");
  await drawLogo(doc, 15, 15.5, 22);
  drawScheduleGrid(doc, days, eventsForDate, imageCache);
  drawLegend(doc, 22, 180, 253);
  drawFooter(doc);

  return doc;
}
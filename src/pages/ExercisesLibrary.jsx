import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronDown, ChevronUp, Upload, FileSpreadsheet, ExternalLink, X, Users, Maximize2, Clock, Target, Trash2, FileDown, ImagePlus, Play } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";
import "moment/locale/es";
import VideoUploadSection from "@/components/sessions/VideoUploadSection";
import VideoPreviewModal from "@/components/sessions/VideoPreviewModal";
import { getVideoThumbnailUrl } from "@/components/sessions/exerciseLibrarySync";

moment.locale("es");

// ── Mismo parser que Catapult ──────────────────────────────────────────────
function matchColumn(raw) {
  const h = raw.toLowerCase().replace(/^\uFEFF/, "").trim();
  if (h === "name" || h === "jugador" || h === "player" || h === "nombre" || h === "athlete") return "player_name";
  if (h === "total duration" || h === "tot dur") return "total_duration";
  if (h.includes("total distance") || h === "tot dist (m)" || h === "tot dist") return "total_distance";
  if (h.startsWith("d") && h.includes("19")) return "distance_hsr";
  if ((h.startsWith("d+") || h.startsWith("d +")) && h.includes("25")) return "sprint_distance";
  if (h === "sprint efforts" || h === "sprint effs") return "sprint_efforts";
  if (h.includes("acc") && (h.includes("3mt") || h.includes("3 m"))) return "accelerations";
  if (h.includes("dec") && (h.includes("3mt") || h.includes("3 m"))) return "decelerations";
  if (h === "total player load" || h === "tot pl" || h === "player load") return "player_load";
  if (h.includes("maximum velocity") || h === "max vel (km/h)" || h === "max velocity (km/h)") return "max_velocity";
  if (h.includes("max vel") && h.includes("%")) return "max_velocity_percentage";
  if (h === "metros x min" || h === "m/min" || h === "meters per minute") return "meters_per_minute";
  return null;
}

function parseNum(val) {
  if (val == null || val === "" || val === "-") return null;
  const str = String(val).trim();
  const hasCommaDecimal = /^\d+,\d+$/.test(str) || /^\d{1,3}(\.\d{3})*,\d+$/.test(str);
  const cleaned = hasCommaDecimal ? str.replace(/\./g, "").replace(",", ".") : str.replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function parseDuration(val) {
  if (!val) return null;
  const parts = String(val).trim().split(":").map(Number);
  if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 60;
  if (parts.length === 2) return parts[0] + parts[1] / 60;
  return parseNum(val);
}

function splitCSVLine(line, sep) {
  const result = [];
  let cur = "", inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === sep && !inQuotes) { result.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  result.push(cur.trim());
  return result;
}

function parseCatapultCSV(text) {
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split("\n").map((l) => l.trim()).filter(Boolean);
  const firstSemi = lines[0].split(";").length;
  const firstComma = lines[0].split(",").length;
  const sep = firstSemi > firstComma ? ";" : ",";

  let headerIdx = -1, headers = [];
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const cols = splitCSVLine(lines[i], sep);
    const firstLow = cols[0]?.replace(/^\uFEFF/, "").toLowerCase().trim();
    const mapped = cols.filter((c) => matchColumn(c) !== null).length;
    if (firstLow === "name" || firstLow === "jugador" || firstLow === "athlete" || mapped >= 3) {
      headerIdx = i;
      headers = cols.map((c, idx) => idx === 0 ? c.replace(/^\uFEFF/, "") : c);
      break;
    }
  }
  if (headerIdx === -1) return { error: "No se encontró fila de encabezados válida." };

  const fieldMap = {};
  headers.forEach((h, idx) => {
    const field = matchColumn(h);
    if (field) fieldMap[idx] = field;
    else if (idx === 0) fieldMap[idx] = "player_name";
  });

  const rows = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i], sep);
    const obj = {};
    Object.entries(fieldMap).forEach(([colIdx, field]) => {
      const raw = cols[parseInt(colIdx)];
      if (field === "player_name") obj[field] = raw || "";
      else if (field === "total_duration") obj[field] = parseDuration(raw);
      else obj[field] = parseNum(raw);
    });
    const name = (obj.player_name || "").trim();
    if (!name) continue;
    if (["total", "promedio", "average", "team", "totals"].includes(name.toLowerCase())) continue;
    rows.push(obj);
  }
  return { rows };
}

const CATEGORIES = [
  "Posesión", "Pressing", "Finalización", "Transición",
  "Físico", "Táctica", "Rondo", "Pelota parada", "Otro"
];

const CATEGORY_COLORS = {
  "Posesión":      "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Pressing":      "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "Finalización":  "bg-red-500/20 text-red-400 border-red-500/30",
  "Transición":    "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "Físico":        "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "Táctica":       "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  "Rondo":         "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "Pelota parada": "bg-pink-500/20 text-pink-400 border-pink-500/30",
  "Otro":          "bg-zinc-700/50 text-zinc-400 border-zinc-600",
};

const METRICS = [
  { key: "total_distance",  label: "Distancia (m)",      fmt: (v) => Math.round(v) },
  { key: "distance_hsr",   label: "19.8-25 km/h (m)",   fmt: (v) => Math.round(v) },
  { key: "sprint_distance", label: "+25 km/h (m)",        fmt: (v) => Math.round(v) },
  { key: "player_load",    label: "Player Load",          fmt: (v) => v.toFixed(0)  },
  { key: "max_velocity",   label: "Vel. Máx (km/h)",     fmt: (v) => v.toFixed(1)  },
  { key: "accelerations",  label: "Aceleraciones",        fmt: (v) => Math.round(v) },
  { key: "decelerations",  label: "Desaceleraciones",     fmt: (v) => Math.round(v) },
  { key: "sprint_efforts", label: "Sprint Efforts",       fmt: (v) => Math.round(v) },
];

function CsvDataTable({ csvUrl, onRowsParsed }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!csvUrl) return;
    fetch(csvUrl)
      .then((r) => r.text())
      .then((text) => {
        const result = parseCatapultCSV(text);
        if (result.error) setError(result.error);
        else { setRows(result.rows); onRowsParsed?.(result.rows); }
      })
      .catch(() => setError("Error al cargar el archivo."))
      .finally(() => setLoading(false));
  }, [csvUrl]);

  if (loading) return <div className="text-xs text-zinc-600 py-2 mt-2">Cargando datos...</div>;
  if (error) return <div className="text-xs text-red-400 py-2 mt-2">{error}</div>;
  if (!rows || rows.length === 0) return <div className="text-xs text-zinc-600 py-2 mt-2">Sin datos válidos en el archivo.</div>;

  // Promedios
  const avgs = {};
  METRICS.forEach(({ key }) => {
    const vals = rows.map(r => r[key]).filter(v => v != null);
    if (vals.length) avgs[key] = vals.reduce((a, b) => a + b, 0) / vals.length;
  });

  return (
    <div className="mt-3 space-y-3">
      {/* Promedios */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {METRICS.filter(({ key }) => avgs[key] != null).map(({ key, label, fmt }) => (
          <div key={key} className="bg-zinc-800/60 border border-zinc-700 rounded-lg p-2.5 text-center">
            <p className="text-zinc-500 text-xs">{label}</p>
            <p className="text-white font-bold text-sm mt-0.5">{fmt(avgs[key])}</p>
          </div>
        ))}
      </div>

      {/* Tabla por jugador */}
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-zinc-800/80">
              <th className="px-3 py-2 text-left text-zinc-400 font-semibold whitespace-nowrap">Jugador</th>
              {METRICS.filter(({ key }) => rows.some(r => r[key] != null)).map(({ key, label }) => (
                <th key={key} className="px-3 py-2 text-right text-zinc-400 font-semibold whitespace-nowrap">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? "bg-zinc-900" : "bg-zinc-800/30"}>
                <td className="px-3 py-1.5 text-zinc-200 font-medium whitespace-nowrap">{row.player_name}</td>
                {METRICS.filter(({ key }) => rows.some(r => r[key] != null)).map(({ key, fmt }) => (
                  <td key={key} className="px-3 py-1.5 text-zinc-300 text-right whitespace-nowrap">
                    {row[key] != null ? fmt(row[key]) : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

async function exportExercisePDF(exercise, session, csvRows) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const M = 14;

  // Header
  doc.setFillColor(24, 24, 27);
  doc.rect(0, 0, W, 28, "F");
  doc.setFillColor(240, 200, 0);
  doc.rect(0, 28, W, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text("EJERCICIO", M, 12);
  doc.setFontSize(9);
  doc.setTextColor(160, 160, 160);
  doc.text("Defensa y Justicia — Biblioteca de Ejercicios", M, 20);
  doc.setTextColor(240, 200, 0);
  doc.text(moment().format("DD/MM/YYYY HH:mm"), W - M, 12, { align: "right" });
  if (session) {
    doc.setTextColor(160, 160, 160);
    doc.setFontSize(8);
    doc.text(`${session.title} · ${moment(session.date).format("DD/MM/YYYY")}`, W - M, 20, { align: "right" });
  }

  let y = 36;

  // Nombre del ejercicio
  doc.setFillColor(39, 39, 42);
  doc.roundedRect(M, y, W - M * 2, 16, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(exercise.name, M + 4, y + 10);
  y += 22;

  // Métricas del ejercicio
  const meta = [
    exercise.duration_minutes ? `Duración: ${exercise.duration_minutes} min` : null,
    exercise.space ? `Espacio: ${exercise.space}` : null,
    (exercise.width_m && exercise.length_m) ? `Dimensiones: ${exercise.width_m} × ${exercise.length_m} m` : null,
    exercise.num_players ? `Jugadores: ${exercise.num_players}` : null,
  ].filter(Boolean);

  if (meta.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(meta.join("    ·    "), M + 2, y);
    y += 8;
  }

  if (exercise.objective) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(200, 200, 100);
    const lines = doc.splitTextToSize(`Objetivo: ${exercise.objective}`, W - M * 2 - 4);
    doc.text(lines, M + 2, y);
    y += lines.length * 5 + 2;
  }

  if (exercise.description) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(120, 120, 120);
    const lines = doc.splitTextToSize(exercise.description, W - M * 2 - 4);
    doc.text(lines, M + 2, y);
    y += lines.length * 4.5 + 4;
  }

  // Imagen del ejercicio
  if (exercise.image_url) {
    try {
      const imgData = await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext("2d").drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = reject;
        img.src = exercise.image_url;
      });
      const imgW = W - M * 2;
      const imgH = 60;
      if (y + imgH > 270) { doc.addPage(); y = 14; }
      doc.addImage(imgData, "JPEG", M, y, imgW, imgH, undefined, "FAST");
      y += imgH + 6;
    } catch { /* imagen no disponible */ }
  }

  // Datos GPS del CSV
  if (csvRows && csvRows.length > 0) {
    if (y + 20 > 265) { doc.addPage(); y = 14; }
    doc.setFillColor(45, 45, 50);
    doc.roundedRect(M, y, W - M * 2, 8, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(240, 200, 0);
    doc.text("Carga externa GPS", M + 3, y + 5.5);
    y += 11;

    const activeMetrics = METRICS.filter(({ key }) => csvRows.some(r => r[key] != null));

    // Promedios
    const avgs = {};
    activeMetrics.forEach(({ key }) => {
      const vals = csvRows.map(r => r[key]).filter(v => v != null);
      if (vals.length) avgs[key] = vals.reduce((a, b) => a + b, 0) / vals.length;
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text("Promedios:", M + 2, y);
    y += 5;
    const avgText = activeMetrics.filter(({ key }) => avgs[key]).map(({ key, label, fmt }) => `${label}: ${fmt(avgs[key])}`).join("   ·   ");
    const avgLines = doc.splitTextToSize(avgText, W - M * 2 - 4);
    doc.setTextColor(200, 200, 200);
    doc.text(avgLines, M + 2, y);
    y += avgLines.length * 4.5 + 5;

    // Tabla de jugadores
    if (y + 10 > 270) { doc.addPage(); y = 14; }
    const colW = Math.min(28, (W - M * 2 - 50) / activeMetrics.length);
    const nameW = 50;

    // Header fila
    doc.setFillColor(50, 50, 55);
    doc.rect(M, y, W - M * 2, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(180, 180, 180);
    doc.text("Jugador", M + 2, y + 4.5);
    activeMetrics.forEach(({ label }, i) => {
      doc.text(label, M + nameW + i * colW + colW / 2, y + 4.5, { align: "center" });
    });
    y += 7;

    csvRows.forEach((row, ri) => {
      if (y > 270) { doc.addPage(); y = 14; }
      if (ri % 2 === 0) {
        doc.setFillColor(35, 35, 38);
        doc.rect(M, y, W - M * 2, 6, "F");
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(210, 210, 210);
      doc.text(row.player_name?.substring(0, 22) || "", M + 2, y + 4);
      activeMetrics.forEach(({ key, fmt }, i) => {
        const val = row[key] != null ? fmt(row[key]) : "—";
        doc.text(String(val), M + nameW + i * colW + colW / 2, y + 4, { align: "center" });
      });
      y += 6;
    });
  }

  // Footer
  doc.setDrawColor(60, 60, 60);
  doc.line(M, 285, W - M, 285);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text("PerformancePitch — Defensa y Justicia", M, 290);

  doc.save(`Ejercicio_${exercise.name.replace(/\s+/g, "_")}.pdf`);
}

function ExerciseCard({ exercise, session, onDelete }) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [csvUrl, setCsvUrl] = useState(exercise.external_csv_url || null);
  const [csvLabel, setCsvLabel] = useState(exercise.external_csv_label || null);
  const [csvRows, setCsvRows] = useState(null);
  const [imageUrl, setImageUrl] = useState(exercise.image_url || null);
  const [videoUrl, setVideoUrl] = useState(exercise.video_url || null);
  const [category, setCategory] = useState(exercise.category || "");
  const [showVideoModal, setShowVideoModal] = useState(false);
  const fileRef = useRef();
  const imgRef = useRef();
  const { toast } = useToast();

  const videoThumb = videoUrl ? getVideoThumbnailUrl(videoUrl) : null;

  async function handleVideoChange(newUrl) {
    const value = newUrl || null;
    try {
      await base44.entities.FieldExercise.update(exercise.id, { video_url: value || null });
      setVideoUrl(value);
      toast({ title: value ? "Video guardado" : "Video eliminado" });
    } catch {
      toast({ title: "Error al actualizar video", variant: "destructive" });
    }
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploadingImg(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.FieldExercise.update(exercise.id, { image_url: file_url });
      setImageUrl(file_url);
      toast({ title: "Imagen guardada" });
    } catch {
      toast({ title: "Error al subir imagen", variant: "destructive" });
    } finally {
      setUploadingImg(false);
    }
  }

  async function handleExportPdf() {
    setGeneratingPdf(true);
    await exportExercisePDF({ ...exercise, image_url: imageUrl }, session, csvRows);
    setGeneratingPdf(false);
  }

  async function handleDelete(e) {
    e.stopPropagation();
    if (!confirm(`¿Eliminar el ejercicio "${exercise.name}"?`)) return;
    setDeleting(true);
    await base44.entities.FieldExercise.delete(exercise.id);
    toast({ title: "Ejercicio eliminado" });
    onDelete(exercise.id);
  }

  async function handleCsvUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.FieldExercise.update(exercise.id, {
        external_csv_url: file_url,
        external_csv_label: file.name,
      });
      setCsvUrl(file_url);
      setCsvLabel(file.name);
      toast({ title: "CSV cargado correctamente" });
    } catch {
      toast({ title: "Error al cargar el CSV", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  async function removeCsv() {
    await base44.entities.FieldExercise.update(exercise.id, {
      external_csv_url: null,
      external_csv_label: null,
    });
    setCsvUrl(null);
    setCsvLabel(null);
    toast({ title: "CSV eliminado" });
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-4 hover:bg-zinc-800/30 transition-colors text-left"
      >
        {/* Video / image thumbnail preview in header */}
        {(videoUrl || imageUrl) && (
          <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-zinc-700 bg-zinc-800">
            {videoUrl && videoThumb ? (
              <img src={videoThumb} alt="" className="w-full h-full object-cover" />
            ) : imageUrl ? (
              <img src={imageUrl} alt="" className="w-full h-full object-cover" />
            ) : null}
            {videoUrl && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Play size={12} className="text-white fill-white" />
              </div>
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white font-semibold text-sm">{exercise.name}</p>
            {category && (
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CATEGORY_COLORS[category] || CATEGORY_COLORS["Otro"]}`}>
                {category}
              </span>
            )}
            {videoUrl && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-300 uppercase">Video</span>
            )}
          </div>
          <div className="flex flex-wrap gap-3 mt-1 text-xs text-zinc-500">
            {session && (
              <span className="text-zinc-600">
                {session.title} · {moment(session.date).format("DD/MM/YY")}
              </span>
            )}
            {exercise.space && <span>📍 {exercise.space}</span>}
            {exercise.duration_minutes && <span>⏱ {exercise.duration_minutes} min</span>}
            {exercise.num_players && <span>👥 {exercise.num_players} jug.</span>}
            {(exercise.width_m || exercise.length_m) && (
              <span>📐 {exercise.width_m ?? "—"} × {exercise.length_m ?? "—"} m</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {csvUrl && (
            <span className="text-xs bg-green-900/40 text-green-400 border border-green-800/50 px-2 py-0.5 rounded-full">CSV</span>
          )}
          {videoUrl && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowVideoModal(true); }}
              title="Reproducir video"
              className="text-zinc-500 hover:text-blue-400 transition-colors p-1 rounded"
            >
              <Play size={14} />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); handleExportPdf(); }}
            disabled={generatingPdf}
            title="Exportar PDF"
            className="text-zinc-500 hover:text-yellow-400 transition-colors p-1 rounded disabled:opacity-50"
          >
            {generatingPdf
              ? <div className="w-3.5 h-3.5 border border-zinc-500 border-t-yellow-400 rounded-full animate-spin" />
              : <FileDown size={14} />}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-zinc-600 hover:text-red-400 transition-colors p-1 rounded"
          >
            <Trash2 size={14} />
          </button>
          {open ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
        </div>
      </button>

      {/* Expanded */}
      {open && (
        <div className="border-t border-zinc-800 p-4 space-y-4">

          {/* Media: video > imagen > placeholder */}
          {videoUrl ? (
            <div
              className="relative rounded-lg overflow-hidden border border-zinc-800 group cursor-pointer"
              onClick={() => setShowVideoModal(true)}
            >
              {videoThumb ? (
                <img src={videoThumb} alt="Ejercicio" className="w-full max-h-64 object-cover" />
              ) : (
                <div className="w-full h-40 flex items-center justify-center bg-zinc-800">
                  <Play size={28} className="text-zinc-600" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/50 flex items-center justify-center backdrop-blur-sm">
                  <Play size={20} className="text-white fill-white ml-0.5" />
                </div>
              </div>
              <span className="absolute top-2 left-2 bg-blue-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">Video</span>
            </div>
          ) : imageUrl ? (
            <div className="relative group">
              <img src={imageUrl} alt="Ejercicio" className="w-full max-h-64 object-cover rounded-lg border border-zinc-800" />
              <label className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <div className="flex items-center gap-1.5 bg-zinc-900/80 text-zinc-300 hover:text-white text-xs px-2.5 py-1.5 rounded-lg border border-zinc-700">
                  {uploadingImg ? <div className="w-3 h-3 border border-zinc-500 border-t-white rounded-full animate-spin" /> : <ImagePlus size={12} />}
                  Cambiar
                </div>
                <input ref={imgRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImg} />
              </label>
            </div>
          ) : (
            <label className="cursor-pointer block">
              <div className={`flex items-center justify-center gap-2 border border-dashed border-zinc-700 rounded-lg px-4 py-6 text-xs text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors ${uploadingImg ? "opacity-60 pointer-events-none" : ""}`}>
                {uploadingImg ? <div className="w-3.5 h-3.5 border border-zinc-500 border-t-white rounded-full animate-spin" /> : <ImagePlus size={16} />}
                {uploadingImg ? "Subiendo imagen..." : "Agregar imagen al ejercicio"}
              </div>
              <input ref={imgRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImg} />
            </label>
          )}

          {/* Video management section */}
          <div className="border border-zinc-800 rounded-lg p-3">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Video del ejercicio</p>
            <VideoUploadSection
              videoUrl={videoUrl || ""}
              onVideoUrl={handleVideoChange}
            />
          </div>

          {/* Detalles del ejercicio */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-zinc-800/60 rounded-lg p-3">
              <p className="text-zinc-500 text-xs flex items-center gap-1 mb-1"><Users size={11} /> Jugadores</p>
              <p className="text-white font-bold text-lg">{exercise.num_players ?? "—"}</p>
            </div>
            <div className="bg-zinc-800/60 rounded-lg p-3">
              <p className="text-zinc-500 text-xs flex items-center gap-1 mb-1"><Maximize2 size={11} /> Dimensiones</p>
              <p className="text-white font-bold text-sm">
                {exercise.width_m && exercise.length_m
                  ? `${exercise.width_m} × ${exercise.length_m} m`
                  : exercise.width_m ? `${exercise.width_m} m ancho`
                  : exercise.length_m ? `${exercise.length_m} m largo`
                  : "—"}
              </p>
            </div>
            <div className="bg-zinc-800/60 rounded-lg p-3">
              <p className="text-zinc-500 text-xs flex items-center gap-1 mb-1"><Clock size={11} /> Duración</p>
              <p className="text-white font-bold text-lg">{exercise.duration_minutes ? `${exercise.duration_minutes} min` : "—"}</p>
            </div>
            <div className="bg-zinc-800/60 rounded-lg p-3">
              <p className="text-zinc-500 text-xs flex items-center gap-1 mb-1">📍 Espacio</p>
              <p className="text-white text-sm font-medium truncate">{exercise.space || "—"}</p>
            </div>
          </div>

          {exercise.objective && (
            <div className="bg-zinc-800/40 rounded-lg p-3">
              <p className="text-zinc-500 text-xs flex items-center gap-1 mb-1"><Target size={11} /> Objetivo</p>
              <p className="text-zinc-300 text-sm">{exercise.objective}</p>
            </div>
          )}

          {exercise.description && (
            <div className="bg-zinc-800/40 rounded-lg p-3">
              <p className="text-zinc-500 text-xs mb-1">Descripción</p>
              <p className="text-zinc-300 text-sm">{exercise.description}</p>
            </div>
          )}

          {/* Categoría */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 shrink-0">Categoría:</span>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={async () => {
                    const newCat = cat === category ? "" : cat;
                    setCategory(newCat);
                    await base44.entities.FieldExercise.update(exercise.id, { category: newCat || null });
                  }}
                  className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                    category === cat
                      ? CATEGORY_COLORS[cat] || CATEGORY_COLORS["Otro"]
                      : "bg-zinc-800 text-zinc-500 border-zinc-700 hover:border-zinc-500"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Interacción individual */}
          <ExercisePlayerLogs exerciseId={exercise.id} />

          {/* CSV Carga externa */}
          <div className="border-t border-zinc-800 pt-4">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Carga externa (CSV)</p>
            {csvUrl ? (
              <>
                <div className="flex items-center gap-3 bg-zinc-800/60 rounded-lg px-3 py-2.5">
                  <FileSpreadsheet size={16} className="text-green-400 shrink-0" />
                  <span className="text-zinc-300 text-xs flex-1 truncate">{csvLabel || "Archivo CSV"}</span>
                  <a href={csvUrl} target="_blank" rel="noopener noreferrer"
                    className="text-zinc-400 hover:text-white transition-colors p-1">
                    <ExternalLink size={14} />
                  </a>
                  <button onClick={removeCsv} className="text-zinc-600 hover:text-red-400 transition-colors p-1">
                    <X size={14} />
                  </button>
                </div>
                <CsvDataTable csvUrl={csvUrl} onRowsParsed={setCsvRows} />
              </>
            ) : (
              <label className="cursor-pointer">
                <div className={`flex items-center gap-2 border border-dashed border-zinc-700 rounded-lg px-4 py-3 text-xs text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
                  {uploading ? (
                    <div className="w-3.5 h-3.5 border border-zinc-500 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Upload size={14} />
                  )}
                  {uploading ? "Subiendo..." : "Cargar CSV de carga externa del ejercicio"}
                </div>
                <input ref={fileRef} type="file" accept=".csv,.txt,.xlsx" onChange={handleCsvUpload} className="hidden" disabled={uploading} />
              </label>
            )}
          </div>
        </div>
      )}
      {showVideoModal && videoUrl && (
        <VideoPreviewModal url={videoUrl} title={exercise.name} onClose={() => setShowVideoModal(false)} />
      )}
    </div>
  );
}

// Muestra la interacción individual por jugador (solo lectura resumida)
function ExercisePlayerLogs({ exerciseId }) {
  const [logs, setLogs] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    base44.entities.PlayerExerciseLog.filter({ exercise_id: exerciseId }, null, 100)
      .then(setLogs)
      .finally(() => setLoaded(true));
  }, [exerciseId]);

  if (!loaded) return <div className="text-xs text-zinc-600">Cargando interacción...</div>;
  if (logs.length === 0) return null;

  const participated = logs.filter((l) => l.participated);
  const notParticipated = logs.filter((l) => !l.participated);

  return (
    <div className="bg-zinc-800/40 rounded-lg p-3">
      <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2">
        Interacción individual — {participated.length} participaron
      </p>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {participated.map((log) => (
          <div key={log.player_id} className="flex items-center gap-2 text-xs">
            <span className="text-zinc-300 w-36 truncate">{log.player_name}</span>
            {log.performance && (
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                log.performance === "Muy bien" ? "bg-emerald-900/50 text-emerald-400"
                : log.performance === "Bien" ? "bg-blue-900/50 text-blue-400"
                : log.performance === "Regular" ? "bg-yellow-900/50 text-yellow-400"
                : "bg-red-900/50 text-red-400"
              }`}>{log.performance}</span>
            )}
            {log.notes && <span className="text-zinc-600 truncate flex-1">{log.notes}</span>}
          </div>
        ))}
        {notParticipated.length > 0 && (
          <p className="text-zinc-700 text-xs mt-1">No participaron: {notParticipated.map(l => l.player_name).join(", ")}</p>
        )}
      </div>
    </div>
  );
}

export default function ExercisesLibrary() {
  const [exercises, setExercises] = useState([]);
  const [sessions, setSessions] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterSession, setFilterSession] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const [exs, sess] = await Promise.all([
        base44.entities.FieldExercise.list("order", 500),
        base44.entities.TrainingSession.list("-date", 200),
      ]);
      const sessMap = {};
      sess.forEach((s) => { sessMap[s.id] = s; });
      setExercises(exs);
      setSessions(sessMap);
      setLoading(false);
    }
    load();
  }, []);

  const uniqueSessions = [...new Map(
    exercises.map((e) => [e.session_id, sessions[e.session_id]]).filter(([, s]) => s)
  ).entries()].map(([id, s]) => ({ id, title: s.title, date: s.date }))
    .sort((a, b) => b.date?.localeCompare(a.date));

  const filtered = exercises.filter((ex) => {
    const matchSession = filterSession === "all" || ex.session_id === filterSession;
    const matchCategory = filterCategory === "all" || ex.category === filterCategory;
    const matchSearch = !search || ex.name.toLowerCase().includes(search.toLowerCase());
    return matchSession && matchCategory && matchSearch;
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Biblioteca de Ejercicios</h2>
        <p className="text-zinc-500 text-sm mt-0.5">Todos los ejercicios de las sesiones de campo</p>
      </div>

      {/* Filtros */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar ejercicio..."
            className="bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-1.5 outline-none focus:border-zinc-500 w-56"
          />
          <select
            value={filterSession}
            onChange={(e) => setFilterSession(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm rounded-lg px-3 py-1.5 outline-none focus:border-zinc-500"
          >
            <option value="all">Todas las sesiones</option>
            {uniqueSessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({moment(s.date).format("DD/MM/YY")})
              </option>
            ))}
          </select>
          <span className="text-xs text-zinc-600">{filtered.length} ejercicios</span>
        </div>
        {/* Filtro rápido por categoría */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilterCategory("all")}
            className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
              filterCategory === "all"
                ? "bg-white text-zinc-900 border-white"
                : "bg-zinc-800 text-zinc-500 border-zinc-700 hover:border-zinc-500"
            }`}
          >
            Todas
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(filterCategory === cat ? "all" : cat)}
              className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                filterCategory === cat
                  ? CATEGORY_COLORS[cat] || CATEGORY_COLORS["Otro"]
                  : "bg-zinc-800 text-zinc-500 border-zinc-700 hover:border-zinc-500"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <FileSpreadsheet size={36} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">
            {exercises.length === 0 ? "No hay ejercicios registrados en ninguna sesión" : "Sin resultados para el filtro aplicado"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ex) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              session={sessions[ex.session_id]}
              onDelete={(id) => setExercises((prev) => prev.filter((e) => e.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
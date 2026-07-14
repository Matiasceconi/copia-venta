import React, { useMemo, useState } from "react";
import { FileText, Loader, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { CLUB_BRAND } from "@/lib/clubBrand";
import moment from "moment";
import jsPDF from "jspdf";

function hexToRgb(hex, fallback = [0, 0, 0]) {
  const clean = String(hex || "").replace("#", "");
  if (clean.length !== 6) return fallback;
  return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
}

function parseLeadingNumber(value) {
  const match = String(value || "").match(/\d+(?:[.,]\d+)?/);
  return match ? Number(match[0].replace(",", ".")) : 0;
}

function parseNumbers(value) {
  return String(value || "").match(/\d+(?:[.,]\d+)?/g)?.map(item => Number(item.replace(",", "."))) || [];
}

function totalReps(row) {
  const sets = parseLeadingNumber(row.sets);
  const reps = parseLeadingNumber(row.reps);
  if (sets && reps) return sets * reps;
  const volumeNumbers = parseNumbers(row.volume);
  if (/x/i.test(String(row.volume || "")) && volumeNumbers.length >= 2) return volumeNumbers[0] * volumeNumbers[1];
  if (String(row.volume || "").includes("+") && volumeNumbers.length) return volumeNumbers.reduce((sum, value) => sum + value, 0);
  return reps || parseLeadingNumber(row.volume);
}

function totalSets(row) {
  return parseLeadingNumber(row.sets) || (/x/i.test(String(row.volume || "")) ? parseLeadingNumber(row.volume) : 0);
}

async function loadImageDataUrl(url) {
  const response = await fetch(url);
  const blob = await response.blob();
  return await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

export default function StrengthPDFExport({ session, stations, blocks = [] }) {
  const [generating, setGenerating] = useState(false);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("complete");
  const [selected, setSelected] = useState([]);
  const { toast } = useToast();

  const exportBlocks = useMemo(() => blocks.filter(block => !block.hidden), [blocks]);

  function toggle(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  }

  function selectedBlocks() {
    if (mode === "complete" || mode === "separate") return exportBlocks;
    return exportBlocks.filter(block => selected.includes(block.id));
  }

  async function generate() {
    const blocksToExport = selectedBlocks();
    if (!blocksToExport.length) return;
    setGenerating(true);
    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageW = 210;
      const pageH = 297;
      const margin = 12;
      const contentW = pageW - margin * 2;
      let y = margin;
      let logo = null;
      try { logo = await loadImageDataUrl(CLUB_BRAND.logoUrl); } catch { logo = null; }

      const green = hexToRgb(CLUB_BRAND.colors.green, [0, 132, 61]);
      const greenDark = hexToRgb(CLUB_BRAND.colors.greenDark, [0, 90, 52]);
      const greenDeep = hexToRgb(CLUB_BRAND.colors.greenDeep, [0, 61, 37]);
      const yellow = hexToRgb(CLUB_BRAND.colors.yellow, [255, 212, 0]);
      const panel = hexToRgb(CLUB_BRAND.colors.panel, [246, 247, 243]);
      const line = hexToRgb(CLUB_BRAND.colors.line, [216, 222, 210]);
      const ink = hexToRgb(CLUB_BRAND.colors.ink, [17, 24, 39]);
      const muted = hexToRgb(CLUB_BRAND.colors.muted, [107, 114, 128]);

      function addPageIfNeeded(needed = 12) {
        if (y + needed > pageH - 16) {
          doc.addPage();
          y = margin;
          drawPageHeader(false);
        }
      }

      function metricCard(x, label, value, color = greenDark) {
        doc.setFillColor(...panel);
        doc.setDrawColor(...line);
        doc.roundedRect(x, y, 43, 16, 3, 3, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5.4);
        doc.setTextColor(...muted);
        doc.text(doc.splitTextToSize(label.toUpperCase(), 37).slice(0, 2), x + 3, y + 4.2);
        doc.setFontSize(10);
        doc.setTextColor(...color);
        doc.text(String(value || "—"), x + 3, y + 13);
      }

      function drawPageHeader(first = true) {
        doc.setFillColor(...greenDeep);
        doc.rect(0, 0, pageW, 20, "F");
        doc.setFillColor(...yellow);
        doc.rect(0, 20, pageW, 2.2, "F");
        if (logo) doc.addImage(logo, "PNG", margin, 4, 14, 14);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(255, 255, 255);
        doc.text("PLANILLA DE FUERZA", logo ? margin + 18 : margin, 10);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(225, 238, 228);
        doc.text(CLUB_BRAND.name, logo ? margin + 18 : margin, 15);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...yellow);
        doc.text(moment(session.date).isValid() ? moment(session.date).format("DD/MM/YYYY") : "Fecha sin definir", pageW - margin, 10, { align: "right" });
        y = 28;

        if (first) {
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(...line);
          doc.roundedRect(margin, y, contentW, 24, 4, 4, "FD");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(13);
          doc.setTextColor(...ink);
          doc.text(session.title || "Sesión de fuerza", margin + 4, y + 8, { maxWidth: contentW - 8 });
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(...muted);
          const info = [session.squad_name && `Plantel: ${session.squad_name}`, session.match_day_code && `MD: ${session.match_day_code}`, session.strength_purpose && `Propósito: ${session.strength_purpose}`, session.strength_session_type && `Tipo: ${session.strength_session_type}`].filter(Boolean).join("  ·  ");
          doc.text(info || "Información de sesión", margin + 4, y + 16, { maxWidth: contentW - 8 });
          y += 31;
        }
      }

      function drawBlock(block, blockIndex) {
        const blockRows = stations.filter(row => row.work_block_id === block.id).sort((a, b) => (a.order || 0) - (b.order || 0));
        const repsTotal = blockRows.reduce((sum, row) => sum + totalReps(row), 0);
        const setsTotal = blockRows.reduce((sum, row) => sum + totalSets(row), 0);
        const blockColor = hexToRgb(block.color, green);
        addPageIfNeeded(44);

        doc.setFillColor(...blockColor);
        doc.roundedRect(margin, y, contentW, 13, 3, 3, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text(`${String(blockIndex + 1).padStart(2, "0")} · ${block.name || "Cuadro de trabajo"}`, margin + 4, y + 8.5, { maxWidth: contentW - 8 });
        y += 17;

        metricCard(margin, "Ejercicios", blockRows.length, greenDark);
        metricCard(margin + 47, "Tiempo estimado", block.estimated_time || "—", greenDark);
        metricCard(margin + 94, "Cantidad de repeticiones totales", repsTotal || "—", greenDark);
        metricCard(margin + 141, "Cantidad de series totales", setsTotal || "—", greenDark);
        y += 19;

        if (block.description) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(...muted);
          const description = doc.splitTextToSize(block.description, contentW);
          doc.text(description, margin, y);
          y += Math.max(6, description.length * 4) + 2;
        }

        const cols = [
          { label: "N°", w: 9 },
          { label: "Ejercicio", w: 43 },
          { label: "Volumen", w: 20 },
          { label: "Series", w: 16 },
          { label: "Reps", w: 16 },
          { label: "Tiempo", w: 18 },
          { label: "Método / Tipo", w: 34 },
          { label: "Objetivo / Obs.", w: contentW - 156 },
        ];
        doc.setFillColor(...greenDeep);
        doc.roundedRect(margin, y, contentW, 7, 2, 2, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(255, 255, 255);
        let x = margin;
        cols.forEach(col => { doc.text(col.label, x + 1.5, y + 4.6, { maxWidth: col.w - 2 }); x += col.w; });
        y += 7;

        if (!blockRows.length) {
          doc.setFillColor(...panel);
          doc.roundedRect(margin, y, contentW, 10, 2, 2, "F");
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(...muted);
          doc.text("Sin ejercicios cargados", margin + 3, y + 6);
          y += 14;
          return;
        }

        blockRows.forEach((row, idx) => {
          const values = [
            String(idx + 1),
            row.exercise_name || "—",
            row.volume || "—",
            row.sets || "—",
            row.reps || "—",
            row.time || "—",
            [row.method, row.exercise_type].filter(Boolean).join(" / ") || "—",
            [row.objective, row.notes].filter(Boolean).join(" · ") || "—",
          ];
          const lineSets = values.map((value, i) => doc.splitTextToSize(String(value), cols[i].w - 2));
          const rowH = Math.max(8, Math.max(...lineSets.map(lines => lines.length)) * 3.6 + 3);
          addPageIfNeeded(rowH + 3);
          doc.setFillColor(idx % 2 === 0 ? 252 : 246, idx % 2 === 0 ? 252 : 247, idx % 2 === 0 ? 250 : 243);
          doc.rect(margin, y, contentW, rowH, "F");
          doc.setDrawColor(...line);
          doc.line(margin, y + rowH, margin + contentW, y + rowH);
          doc.setFont("helvetica", idx === 0 ? "bold" : "normal");
          doc.setFontSize(6.8);
          doc.setTextColor(...ink);
          let rx = margin;
          lineSets.forEach((lines, i) => { doc.text(lines, rx + 1.5, y + 4.7, { maxWidth: cols[i].w - 2 }); rx += cols[i].w; });
          y += rowH;
        });
        y += 8;
      }

      drawPageHeader(true);
      blocksToExport.forEach((block, idx) => {
        if (mode === "separate" && idx > 0) {
          doc.addPage();
          y = margin;
          drawPageHeader(false);
        }
        drawBlock(block, idx);
      });

      const totalPages = doc.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p += 1) {
        doc.setPage(p);
        doc.setFillColor(...yellow);
        doc.rect(0, pageH - 7, pageW, 2, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(...muted);
        doc.text(`${CLUB_BRAND.shortName} · Área de Preparación Física`, margin, pageH - 3);
        doc.text(`${p} / ${totalPages}`, pageW - margin, pageH - 3, { align: "right" });
      }

      doc.save(`fuerza_${moment(session.date).format("YYYY-MM-DD")}_${(session.title || "sesion").replace(/\s+/g, "_")}.pdf`);
      toast({ title: "✓ PDF de fuerza exportado" });
      setOpen(false);
    } catch (err) {
      toast({ title: "Error al generar el PDF: " + err.message, variant: "destructive" });
    } finally { setGenerating(false); }
  }

  return <>
    <button onClick={() => setOpen(true)} disabled={generating || exportBlocks.length === 0} className="flex items-center gap-1.5 px-3 py-2 bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 rounded-lg text-xs hover:bg-yellow-500/25 transition-colors disabled:opacity-50">{generating ? <Loader size={13} className="animate-spin" /> : <FileText size={13} />}{generating ? "Generando..." : "Exportar"}</button>
    {open && <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"><div className="w-full max-w-md rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl"><div className="flex items-center justify-between p-4 border-b border-zinc-800"><p className="text-sm font-semibold text-white">Exportar fuerza</p><button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-white"><X size={16} /></button></div><div className="p-4 space-y-4"><div className="grid gap-2">{[{ id: "complete", label: "Exportar sesión completa" }, { id: "selected", label: "Exportar cuadros seleccionados" }, { id: "separate", label: "Todos los cuadros en hojas separadas" }].map(option => <button key={option.id} onClick={() => setMode(option.id)} className={`text-left rounded-lg border px-3 py-2 text-xs ${mode === option.id ? "bg-white text-zinc-900 border-white" : "bg-zinc-800 text-zinc-300 border-zinc-700"}`}>{option.label}</button>)}</div>{mode === "selected" && <div className="space-y-2"><p className="text-[10px] text-zinc-500 uppercase font-bold">Elegir cuadros</p>{exportBlocks.map(block => <label key={block.id} className="flex items-center gap-2 text-xs text-zinc-300"><input type="checkbox" checked={selected.includes(block.id)} onChange={() => toggle(block.id)} />{block.name}</label>)}</div>}<div className="flex justify-end gap-2"><button onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-xs">Cancelar</button><button onClick={generate} disabled={generating || !selectedBlocks().length} className="px-4 py-2 rounded-lg bg-white text-zinc-950 text-xs font-bold disabled:opacity-40">Exportar PDF</button></div></div></div></div>}
  </>;
}
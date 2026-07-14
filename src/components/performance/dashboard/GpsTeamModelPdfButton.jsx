import React from "react";
import { Download } from "lucide-react";
import { jsPDF } from "jspdf";
import { MODEL_METRICS, fmt } from "./teamModelUtils";

export default function GpsTeamModelPdfButton({ squadName, season, microcycle, competition, evolution, positionLabel, analysis, observations }) {
  function exportPdf() {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    doc.setFillColor(20, 20, 24); doc.rect(0, 0, 297, 22, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(15); doc.text("Modelo de Rendimiento del Equipo", 14, 14);
    doc.setFontSize(9); doc.text(`${squadName || "Plantel"} · ${season || "Temporada"} · ${positionLabel}`, 210, 14);
    doc.setTextColor(30, 30, 30); doc.setFontSize(10); doc.text("Perfil del microciclo", 14, 34);
    let y = 42; doc.setFontSize(7);
    microcycle.forEach((d) => { doc.text(`${d.day} · sesiones: ${d.sessions_count} · Dist: ${fmt(d.total_distance, "m")} · PL: ${fmt(d.player_load, "u")} · Smax: ${fmt(d.smax, "km/h")}`, 14, y); y += 6; });
    doc.setFontSize(10); doc.text("Perfil competitivo", 150, 34); doc.setFontSize(7);
    MODEL_METRICS.forEach((m, i) => doc.text(`${m.label}: ${fmt(competition[m.key], m.unit)}`, 150, 42 + i * 5));
    doc.setFontSize(10); doc.text("Evolución", 14, y + 8); doc.setFontSize(7); y += 16;
    evolution.summary.slice(0, 8).forEach((e) => { doc.text(`${e.metric}: actual ${fmt(e.current, e.unit)} · histórico ${fmt(e.historic, e.unit)} · ${e.pct.toFixed(1)}% · ${e.trend}`, 14, y); y += 5; });
    doc.setFontSize(10); doc.text("Análisis Inteligente", 150, 105); doc.setFontSize(7);
    doc.splitTextToSize(analysis || "Sin análisis generado.", 125).slice(0, 12).forEach((line, i) => doc.text(line, 150, 113 + i * 4));
    doc.setFontSize(10); doc.text("Observaciones", 150, 168); doc.setFontSize(7);
    doc.splitTextToSize(observations || "Sin observaciones.", 125).slice(0, 8).forEach((line, i) => doc.text(line, 150, 176 + i * 4));
    doc.save(`modelo-rendimiento-${squadName || "equipo"}.pdf`);
  }
  return <button onClick={exportPdf} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold"><Download size={16} />Exportar Perfil del Equipo</button>;
}
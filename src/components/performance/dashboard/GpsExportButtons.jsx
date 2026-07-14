import React from "react";
import { FileText, Image as ImageIcon, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import moment from "moment";

export default function GpsExportButtons({ session, rows, dashboardRef }) {
  function exportExcel() {
    const data = rows.map((r) => ({
      Jugador: r.player_name, Posicion: r.position, "Dist (m)": r.total_distance, "m/min": r.m_min,
      "D>19.8": r.distance_19_8, "D>25": r.distance_25, Sprints: r.sprints, "ACC+3": r.acc_3,
      "DEC+3": r.dec_3, "Player Load": r.player_load, "S Max": r.smax,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sesion GPS");
    XLSX.writeFile(wb, `gps-sesion-${session?.date || "sesion"}.xlsx`);
  }

  function exportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Carga Externa GPS - ${session?.title || ""}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`${moment(session?.date).format("DD/MM/YYYY")}`, 14, 22);
    let y = 32;
    doc.setFontSize(8);
    doc.text("Jugador | Pos | Dist | m/min | Sprints | PL | SMax", 14, y);
    y += 5;
    rows.forEach((r) => {
      if (y > 280) { doc.addPage(); y = 15; }
      doc.text(`${r.player_name} | ${r.position || "-"} | ${Math.round(r.total_distance || 0)} | ${Math.round(r.m_min || 0)} | ${Math.round(r.sprints || 0)} | ${Math.round(r.player_load || 0)} | ${(r.smax || 0).toFixed(1)}`, 14, y);
      y += 5;
    });
    doc.save(`gps-sesion-${session?.date || "sesion"}.pdf`);
  }

  async function exportPNG() {
    if (!dashboardRef?.current) return;
    const canvas = await html2canvas(dashboardRef.current, { backgroundColor: "#18181b" });
    const link = document.createElement("a");
    link.download = `gps-dashboard-${session?.date || "hoy"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <button onClick={exportPDF} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/90 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors">
        <FileText size={13} /> PDF
      </button>
      <button onClick={exportPNG} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/90 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-colors">
        <ImageIcon size={13} /> PNG
      </button>
      <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors">
        <FileSpreadsheet size={13} /> Excel
      </button>
    </div>
  );
}
import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, FileDown, Loader } from "lucide-react";
import moment from "moment";
import "moment/locale/es";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useToast } from "@/components/ui/use-toast";
import { buildReportData } from "./sessionGpsReportData";
import SessionGpsReportContent from "./SessionGpsReportContent";
moment.locale("es");

export default function SessionGPSReportModal({ session, sessionPlayers, onClose }) {
  const { toast } = useToast();
  const reportRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [observations, setObservations] = useState(session.gps_report_observations || "");

  useEffect(() => {
    async function load() {
      const weekStart = moment(session.date).startOf("isoWeek").format("YYYY-MM-DD");
      const weekEnd = moment(session.date).endOf("isoWeek").format("YYYY-MM-DD");
      const [gpsRows, players, allSessions, competitionProfiles] = await Promise.all([
        base44.entities.SessionGPSData.filter({ session_id: session.id }, "-created_date", 200),
        base44.entities.Player.list("-created_date", 500),
        base44.entities.TrainingSession.list("-date", 300),
        base44.entities.PlayerCompetitionProfile.list("-updated_at", 500),
      ]);
      const weekSessions = allSessions.filter(s => s.id !== session.id && s.squad_id === session.squad_id && s.date >= weekStart && s.date <= weekEnd);
      const weekGpsRows = weekSessions.length ? (await Promise.all(weekSessions.map(s => base44.entities.SessionGPSData.filter({ session_id: s.id }, "-created_date", 200)))).flat() : [];
      setReportData(buildReportData({ session, sessionPlayers, gpsRows, players, weekGpsRows, competitionProfiles }));
      setLoading(false);
    }
    load();
  }, [session.id]);

  async function saveObservations() {
    setSaving(true);
    await base44.entities.TrainingSession.update(session.id, { gps_report_observations: observations });
    setSaving(false);
    toast({ title: "✓ Observaciones guardadas" });
  }

  async function handleExport() {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: "#18181b" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = 210, pageH = 297;
      const imgH = (canvas.height * pageW) / canvas.width;
      let heightLeft = imgH;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, pageW, imgH);
      heightLeft -= pageH;
      while (heightLeft > 0) {
        position -= pageH;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pageW, imgH);
        heightLeft -= pageH;
      }
      const filename = `informe_gps_${moment(session.date).format("YYYY-MM-DD")}_${(session.title || "sesion").replace(/\s+/g, "_")}.pdf`;
      pdf.save(filename);
      toast({ title: "✓ Informe PDF generado" });
    } catch (err) {
      toast({ title: "Error al generar el PDF: " + err.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 shrink-0">
          <p className="text-sm font-semibold text-white">Informe de Sesión GPS — {session.title}</p>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} disabled={exporting || loading} className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-zinc-900 font-semibold rounded-lg text-xs transition-colors disabled:opacity-50">
              {exporting ? <Loader size={12} className="animate-spin" /> : <FileDown size={12} />} Exportar PDF
            </button>
            <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors"><X size={18} /></button>
          </div>
        </div>
        <div className="overflow-y-auto p-5">
          {loading || !reportData ? <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" /></div> : <div ref={reportRef}><SessionGpsReportContent session={session} reportData={reportData} observations={observations} setObservations={setObservations} saving={saving} onSaveObservations={saveObservations} /></div>}
        </div>
      </div>
    </div>
  );
}
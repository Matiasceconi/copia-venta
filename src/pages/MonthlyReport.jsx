import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FileDown, Loader2, ChevronDown, BarChart2, Clock, Zap } from "lucide-react";
import moment from "moment";
import "moment/locale/es";
moment.locale("es");

// ── Helpers ───────────────────────────────────────────────────────────────────
const avg = (arr, key) => {
  const vals = arr.map((r) => r[key]).filter((v) => v != null && v > 0);
  return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
};
const sum = (arr, key) => arr.reduce((a, r) => a + (r[key] || 0), 0);

function fmt(n, dec = 0) {
  if (!n || n === 0) return "—";
  return dec > 0 ? Number(n).toFixed(dec) : Math.round(n).toString();
}

// ── PDF Generator ─────────────────────────────────────────────────────────────
async function generatePDF(month, year, playerStats, sessionCount) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const W = 210;
  const MARGIN = 14;
  const COL = W - MARGIN * 2;
  const monthLabel = moment(`${year}-${month}-01`).format("MMMM YYYY").toUpperCase();

  // ── Header band
  doc.setFillColor(24, 24, 27); // zinc-900
  doc.rect(0, 0, W, 28, "F");
  doc.setFillColor(240, 200, 0); // yellow accent
  doc.rect(0, 28, W, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("INFORME MENSUAL DE RENDIMIENTO", MARGIN, 12);
  doc.setFontSize(10);
  doc.setTextColor(160, 160, 160);
  doc.text(`Defensa y Justicia — Cuerpo Técnico`, MARGIN, 20);
  doc.setTextColor(240, 200, 0);
  doc.text(monthLabel, W - MARGIN, 12, { align: "right" });
  doc.setTextColor(160, 160, 160);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Generado: ${moment().format("DD/MM/YYYY HH:mm")}`, W - MARGIN, 20, { align: "right" });

  let y = 36;

  // ── Summary box
  doc.setFillColor(39, 39, 42); // zinc-800
  doc.roundedRect(MARGIN, y, COL, 18, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 200);
  const summaryItems = [
    { label: "Jugadores analizados", value: playerStats.length.toString() },
    { label: "Sesiones del mes", value: sessionCount.toString() },
    { label: "Dist. prom. total", value: `${fmt(avg(playerStats.map(p => ({ v: p.avgDistance })), "v"))} m` },
    { label: "Vel. máx. prom.", value: `${fmt(avg(playerStats.map(p => ({ v: p.avgMaxVel })), "v"), 1)} km/h` },
  ];
  const colW = COL / summaryItems.length;
  summaryItems.forEach((item, i) => {
    const x = MARGIN + i * colW + colW / 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(240, 200, 0);
    doc.text(item.value, x, y + 9, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text(item.label, x, y + 15, { align: "center" });
  });

  y += 24;

  // ── Table header
  const cols = [
    { label: "Jugador", w: 40 },
    { label: "Sesiones", w: 18 },
    { label: "Dist. prom (m)", w: 26 },
    { label: "+25km/h (m)", w: 22 },
    { label: "19.8-25 (m)", w: 22 },
    { label: "Player Load", w: 22 },
    { label: "Vel. Máx", w: 20 },
    { label: "Min jugados", w: 22 },
  ];

  // Header row
  doc.setFillColor(24, 24, 27);
  doc.rect(MARGIN, y, COL, 8, "F");
  let cx = MARGIN + 2;
  cols.forEach((col) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text(col.label, cx, y + 5.5);
    cx += col.w;
  });
  y += 8;

  // Data rows
  playerStats.forEach((ps, idx) => {
    if (y > 270) {
      doc.addPage();
      y = 14;
    }
    const bg = idx % 2 === 0 ? [39, 39, 42] : [30, 30, 32];
    doc.setFillColor(...bg);
    doc.rect(MARGIN, y, COL, 8, "F");

    const values = [
      ps.name,
      ps.sessions.toString(),
      fmt(ps.avgDistance),
      fmt(ps.avgSprint),
      fmt(ps.avgHsr),
      fmt(ps.avgLoad, 1),
      `${fmt(ps.avgMaxVel, 1)} km/h`,
      ps.totalMinutes > 0 ? `${ps.totalMinutes}'` : "—",
    ];

    cx = MARGIN + 2;
    values.forEach((val, vi) => {
      const isName = vi === 0;
      const isHighlight = vi === 7 && ps.totalMinutes >= 80;
      doc.setFont("helvetica", isName ? "bold" : "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(
        isHighlight ? 240 : isName ? 240 : 180,
        isHighlight ? 200 : isName ? 240 : 180,
        isHighlight ? 0 : isName ? 240 : 180
      );
      doc.text(val, cx, y + 5.5);
      cx += cols[vi].w;
    });
    y += 8;
  });

  // ── Footer
  y += 6;
  if (y < 270) {
    doc.setDrawColor(60, 60, 60);
    doc.line(MARGIN, y, W - MARGIN, y);
    y += 5;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text("Datos extraídos de Catapult OpenField y registro de minutos — PerformancePitch", MARGIN, y);
    doc.text(`Página 1`, W - MARGIN, y, { align: "right" });
  }

  doc.save(`Informe_Rendimiento_${monthLabel.replace(" ", "_")}.pdf`);
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MonthlyReport() {
  const [catapult, setCatapult] = useState([]);
  const [minutes, setMinutes] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Selected month/year
  const [month, setMonth] = useState(moment().format("MM"));
  const [year, setYear] = useState(moment().format("YYYY"));

  useEffect(() => {
    async function load() {
      const [c, m, s] = await Promise.all([
        base44.entities.CatapultReport.list("date", 2000),
        base44.entities.MinutesRecord.list("match_date", 1000),
        base44.entities.TrainingSession.list("date", 500),
      ]);
      setCatapult(c);
      setMinutes(m);
      setSessions(s);
      setLoading(false);
    }
    load();
  }, []);

  // ── Compute stats for selected month
  const monthStr = `${year}-${month}`;

  const monthCatapult = catapult.filter((r) => r.date?.startsWith(monthStr));
  const monthMinutes = minutes.filter((r) => r.match_date?.startsWith(monthStr));
  const monthSessions = sessions.filter((s) => s.date?.startsWith(monthStr));

  // Group catapult by player
  const catByPlayer = {};
  monthCatapult.forEach((r) => {
    if (!r.player_name) return;
    if (!catByPlayer[r.player_name]) catByPlayer[r.player_name] = [];
    catByPlayer[r.player_name].push(r);
  });

  // Group minutes by player
  const minByPlayer = {};
  monthMinutes.forEach((r) => {
    if (!r.player_name) return;
    minByPlayer[r.player_name] = (minByPlayer[r.player_name] || 0) + (r.minutes || 0);
  });

  // Build player stats
  const allNames = [...new Set([...Object.keys(catByPlayer), ...Object.keys(minByPlayer)])].sort();

  const playerStats = allNames.map((name) => {
    const recs = catByPlayer[name] || [];
    return {
      name,
      sessions: recs.length,
      avgDistance: avg(recs, "total_distance"),
      avgSprint: avg(recs, "sprint_distance"),
      avgHsr: avg(recs, "distance_hsr"),
      avgLoad: avg(recs, "player_load"),
      avgMaxVel: avg(recs, "max_velocity"),
      totalMinutes: minByPlayer[name] || 0,
    };
  }).sort((a, b) => b.avgDistance - a.avgDistance);

  async function handleExport() {
    if (playerStats.length === 0) return;
    setGenerating(true);
    await generatePDF(month, year, playerStats, monthSessions.length);
    setGenerating(false);
  }

  // Month options
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1).padStart(2, "0"),
    label: moment(`2024-${String(i + 1).padStart(2, "0")}-01`).format("MMMM"),
  }));
  const yearOptions = ["2024", "2025", "2026"];

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none capitalize"
          >
            {monthOptions.map((m) => (
              <option key={m.value} value={m.value} className="capitalize">{m.label}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none"
          >
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <button
          onClick={handleExport}
          disabled={generating || playerStats.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-zinc-900 font-semibold rounded-lg text-sm transition-colors"
        >
          {generating ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
          {generating ? "Generando PDF..." : "Exportar PDF"}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: BarChart2, label: "Jugadores en el mes", value: playerStats.length, color: "text-blue-400" },
          { icon: Clock, label: "Sesiones GPS", value: monthSessions.length, color: "text-purple-400" },
          { icon: Zap, label: "Dist. prom. total", value: playerStats.length > 0 ? `${fmt(avg(playerStats.map(p => ({ v: p.avgDistance })), "v"))} m` : "—", color: "text-green-400" },
          { icon: Zap, label: "Vel. máx. prom.", value: playerStats.length > 0 ? `${fmt(avg(playerStats.map(p => ({ v: p.avgMaxVel })), "v"), 1)} km/h` : "—", color: "text-yellow-400" },
        ].map((s) => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <s.icon size={16} className={`${s.color} mb-2`} />
            <p className="text-xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Preview table */}
      {playerStats.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <BarChart2 size={36} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">Sin datos para {moment(`${year}-${month}-01`).format("MMMM YYYY")}</p>
          <p className="text-zinc-600 text-xs mt-1">Importá datos GPS de Catapult o registrá minutos jugados</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <p className="text-sm font-semibold text-white">
              Vista previa — {moment(`${year}-${month}-01`).format("MMMM YYYY")}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">{playerStats.length} jugadores · valores promedio del período</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-zinc-800/50 text-zinc-400 border-b border-zinc-800">
                  <th className="px-4 py-2.5 text-left font-semibold">Jugador</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Ses.</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Dist. prom (m)</th>
                  <th className="px-3 py-2.5 text-right font-semibold">+25km/h (m)</th>
                  <th className="px-3 py-2.5 text-right font-semibold">19.8-25 (m)</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Player Load</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Vel. Máx</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Min jugados</th>
                </tr>
              </thead>
              <tbody>
                {playerStats.map((ps, i) => (
                  <tr key={ps.name} className={`border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors ${i % 2 === 0 ? "" : "bg-zinc-900/40"}`}>
                    <td className="px-4 py-2.5 text-white font-medium">{ps.name}</td>
                    <td className="px-3 py-2.5 text-right text-zinc-400">{ps.sessions}</td>
                    <td className="px-3 py-2.5 text-right text-zinc-300">{fmt(ps.avgDistance)}</td>
                    <td className="px-3 py-2.5 text-right text-zinc-300">{fmt(ps.avgSprint)}</td>
                    <td className="px-3 py-2.5 text-right text-zinc-300">{fmt(ps.avgHsr)}</td>
                    <td className="px-3 py-2.5 text-right text-zinc-300">{fmt(ps.avgLoad, 1)}</td>
                    <td className="px-3 py-2.5 text-right text-zinc-300">{ps.avgMaxVel > 0 ? `${fmt(ps.avgMaxVel, 1)} km/h` : "—"}</td>
                    <td className={`px-3 py-2.5 text-right font-bold ${ps.totalMinutes > 0 ? "text-yellow-400" : "text-zinc-600"}`}>
                      {ps.totalMinutes > 0 ? `${ps.totalMinutes}'` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
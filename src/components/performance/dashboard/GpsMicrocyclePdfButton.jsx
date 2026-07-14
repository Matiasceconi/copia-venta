import React, { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { MICRO_METRICS } from "./gpsMicrocycleReportUtils";
import { generateMicrocyclePdf } from "./gpsMicrocyclePdfRenderer";

const DEFAULT_OPTIONS = {
  period: "selected",
  includeCover: true,
  includeCycleDays: true,
  includePlayerTable: true,
  includeCharts: true,
  includeRankings: true,
  includeHighlightedPlayers: true,
  includeWeeklyComparison: true,
  includeConclusions: false,
  metricKeys: [],
};

export default function GpsMicrocyclePdfButton({ squadName, season, dailySummaries, highlights, comparison, cycleDays, selectedDates = [], visibleMetrics = MICRO_METRICS, chartMetrics = [], chartConfig, rankingConfig, matchContext, cycleRows = [] }) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const effectiveMetricKeys = options.metricKeys?.length ? options.metricKeys : (chartMetrics.length ? chartMetrics : visibleMetrics).map((metric) => metric.key);
  const selectedMetricObjects = useMemo(() => effectiveMetricKeys.map((key) => MICRO_METRICS.find((metric) => metric.key === key)).filter(Boolean), [effectiveMetricKeys]);
  const exportDays = useMemo(() => options.period === "selected" && selectedDates.length ? (dailySummaries || []).filter((day) => selectedDates.includes(day.date)) : dailySummaries || [], [options.period, selectedDates, dailySummaries]);

  async function buildAiText() {
    if (!options.includeConclusions) return "";
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Redacta conclusiones profesionales, breves y accionables para un informe de rendimiento de fútbol. Usa español técnico y claro. Datos: ${JSON.stringify({ dailySummaries: exportDays, highlights, comparison }).slice(0, 12000)}`,
    });
    return typeof res === "string" ? res : String(res || "");
  }

  async function exportPdf() {
    setExporting(true);
    try {
      const aiText = await buildAiText();
      await generateMicrocyclePdf({ squadName, season, dailySummaries: exportDays, highlights, comparison, metrics: selectedMetricObjects, cycleDays, selectedDates, rankingConfig, chartConfig, matchContext, cycleRows, options, aiText });
      setOpen(false);
    } finally { setExporting(false); }
  }

  function toggleMetric(key) {
    setOptions((current) => {
      const currentKeys = current.metricKeys?.length ? current.metricKeys : effectiveMetricKeys;
      return { ...current, metricKeys: currentKeys.includes(key) ? currentKeys.filter((item) => item !== key) : [...currentKeys, key] };
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} disabled={exporting} className="inline-flex items-center gap-2 px-4 py-2 bg-lime-500 hover:bg-lime-400 disabled:bg-zinc-700 text-zinc-950 rounded-xl text-sm font-bold transition-colors"><Download size={16} /> {exporting ? "Generando..." : "Exportar"}</button>
      {open && <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"><div className="w-full max-w-4xl max-h-[86vh] overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-2xl"><h3 className="text-white text-lg font-bold">Opciones de exportación</h3><p className="text-zinc-400 text-sm mt-1">Informe PDF profesional sin capturas de pantalla.</p><div className="grid gap-5 mt-5 lg:grid-cols-[1fr_280px]"><div className="space-y-5"><div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"><p className="mb-3 text-xs font-black uppercase tracking-wider text-zinc-500">Período</p><select value={options.period} onChange={(e) => setOptions((p) => ({ ...p, period: e.target.value }))} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"><option value="selected">Días seleccionados</option><option value="full">Microciclo completo</option></select></div><div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"><p className="mb-3 text-xs font-black uppercase tracking-wider text-zinc-500">Secciones</p><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{[["includeCover", "Incluir portada"], ["includeCycleDays", "Incluir días del microciclo"], ["includePlayerTable", "Incluir tabla acumulada de jugadores"], ["includeCharts", "Incluir gráficos"], ["includeRankings", "Incluir rankings"], ["includeHighlightedPlayers", "Incluir jugadores destacados"], ["includeWeeklyComparison", "Comparación con la semana anterior"], ["includeConclusions", "Incluir conclusiones"]].map(([key, label]) => <label key={key} className="flex items-center gap-3 text-zinc-200 text-sm"><input type="checkbox" checked={options[key]} onChange={(e) => setOptions((p) => ({ ...p, [key]: e.target.checked }))} className="w-4 h-4 accent-emerald-600" />{label}</label>)}</div></div><div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"><p className="mb-3 text-xs font-black uppercase tracking-wider text-zinc-500">Métricas</p><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{visibleMetrics.map((metric) => <label key={metric.key} className="flex items-center gap-3 rounded-xl bg-zinc-950 px-3 py-2 text-sm text-zinc-200"><input type="checkbox" checked={effectiveMetricKeys.includes(metric.key)} onChange={() => toggleMetric(metric.key)} className="h-4 w-4 accent-emerald-500" /><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: metric.color }} />{metric.label}</label>)}</div></div></div><div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"><p className="mb-3 text-xs font-black uppercase tracking-wider text-zinc-500">Rankings</p><p className="text-sm text-zinc-300">Se exportan los rankings seleccionados en “Personalizar rankings”.</p><p className="mt-2 text-xs text-zinc-500">Top {rankingConfig?.topCount || 3} · {rankingConfig?.scope === "selected" ? "Días seleccionados" : "Microciclo completo"}</p>{preview && <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400"><p className="font-bold text-white">Vista previa</p><p>Días: {exportDays.length}</p><p>Métricas: {selectedMetricObjects.map((m) => m.short || m.label).join(", ") || "—"}</p><p>Partido: {matchContext?.rival ? `vs. ${matchContext.rival}` : "Sin partido detectado"}</p></div>}</div></div><div className="flex justify-end gap-2 mt-6"><button onClick={() => setPreview((v) => !v)} className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white text-sm">Vista previa</button><button onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-sm">Cancelar</button><button onClick={exportPdf} disabled={exporting} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 text-white text-sm font-bold">{exporting ? "Generando..." : "Generar PDF"}</button></div></div></div>}
    </>
  );
}
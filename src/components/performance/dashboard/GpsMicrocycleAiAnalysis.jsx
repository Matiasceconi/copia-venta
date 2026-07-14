import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Brain, Send, X } from "lucide-react";
import { fmt, MICRO_METRICS } from "./gpsMicrocycleReportUtils";

const EXAMPLES = ["¿Cuál fue el día de mayor carga mecánica?", "¿Qué día tuvo mayor volumen?", "¿Qué jugadores acumularon más Player Load?", "¿Qué diferencias hubo respecto de la semana anterior?", "¿El microciclo respetó el modelo esperado?"];

function buildPayload({ dailySummaries = [], highlights = [], comparison = [] }) {
  const safeDays = Array.isArray(dailySummaries) ? dailySummaries : [];
  const safeHighlights = Array.isArray(highlights) ? highlights : [];
  const safeComparison = Array.isArray(comparison) ? comparison : [];

  return {
    days: safeDays.map((d) => {
      const sessions = Array.isArray(d.sessions) ? d.sessions : [];
      const excludedRows = Array.isArray(d.excludedRows) ? d.excludedRows : [];
      return {
        date: d.date,
        md: d.md,
        sessions: sessions.map((s) => typeof s === "string" ? s : s?.title).filter(Boolean),
        gpsPlayers: d.gpsPlayers ?? d.players ?? 0,
        excludedPlayers: excludedRows.map((r) => ({ name: r.player_name, group: r.gps_group || r.exclusion_reason || "excluido" })),
        metrics: Object.fromEntries(MICRO_METRICS.map((m) => [m.key, fmt(d[m.key] ?? d.metrics?.[m.key]?.value, m.unit)])),
      };
    }),
    rankings: safeHighlights.map((h) => ({
      metric: h.metric?.label || h.label || "Métrica",
      top3: (h.top || h.top3 || []).map((p) => ({ player: p.name, position: p.player?.position, value: fmt(p.value, h.metric?.unit) })),
    })),
    comparison: safeComparison.map((c) => ({
      metric: c.metric?.label || c.label || "Métrica",
      current: fmt(c.current, c.metric?.unit),
      previous: fmt(c.previous, c.metric?.unit),
      diff: c.diff == null ? null : `${Number(c.diff).toFixed(0)}%`,
      trend: c.trend,
    })),
  };
}

export default function GpsMicrocycleAiAnalysis({ dailySummaries, highlights, comparison }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const payload = useMemo(() => buildPayload({ dailySummaries, highlights, comparison }), [dailySummaries, highlights, comparison]);

  async function ask(q = question) {
    if (!q.trim()) return;
    const userMsg = { role: "user", content: q.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion(""); setLoading(true);
    try {
      const answer = await base44.integrations.Core.InvokeLLM({ prompt: `Respondé como asistente de carga externa para fútbol. Usá únicamente estos datos reales, no inventes datos ni nombres. Si no hay datos suficientes, decilo claramente. Pregunta: ${q}. Datos JSON: ${JSON.stringify(payload)}` });
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch { setMessages((prev) => [...prev, { role: "assistant", content: "No pude consultar la IA en este momento." }]); }
    setLoading(false);
  }

  return <><button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold"><Brain size={16} />Consultar IA</button>{open && <div className="fixed inset-0 z-50 bg-black/70 flex items-end lg:items-center justify-center p-4"><div className="w-full max-w-3xl max-h-[85vh] bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl"><div className="flex items-center justify-between p-4 border-b border-zinc-800"><div><h3 className="text-white font-bold">Asistente inteligente del microciclo</h3><p className="text-xs text-zinc-500">Responde únicamente con datos cargados.</p></div><button onClick={() => setOpen(false)} className="p-2 text-zinc-400 hover:text-white"><X size={18} /></button></div><div className="p-4 space-y-3 overflow-y-auto max-h-[55vh]"><div className="flex flex-wrap gap-2">{EXAMPLES.map((e) => <button key={e} onClick={() => ask(e)} className="px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:text-white">{e}</button>)}</div>{messages.map((m, i) => <div key={i} className={m.role === "user" ? "text-right" : "text-left"}><div className={`inline-block max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-line ${m.role === "user" ? "bg-emerald-600 text-white" : "bg-zinc-900 text-zinc-200 border border-zinc-800"}`}>{m.content}</div></div>)}{loading && <p className="text-zinc-500 text-sm">Analizando datos reales...</p>}</div><div className="p-4 border-t border-zinc-800 flex gap-2"><input value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()} placeholder="Preguntá sobre la carga semanal..." className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" /><button onClick={() => ask()} disabled={loading} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 text-white rounded-xl"><Send size={16} /></button></div></div></div>}</>;
}
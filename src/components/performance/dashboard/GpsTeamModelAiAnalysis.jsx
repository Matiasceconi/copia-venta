import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { BrainCircuit } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function GpsTeamModelAiAnalysis({ microcycle, competition, evolution, positionLabel, onAnalysisReady }) {
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function run() {
      if (!microcycle.some((d) => d.sessions_count > 0)) { setAnalysis("No hay datos suficientes para generar análisis."); return; }
      setLoading(true);
      const payload = { positionLabel, microcycle, competition, evolution: evolution.summary };
      try {
        const res = await base44.integrations.Core.InvokeLLM({
          prompt: `Actuá como preparador físico de fútbol profesional. Usá únicamente estos datos reales JSON, no inventes datos: ${JSON.stringify(payload)}. Generá un análisis breve del Modelo de Rendimiento: mayor volumen, mayor intensidad, carga mecánica, ACC, DEC, alta velocidad, cercanía a competencia, progresión del microciclo, descarga pre partido y variables que suben o bajan. Español profesional, 2 párrafos y 4 bullets accionables.`,
        });
        const text = res || "Sin análisis disponible.";
        setAnalysis(text);
        onAnalysisReady?.(text);
      } catch { const text = "No se pudo generar el análisis inteligente con los datos actuales."; setAnalysis(text); onAnalysisReady?.(text); }
      setLoading(false);
    }
    run();
  }, [microcycle, competition, evolution, positionLabel]);

  return <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5"><div className="flex items-center gap-2 mb-3"><BrainCircuit className="text-emerald-400" size={20} /><h3 className="text-white font-bold">Análisis Inteligente del Modelo</h3></div>{loading ? <p className="text-zinc-400 text-sm">Analizando datos reales...</p> : <ReactMarkdown className="prose prose-invert prose-sm max-w-none text-zinc-300">{analysis}</ReactMarkdown>}</div>;
}
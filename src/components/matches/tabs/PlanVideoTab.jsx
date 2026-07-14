import React, { useEffect, useMemo, useState } from "react";
import { ExternalLink, Film, Save, Trash2 } from "lucide-react";

import { base44 } from "@/api/base44Client";
import MatchPlanPdfPanel from "@/components/matches/MatchPlanPdfPanel";
import MatchVideoPanel from "@/components/matches/MatchVideoPanel";
import { useToast } from "@/components/ui/use-toast";

function getYoutubeEmbedId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|v=|\/v\/|embed\/)([A-Za-z0-9_-]{11})/);
  return match?.[1] || null;
}

function ExtraVideoCard({ title, description, value, onChange, onRemove }) {
  const embedId = getYoutubeEmbedId(value);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
      <div className="border-b border-zinc-800 px-4 py-3">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="mt-1 text-xs text-zinc-500">{description}</p>
      </div>
      <div className="space-y-3 p-4">
        <input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none transition focus:border-yellow-500" />
        {embedId ? (
          <div className="relative overflow-hidden rounded-xl border border-zinc-700" style={{ paddingBottom: "56.25%" }}>
            <iframe className="absolute inset-0 h-full w-full" src={`https://www.youtube.com/embed/${embedId}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
        ) : value ? (
          <a href={value} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-red-400 underline-offset-4 hover:text-red-300 hover:underline"><ExternalLink size={14} /> Abrir video</a>
        ) : null}
        <div className="flex justify-end">
          <button onClick={onRemove} className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 transition hover:border-red-500/40 hover:text-red-400"><Trash2 size={13} /> Quitar</button>
        </div>
      </div>
    </div>
  );
}

export default function PlanVideoTab({ match, onMatchUpdated, onRegisterSave }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    video_analysis_url: match.video_analysis_url || "",
    video_set_pieces_url: match.video_set_pieces_url || "",
    video_extra_url: match.video_extra_url || "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      video_analysis_url: match.video_analysis_url || "",
      video_set_pieces_url: match.video_set_pieces_url || "",
      video_extra_url: match.video_extra_url || "",
    });
  }, [match.video_analysis_url, match.video_extra_url, match.video_set_pieces_url, match.id]);

  const dirty = useMemo(() => (
    form.video_analysis_url !== (match.video_analysis_url || "") ||
    form.video_set_pieces_url !== (match.video_set_pieces_url || "") ||
    form.video_extra_url !== (match.video_extra_url || "")
  ), [form, match.video_analysis_url, match.video_extra_url, match.video_set_pieces_url]);

  async function saveExtras() {
    setSaving(true);
    try {
      const patch = {
        video_analysis_url: form.video_analysis_url || null,
        video_set_pieces_url: form.video_set_pieces_url || null,
        video_extra_url: form.video_extra_url || null,
      };
      await base44.entities.MatchReport.update(match.id, patch);
      onMatchUpdated?.(patch);
      toast({ title: "Videos complementarios guardados" });
    } catch {
      toast({ title: "No se pudieron guardar los videos", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    onRegisterSave?.({ action: saveExtras, disabled: !dirty || saving, pending: dirty, label: "plan y video" });
  }, [dirty, onRegisterSave, saving, form]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Film size={16} className="text-red-400" /> Plan y video</h2>
            <p className="mt-1 text-xs text-zinc-500">Gestioná el video del partido, análisis, pelota parada, extra y el PDF del plan.</p>
          </div>
          <button onClick={saveExtras} disabled={!dirty || saving} className="rounded-lg bg-yellow-500 px-3 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"><Save size={13} className="mr-1 inline" /> {saving ? "Guardando..." : "Guardar videos extra"}</button>
        </div>
      </div>

      <MatchVideoPanel match={match} onVideoSaved={(url) => onMatchUpdated?.({ match_video_url: url })} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ExtraVideoCard title="Video de análisis" description="Link de análisis general del rival o del propio partido." value={form.video_analysis_url} onChange={(value) => setForm((current) => ({ ...current, video_analysis_url: value }))} onRemove={() => setForm((current) => ({ ...current, video_analysis_url: "" }))} />
        <ExtraVideoCard title="Pelota parada" description="Video específico de acciones a balón detenido." value={form.video_set_pieces_url} onChange={(value) => setForm((current) => ({ ...current, video_set_pieces_url: value }))} onRemove={() => setForm((current) => ({ ...current, video_set_pieces_url: "" }))} />
        <ExtraVideoCard title="Video extra" description="Cualquier otro enlace complementario del staff." value={form.video_extra_url} onChange={(value) => setForm((current) => ({ ...current, video_extra_url: value }))} onRemove={() => setForm((current) => ({ ...current, video_extra_url: "" }))} />
      </div>

      <MatchPlanPdfPanel match={match} onPdfSaved={(url, label) => onMatchUpdated?.({ match_plan_pdf_url: url, match_plan_pdf_label: label })} />
    </div>
  );
}

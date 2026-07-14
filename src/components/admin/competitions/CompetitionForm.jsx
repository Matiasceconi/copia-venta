import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { normalizeCompetitionName } from "@/lib/competitions";

const EMPTY = { name: "", short_name: "", category: "", organizer: "", competition_type: "torneo", season_id: "", squad_id: "", country: "Argentina", division: "", age_category: "", official: true, active: true, color: "#F0C800", logo: "", description: "" };

export default function CompetitionForm({ competition, squads, onCancel, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [uploading, setUploading] = useState(false);
  useEffect(() => setForm(competition || EMPTY), [competition]);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  async function uploadLogo(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set("logo", file_url);
    setUploading(false);
  }

  async function save() {
    const now = new Date().toISOString();
    const payload = { ...form, normalized_name: normalizeCompetitionName(form.name), updated_at: now, created_at: form.created_at || now };
    if (competition?.id) await base44.entities.Competitions.update(competition.id, payload);
    else await base44.entities.Competitions.create(payload);
    onSaved?.();
  }

  return <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 space-y-3">
    <p className="text-white font-semibold">{competition?.id ? "Editar competencia" : "Nueva competencia"}</p>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <input className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="Nombre oficial" value={form.name || ""} onChange={(e) => set("name", e.target.value)} />
      <input className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="Nombre corto" value={form.short_name || ""} onChange={(e) => set("short_name", e.target.value)} />
      <select className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" value={form.competition_type || "torneo"} onChange={(e) => set("competition_type", e.target.value)}><option value="torneo">Torneo</option><option value="liga">Liga</option><option value="copa">Copa</option><option value="juveniles">Juveniles</option><option value="amistoso">Amistoso</option><option value="otro">Otro</option></select>
      <input type="color" className="h-10 bg-zinc-800 border border-zinc-700 rounded-lg px-2" value={form.color || "#F0C800"} onChange={(e) => set("color", e.target.value)} />
      <input className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="Temporada" value={form.season_id || ""} onChange={(e) => set("season_id", e.target.value)} />
      <select className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" value={form.squad_id || ""} onChange={(e) => set("squad_id", e.target.value)}><option value="">Todos los planteles</option>{squads.map((squad) => <option key={squad.id} value={squad.id}>{squad.name}</option>)}</select>
      <input className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="Categoría" value={form.category || ""} onChange={(e) => set("category", e.target.value)} />
      <input className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="Organizador" value={form.organizer || ""} onChange={(e) => set("organizer", e.target.value)} />
      <input className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="División" value={form.division || ""} onChange={(e) => set("division", e.target.value)} />
      <input className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="Categoría de edad" value={form.age_category || ""} onChange={(e) => set("age_category", e.target.value)} />
      <input className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white md:col-span-2" placeholder="URL del logo" value={form.logo || ""} onChange={(e) => set("logo", e.target.value)} />
      <label className="text-xs text-zinc-400 md:col-span-2"><input type="file" accept="image/*" onChange={uploadLogo} className="hidden" /> <span className="cursor-pointer text-yellow-300">{uploading ? "Subiendo logo..." : "Cargar logo desde archivo"}</span></label>
    </div>
    <textarea className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="Descripción" value={form.description || ""} onChange={(e) => set("description", e.target.value)} />
    <div className="flex flex-wrap gap-4 text-sm text-zinc-300"><label><input type="checkbox" checked={!!form.official} onChange={(e) => set("official", e.target.checked)} /> Oficial</label><label><input type="checkbox" checked={!!form.active} onChange={(e) => set("active", e.target.checked)} /> Activa</label></div>
    <div className="flex justify-end gap-2"><button onClick={onCancel} className="px-3 py-2 text-sm text-zinc-400">Cancelar</button><button onClick={save} disabled={!form.name} className="px-4 py-2 rounded-lg bg-yellow-500 text-zinc-950 text-sm font-semibold disabled:opacity-40">Guardar</button></div>
  </div>;
}
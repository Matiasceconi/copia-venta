import React, { useMemo, useState } from "react";
import { Edit2, Plus, Search, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { normalizeClubText } from "@/lib/rivalClubs";

const EMPTY = { official_name: "", short_name: "", shield_url: "", country: "", region: "", usual_competition: "", stadium: "", aliases_text: "", primary_colors_text: "", active: true };

export default function ClubSettingsPanel({ clubs = [], matches = [], onReload }) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [uploading, setUploading] = useState(false);
  const filtered = useMemo(() => clubs.filter((club) => !query || normalizeClubText([club.official_name, club.short_name, ...(club.aliases || [])].join(" ")).includes(normalizeClubText(query))), [clubs, query]);
  const usedClubIds = useMemo(() => new Set(matches.map((m) => m.rival_club_id).filter(Boolean)), [matches]);

  function openForm(club = null) {
    setEditing(club || {});
    setForm(club ? { ...EMPTY, ...club, aliases_text: (club.aliases || []).join(", "), primary_colors_text: (club.primary_colors || []).join(", ") } : { ...EMPTY });
  }

  async function uploadShield(file) {
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((current) => ({ ...current, shield_url: file_url }));
    setUploading(false);
  }

  async function saveClub() {
    const payload = {
      ...form,
      normalized_name: normalizeClubText(form.official_name),
      aliases: form.aliases_text.split(",").map((v) => v.trim()).filter(Boolean),
      primary_colors: form.primary_colors_text.split(",").map((v) => v.trim()).filter(Boolean),
      updated_at: new Date().toISOString(),
    };
    delete payload.aliases_text;
    delete payload.primary_colors_text;
    if (editing?.id) await base44.entities.RivalClub.update(editing.id, payload);
    else await base44.entities.RivalClub.create({ ...payload, created_at: new Date().toISOString() });
    setEditing(null);
    setForm(EMPTY);
    onReload?.();
  }

  async function deactivateClub(club) {
    await base44.entities.RivalClub.update(club.id, { active: false, updated_at: new Date().toISOString() });
    onReload?.();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="relative md:w-80"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar clubes" className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-9 pr-3 text-sm text-white" /></div>
        <button onClick={() => openForm()} className="inline-flex items-center gap-2 rounded-lg bg-yellow-500 px-3 py-2 text-sm font-semibold text-zinc-950"><Plus size={14} /> Crear club</button>
      </div>
      {(editing !== null || form !== EMPTY) && <div className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-700 bg-zinc-950 p-4 md:grid-cols-2">
        <input className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white" placeholder="Nombre oficial" value={form.official_name} onChange={(e) => setForm({ ...form, official_name: e.target.value })} />
        <input className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white" placeholder="Nombre corto" value={form.short_name} onChange={(e) => setForm({ ...form, short_name: e.target.value })} />
        <input className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white" placeholder="País" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
        <input className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white" placeholder="Provincia o región" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
        <input className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white" placeholder="Competencia habitual" value={form.usual_competition} onChange={(e) => setForm({ ...form, usual_competition: e.target.value })} />
        <input className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white" placeholder="Estadio" value={form.stadium} onChange={(e) => setForm({ ...form, stadium: e.target.value })} />
        <input className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white md:col-span-2" placeholder="Alias separados por coma" value={form.aliases_text} onChange={(e) => setForm({ ...form, aliases_text: e.target.value })} />
        <input className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white md:col-span-2" placeholder="Colores principales separados por coma" value={form.primary_colors_text} onChange={(e) => setForm({ ...form, primary_colors_text: e.target.value })} />
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-300"><Upload size={13} /> {uploading ? "Subiendo..." : "Reemplazar escudo"}<input type="file" accept="image/*" className="hidden" onChange={(e) => uploadShield(e.target.files?.[0])} /></label>
        {form.shield_url && <img src={form.shield_url} alt="Escudo" className="h-12 w-12 object-contain" />}
        <div className="flex justify-end gap-2 md:col-span-2"><button onClick={() => { setEditing(null); setForm(EMPTY); }} className="px-3 py-2 text-sm text-zinc-400">Cancelar</button><button onClick={saveClub} disabled={!form.official_name} className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50">Guardar club</button></div>
      </div>}
      <div className="space-y-2">{filtered.map((club) => <div key={club.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2"><div className="h-10 w-10 rounded bg-zinc-900 flex items-center justify-center">{club.shield_url ? <img src={club.shield_url} alt={club.official_name} className="h-9 w-9 object-contain" /> : <span className="text-zinc-500">{club.official_name?.[0]}</span>}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{club.official_name}</p><p className="truncate text-xs text-zinc-500">{club.short_name || "Sin nombre corto"}{club.active === false ? " · Inactivo" : ""}</p></div><button onClick={() => openForm(club)} className="p-2 text-zinc-400 hover:text-white"><Edit2 size={14} /></button><button onClick={() => deactivateClub(club)} disabled={club.active === false} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 disabled:opacity-40">{usedClubIds.has(club.id) ? "Desactivar" : "Desactivar"}</button></div>)}</div>
    </div>
  );
}
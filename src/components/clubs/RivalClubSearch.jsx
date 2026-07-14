import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { clubDisplayName, clubMatchesQuery, findSimilarClubs, normalizeClubText, patchFromClub } from "@/lib/rivalClubs";

export default function RivalClubSearch({ clubs = [], value = "", selectedClubId = "", onSelect, onCreated, label = "Rival" }) {
  const [query, setQuery] = useState(value || "");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(!selectedClubId);
  const [newClub, setNewClub] = useState({ official_name: "", short_name: "", shield_url: "" });
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);
  const selected = clubs.find((club) => club.id === selectedClubId);
  const results = useMemo(() => (editing && query ? clubs.filter((club) => club.active !== false && clubMatchesQuery(club, query)).slice(0, 8) : []), [clubs, editing, query]);
  const similar = useMemo(() => findSimilarClubs(clubs, newClub.official_name), [clubs, newClub.official_name]);

  useEffect(() => {
    if (selected) {
      setQuery(clubDisplayName(selected));
      setEditing(false);
    }
  }, [selectedClubId]);

  function choose(club) {
    setQuery(clubDisplayName(club));
    setEditing(false);
    inputRef.current?.blur();
    onSelect?.(club, patchFromClub(club));
  }

  function changeRival() {
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function uploadShield(file) {
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setNewClub((current) => ({ ...current, shield_url: file_url }));
    setUploading(false);
  }

  async function createClub() {
    if (!newClub.official_name.trim()) return;
    const now = new Date().toISOString();
    const club = await base44.entities.RivalClub.create({
      ...newClub,
      normalized_name: normalizeClubText(newClub.official_name),
      active: true,
      aliases: [],
      primary_colors: [],
      created_at: now,
      updated_at: now,
    });
    onCreated?.(club);
    choose(club);
    setCreating(false);
    setNewClub({ official_name: "", short_name: "", shield_url: "" });
  }

  return (
    <div className="space-y-2">
      <label className="text-xs text-zinc-400 mb-1 block">{label}</label>
      {selected && !editing ? (
        <div className="flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200">
          <span className="flex h-8 w-8 items-center justify-center rounded bg-zinc-950">{selected.shield_url ? <img src={selected.shield_url} alt={selected.official_name} className="h-7 w-7 object-contain" /> : <span className="text-xs text-zinc-500">{selected.official_name?.[0]}</span>}</span>
          <span className="min-w-0 flex-1 truncate font-medium">{selected.official_name}</span>
          <button type="button" onClick={changeRival} className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-yellow-300 hover:bg-zinc-800">Cambiar</button>
        </div>
      ) : (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input ref={inputRef} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2 pl-9 pr-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500" placeholder="Buscar club..." value={query} onChange={(e) => { setQuery(e.target.value); setEditing(true); }} onFocus={() => setEditing(true)} />
        </div>
      )}
      {editing && (results.length > 0 || query) && <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
        {results.map((club) => <button key={club.id} type="button" onClick={() => choose(club)} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-zinc-900"><span className="flex h-8 w-8 items-center justify-center rounded bg-zinc-900">{club.shield_url ? <img src={club.shield_url} alt={club.official_name} className="h-7 w-7 object-contain" /> : <span className="text-xs text-zinc-500">{club.official_name?.[0]}</span>}</span><span className="min-w-0"><span className="block truncate text-sm text-white">{club.official_name}</span><span className="block truncate text-xs text-zinc-500">{club.short_name || "Sin nombre corto"}</span></span></button>)}
        <button type="button" onClick={() => { setCreating(true); setNewClub((c) => ({ ...c, official_name: query })); }} className="flex w-full items-center gap-2 border-t border-zinc-800 px-3 py-2 text-left text-sm text-yellow-300 hover:bg-zinc-900"><Plus size={14} /> Crear nuevo club</button>
      </div>}
      {creating && <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 space-y-2">
        <p className="text-xs font-semibold text-yellow-300">Crear club rápido</p>
        {similar.length > 0 && <p className="text-xs text-orange-300">Puede que este club ya exista: {similar.map((club) => club.short_name || club.official_name).join(", ")}</p>}
        <input className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white" placeholder="Nombre del club" value={newClub.official_name} onChange={(e) => setNewClub({ ...newClub, official_name: e.target.value })} />
        <input className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white" placeholder="Nombre corto opcional" value={newClub.short_name} onChange={(e) => setNewClub({ ...newClub, short_name: e.target.value })} />
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"><Upload size={13} /> {uploading ? "Subiendo..." : "Cargar escudo"}<input type="file" accept="image/*" className="hidden" onChange={(e) => uploadShield(e.target.files?.[0])} /></label>
        {newClub.shield_url && <img src={newClub.shield_url} alt="Escudo" className="h-12 w-12 object-contain" />}
        <div className="flex justify-end gap-2"><button type="button" onClick={() => setCreating(false)} className="px-3 py-1.5 text-xs text-zinc-400">Cancelar</button><button type="button" onClick={createClub} className="rounded-lg bg-yellow-500 px-3 py-1.5 text-xs font-semibold text-zinc-950">Guardar y seleccionar</button></div>
      </div>}
    </div>
  );
}
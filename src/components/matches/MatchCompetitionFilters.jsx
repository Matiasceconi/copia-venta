import React, { useState } from "react";
import { Plus, X } from "lucide-react";

export default function MatchCompetitionFilters({ options, selected, onSelect, onAdd, onRename, onDelete }) {
  const [newTag, setNewTag] = useState("");

  function addTag() {
    const value = newTag.trim();
    if (!value) return;
    onAdd(value);
    setNewTag("");
  }

  return (
    <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-3 space-y-3">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => onSelect("")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${!selected ? "bg-white text-zinc-900 border-white" : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white"}`}>Todos</button>
        {options.map((tag) => (
          <button key={tag} onClick={() => onSelect(tag)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${selected === tag ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/40" : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white"}`}>{tag}</button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
        {options.map((tag) => (
          <div key={tag} className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1.5">
            <input defaultValue={tag} onBlur={(e) => onRename(tag, e.target.value)} className="flex-1 bg-transparent text-xs text-white focus:outline-none" />
            <button onClick={() => onDelete(tag)} className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"><X size={12} /></button>
          </div>
        ))}
        <div className="flex items-center gap-2 bg-zinc-900 border border-dashed border-zinc-700 rounded-xl px-2 py-1.5">
          <input value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addTag(); }} placeholder="Nueva etiqueta de torneo" className="flex-1 bg-transparent text-xs text-white placeholder-zinc-600 focus:outline-none" />
          <button onClick={addTag} className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"><Plus size={12} /></button>
        </div>
      </div>
    </div>
  );
}
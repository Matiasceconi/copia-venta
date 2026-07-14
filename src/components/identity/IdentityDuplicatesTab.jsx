import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Search, CheckCircle2, GitMerge, AlertTriangle } from "lucide-react";

export default function IdentityDuplicatesTab({ players, onPlayersChanged, toast, reload }) {
  const [duplicates, setDuplicates] = useState(null);
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState(null);

  async function detect() {
    setLoading(true);
    const res = await base44.functions.invoke("resolvePlayerNames", { action: "detect_duplicates" });
    setDuplicates(res.data.duplicates || []);
    setLoading(false);
  }

  async function handleMerge(keepId, discardId, keepName) {
    if (!confirm(`¿Fusionar jugadores?\n\nSe conservará: "${keepName}"\nSe eliminará el duplicado y todos sus datos (GPS, minutos, lesiones) se moverán al jugador conservado.`)) return;
    setMerging(discardId);
    const res = await base44.functions.invoke("resolvePlayerNames", { action: "merge", keep_id: keepId, discard_id: discardId });
    const m = res.data.migration || {};
    const totalMoved = Object.values(m).reduce((a, b) => a + b, 0);
    setDuplicates(prev => prev.filter(d => d.playerA.id !== discardId && d.playerB.id !== discardId && d.playerA.id !== keepId && d.playerB.id !== keepId));
    onPlayersChanged(players.filter(p => p.id !== discardId));
    setMerging(null);
    toast({ title: `Jugadores fusionados · ${totalMoved} registros migrados` });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-white font-semibold">Detección de duplicados</p>
          <p className="text-xs text-zinc-500 mt-0.5">Detecta jugadores con nombres similares que podrían ser el mismo. Al fusionar, <span className="text-yellow-400">todos los datos se migran automáticamente</span> a la identidad conservada.</p>
        </div>
        <button onClick={detect} disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm hover:bg-zinc-700 transition-colors disabled:opacity-50">
          {loading ? <div className="w-3 h-3 border border-zinc-500 border-t-white rounded-full animate-spin" /> : <Search size={14} />}
          Detectar duplicados
        </button>
      </div>

      {duplicates === null && !loading && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <GitMerge size={28} className="text-zinc-700 mx-auto mb-2" />
          <p className="text-zinc-500 text-sm">Hacé clic en "Detectar duplicados" para analizar el plantel</p>
        </div>
      )}

      {duplicates?.length === 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-8 text-center">
          <CheckCircle2 size={24} className="text-emerald-400 mx-auto mb-2" />
          <p className="text-emerald-300 text-sm font-medium">No se detectaron duplicados en el plantel</p>
        </div>
      )}

      {duplicates?.map((d, i) => (
        <div key={i} className="bg-zinc-900 border border-yellow-500/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-yellow-400 shrink-0" />
            <span className="text-xs text-yellow-400 font-semibold">Similitud: {Math.round(d.score * 100)}%</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[{ p: d.playerA, label: "Jugador A" }, { p: d.playerB, label: "Jugador B" }].map(({ p, label }) => (
              <div key={p.id} className="bg-zinc-800 rounded-xl p-3">
                <p className="text-xs text-zinc-500 mb-1">{label}</p>
                <p className="text-sm font-semibold text-white">{p.full_name}</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {p.division && <span className="text-xs text-zinc-500">{p.division}</span>}
                  {p.category && <span className="text-xs text-zinc-600">· {p.category}</span>}
                  {p.jersey_number && <span className="text-xs text-zinc-600">· #{p.jersey_number}</span>}
                </div>
                <p className="text-[10px] text-zinc-700 font-mono mt-1.5 truncate">{p.id}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-xs text-zinc-500">Conservar como ID oficial:</span>
            <button onClick={() => handleMerge(d.playerA.id, d.playerB.id, d.playerA.full_name)} disabled={!!merging}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600/30 transition-colors disabled:opacity-40">
              {merging === d.playerB.id ? <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" /> : <GitMerge size={12} />}
              Conservar A · {d.playerA.full_name}
            </button>
            <button onClick={() => handleMerge(d.playerB.id, d.playerA.id, d.playerB.full_name)} disabled={!!merging}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-violet-600/20 text-violet-300 border border-violet-500/30 hover:bg-violet-600/30 transition-colors disabled:opacity-40">
              {merging === d.playerA.id ? <div className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin" /> : <GitMerge size={12} />}
              Conservar B · {d.playerB.full_name}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
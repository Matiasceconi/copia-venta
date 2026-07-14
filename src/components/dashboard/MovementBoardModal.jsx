import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, XCircle } from "lucide-react";
import moment from "moment";
import PlayerAvatar from "@/components/player/PlayerAvatar";
import { sortRecordsByPosition } from "./movementBoardUtils";

export default function MovementBoardModal({ open, onClose, title, originLabel, destLabel, records, playerMap, isGKFn, onFinalize }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("todos"); // todos | campo | arqueros
  const [finalizing, setFinalizing] = useState(null);

  async function handleFinalize(ds) {
    if (!onFinalize) return;
    setFinalizing(ds.id);
    await onFinalize(ds);
    setFinalizing(null);
  }

  const filtered = useMemo(() => {
    let list = records;
    if (filter === "campo") list = list.filter(ds => !isGKFn(ds));
    if (filter === "arqueros") list = list.filter(ds => isGKFn(ds));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(ds => {
        const player = playerMap[ds.player_id] || {};
        const name = ds.player_name || player.full_name || "";
        return name.toLowerCase().includes(q);
      });
    }
    return sortRecordsByPosition(list, playerMap);
  }, [records, filter, search, playerMap, isGKFn]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <p className="text-xs text-zinc-500">
            Origen: <span className="text-zinc-300">{originLabel}</span>
            <span className="mx-1.5 text-zinc-700">·</span>
            Destino: <span className="text-zinc-300">{destLabel}</span>
          </p>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar jugador..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-8 pr-2 py-1.5 text-sm text-white focus:outline-none"
            />
          </div>
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none">
            <option value="todos">Todos</option>
            <option value="campo">Campo</option>
            <option value="arqueros">Arqueros</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filtered.length === 0 ? (
            <p className="text-zinc-600 text-sm text-center py-8">Sin resultados</p>
          ) : filtered.map(ds => {
            const player = playerMap[ds.player_id] || {};
            const name = ds.player_name || player.full_name || "—";
            const position = player.position || ds.position || "";
            const isGK = isGKFn(ds);
            const playerObj = player.id ? player : { id: ds.player_id, full_name: name, photo_url: player.photo_url };
            return (
              <div key={ds.id || ds.player_id} className={`flex items-start gap-3 p-3 rounded-xl border ${isGK ? "bg-yellow-500/10 border-yellow-500/25" : "bg-zinc-800/40 border-zinc-700/60"}`}>
                <PlayerAvatar player={playerObj} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm text-white font-semibold truncate">{name}</p>
                    {isGK && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 shrink-0">ARQ</span>}
                  </div>
                  <p className="text-xs text-zinc-500">{position}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Plantel base: <span className="text-zinc-300">{ds.base_squad_name || "—"}</span></p>
                  {ds.date && <p className="text-[10px] text-zinc-600 mt-0.5">Desde: {moment(ds.date).format("DD/MM/YYYY")}</p>}
                  {ds.notes && <p className="text-xs text-zinc-500 italic mt-1">"{ds.notes}"</p>}
                  {onFinalize && (
                    <button
                      onClick={() => handleFinalize(ds)}
                      disabled={finalizing === ds.id}
                      className="flex items-center gap-1 mt-2 text-[11px] px-2 py-1 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25 transition-colors disabled:opacity-50"
                    >
                      <XCircle size={11} /> {finalizing === ds.id ? "Finalizando..." : "Finalizar movimiento temporal"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PlayerAvatar from "@/components/player/PlayerAvatar";

export default function DaySummaryDetailModal({ open, onClose, title, records, playerMap }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[75vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title} ({records.length})</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {records.length === 0 ? (
            <p className="text-zinc-600 text-sm text-center py-8">Sin jugadores</p>
          ) : records.map(ds => {
            const player = playerMap[ds.player_id] || {};
            const name = ds.player_name || player.full_name || "—";
            const position = player.position || ds.position || "";
            const playerObj = player.id ? player : { id: ds.player_id, full_name: name, photo_url: player.photo_url };
            return (
              <div key={ds.id || ds.player_id} className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-800/40 border border-zinc-700/60">
                <PlayerAvatar player={playerObj} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{name}</p>
                  <p className="text-xs text-zinc-500 truncate">{position}</p>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
import React, { useState } from "react";
import PlayerAvatar from "@/components/player/PlayerAvatar";
import MovementBoardModal from "./MovementBoardModal";
import { sortRecordsByPosition } from "./movementBoardUtils";

const COLOR_SCHEMES = {
  sky: {
    dot: "bg-sky-400",
    headerText: "text-sky-300",
    buttonBg: "bg-sky-500/15 hover:bg-sky-500/25",
    buttonBorder: "border-sky-500/30",
    buttonText: "text-sky-300",
  },
  violet: {
    dot: "bg-violet-400",
    headerText: "text-violet-300",
    buttonBg: "bg-violet-500/15 hover:bg-violet-500/25",
    buttonBorder: "border-violet-500/30",
    buttonText: "text-violet-300",
  },
};

const VISIBLE_LIMIT = 4;

function MovementPlayerRow({ ds, playerMap, isGK }) {
  const player = playerMap[ds.player_id] || {};
  const name = ds.player_name || player.full_name || "—";
  const position = player.position || ds.position || "";
  const playerObj = player.id ? player : { id: ds.player_id, full_name: name, photo_url: player.photo_url };
  return (
    <div className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg border ${isGK ? "bg-yellow-500/10 border-yellow-500/25" : "bg-zinc-800/40 border-zinc-700/60"}`}>
      <PlayerAvatar player={playerObj} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm text-white font-semibold truncate">{name}</p>
          {isGK && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 shrink-0">ARQ</span>}
        </div>
        <p className="text-xs text-zinc-500 truncate">{position}{ds.base_squad_name ? ` · ${ds.base_squad_name}` : ""}</p>
      </div>
    </div>
  );
}

export default function MovementBoardCard({ title, originLabel, destLabel, colorScheme = "sky", records, playerMap, isGKFn, onFinalize }) {
  const [showModal, setShowModal] = useState(false);
  const colors = COLOR_SCHEMES[colorScheme] || COLOR_SCHEMES.sky;

  const gkRecords = sortRecordsByPosition(records.filter(ds => isGKFn(ds)), playerMap);
  const fieldRecords = sortRecordsByPosition(records.filter(ds => !isGKFn(ds)), playerMap);
  const total = records.length;

  const ordered = [
    ...fieldRecords.map(ds => ({ ds, isGK: false })),
    ...gkRecords.map(ds => ({ ds, isGK: true })),
  ];
  const visible = ordered.slice(0, VISIBLE_LIMIT);
  const hasMore = ordered.length > VISIBLE_LIMIT;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
      <div className="p-4 border-b border-zinc-800 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${colors.dot} inline-block`} />
            {title}
          </h2>
          <button onClick={() => setShowModal(true)}
            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${colors.buttonBg} ${colors.buttonBorder} ${colors.buttonText}`}>
            Ver detalle
          </button>
        </div>
        <p className="text-xs text-zinc-500">
          Origen: <span className="text-zinc-300">{originLabel}</span>
          <span className="mx-1.5 text-zinc-700">·</span>
          Destino: <span className="text-zinc-300">{destLabel}</span>
        </p>
        <div className="flex items-center gap-5">
          <div><p className="text-lg font-bold text-white leading-none">{total}</p><p className="text-[10px] text-zinc-500 mt-0.5">Total</p></div>
          <div><p className={`text-lg font-bold leading-none ${colors.headerText}`}>{fieldRecords.length}</p><p className="text-[10px] text-zinc-500 mt-0.5">Campo</p></div>
          <div><p className="text-lg font-bold text-yellow-400 leading-none">{gkRecords.length}</p><p className="text-[10px] text-zinc-500 mt-0.5">ARQ</p></div>
        </div>
      </div>

      <div className="p-3">
        {total === 0 ? (
          <p className="text-zinc-600 text-sm text-center py-5">Sin jugadores</p>
        ) : (
          <div className="space-y-1.5">
            {visible.map(({ ds, isGK }) => (
              <MovementPlayerRow key={ds.id || ds.player_id} ds={ds} playerMap={playerMap} isGK={isGK} />
            ))}
            {hasMore && (
              <button onClick={() => setShowModal(true)}
                className="w-full text-center text-xs py-2 text-zinc-400 hover:text-white transition-colors">
                Ver todos los {total}
              </button>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <MovementBoardModal
          open={showModal}
          onClose={() => setShowModal(false)}
          title={title}
          originLabel={originLabel}
          destLabel={destLabel}
          records={records}
          playerMap={playerMap}
          isGKFn={isGKFn}
          onFinalize={onFinalize}
        />
      )}
    </div>
  );
}
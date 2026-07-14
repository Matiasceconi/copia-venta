import React from "react";
import moment from "moment";
import { Move } from "lucide-react";

import PlayerPhoto from "@/components/player/PlayerPhoto";
import { getPlayerName, getPlayerNumber } from "@/lib/matchCallupUtils";
import { shortPosition } from "@/components/matches/tabs/formationSlots";

const DYJ_LOGO = "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/4379a507a_defensa.png";

function formatDateTime(match) {
  const date = match?.date ? moment(match.date).format("DD/MM/YYYY") : "Fecha a definir";
  const time = match?.match_time || match?.time || "Horario a definir";
  return `${date} - ${time}`;
}

function playerLabel(player) {
  return String(getPlayerName(player) || "Jugador").toUpperCase();
}

function PlayerMarker({ player, pos, isCaptain, onPlayerClick, onCaptainChange }) {
  const number = getPlayerNumber(player) || "—";
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", player.id)}
      onClick={() => onPlayerClick(player.id)}
      className="absolute z-20 w-40 -translate-x-1/2 -translate-y-1/2 cursor-pointer text-center transition hover:scale-[1.03]"
      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
    >
      <span onClick={(e) => { e.stopPropagation(); onCaptainChange(player.id); }} className={`absolute left-5 top-8 z-30 flex h-7 w-7 items-center justify-center rounded-full border text-xs font-black shadow-lg ${isCaptain ? "border-yellow-200 bg-yellow-400 text-emerald-950" : "border-white/70 bg-emerald-950/90 text-white"}`}>C</span>
      <div className="relative mx-auto h-20 w-20">
        <PlayerPhoto
          player={player}
          className="h-20 w-20 rounded-full border-[4px] border-white object-cover shadow-[0_8px_18px_rgba(0,0,0,0.35)]"
          fallbackClassName="flex h-20 w-20 items-center justify-center rounded-full border-[4px] border-white bg-emerald-900 shadow-[0_8px_18px_rgba(0,0,0,0.35)]"
          textClassName="text-xl font-black text-yellow-300"
        />
        {isCaptain && <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-yellow-400 text-xs font-black text-emerald-950 ring-2 ring-white">C</span>}
      </div>
      <div className="mx-auto mt-2 flex h-9 w-full overflow-hidden rounded border border-white/70 bg-emerald-900/90 text-white shadow-[0_8px_14px_rgba(0,0,0,0.25)]">
        <div className="flex w-10 items-center justify-center border-r border-white/30 text-sm font-black text-yellow-300">{number}</div>
        <div className="flex min-w-0 flex-1 items-center px-2 text-left text-[11px] font-black leading-none">
          <span className="truncate">{playerLabel(player)}</span>
        </div>
      </div>
    </button>
  );
}

function PitchLines() {
  return (
    <>
      <div className="absolute inset-0 border border-white/45" />
      <div className="absolute left-0 top-1/2 h-px w-full bg-white/45" />
      <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/45" />
      <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60" />
      <div className="absolute left-1/2 top-0 h-[21%] w-[36%] -translate-x-1/2 border border-t-0 border-white/45" />
      <div className="absolute left-1/2 top-0 h-[7.5%] w-[16.5%] -translate-x-1/2 border border-t-0 border-white/45" />
      <div className="absolute left-1/2 top-[21%] h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-b-full border border-t-0 border-white/45" />
      <div className="absolute bottom-0 left-1/2 h-[21%] w-[36%] -translate-x-1/2 border border-b-0 border-white/45" />
      <div className="absolute bottom-0 left-1/2 h-[7.5%] w-[16.5%] -translate-x-1/2 border border-b-0 border-white/45" />
      <div className="absolute bottom-[21%] left-1/2 h-24 w-24 -translate-x-1/2 translate-y-1/2 rounded-t-full border border-b-0 border-white/45" />
      <div className="absolute -left-7 -top-7 h-14 w-14 rounded-full border border-white/45" />
      <div className="absolute -right-7 -top-7 h-14 w-14 rounded-full border border-white/45" />
      <div className="absolute -bottom-7 -left-7 h-14 w-14 rounded-full border border-white/45" />
      <div className="absolute -bottom-7 -right-7 h-14 w-14 rounded-full border border-white/45" />
    </>
  );
}

function SubstituteCard({ player, isCaptain }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-white/20 bg-emerald-950/65 px-3 py-2 shadow-sm">
      <div className="relative shrink-0">
        <PlayerPhoto player={player} className="h-11 w-11 rounded-full border-2 border-white object-cover" fallbackClassName="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-emerald-900" textClassName="text-xs font-black text-yellow-300" />
        {isCaptain && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-400 text-[10px] font-black text-emerald-950">C</span>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-yellow-300">{getPlayerNumber(player) || "—"}</span>
          <span className="truncate text-sm font-black text-white">{playerLabel(player)}</span>
        </div>
        <p className="text-xs font-semibold text-white/70">{shortPosition(player)}</p>
      </div>
    </div>
  );
}

export default function FormationPoster({ containerRef, fieldRef, match, system, positions, playerMap, suplentes = [], captainPlayerId, onDrop, onPlayerClick, onCaptainChange }) {
  const titleSquad = match?.squad_name || "RESERVA";
  const rival = match?.rival || "Rival";

  return (
    <div ref={containerRef} className="overflow-hidden rounded-[30px] border border-yellow-400/20 bg-gradient-to-r from-[#002b06] via-[#003b08] to-[#3a3c17] p-6 text-white shadow-2xl">
      <div className="relative pb-5 text-center">
        <img src={DYJ_LOGO} alt="Defensa y Justicia" className="absolute left-0 top-0 h-24 w-24 object-contain" />
        <div className="mx-auto max-w-4xl border-y-2 border-yellow-400/90 py-4">
          <h2 className="text-4xl font-black tracking-wide text-yellow-300">F1 · {String(titleSquad).toUpperCase()}</h2>
        </div>
        <div className="mt-5 text-yellow-300">
          <h3 className="text-2xl font-black tracking-tight">DEFENSA Y JUSTICIA vs {String(rival).toUpperCase()}</h3>
          <p className="mt-2 text-xl font-black">{formatDateTime(match)}</p>
          <p className="text-xl font-black">PREDIO: {String(match?.match_venue || match?.location || "CIUDAD DEPORTIVA").toUpperCase()}</p>
          <p className="text-xl font-black">SISTEMA: {system}</p>
        </div>
      </div>

      <div ref={fieldRef} onDragOver={(e) => e.preventDefault()} onDrop={onDrop} className="relative h-[820px] overflow-hidden border border-white/35 bg-gradient-to-b from-[#005f2a] via-[#00742e] to-[#008333] shadow-inner">
        <PitchLines />
        {Object.entries(positions).map(([playerId, pos]) => {
          const player = playerMap.get(playerId);
          if (!player) return null;
          return <PlayerMarker key={playerId} player={player} pos={pos} isCaptain={captainPlayerId === playerId} onPlayerClick={onPlayerClick} onCaptainChange={onCaptainChange} />;
        })}
        <div className="pointer-events-none absolute bottom-4 right-4 flex items-center gap-1 rounded-full border border-white/20 bg-black/25 px-3 py-1 text-[11px] text-white/80">
          <Move size={12} /> Tocá una tarjeta para cambiar jugador
        </div>
      </div>

      <div className="px-5 py-7">
        <h3 className="mb-4 text-xl font-black text-yellow-300">SUPLENTES</h3>
        {suplentes.length ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-4">
            {suplentes.map(({ player }) => <SubstituteCard key={player.id} player={player} isCaptain={captainPlayerId === player.id} />)}
          </div>
        ) : <p className="text-white/70">Sin suplentes cargados</p>}
      </div>
    </div>
  );
}
import React, { useState } from "react";
import moment from "moment";
import { Copy, Check } from "lucide-react";

function fmtDate(d) { return d ? moment(d).format("DD/MM/YYYY") : "—"; }
function age(bd) { return bd ? moment().diff(moment(bd), "years") : null; }

function CopyBtn({ text }) {
  const [done, setDone] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}
      className="ml-1 text-zinc-600 hover:text-zinc-300 transition-colors">
      {done ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
    </button>
  );
}

function InfoRow({ label, value }) {
  if (value == null || value === "" || value === "—") return null;
  return (
    <div className="flex items-start justify-between py-2 border-b border-zinc-800/50 last:border-0 gap-3">
      <span className="text-xs text-zinc-500 w-36 shrink-0">{label}</span>
      <span className="text-sm text-white text-right font-medium">{value}</span>
    </div>
  );
}

export default function PlayerDatosPersonalesTab({ player, activeMembership, dayStatus }) {
  const playerAge = age(player.birth_date);
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Datos personales</p>
          <div className="bg-zinc-900 rounded-xl px-4 divide-y divide-zinc-800/50">
            <InfoRow label="Nombre completo" value={player.full_name} />
            <InfoRow label="DNI" value={player.dni || player.document_number} />
            <InfoRow label="Fecha de nacimiento" value={fmtDate(player.birth_date)} />
            <InfoRow label="Edad" value={playerAge ? `${playerAge} años` : null} />
            <InfoRow label="Pierna hábil" value={player.dominant_leg} />
            <InfoRow label="Altura" value={player.height ? `${player.height} cm` : null} />
            <InfoRow label="Peso" value={player.weight ? `${player.weight} kg` : null} />
            <InfoRow label="Lugar de nacimiento" value={player.birth_place} />
            <InfoRow label="Residencia actual" value={player.current_residence} />
          </div>
        </div>
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Plantel y posición</p>
          <div className="bg-zinc-900 rounded-xl px-4 divide-y divide-zinc-800/50">
            <InfoRow label="Plantel actual" value={activeMembership?.squad_name} />
            <InfoRow label="Categoría" value={player.category} />
            <InfoRow label="Posición" value={player.position} />
            <InfoRow label="Grupo posicional" value={player.position_group} />
            <InfoRow label="Tipo" value={player.player_type === "arquero" ? "🥅 Arquero" : "Jugador de campo"} />
            <InfoRow label="Estado" value={player.status} />
            <InfoRow label="Disponibilidad hoy" value={dayStatus?.status} />
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
        <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">ID oficial del sistema</p>
        <div className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2">
          <span className="text-xs font-mono text-zinc-300 flex-1 break-all">{player.id}</span>
          <CopyBtn text={player.id} />
        </div>
      </div>

      {player.notes && (
        <div className="bg-zinc-900 rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Notas</p>
          <p className="text-sm text-zinc-300 whitespace-pre-wrap">{player.notes}</p>
        </div>
      )}
    </div>
  );
}
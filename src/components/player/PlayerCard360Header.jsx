import React from "react";
import { X, Edit2, Save, Camera } from "lucide-react";
import moment from "moment";
import PlayerPhoto from "@/components/player/PlayerPhoto";

const POSITIONS = [
  "Arquero","Defensor Central","Lateral Derecho","Lateral Izquierdo",
  "Mediocampista Central","Volante Interno","Extremo","Delantero Centro",
];
const POSITION_GROUPS = ["Arqueros","Defensores","Mediocampistas","Extremos","Delanteros"];
const LEG_OPTIONS = ["Derecha","Izquierda","Ambidiestro"];
const STATUS_OPTIONS = [
  "Disponible","Lesionado","En recuperación","Suspendido","Permiso",
  "Selección","Subio a primera","Bajo a juveniles","Subieron de juveniles",
  "Bajo de primera","Sparring",
];

export const STATUS_BADGE_MAP = {
  disponible:   { label: "Disponible",   cls: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" },
  diferenciado: { label: "Diferenciado", cls: "text-amber-400 bg-amber-500/15 border-amber-500/30" },
  lesionado:    { label: "Lesionado",    cls: "text-red-400 bg-red-500/15 border-red-500/30" },
  kinesiologia: { label: "Kinesiología", cls: "text-teal-400 bg-teal-500/15 border-teal-500/30" },
  suspendido:   { label: "Suspendido",   cls: "text-yellow-400 bg-yellow-500/15 border-yellow-500/30" },
  "subió":      { label: "Subió",        cls: "text-violet-400 bg-violet-500/15 border-violet-500/30" },
  "bajó":       { label: "Bajó",         cls: "text-pink-400 bg-pink-500/15 border-pink-500/30" },
};

export function resolveBadge(dayStatus, todaysAttendance, player) {
  if (todaysAttendance === "kinesiologia") return STATUS_BADGE_MAP.kinesiologia;
  const key = (dayStatus?.status || "").toLowerCase();
  if (STATUS_BADGE_MAP[key]) return STATUS_BADGE_MAP[key];
  const ps = (player.status || "").toLowerCase();
  if (ps.includes("lesion")) return STATUS_BADGE_MAP.lesionado;
  if (ps.includes("suspend")) return STATUS_BADGE_MAP.suspendido;
  if (ps === "disponible") return STATUS_BADGE_MAP.disponible;
  return { label: player.status || "Sin estado", cls: "text-zinc-300 bg-zinc-700/30 border-zinc-600" };
}

function age(bd) { return bd ? moment().diff(moment(bd), "years") : null; }
function fmtDate(d) { return d ? moment(d).format("DD/MM/YYYY") : "—"; }

export default function PlayerCard360Header({
  player, editing, editForm, setEditForm, canEdit, canUploadPhoto,
  onEdit, onCancelEdit, onSave, saving, onPhotoUpload, onClose,
  activeMembership, badge,
}) {
  const playerAge = age(player.birth_date);

  return (
    <div className="relative bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-t-2xl p-4 border-b border-zinc-800">
      <div className="flex items-start gap-3">
        {/* Photo */}
        <div className="relative shrink-0">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-zinc-700 bg-zinc-800">
            <PlayerPhoto
              player={player}
              src={editing ? editForm.photo_url : player.photo_url}
              className="w-full h-full object-cover"
              fallbackClassName="w-full h-full flex items-center justify-center"
              textClassName="text-xl font-bold text-zinc-400"
            />
          </div>
          {canUploadPhoto && (
            <label className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-zinc-700 border border-zinc-600 flex items-center justify-center cursor-pointer hover:bg-zinc-600 transition-colors">
              <Camera size={10} className="text-zinc-300" />
              <input type="file" accept="image/*" className="hidden" onChange={onPhotoUpload} />
            </label>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input value={editForm.first_name || ""} onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))}
                  placeholder="Nombre" className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none" />
                <input value={editForm.last_name || ""} onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))}
                  placeholder="Apellido" className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none" />
              </div>
              <div className="flex gap-2 flex-wrap">
                <input value={editForm.dni || ""} onChange={e => setEditForm(f => ({ ...f, dni: e.target.value }))}
                  placeholder="DNI" className="w-32 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none" />
                <input type="date" value={editForm.birth_date || ""} onChange={e => setEditForm(f => ({ ...f, birth_date: e.target.value }))}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none" />
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold text-white leading-tight truncate">{player.full_name}</h2>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badge.cls}`}>{badge.label}</span>
                {player.position && <span className="text-xs text-zinc-400">{player.position}</span>}
                {activeMembership?.squad_name && <span className="text-xs text-zinc-500">· {activeMembership.squad_name}</span>}
                {player.jersey_number && <span className="text-xs text-zinc-500">#{player.jersey_number}</span>}
              </div>
              <div className="flex items-center gap-2 flex-wrap mt-1 text-[11px] text-zinc-500">
                {player.category && <span>Cat. {player.category}</span>}
                {playerAge && <span>{playerAge} años</span>}
                <span>{fmtDate(player.birth_date)}</span>
                {(player.dni || player.document_number) && <span>DNI {player.dni || player.document_number}</span>}
                {player.dominant_leg && <span>{player.dominant_leg}</span>}
                {player.height && <span>{player.height} cm</span>}
                {player.weight && <span>{player.weight} kg</span>}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {canEdit && !editing && (
            <button onClick={onEdit}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors">
              <Edit2 size={12} /> Editar
            </button>
          )}
          {editing && (
            <>
              <button onClick={onCancelEdit}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-medium transition-colors">
                Cancelar
              </button>
              <button onClick={onSave} disabled={saving}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white text-zinc-900 text-xs font-semibold hover:bg-zinc-200 transition-colors disabled:opacity-50">
                <Save size={12} /> {saving ? "Guardando..." : "Guardar"}
              </button>
            </>
          )}
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Edit extended fields */}
      {editing && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Posición</label>
            <select value={editForm.position || ""} onChange={e => setEditForm(f => ({ ...f, position: e.target.value }))}
              className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none">
              <option value="">—</option>
              {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Grupo posicional</label>
            <select value={editForm.position_group || ""} onChange={e => setEditForm(f => ({ ...f, position_group: e.target.value }))}
              className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none">
              <option value="">—</option>
              {POSITION_GROUPS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Tipo</label>
            <select value={editForm.player_type || "jugador_campo"} onChange={e => setEditForm(f => ({ ...f, player_type: e.target.value }))}
              className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none">
              <option value="jugador_campo">Jugador de campo</option>
              <option value="arquero">Arquero</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Pierna hábil</label>
            <select value={editForm.dominant_leg || ""} onChange={e => setEditForm(f => ({ ...f, dominant_leg: e.target.value }))}
              className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none">
              <option value="">—</option>
              {LEG_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Altura (cm)</label>
            <input type="number" value={editForm.height || ""} onChange={e => setEditForm(f => ({ ...f, height: +e.target.value }))}
              className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none" />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Peso (kg)</label>
            <input type="number" value={editForm.weight || ""} onChange={e => setEditForm(f => ({ ...f, weight: +e.target.value }))}
              className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none" />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Estado</label>
            <select value={editForm.status || ""} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
              className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none">
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="col-span-2 sm:col-span-3">
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Notas</label>
            <textarea value={editForm.notes || ""} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none resize-none" />
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Save, X, Check, ChevronDown, ChevronUp, Trash2, Edit2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import PlayerPhoto from "@/components/player/PlayerPhoto";
import moment from "moment";
import "moment/locale/es";
moment.locale("es");

const DYJ_LOGO = "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/4379a507a_defensa.png";

const CLUB_LOGOS = {
  "aldosivi": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/8996d21df_aldosivi.png",
  "argentinos": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/0e05a002a_argentinos.png",
  "argentinos juniors": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/0e05a002a_argentinos.png",
  "atletico tucuman": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/610e3b50e_atleticotucuman.png",
  "atletico rafaela": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/a105893ba_atleticorafaela.png",
  "banfield": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/58c2bc7ed_banfield.png",
  "belgrano": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/67af3c8f1_belgrano.png",
  "boca": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/276a7aa08_boca.png",
  "defensa": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/4379a507a_defensa.png",
  "defensa y justicia": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/4379a507a_defensa.png",
  "estudiantes": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/3a3706975_estudiantes.png",
  "ferro": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/bed607ceb_ferro.png",
  "ferro carril oeste": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/bed607ceb_ferro.png",
  "colon": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/c1bb33ec4_colon.png",
  "colón": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/c1bb33ec4_colon.png",
  "gimnasia": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/6114df84b_gimnasia.png",
  "gimnasia mendoza": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/9488b9e24_gimnasiamendoza.png",
  "godoy cruz": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/31d31622d_godoycruz.png",
  "huracan": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/933efb702_huracan.png",
  "independiente": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/a2a471da7_independiente.png",
  "independiente rivadavia": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/9fabf18c5_independienteriv.png",
  "instituto": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/a9ad926b0_instituto.png",
  "lanus": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/99213e3ca_lanus.png",
  "newells": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/9050b34cc_newells.png",
  "platense": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/7ff5c5303_platense.png",
  "racing": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/e0d6a6146_racing.png",
  "river": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/7efeaf539_river.png",
  "river plate": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/7efeaf539_river.png",
  "rosario central": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/724bdfba3_rosariocentral.png",
  "san lorenzo": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/2b8112b77_sanlorenzo.png",
  "sarmiento": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/db1e161fb_sarmiento.png",
  "talleres": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/070c306fb_talleres.png",
  "tigre": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/913703796_tigre.png",
  "union": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/16e7a6924_union.png",
  "velez": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/973c619a4_velez.png",
  "quilmes": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/a2c70d41a_quilmes.png",
};

function normalizeStr(str) {
  return (str || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/['']/g, "");
}

function getLogoForRival(name) {
  if (!name) return null;
  const key = normalizeStr(name);
  for (const [k, v] of Object.entries(CLUB_LOGOS)) {
    if (normalizeStr(k) === key) return v;
  }
  return null;
}

const EMPTY_MATCH = { date: "", rival: "", location: "Local", our_score: "", rival_score: "" };

function ClubLogo({ url, name, size = 10, onAddLogo }) {
  const [err, setErr] = useState(false);
  if (!url || err) {
    return (
      <div
        className={`w-${size} h-${size} rounded-full bg-zinc-800 border border-dashed border-zinc-600 flex flex-col items-center justify-center shrink-0 ${onAddLogo ? "cursor-pointer hover:border-zinc-400 group" : ""}`}
        onClick={onAddLogo}
        title={onAddLogo ? "Agregar escudo" : ""}
      >
        {onAddLogo ? (
          <span className="text-zinc-500 group-hover:text-zinc-300 text-[10px] font-bold">+</span>
        ) : (
          <span className="text-[10px] font-bold text-zinc-500">{(name || "?").charAt(0)}</span>
        )}
      </div>
    );
  }
  return <img src={url} alt={name} className={`w-${size} h-${size} object-contain shrink-0`} onError={() => setErr(true)} />;
}

const EDIT_EMPTY = { date: "", rival: "", location: "Local", our_score: "", rival_score: "", rival_logo_url: "" };

function JuvMatchCard({ match, players, onDelete, onLogoUpdated, onMatchUpdated }) {
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(EDIT_EMPTY);
  const [expanded, setExpanded] = useState(false);
  const [minutesRecords, setMinutesRecords] = useState([]);
  const [editMinutesMap, setEditMinutesMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingLogo, setEditingLogo] = useState(false);
  const [logoInput, setLogoInput] = useState(match.rival_logo_url || "");
  const { toast } = useToast();

  const hasResult = match.our_score != null && match.rival_score != null;
  const won = match.our_score > match.rival_score;
  const drew = match.our_score === match.rival_score;

  const rivalLogo = match.rival_logo_url || getLogoForRival(match.rival);

  useEffect(() => {
    if (!expanded) return;
    setLoading(true);
    base44.entities.MinutesRecord.filter(
      { match_date: match.date, tournament: "Juveniles" }, "-created_date", 200
    ).then((records) => {
      setMinutesRecords(records.filter(r => r.minutes > 0));
      const map = {};
      records.forEach((r) => {
        const key = r.player_id || `name:${r.player_name}`;
        map[key] = { id: r.id, minutes: r.minutes ?? "", name: r.player_name, player_id: r.player_id };
      });
      setEditMinutesMap(map);
    }).finally(() => setLoading(false));
  }, [expanded, match.date]);

  async function saveMinutes() {
    setSaving(true);
    try {
      for (const [key, val] of Object.entries(editMinutesMap)) {
        if (val.minutes === "" || val.minutes === undefined) continue;
        if (val.id) {
          await base44.entities.MinutesRecord.update(val.id, { minutes: Number(val.minutes) });
        } else {
          const isPlayerId = !key.startsWith("name:");
          await base44.entities.MinutesRecord.create({
            tournament: "Juveniles",
            match_label: `vs ${match.rival} ${moment(match.date).format("DD/MM/YY")} (Juv)`,
            match_date: match.date,
            rival: match.rival,
            minutes: Number(val.minutes),
            player_name: val.name,
            ...(isPlayerId ? { player_id: key } : {}),
          });
        }
      }
      toast({ title: "Minutos guardados" });
      // Recargar
      const records = await base44.entities.MinutesRecord.filter(
        { match_date: match.date, tournament: "Juveniles" }, "-created_date", 200
      );
      setMinutesRecords(records.filter(r => r.minutes > 0));
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function saveLogo() {
    await base44.entities.MatchReport.update(match.id, { rival_logo_url: logoInput });
    onLogoUpdated?.(match.id, logoInput);
    setEditingLogo(false);
    toast({ title: "Escudo actualizado" });
  }

  // Jugadores del plantel que tienen minutos en este partido
  const playerMap = {};
  players.forEach(p => { playerMap[p.id] = p; });

  // Agregar jugadores del plantel sin registro para poder ingresar minutos
  const reservaPlayers = players.filter(p => p.division === "Reserva");

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header clickeable */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-zinc-800/40 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Fecha */}
        <div className="text-center min-w-[44px] shrink-0">
          <p className="text-white font-bold text-sm">{moment(match.date).format("DD/MM")}</p>
          <p className="text-zinc-600 text-xs">{moment(match.date).format("YY")}</p>
        </div>

        {/* Escudos + marcador */}
        <div className="flex items-center gap-3 flex-1 justify-center px-3">
          <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
            <span className="text-xs text-zinc-300 hidden sm:block truncate max-w-[80px] text-right">Def. y Justicia</span>
            <ClubLogo url={DYJ_LOGO} name="DyJ" size={8} />
          </div>

          {hasResult ? (
            <div className={`flex items-center gap-1 px-3 py-1 rounded-lg font-bold text-base shrink-0 ${won ? "bg-green-900/40 text-green-400" : drew ? "bg-zinc-700 text-zinc-200" : "bg-red-900/40 text-red-400"}`}>
              <span>{match.our_score}</span>
              <span className="text-zinc-500 text-xs mx-0.5">-</span>
              <span>{match.rival_score}</span>
            </div>
          ) : (
            <div className="px-3 py-1 text-zinc-600 text-xs shrink-0">vs</div>
          )}

          <div className="flex items-center gap-2 min-w-0 flex-1">
            <ClubLogo
              url={rivalLogo}
              name={match.rival}
              size={8}
              onAddLogo={!rivalLogo ? (e => { e?.stopPropagation(); setEditingLogo(true); }) : undefined}
            />
            <span className="text-xs text-zinc-300 hidden sm:block truncate max-w-[80px]">{match.rival}</span>
          </div>
        </div>

        {/* Info + acciones */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full ${match.location === "Local" ? "bg-green-900/30 text-green-400" : "bg-orange-900/30 text-orange-400"}`}>
            {match.location}
          </span>
          {minutesRecords.length > 0 && (
            <span className="text-xs text-violet-400 font-mono">{minutesRecords.length}j</span>
          )}
          <button onClick={e => { e.stopPropagation(); setEditForm({ ...match, our_score: match.our_score ?? "", rival_score: match.rival_score ?? "", rival_logo_url: match.rival_logo_url || "" }); setEditing(true); }} className="p-1.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-white transition-colors">
            <Edit2 size={13} />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(match.id); }} className="p-1.5 rounded hover:bg-red-900/40 text-zinc-500 hover:text-red-400 transition-colors">
            <Trash2 size={13} />
          </button>
          {expanded ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
        </div>
      </div>

      {/* Panel de logo */}
      {editingLogo && (
        <div className="border-t border-zinc-800 px-4 py-3 bg-zinc-800/40 flex items-center gap-2">
          <input
            value={logoInput}
            onChange={e => setLogoInput(e.target.value)}
            placeholder="URL del escudo del rival..."
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-zinc-500"
            onClick={e => e.stopPropagation()}
          />
          <button onClick={e => { e.stopPropagation(); saveLogo(); }} className="px-3 py-1.5 bg-white text-zinc-900 rounded-lg text-sm font-medium">Guardar</button>
          <button onClick={e => { e.stopPropagation(); setEditingLogo(false); }} className="px-3 py-1.5 text-zinc-400 hover:text-white text-sm">Cancelar</button>
        </div>
      )}

      {/* Panel de edición del partido */}
      {editing && (
        <div className="border-t border-zinc-800 p-4 bg-zinc-850 space-y-3" onClick={e => e.stopPropagation()}>
          <p className="text-sm font-semibold text-white flex items-center gap-2"><Edit2 size={14} /> Editar partido</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Rival *</label>
              <div className="flex items-center gap-2">
                {(editForm.rival_logo_url || getLogoForRival(editForm.rival)) && (
                  <img src={editForm.rival_logo_url || getLogoForRival(editForm.rival)} className="w-5 h-5 object-contain shrink-0" onError={e => e.target.style.display="none"} />
                )}
                <input className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-zinc-500" value={editForm.rival} onChange={e => {
                  const val = e.target.value;
                  const autoLogo = getLogoForRival(val);
                  setEditForm(f => ({ ...f, rival: val, rival_logo_url: autoLogo || f.rival_logo_url }));
                }} />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Fecha</label>
              <input type="date" className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-zinc-500" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Condición</label>
              <select className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none" value={editForm.location} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))}>
                <option>Local</option><option>Visitante</option><option>Neutral</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Escudo (URL)</label>
              <div className="flex items-center gap-2">
                {editForm.rival_logo_url && <img src={editForm.rival_logo_url} className="w-5 h-5 object-contain shrink-0" onError={e => e.target.style.display="none"} />}
                <input className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-zinc-500" placeholder="https://..." value={editForm.rival_logo_url || ""} onChange={e => setEditForm(f => ({ ...f, rival_logo_url: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Goles propios</label>
              <input type="number" min="0" className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none" value={editForm.our_score} onChange={e => setEditForm(f => ({ ...f, our_score: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Goles rival</label>
              <input type="number" min="0" className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none" value={editForm.rival_score} onChange={e => setEditForm(f => ({ ...f, rival_score: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">Cancelar</button>
            <button onClick={async () => {
              const autoLogo = editForm.rival_logo_url || getLogoForRival(editForm.rival);
              await base44.entities.MatchReport.update(match.id, {
                rival: editForm.rival,
                date: editForm.date,
                location: editForm.location,
                rival_logo_url: autoLogo || null,
                our_score: editForm.our_score !== "" ? Number(editForm.our_score) : null,
                rival_score: editForm.rival_score !== "" ? Number(editForm.rival_score) : null,
              });
              onLogoUpdated?.(match.id, autoLogo);
              onMatchUpdated?.(match.id, {
                rival: editForm.rival,
                date: editForm.date,
                location: editForm.location,
                rival_logo_url: autoLogo,
                our_score: editForm.our_score !== "" ? Number(editForm.our_score) : null,
                rival_score: editForm.rival_score !== "" ? Number(editForm.rival_score) : null,
              });
              setEditing(false);
              toast({ title: "Partido actualizado" });
              if (expanded) {
                const records = await base44.entities.MinutesRecord.filter(
                  { match_date: match.date, tournament: "Juveniles" }, "-created_date", 200
                );
                setMinutesRecords(records.filter(r => r.minutes > 0));
              }
            }} disabled={!editForm.rival || !editForm.date}
              className="px-3 py-1.5 rounded-lg text-sm bg-violet-600 hover:bg-violet-500 text-white font-semibold disabled:opacity-40 transition-colors">
              <Check size={14} className="inline mr-1" />Guardar
            </button>
          </div>
        </div>
      )}

      {/* Detalle expandido */}
      {expanded && (
        <div className="border-t border-zinc-800 p-4 space-y-4">
          {/* Banner escudos grandes */}
          <div className="bg-zinc-800/60 rounded-xl p-4">
            <div className="flex items-center justify-center gap-6">
              <div className="flex flex-col items-center gap-2">
                <ClubLogo url={DYJ_LOGO} name="Defensa y Justicia" size={16} />
                <p className="text-xs text-zinc-400 text-center">Defensa y Justicia</p>
              </div>
              <div className="text-center">
                {hasResult ? (
                  <p className={`text-3xl font-black ${won ? "text-green-400" : drew ? "text-zinc-200" : "text-red-400"}`}>
                    {match.our_score} — {match.rival_score}
                  </p>
                ) : <p className="text-zinc-600 text-xl font-bold">vs</p>}
                <p className="text-xs text-zinc-500 mt-1">{moment(match.date).format("dddd DD [de] MMMM YYYY")}</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <ClubLogo
                  url={rivalLogo}
                  name={match.rival}
                  size={16}
                  onAddLogo={!rivalLogo ? () => setEditingLogo(true) : undefined}
                />
                {!rivalLogo && (
                  <button onClick={() => setEditingLogo(true)} className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1">
                    <Plus size={10} /> Agregar escudo
                  </button>
                )}
                <p className="text-xs text-zinc-400 text-center">{match.rival}</p>
              </div>
            </div>
          </div>

          {/* Jugadores con minutos */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-white">
                Jugadores con minutos
                {Object.keys(editMinutesMap).filter(k => editMinutesMap[k].minutes > 0 || editMinutesMap[k].minutes !== "").length > 0 && (
                  <span className="text-zinc-500 text-xs ml-2 font-normal">
                    ({Object.keys(editMinutesMap).filter(k => editMinutesMap[k].minutes > 0 || editMinutesMap[k].minutes !== "").length})
                  </span>
                )}
              </p>
              <button onClick={saveMinutes} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-violet-500/20 border border-violet-500/30 text-violet-300 hover:bg-violet-500/30 rounded-lg transition-colors disabled:opacity-50">
                {saving ? <div className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin" /> : <Save size={12} />}
                Guardar
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-6"><div className="w-4 h-4 border border-zinc-700 border-t-white rounded-full animate-spin" /></div>
            ) : (
              <div className="space-y-1.5">
                {/* Jugadores con minutos importados o cargados */}
                {minutesRecords.length === 0 && Object.keys(editMinutesMap).filter(k => editMinutesMap[k].minutes > 0).length === 0 ? (
                  <p className="text-zinc-500 text-sm text-center py-4">Sin minutos cargados para este partido</p>
                ) : (
                  Object.entries(editMinutesMap)
                    .filter(([, val]) => val.minutes > 0 || val.minutes !== "")
                    .sort((a, b) => (b[1].minutes || 0) - (a[1].minutes || 0))
                    .map(([key, val]) => {
                      const player = val.player_id ? playerMap[val.player_id] : null;
                      return (
                        <div key={key} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-zinc-800/30 transition-colors group">
                          <PlayerPhoto
                            player={player || { full_name: val.name }}
                            alt={val.name}
                            className="w-7 h-7 rounded-full object-cover border border-zinc-700 shrink-0"
                            fallbackClassName="w-7 h-7 rounded-full bg-zinc-700 border border-zinc-600 flex items-center justify-center shrink-0"
                            textClassName="text-xs font-bold text-zinc-400"
                          />
                          {player?.jersey_number && (
                            <span className="text-xs text-zinc-500 font-mono w-5 text-center shrink-0">{player.jersey_number}</span>
                          )}
                          <span className="text-sm text-white flex-1 truncate">{val.name}</span>
                          {player?.division && (
                            <span className="text-xs text-zinc-600 shrink-0 hidden sm:block">{player.division}</span>
                          )}
                          <input
                            type="number" min="0" max="120"
                            value={val.minutes ?? ""}
                            onChange={e => setEditMinutesMap(m => ({ ...m, [key]: { ...val, minutes: e.target.value } }))}
                            className="w-16 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white text-center focus:outline-none focus:border-violet-500/50 shrink-0"
                          />
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              try { if (val.id) await base44.entities.MinutesRecord.delete(val.id); } catch {}
                              const newMap = { ...editMinutesMap };
                              delete newMap[key];
                              setEditMinutesMap(newMap);
                              setMinutesRecords(recs => recs.filter(r => r.id !== val.id));
                            }}
                            title="Quitar jugador"
                            className="p-1 rounded text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })
                )}

                {/* Agregar jugadores */}
                <details className="mt-3">
                  <summary className="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer select-none">
                    + Agregar jugador
                  </summary>
                  <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                    {players
                      .filter(p => !editMinutesMap[p.id] && !editMinutesMap[`name:${normalizeStr(p.full_name)}`])
                      .map(p => (
                        <div key={p.id} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-zinc-800/30 transition-colors">
                          <PlayerPhoto
                            player={p}
                            className="w-6 h-6 rounded-full object-cover border border-zinc-700 shrink-0"
                            fallbackClassName="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center shrink-0"
                            textClassName="text-[10px] font-bold text-zinc-400"
                          />
                          <span className="text-xs text-zinc-500 font-mono w-5 shrink-0">{p.jersey_number || "—"}</span>
                          <span className="text-xs text-zinc-400 flex-1">{p.full_name}</span>
                          <span className="text-xs text-zinc-600 shrink-0">{p.division || ""}</span>
                          <input
                            type="number" min="0" max="120" placeholder="min"
                            onBlur={e => {
                              if (e.target.value) {
                                const name = p.full_name;
                                const key = p.id;
                                setEditMinutesMap(m => ({
                                  ...m,
                                  [key]: { minutes: e.target.value, name, player_id: p.id }
                                }));
                              }
                            }}
                            className="w-14 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-0.5 text-xs text-white text-center focus:outline-none focus:border-violet-500/50 shrink-0"
                          />
                        </div>
                      ))}
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function JuvenileMatchPanel({ players }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_MATCH);
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadMatches(); }, []);

  async function loadMatches() {
    const data = await base44.entities.MatchReport.filter({ competition: "Juveniles" }, "-date", 100);
    setMatches(data);
    setLoading(false);
  }

  async function saveMatch() {
    if (!form.rival || !form.date) return;
    const autoLogo = getLogoForRival(form.rival);
    await base44.entities.MatchReport.create({
      ...form,
      competition: "Juveniles",
      rival_logo_url: autoLogo || null,
      our_score: form.our_score !== "" ? Number(form.our_score) : null,
      rival_score: form.rival_score !== "" ? Number(form.rival_score) : null,
    });
    toast({ title: "Partido creado" });
    setForm(EMPTY_MATCH);
    setShowForm(false);
    loadMatches();
  }

  async function deleteMatch(id) {
    if (!confirm("¿Eliminar este partido?")) return;
    await base44.entities.MatchReport.delete(id);
    loadMatches();
  }

  function handleLogoUpdated(id, url) {
    setMatches(ms => ms.map(m => m.id === id ? { ...m, rival_logo_url: url } : m));
  }

  function handleMatchUpdated(id, data) {
    setMatches(ms => ms.map(m => m.id === id ? { ...m, ...data } : m));
  }

  async function runImport() {
    setImporting(true);
    try {
      const result = await base44.functions.invoke("importJuvenileMinutes", {});
      toast({ title: result.data?.message || "Importación completada" });
      loadMatches();
    } catch (e) {
      toast({ title: "Error: " + e.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const previewLogo = getLogoForRival(form.rival);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-zinc-400 text-sm">{matches.length} partido{matches.length !== 1 ? "s" : ""}</p>
        <div className="flex gap-2">
          <button onClick={runImport} disabled={importing}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-700/50 border border-zinc-600 text-zinc-300 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
            {importing ? <div className="w-4 h-4 border border-zinc-400 border-t-transparent rounded-full animate-spin" /> : "↓"}
            Importar planilla
          </button>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-violet-500/20 border border-violet-500/30 text-violet-300 hover:bg-violet-500/30 rounded-lg text-sm font-medium transition-colors">
            <Plus size={15} /> Nuevo partido
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 space-y-4">
          <p className="text-white font-semibold">Nuevo partido — Juveniles</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Rival *</label>
              <div className="flex items-center gap-2">
                {previewLogo && <img src={previewLogo} className="w-6 h-6 object-contain shrink-0" />}
                <input
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                  placeholder="Nombre del rival"
                  value={form.rival}
                  onChange={e => set("rival", e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Fecha *</label>
              <input type="date" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" value={form.date} onChange={e => set("date", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Condición</label>
              <select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" value={form.location} onChange={e => set("location", e.target.value)}>
                <option>Local</option><option>Visitante</option><option>Neutral</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Goles propios</label>
                <input type="number" min="0" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" placeholder="—" value={form.our_score} onChange={e => set("our_score", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Goles rival</label>
                <input type="number" min="0" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" placeholder="—" value={form.rival_score} onChange={e => set("rival_score", e.target.value)} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowForm(false); setForm(EMPTY_MATCH); }} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center gap-1"><X size={14} /> Cancelar</button>
            <button onClick={saveMatch} disabled={!form.rival || !form.date} className="px-4 py-2 rounded-lg text-sm bg-violet-600 hover:bg-violet-500 text-white font-semibold disabled:opacity-40 flex items-center gap-1"><Check size={14} /> Guardar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" /></div>
      ) : matches.length === 0 && !showForm ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <p className="text-zinc-500 text-sm">No hay partidos. Presioná "Importar planilla" para cargar los 15 partidos.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map(m => (
            <JuvMatchCard key={m.id} match={m} players={players} onDelete={deleteMatch} onLogoUpdated={handleLogoUpdated} onMatchUpdated={handleMatchUpdated} />
          ))}
        </div>
      )}
    </div>
  );
}
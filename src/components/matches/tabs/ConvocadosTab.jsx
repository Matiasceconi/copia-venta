import React, { useEffect, useMemo, useRef, useState } from "react";
import moment from "moment";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { AlertTriangle, Download, FileText, LayoutGrid, List, RefreshCw, Save, Search, Sparkles, Upload, Users } from "lucide-react";

import { base44 } from "@/api/base44Client";
import TransparentPlayerPhoto from "@/components/player/PlayerPhoto";
import { useToast } from "@/components/ui/use-toast";
import { buildNameVariants, getPlayerName, getPlayerNumber, getPlayerSquadLabel, getPositionGroup, isUnavailableStatus, loadMatchCallupState, matchDetectedPlayers, normalizeText, saveMatchCallups } from "@/lib/matchCallupUtils";

const GROUPS = ["Arquero", "Defensor", "Mediocampista", "Delantero", "Sin categoría"];
const EXPORT_SIZES = {
  whatsapp: { label: "WhatsApp 1080x1350", width: 1080, height: 1350 },
  story: { label: "Story 1080x1920", width: 1080, height: 1920 },
};

function getStatusClass(status) {
  const normalized = normalizeText(status);
  if (normalized.includes("lesion")) return "bg-red-500/15 text-red-300 border-red-500/30";
  if (normalized.includes("no disponible") || normalized.includes("suspend")) return "bg-orange-500/15 text-orange-300 border-orange-500/30";
  if (normalized.includes("dispon")) return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  return "bg-zinc-800 text-zinc-300 border-zinc-700";
}

function downloadBlob(dataUrl, filename) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

function RoleBadges({ callup, isCaptain }) {
  const role = callup?.lineup_role;
  if (!role && !isCaptain) return null;
  return <div className="mt-2 flex flex-wrap gap-1.5">{role && role !== "pendiente" && <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${role === "titular" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-blue-500/30 bg-blue-500/10 text-blue-300"}`}>{role === "titular" ? "Titular" : "Suplente"}</span>}{isCaptain && <span className="rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-black uppercase text-zinc-950">Capitán</span>}</div>;
}

export default function ConvocadosTab({ match, players = [], refreshKey = 0, onMatchUpdated, onRegisterSave, onCallupsUpdated }) {
  const { toast } = useToast();
  const previewRef = useRef(null);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [savedCallups, setSavedCallups] = useState([]);
  const [allCallups, setAllCallups] = useState([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [loadingCallups, setLoadingCallups] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [squadFilter, setSquadFilter] = useState("match");
  const [squadOptions, setSquadOptions] = useState([]);
  const [viewMode, setViewMode] = useState("cards");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [linkedMinutes, setLinkedMinutes] = useState([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState("whatsapp");
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importSummary, setImportSummary] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiReview, setAiReview] = useState(null);
  const [importMode, setImportMode] = useState("replace");

  async function reload() {
    setLoadingPlayers(true);
    setLoadingCallups(true);
    setLoadError("");
    try {
      const [state, minutesRows] = await Promise.all([
        loadMatchCallupState(match, players),
        base44.entities.MinutesRecord.filter({ match_id: match.id }, "-created_date", 300).catch(() => []),
      ]);
      setAvailablePlayers(state.availablePlayers);
      setSavedCallups(state.savedCallups);
      setAllCallups(state.allCallups);
      setSelectedPlayerIds(state.selectedPlayerIds);
      setSquadOptions(state.squadOptions || []);
      setLinkedMinutes(minutesRows || []);
      setDirty(false);
    } catch (error) {
      setLoadError(error.message || "No se pudo cargar la convocatoria");
    } finally {
      setLoadingPlayers(false);
      setLoadingCallups(false);
    }
  }

  useEffect(() => { reload(); }, [match.id, match.squad_id, refreshKey]);

  const visiblePlayers = useMemo(() => availablePlayers.filter((player) => {
    const name = normalizeText(getPlayerName(player));
    const status = normalizeText(player.status || "sin estado");
    const position = getPositionGroup(player.position);
    const isSelected = selectedPlayerIds.includes(player.id);
    if (search && !name.includes(normalizeText(search))) return false;
    if (!isSelected && squadFilter === "match" && match.squad_id && player.origin_squad_id !== match.squad_id) return false;
    if (!isSelected && squadFilter !== "all" && squadFilter !== "match" && player.origin_squad_name !== squadFilter && player.origin_squad_id !== squadFilter) return false;
    if (positionFilter !== "all" && position !== positionFilter) return false;
    if (statusFilter !== "all" && status !== statusFilter) return false;
    return true;
  }), [availablePlayers, match.squad_id, positionFilter, search, selectedPlayerIds, squadFilter, statusFilter]);

  const groupedPlayers = useMemo(() => {
    const groups = Object.fromEntries(GROUPS.map((group) => [group, []]));
    visiblePlayers.forEach((player) => groups[getPositionGroup(player.position)].push(player));
    return groups;
  }, [visiblePlayers]);

  const selectedSet = useMemo(() => new Set(selectedPlayerIds), [selectedPlayerIds]);
  const callupByPlayerId = useMemo(() => Object.fromEntries(savedCallups.map((callup) => [callup.player_id, callup])), [savedCallups]);
  const captainPlayerId = match.captain_player_id || "";
  const selectedPlayers = useMemo(() => availablePlayers.filter((player) => selectedSet.has(player.id)), [availablePlayers, selectedSet]);
  const linkedPlayersMap = useMemo(() => Object.fromEntries(linkedMinutes.map((row) => [row.player_id, row])), [linkedMinutes]);
  const distinctStatuses = useMemo(() => Array.from(new Set(availablePlayers.map((player) => normalizeText(player.status || "sin estado")))).filter(Boolean), [availablePlayers]);

  async function saveConvocados() {
    if (saving) return;
    const removedWithMinutes = savedCallups.filter((callup) => !selectedSet.has(callup.player_id) && linkedPlayersMap[callup.player_id]);
    if (removedWithMinutes.length) {
      const confirmed = window.confirm(`Vas a quitar ${removedWithMinutes.length} jugador(es) que ya tienen minutos cargados. Los minutos se conservarán, pero dejarán de verse como convocados. ¿Confirmás?`);
      if (!confirmed) return;
    }
    setSaving(true);
    try {
      const state = await saveMatchCallups({ match, selectedPlayerIds, availablePlayers, allCallups, replaceMissing: true });
      setAvailablePlayers(state.availablePlayers);
      setSavedCallups(state.savedCallups);
      setAllCallups(state.allCallups);
      setSelectedPlayerIds(state.selectedPlayerIds);
      setDirty(false);
      onMatchUpdated?.({ squad_called: state.selectedPlayerIds, squad_names: state.selectedPlayerIds.map((id) => getPlayerName(state.playerMap.get(id))).filter(Boolean) });
      onCallupsUpdated?.();
      toast({ title: `Convocatoria guardada correctamente: ${state.selectedPlayerIds.length} jugadores` });
    } catch (error) {
      toast({ title: error.message || "No se pudo guardar la convocatoria", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    onRegisterSave?.({ action: saveConvocados, disabled: !dirty || saving, pending: dirty, label: "convocados" });
  }, [dirty, onRegisterSave, saving, selectedPlayerIds, allCallups, availablePlayers]);

  function togglePlayer(player) {
    const alreadySelected = selectedSet.has(player.id);
    if (!alreadySelected && isUnavailableStatus(player.status)) {
      const confirmed = window.confirm(`⚠️ ${getPlayerName(player)} figura como "${player.status || "no disponible"}". ¿Querés convocarlo igualmente?`);
      if (!confirmed) return;
    }
    setSelectedPlayerIds((current) => alreadySelected ? current.filter((id) => id !== player.id) : [...current, player.id]);
    setDirty(true);
  }

  function selectAvailable() {
    setSelectedPlayerIds(visiblePlayers.filter((player) => !isUnavailableStatus(player.status)).map((player) => player.id));
    setDirty(true);
  }

  async function analyzeImportFile(file) {
    if (!file) return;
    setAnalyzing(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.InvokeLLM({
        file_urls: [file_url],
        prompt: "Analizá esta planilla/imagen/PDF de formación de fútbol. Extraé rival, club, fecha, horario, lugar, sistema táctico, titulares y suplentes. Para cada jugador devolvé número de camiseta, nombre completo leído, rol titular/suplente y ubicación aproximada si aparece. No inventes jugadores.",
        response_json_schema: { type: "object", properties: { club: { type: "string" }, rival: { type: "string" }, date: { type: "string" }, time: { type: "string" }, venue: { type: "string" }, system: { type: "string" }, players: { type: "array", items: { type: "object", properties: { number: { type: "number" }, name: { type: "string" }, role: { type: "string" }, detected_position: { type: "string" } } } } } },
      });
      const rows = matchDetectedPlayers((result.players || []).map((row) => ({ shirt_number: row.number, name: row.name, lineup_role: normalizeText(row.role).includes("titular") ? "titular" : "suplente", detected_position: row.detected_position || "" })), availablePlayers);
      setAiReview({ metadata: result, rows, source_file: file_url });
      setImportSummary({ convocados: rows.length, titulares: rows.filter((row) => row.lineup_role === "titular").length, suplentes: rows.filter((row) => row.lineup_role === "suplente").length });
    } catch (error) {
      toast({ title: error.message || "No se pudo analizar el archivo", variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  }

  function loadImportFile(file) {
    const reader = new FileReader();
    reader.onload = () => setImportText(String(reader.result || ""));
    reader.readAsText(file);
  }

  function applyAiImport() {
    const normalizedText = normalizeText(importText);
    if (!normalizedText) return toast({ title: "Pegá o cargá un texto para importar", variant: "destructive" });
    const detectedRows = [];
    availablePlayers.forEach((player) => {
      if (buildNameVariants(player).some((variant) => variant && normalizedText.includes(variant))) detectedRows.push({ shirt_number: Number(getPlayerNumber(player)) || null, name: getPlayerName(player), lineup_role: "suplente", detected_position: "" });
    });
    if (!detectedRows.length) return toast({ title: "No se detectaron jugadores en el texto", variant: "destructive" });
    const rows = matchDetectedPlayers(detectedRows, availablePlayers);
    setAiReview({ metadata: {}, rows, source_file: "texto pegado" });
    setImportSummary({ convocados: rows.length, titulares: 0, suplentes: rows.length });
  }

  function updateReviewMatch(index, playerId) {
    setAiReview((current) => {
      const rows = [...(current?.rows || [])];
      const player = availablePlayers.find((item) => item.id === playerId) || null;
      rows[index] = { ...rows[index], matchedPlayerId: playerId, matchedPlayer: player, confidence: player ? 1 : 0, group: player ? "matched" : "missing" };
      return { ...current, rows };
    });
  }

  async function confirmAiImport() {
    const rows = (aiReview?.rows || []).filter((row) => row.matchedPlayerId);
    if (!rows.length) return toast({ title: "No hay jugadores relacionados para importar", variant: "destructive" });
    setSaving(true);
    try {
      const ids = importMode === "replace" ? rows.map((row) => row.matchedPlayerId) : Array.from(new Set([...selectedPlayerIds, ...rows.map((row) => row.matchedPlayerId)]));
      const metaByPlayer = {};
      rows.forEach((row) => { metaByPlayer[row.matchedPlayerId] = { lineup_role: row.lineup_role, shirt_number: row.shirt_number, source: "ai_import", source_file: aiReview.source_file, confidence: row.confidence, detected_name: row.name, detected_position: row.detected_position }; });
      const state = await saveMatchCallups({ match, selectedPlayerIds: ids, availablePlayers, allCallups, metaByPlayer, replaceMissing: importMode === "replace" });
      setAvailablePlayers(state.availablePlayers);
      setSavedCallups(state.savedCallups);
      setAllCallups(state.allCallups);
      setSelectedPlayerIds(state.selectedPlayerIds);
      setDirty(false);
      setImportOpen(false);
      setAiReview(null);
      const tacticalPatch = aiReview?.metadata?.system ? { tactical_system: aiReview.metadata.system } : {};
      if (tacticalPatch.tactical_system) await base44.entities.MatchReport.update(match.id, tacticalPatch);
      onMatchUpdated?.({ squad_called: state.selectedPlayerIds, squad_names: state.selectedPlayerIds.map((id) => getPlayerName(state.playerMap.get(id))).filter(Boolean), ...tacticalPatch });
      onCallupsUpdated?.();
      const titulares = rows.filter((row) => row.lineup_role === "titular").length;
      const suplentes = rows.filter((row) => row.lineup_role === "suplente").length;
      toast({ title: `Importación completada: ${rows.length} convocados, ${titulares} titulares y ${suplentes} suplentes.` });
    } catch (error) {
      toast({ title: error.message || "No se pudo confirmar la importación", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function exportImage() {
    if (!previewRef.current) return;
    const size = EXPORT_SIZES[exportFormat];
    const canvas = await html2canvas(previewRef.current, { backgroundColor: "#09090b", scale: 2, useCORS: true });
    const output = document.createElement("canvas");
    output.width = size.width;
    output.height = size.height;
    const ctx = output.getContext("2d");
    ctx.fillStyle = "#09090b";
    ctx.fillRect(0, 0, output.width, output.height);
    const ratio = Math.min(output.width / canvas.width, output.height / canvas.height);
    ctx.drawImage(canvas, (output.width - canvas.width * ratio) / 2, (output.height - canvas.height * ratio) / 2, canvas.width * ratio, canvas.height * ratio);
    downloadBlob(output.toDataURL("image/png"), `convocatoria-${match.rival || "partido"}-${exportFormat}.png`);
  }

  async function exportPdf() {
    if (!previewRef.current) return;
    const canvas = await html2canvas(previewRef.current, { backgroundColor: "#09090b", scale: 2, useCORS: true });
    const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [canvas.width, canvas.height] });
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width, canvas.height);
    pdf.save(`convocatoria-${match.rival || "partido"}.pdf`);
  }

  const countByGroup = useMemo(() => {
    const base = Object.fromEntries(GROUPS.map((group) => [group, []]));
    selectedPlayers.forEach((player) => base[getPositionGroup(player.position)].push(player));
    return base;
  }, [selectedPlayers]);

  if (loadError) return <StateCard title="No se pudo cargar la convocatoria" description={loadError} action={<button onClick={reload} className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-zinc-950"><RefreshCw size={14} className="mr-1 inline" /> Reintentar</button>} />;
  if (loadingPlayers) return <StateCard title="Cargando jugadores…" />;
  if (loadingCallups) return <StateCard title="Cargando convocatoria…" />;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Users size={16} className="text-yellow-400" /> Convocatoria del partido</h2>
            <p className="mt-1 text-xs text-zinc-500">Plantel del partido: {match.squad_name || "sin plantel asignado"}. La convocatoria se guarda por jugador y partido.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={selectAvailable} disabled={saving || !availablePlayers.length} className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-200 transition hover:bg-zinc-700 disabled:opacity-50">Seleccionar disponibles</button>
            <button onClick={() => setImportOpen(true)} disabled={saving} className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-300 transition hover:bg-blue-500/20 disabled:opacity-50"><Sparkles size={13} className="mr-1 inline" /> Importar IA</button>
            <button onClick={() => setExportOpen(true)} disabled={!selectedPlayers.length} className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-300 transition hover:bg-yellow-500/20 disabled:opacity-50"><Download size={13} className="mr-1 inline" /> Exportar convocatoria</button>
            <button onClick={saveConvocados} disabled={!dirty || saving} className="rounded-lg bg-yellow-500 px-3 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"><Save size={13} className="mr-1 inline" /> {saving ? "Guardando…" : "Guardar"}</button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[220px]"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar jugador" className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2 pl-9 pr-3 text-sm text-white outline-none transition focus:border-yellow-500" /></div>
            <select value={squadFilter} onChange={(e) => setSquadFilter(e.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none transition focus:border-yellow-500"><option value="match">Plantel del partido</option><option value="all">Todos los planteles</option>{squadOptions.map((option) => <option key={option.id || option.name} value={option.id || option.name}>{option.name}</option>)}</select>
            <select value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none transition focus:border-yellow-500"><option value="all">Todas las posiciones</option>{GROUPS.map((group) => <option key={group} value={group}>{group}</option>)}</select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none transition focus:border-yellow-500"><option value="all">Todos los estados</option>{distinctStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-zinc-700 bg-zinc-950 p-1"><button onClick={() => setViewMode("cards")} className={`rounded-md px-2 py-1 text-xs transition ${viewMode === "cards" ? "bg-yellow-500 text-zinc-950" : "text-zinc-400 hover:text-white"}`}><LayoutGrid size={14} /></button><button onClick={() => setViewMode("list")} className={`rounded-md px-2 py-1 text-xs transition ${viewMode === "list" ? "bg-yellow-500 text-zinc-950" : "text-zinc-400 hover:text-white"}`}><List size={14} /></button></div>
            <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-300">{selectedPlayerIds.length} convocados</div>
          </div>
        </div>
      </div>

      {!availablePlayers.length ? <StateCard title="Este plantel todavía no tiene jugadores" description="Asigná jugadores al plantel del partido para poder convocarlos." /> : viewMode === "cards" ? (
        <div className="space-y-4">{Object.entries(groupedPlayers).map(([group, groupPlayers]) => <PlayerGroup key={group} group={group} players={groupPlayers} selectedSet={selectedSet} callupByPlayerId={callupByPlayerId} captainPlayerId={captainPlayerId} onToggle={togglePlayer} />)}</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
          <div className="grid grid-cols-[52px_1.4fr_1fr_80px_150px_130px] gap-3 border-b border-zinc-800 bg-zinc-950/60 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500"><span /><span>Jugador</span><span>Posición / plantel</span><span>N°</span><span>Estado</span><span>Rol</span></div>
          {visiblePlayers.length === 0 ? <div className="px-4 py-8 text-center text-sm text-zinc-500">Todavía no seleccionaste convocados o el filtro no tiene resultados.</div> : visiblePlayers.map((player) => <PlayerListRow key={player.id} player={player} checked={selectedSet.has(player.id)} callup={callupByPlayerId[player.id]} isCaptain={captainPlayerId === player.id} onToggle={() => togglePlayer(player)} />)}
        </div>
      )}

      {exportOpen && <ExportModal match={match} exportFormat={exportFormat} setExportFormat={setExportFormat} onClose={() => setExportOpen(false)} onExportImage={exportImage} onExportPdf={exportPdf} previewRef={previewRef} countByGroup={countByGroup} />}
      {importOpen && <ImportModal importText={importText} setImportText={setImportText} loadImportFile={loadImportFile} analyzeImportFile={analyzeImportFile} analyzing={analyzing} importSummary={importSummary} aiReview={aiReview} clearReview={() => setAiReview(null)} match={match} availablePlayers={availablePlayers} importMode={importMode} setImportMode={setImportMode} updateReviewMatch={updateReviewMatch} onClose={() => setImportOpen(false)} onApply={applyAiImport} onConfirm={confirmAiImport} />}
    </div>
  );
}

function StateCard({ title, description, action }) {
  return <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center"><h2 className="text-lg font-semibold text-white">{title}</h2>{description && <p className="mt-2 text-sm text-zinc-500">{description}</p>}{action && <div className="mt-4">{action}</div>}</div>;
}

function PlayerGroup({ group, players, selectedSet, callupByPlayerId = {}, captainPlayerId = "", onToggle }) {
  return <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-white">{group}</h3><span className="text-xs text-zinc-500">{players.length} jugadores</span></div>{players.length === 0 ? <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-4 py-6 text-center text-sm text-zinc-500">Sin jugadores en esta categoría.</div> : <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">{players.map((player) => <PlayerCard key={player.id} player={player} checked={selectedSet.has(player.id)} callup={callupByPlayerId[player.id]} isCaptain={captainPlayerId === player.id} onToggle={() => onToggle(player)} />)}</div>}</div>;
}

function PlayerCard({ player, checked, callup, isCaptain, onToggle }) {
  return <button onClick={onToggle} className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${checked ? "border-yellow-500/40 bg-yellow-500/10" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900"}`}><input type="checkbox" checked={checked} readOnly className="h-4 w-4 accent-yellow-500" /><TransparentPlayerPhoto player={player} className="h-12 w-12 rounded-full border border-zinc-700 object-cover" fallbackClassName="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800" textClassName="text-sm font-bold text-zinc-400" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><p className="truncate text-sm font-semibold text-white">{getPlayerName(player)}</p><p className="text-xs text-zinc-500">{player.position || "Sin posición"} · {getPlayerSquadLabel(player)}</p></div><div className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs font-semibold text-zinc-300">#{getPlayerNumber(player)}</div></div><span className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[11px] ${getStatusClass(player.status)}`}>{player.status || "Sin estado"}</span>{isUnavailableStatus(player.status) && <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-orange-300"><AlertTriangle size={11} /> advertencia</span>}<RoleBadges callup={callup} isCaptain={isCaptain} /></div></button>;
}

function PlayerListRow({ player, checked, callup, isCaptain, onToggle }) {
  return <button onClick={onToggle} className={`grid w-full grid-cols-[52px_1.4fr_1fr_80px_150px_130px] items-center gap-3 border-b border-zinc-800 px-4 py-3 text-left transition last:border-b-0 ${checked ? "bg-yellow-500/10" : "hover:bg-zinc-950/50"}`}><input type="checkbox" checked={checked} readOnly className="h-4 w-4 accent-yellow-500" /><div className="flex min-w-0 items-center gap-3"><TransparentPlayerPhoto player={player} className="h-10 w-10 rounded-full border border-zinc-700 object-cover" fallbackClassName="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800" textClassName="text-xs font-bold text-zinc-400" /><span className="truncate text-sm font-medium text-white">{getPlayerName(player)}</span></div><span className="text-sm text-zinc-400">{player.position || "—"}</span><span className="text-sm text-zinc-300">#{getPlayerNumber(player)}</span><span className={`inline-flex w-fit rounded-full border px-2 py-1 text-[11px] ${getStatusClass(player.status)}`}>{player.status || "Sin estado"}</span><RoleBadges callup={callup} isCaptain={isCaptain} /></button>;
}

function ExportModal({ match, exportFormat, setExportFormat, onClose, onExportImage, onExportPdf, previewRef, countByGroup }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"><div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-950 p-5 shadow-2xl shadow-black/40"><div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><div><h3 className="text-lg font-semibold text-white">Previsualización de convocatoria</h3><p className="text-sm text-zinc-500">Exportá en formato WhatsApp, Story o PDF.</p></div><div className="flex flex-wrap gap-2">{Object.entries(EXPORT_SIZES).map(([key, option]) => <button key={key} onClick={() => setExportFormat(key)} className={`rounded-lg px-3 py-2 text-xs transition ${exportFormat === key ? "bg-yellow-500 text-zinc-950" : "border border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"}`}>{option.label}</button>)}<button onClick={onExportImage} className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-300 transition hover:bg-yellow-500/20">Descargar imagen</button><button onClick={onExportPdf} className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 transition hover:bg-zinc-800"><FileText size={13} className="mr-1 inline" /> PDF</button><button onClick={onClose} className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 transition hover:bg-zinc-800">Cerrar</button></div></div><div className="overflow-auto rounded-2xl border border-zinc-800 bg-black/30 p-4"><div ref={previewRef} className={`mx-auto overflow-hidden rounded-[28px] border border-yellow-500/20 bg-zinc-950 shadow-2xl shadow-black/50 ${exportFormat === "story" ? "w-[360px] min-h-[640px]" : "w-[360px] min-h-[450px]"}`}><div className="border-b border-zinc-800 bg-gradient-to-br from-yellow-500/20 via-zinc-950 to-zinc-950 px-6 py-6"><p className="text-[11px] uppercase tracking-[0.3em] text-yellow-300">PerformancePitch</p><h4 className="mt-2 text-2xl font-black text-white">Convocatoria oficial</h4><div className="mt-4 flex flex-wrap gap-2 text-[11px] text-zinc-300"><span className="rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1">vs {match.rival}</span><span className="rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1">{moment(match.date).format("DD/MM/YYYY")}</span>{match.squad_name && <span className="rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1">{match.squad_name}</span>}</div></div><div className="space-y-4 px-6 py-6">{Object.entries(countByGroup).filter(([, players]) => players.length > 0).map(([group, players]) => <div key={group} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold text-white">{group}</p><span className="text-xs text-zinc-500">{players.length}</span></div><div className="grid grid-cols-2 gap-2 text-sm text-zinc-200">{players.map((player) => <div key={player.id} className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2"><span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-yellow-500/10 text-xs font-black text-yellow-300">{getPlayerNumber(player)}</span><span className="truncate">{getPlayerName(player)}</span></div>)}</div></div>)}</div></div></div></div></div>;
}

function ImportModal({ importText, setImportText, loadImportFile, analyzeImportFile, analyzing, importSummary, aiReview, clearReview, match, availablePlayers, importMode, setImportMode, updateReviewMatch, onClose, onApply, onConfirm }) {
  const metadata = aiReview?.metadata || {};
  const warning = aiReview && ((metadata.rival && match.rival && !normalizeText(metadata.rival).includes(normalizeText(match.rival)) && !normalizeText(match.rival).includes(normalizeText(metadata.rival))) || (metadata.date && match.date && normalizeText(metadata.date) !== normalizeText(match.date)));
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"><div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-950 p-5 shadow-2xl shadow-black/40"><div className="mb-4 flex items-center justify-between"><div><h3 className="text-lg font-semibold text-white">Importar convocatoria con IA</h3><p className="text-sm text-zinc-500">Subí PDF/JPG/PNG o pegá texto. Nada se guarda hasta confirmar.</p></div><button onClick={onClose} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-zinc-900">Cerrar</button></div><div className="space-y-4"><div className="flex flex-wrap gap-2"><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 transition hover:bg-zinc-800"><Upload size={13} /> {analyzing ? "Analizando…" : "Subir PDF/JPG/PNG"}<input type="file" accept=".pdf,image/png,image/jpeg" className="hidden" disabled={analyzing} onChange={(e) => e.target.files?.[0] && analyzeImportFile(e.target.files[0])} /></label><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 transition hover:bg-zinc-800"><Upload size={13} /> Cargar texto<input type="file" accept=".txt,.csv,.md" className="hidden" onChange={(e) => e.target.files?.[0] && loadImportFile(e.target.files[0])} /></label></div><textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={5} placeholder="También podés pegar texto de una formación..." className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-sm text-white outline-none transition focus:border-yellow-500" />{!aiReview && <div className="flex justify-end gap-2"><button onClick={onClose} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-900">Cancelar</button><button onClick={onApply} className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-yellow-400">Analizar texto</button></div>}{aiReview && <div className="space-y-4"><div className="grid grid-cols-2 gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-xs text-zinc-300 md:grid-cols-5"><span>Rival: <b className="text-white">{metadata.rival || "—"}</b></span><span>Fecha: <b className="text-white">{metadata.date || "—"}</b></span><span>Hora: <b className="text-white">{metadata.time || "—"}</b></span><span>Lugar: <b className="text-white">{metadata.venue || "—"}</b></span><span>Sistema: <b className="text-white">{metadata.system || "—"}</b></span></div>{warning && <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 text-sm text-orange-200">El archivo corresponde a {metadata.rival || "otro rival"} — {metadata.date || "sin fecha"}, pero el partido abierto es contra {match.rival} — {match.date}. Confirmá explícitamente si querés continuar de todas formas.</div>}{importSummary && <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-200">Detectados: {importSummary.convocados} convocados · {importSummary.titulares} titulares · {importSummary.suplentes} suplentes.</div>}<div className="flex gap-2 text-xs"><button onClick={() => setImportMode("replace")} className={`rounded-lg px-3 py-2 ${importMode === "replace" ? "bg-yellow-500 text-zinc-950" : "border border-zinc-700 text-zinc-300"}`}>Reemplazar convocatoria actual</button><button onClick={() => setImportMode("combine")} className={`rounded-lg px-3 py-2 ${importMode === "combine" ? "bg-yellow-500 text-zinc-950" : "border border-zinc-700 text-zinc-300"}`}>Combinar con actual</button></div><ReviewTable rows={aiReview.rows} players={availablePlayers} updateReviewMatch={updateReviewMatch} /><div className="flex justify-end gap-2"><button onClick={onClose} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-900">Cancelar</button><button onClick={() => { setImportText(""); clearReview?.(); }} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-900">Volver a analizar</button><button onClick={onConfirm} className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-yellow-400">Confirmar importación</button></div></div>}</div></div></div>;
}

function ReviewTable({ rows, players, updateReviewMatch }) {
  const sections = [{ key: "matched", title: "Relacionados correctamente", color: "text-emerald-300" }, { key: "review", title: "Coincidencia dudosa", color: "text-yellow-300" }, { key: "missing", title: "No encontrados", color: "text-red-300" }];
  return <div className="space-y-3">{sections.map((section) => { const items = rows.map((row, index) => ({ ...row, index })).filter((row) => row.group === section.key); return <div key={section.key} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3"><h4 className={`mb-2 text-sm font-semibold ${section.color}`}>{section.title} · {items.length}</h4><div className="space-y-2">{items.length === 0 ? <p className="text-xs text-zinc-500">Sin jugadores en este grupo.</p> : items.map((row) => <div key={`${row.index}-${row.name}`} className="grid grid-cols-1 gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-xs md:grid-cols-[70px_1fr_1fr_120px]"><div className="font-bold text-white">#{row.shirt_number || "—"}</div><div><p className="text-white">{row.name}</p><p className="text-zinc-500">{row.lineup_role}</p></div><div className="flex items-center gap-2"><TransparentPlayerPhoto player={row.matchedPlayer} className="h-8 w-8 rounded-full border border-zinc-700 object-cover" fallbackClassName="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800" textClassName="text-xs text-zinc-400" /><select value={row.matchedPlayerId || ""} onChange={(e) => updateReviewMatch(row.index, e.target.value)} className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-white"><option value="">No encontrado</option>{players.map((player) => <option key={player.id} value={player.id}>{getPlayerName(player)} · {getPlayerSquadLabel(player)}</option>)}</select></div><div className="text-zinc-400">Confianza: {Math.round((row.confidence || 0) * 100)}%</div></div>)}</div></div>; })}</div>;
}
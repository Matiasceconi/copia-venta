import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { DragDropContext } from "@hello-pangea/dnd";
import { Activity, Dumbbell, ImagePlus, Plus, RotateCcw, Shield, Sparkles, Target, Users, Zap } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import StrengthGroupTable from "@/components/sessions/strength/StrengthGroupTable";
import StrengthPDFExport from "@/components/sessions/strength/StrengthPDFExport";
import StrengthImageImportModal from "@/components/sessions/strength/StrengthImageImportModal";
import { METHOD_OPTIONS, TYPE_OPTIONS, syncToLibrary } from "@/components/sessions/strength/strengthOptions";
import { findSimilarStrengthExercise } from "@/components/sessions/exerciseLibrarySync";

const BLOCK_TEMPLATES = [
  { name: "Restaura", color: "#ef4444", icon: "rotate" },
  { name: "Compensa", color: "#22c55e", icon: "activity" },
  { name: "Potencia", color: "#38bdf8", icon: "zap" },
  { name: "Preventivo", color: "#f59e0b", icon: "shield" },
  { name: "Circuito", color: "#a855f7", icon: "target" },
  { name: "Readaptación", color: "#14b8a6", icon: "activity" },
  { name: "Arqueros", color: "#60a5fa", icon: "users" },
];

function normalizeGroupName(value = "") {
  const text = String(value || "").trim();
  if (!text) return "Cuadro";
  if (text.toLowerCase() === "restaura") return "Restaura";
  if (text.toLowerCase() === "compensa") return "Compensa";
  return text;
}

function uidName(name) {
  return normalizeGroupName(name).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "cuadro";
}

function parseLeadingNumber(value) {
  const match = String(value || "").match(/\d+(?:[.,]\d+)?/);
  return match ? Number(match[0].replace(",", ".")) : 0;
}

function parseNumbers(value) {
  return String(value || "").match(/\d+(?:[.,]\d+)?/g)?.map(item => Number(item.replace(",", "."))) || [];
}

function totalReps(row) {
  const sets = parseLeadingNumber(row.sets);
  const reps = parseLeadingNumber(row.reps);
  if (sets && reps) return sets * reps;
  const volumeNumbers = parseNumbers(row.volume);
  if (/x/i.test(String(row.volume || "")) && volumeNumbers.length >= 2) return volumeNumbers[0] * volumeNumbers[1];
  if (String(row.volume || "").includes("+") && volumeNumbers.length) return volumeNumbers.reduce((sum, value) => sum + value, 0);
  return reps || parseLeadingNumber(row.volume);
}

function totalSets(row) {
  return parseLeadingNumber(row.sets) || (/x/i.test(String(row.volume || "")) ? parseLeadingNumber(row.volume) : 0);
}

function summarize(stations) {
  return {
    exercises: stations.length,
    volume: stations.reduce((sum, row) => sum + totalReps(row), 0),
    sets: stations.reduce((sum, row) => sum + totalSets(row), 0),
  };
}

export const STRENGTH_BLOCK_ICONS = { dumbbell: Dumbbell, activity: Activity, zap: Zap, shield: Shield, target: Target, users: Users, rotate: RotateCcw };

export default function SessionStrength({ session, onSessionUpdate }) {
  const [stations, setStations] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [suggesting, setSuggesting] = useState(false);
  const [showImageImport, setShowImageImport] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadData(); }, [session.id]);

  async function loadData() {
    const rows = await base44.entities.StrengthStation.filter({ session_id: session.id }, "order", 300);
    const rawBlocks = await base44.entities.StrengthWorkBlock.filter({ session_id: session.id }, "order", 100);

    let nextBlocks = rawBlocks.sort((a, b) => (a.order || 0) - (b.order || 0));
    let nextRows = rows.sort((a, b) => (a.order || 0) - (b.order || 0));

    if (!nextBlocks.length && nextRows.length) {
      const names = [...new Set(nextRows.map(r => normalizeGroupName(r.strength_group || "Restaura")))];
      nextBlocks = [];
      for (let index = 0; index < names.length; index += 1) {
        const name = names[index];
        const template = BLOCK_TEMPLATES.find(t => uidName(t.name) === uidName(name)) || BLOCK_TEMPLATES[index % BLOCK_TEMPLATES.length];
        nextBlocks.push(await base44.entities.StrengthWorkBlock.create({ session_id: session.id, name, color: template.color, icon: template.icon, order: index + 1, hidden: false }));
      }
      const byName = Object.fromEntries(nextBlocks.map(b => [uidName(b.name), b]));
      const migratedRows = [];
      for (const row of nextRows) {
        const block = byName[uidName(row.strength_group || "Restaura")] || nextBlocks[0];
        migratedRows.push(await base44.entities.StrengthStation.update(row.id, { work_block_id: block.id, strength_group: block.name }));
      }
      nextRows = migratedRows;
    }

    setBlocks(nextBlocks);
    setStations(nextRows);
  }

  const visibleBlocks = useMemo(() => blocks.slice().sort((a, b) => (a.order || 0) - (b.order || 0)), [blocks]);
  const stationsByBlock = useMemo(() => Object.fromEntries(visibleBlocks.map(block => [block.id, stations.filter(s => s.work_block_id === block.id || (!s.work_block_id && uidName(s.strength_group) === uidName(block.name))).sort((a, b) => (a.order || 0) - (b.order || 0))])), [visibleBlocks, stations]);

  async function createBlock(initial = {}) {
    const template = BLOCK_TEMPLATES.find(t => uidName(t.name) === uidName(initial.name)) || BLOCK_TEMPLATES[blocks.length % BLOCK_TEMPLATES.length];
    const created = await base44.entities.StrengthWorkBlock.create({
      session_id: session.id,
      name: initial.name || `Cuadro ${blocks.length + 1}`,
      description: initial.description || "",
      color: initial.color || template.color,
      icon: initial.icon || template.icon,
      order: blocks.length + 1,
      hidden: false,
      template_key: initial.template_key || "",
    });
    setBlocks(prev => [...prev, created]);
    return created;
  }

  async function updateBlock(id, patch) {
    setBlocks(prev => prev.map(block => block.id === id ? { ...block, ...patch } : block));
    await base44.entities.StrengthWorkBlock.update(id, patch);
    if (patch.name) {
      setStations(prev => prev.map(row => row.work_block_id === id ? { ...row, strength_group: patch.name } : row));
    }
  }

  async function moveBlock(index, direction) {
    const next = [...visibleBlocks];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    const updated = next.map((block, i) => ({ ...block, order: i + 1 }));
    setBlocks(updated);
    for (const block of updated) {
      await base44.entities.StrengthWorkBlock.update(block.id, { order: block.order });
    }
  }

  async function duplicateBlock(block) {
    const created = await createBlock({ name: `${block.name} copia`, description: block.description, color: block.color, icon: block.icon });
    const sourceRows = stationsByBlock[block.id] || [];
    const createdRows = [];
    for (let index = 0; index < sourceRows.length; index += 1) {
      const row = sourceRows[index];
      const { id, created_date, updated_date, created_by_id, ...rest } = row;
      createdRows.push(await base44.entities.StrengthStation.create({ ...rest, work_block_id: created.id, strength_group: created.name, order: index + 1, station_number: index + 1 }));
    }
    setStations(prev => [...prev, ...createdRows]);
    toast({ title: "✓ Cuadro duplicado" });
  }

  async function deleteBlock(block) {
    if (!window.confirm(`¿Eliminar el cuadro ${block.name} y sus ejercicios?`)) return;
    const rows = stationsByBlock[block.id] || [];
    for (const row of rows) {
      await base44.entities.StrengthStation.delete(row.id);
    }
    await base44.entities.StrengthWorkBlock.delete(block.id);
    setBlocks(prev => prev.filter(item => item.id !== block.id));
    setStations(prev => prev.filter(row => row.work_block_id !== block.id));
  }

  async function addRow(blockId, initial = {}) {
    let block = blocks.find(item => item.id === blockId);
    if (!block) block = await createBlock({ name: "Cuadro 1" });
    const groupRows = stations.filter(row => row.work_block_id === block.id);
    const payload = {
      session_id: session.id,
      work_block_id: block.id,
      strength_group: block.name,
      order: groupRows.length + 1,
      station_number: groupRows.length + 1,
      method: "", exercise_type: "", exercise_name: "", volume: "", notes: "", video_url: "",
      restore_exercise: "", compensate_exercise: "", sets: "", reps: "", time: "", rest_time: "", rir: "", objective: "", muscle_group: "", vector_pattern: "", tags: [],
      ...initial,
    };
    const created = await base44.entities.StrengthStation.create(payload);
    setStations(prev => [...prev, created]);
  }

  function onChange(id, field, value) {
    setStations(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  }

  async function onBlurField(station) {
    let libraryId = station.library_strength_exercise_id || station.library_exercise_id || "";
    if (station.exercise_name) {
      if (!libraryId) {
        const match = await findSimilarStrengthExercise(station, session.squad_id);
        if (match?.type === "exact") libraryId = match.exercise.id;
        if (match?.type === "similar" && window.confirm(`Este ejercicio parece similar a: ${match.exercise.name}. ¿Querés usar el existente?`)) libraryId = match.exercise.id;
      }
      libraryId = await syncToLibrary(station, session.id, session.squad_id, session.squad_name, { updateExistingId: libraryId || undefined, session, incrementUsage: false });
    }
    const payload = {
      work_block_id: station.work_block_id,
      strength_group: station.strength_group || blocks.find(b => b.id === station.work_block_id)?.name || "",
      method: station.method || undefined,
      exercise_type: station.exercise_type || undefined,
      exercise_name: station.exercise_name || undefined,
      volume: station.volume || undefined,
      image_url: station.image_url || undefined,
      video_url: station.video_url || undefined,
      restore_exercise: station.restore_exercise || undefined,
      compensate_exercise: station.compensate_exercise || undefined,
      sets: station.sets || undefined,
      reps: station.reps || undefined,
      time: station.time || undefined,
      rest_time: station.rest_time || undefined,
      rir: station.rir || undefined,
      objective: station.objective || undefined,
      muscle_group: station.muscle_group || undefined,
      vector_pattern: station.vector_pattern || undefined,
      tags: station.tags || [],
      notes: station.notes || undefined,
      library_exercise_id: libraryId || undefined,
      library_strength_exercise_id: libraryId || undefined,
    };
    const updated = await base44.entities.StrengthStation.update(station.id, payload);
    setStations(prev => prev.map(row => row.id === station.id ? { ...row, ...updated } : row));
  }

  async function onPickLibrary(id, ex) {
    const current = stations.find(s => s.id === id);
    const updated = {
      work_block_id: current?.work_block_id || "",
      strength_group: current?.strength_group || "",
      method: ex.method || "",
      exercise_type: ex.exercise_type || "",
      exercise_name: ex.name || "",
      volume: ex.volume || "",
      image_url: ex.image_url || "",
      video_url: ex.video_url || "",
      restore_exercise: ex.restore_exercise || "",
      compensate_exercise: ex.compensate_exercise || "",
      sets: ex.sets || "",
      reps: ex.reps || "",
      time: ex.time || "",
      rest_time: ex.rest_time || "",
      rir: ex.rir || "",
      objective: ex.objective || "",
      muscle_group: ex.muscle_group || "",
      vector_pattern: ex.vector_pattern || "",
      tags: ex.tags || [],
      notes: ex.notes || "",
      library_exercise_id: ex.id,
      library_strength_exercise_id: ex.id,
    };
    setStations(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
    await base44.entities.StrengthStation.update(id, updated);
    await syncToLibrary({ ...current, ...updated }, session.id, session.squad_id, session.squad_name, { updateExistingId: ex.id, session });
  }

  async function onDuplicate(station) {
    const { id, created_date, updated_date, created_by_id, ...rest } = station;
    const blockRows = stations.filter(s => s.work_block_id === rest.work_block_id);
    const created = await base44.entities.StrengthStation.create({ ...rest, order: blockRows.length + 1, station_number: blockRows.length + 1 });
    setStations(prev => [...prev, created]);
    toast({ title: "✓ Ejercicio duplicado" });
  }

  async function onDelete(id) {
    if (!window.confirm("¿Eliminar ejercicio?")) return;
    await base44.entities.StrengthStation.delete(id);
    setStations(prev => prev.filter(s => s.id !== id));
  }

  async function persistBlockRows(blockId, list) {
    const block = blocks.find(item => item.id === blockId);
    const updated = list.map((row, index) => ({ ...row, work_block_id: blockId, strength_group: block?.name || row.strength_group || "", order: index + 1, station_number: index + 1 }));
    setStations(prev => prev.filter(row => row.work_block_id !== blockId).concat(updated));
    const missingIds = [];
    for (const row of updated) {
      try {
        await base44.entities.StrengthStation.update(row.id, { work_block_id: row.work_block_id, strength_group: row.strength_group, order: row.order, station_number: row.station_number });
      } catch (error) {
        if (String(error?.message || error).includes("not found")) missingIds.push(row.id);
        else throw error;
      }
    }
    if (missingIds.length) setStations(prev => prev.filter(row => !missingIds.includes(row.id)));
  }

  function onMoveInBlock(blockId, index, direction) {
    const list = [...(stationsByBlock[blockId] || [])];
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    persistBlockRows(blockId, list);
  }

  async function onDragEnd(result) {
    if (!result.destination) return;
    const sourceBlockId = result.source.droppableId;
    const destBlockId = result.destination.droppableId;
    const source = [...(stationsByBlock[sourceBlockId] || [])];
    const dest = sourceBlockId === destBlockId ? source : [...(stationsByBlock[destBlockId] || [])];
    const [moved] = source.splice(result.source.index, 1);
    dest.splice(result.destination.index, 0, { ...moved, work_block_id: destBlockId, strength_group: blocks.find(b => b.id === destBlockId)?.name || moved.strength_group });
    await persistBlockRows(sourceBlockId, source);
    if (sourceBlockId !== destBlockId) await persistBlockRows(destBlockId, dest);
  }

  async function suggestRow() {
    const targetBlock = visibleBlocks.find(block => !block.hidden) || visibleBlocks[0] || await createBlock({ name: "Potencia", color: "#38bdf8", icon: "zap" });
    setSuggesting(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Sos un preparador físico de fútbol profesional. Sugerí UN ejercicio de fuerza para el cuadro "${targetBlock.name}". MD: ${session.match_day_code || "no especificado"}. Propósito: ${session.strength_purpose || "no especificado"}. Método posible: ${METHOD_OPTIONS.join(", ")}. Tipo posible: ${TYPE_OPTIONS.join(", ")}.`,
        response_json_schema: { type: "object", properties: { method: { type: "string" }, exercise_type: { type: "string" }, exercise_name: { type: "string" }, volume: { type: "string" } }, required: ["exercise_name"] },
      });
      await addRow(targetBlock.id, result);
      toast({ title: "✓ Ejercicio sugerido por IA" });
    } finally {
      setSuggesting(false);
    }
  }

  return (
    <div className="space-y-4">
      <datalist id="strength-method-options">{METHOD_OPTIONS.map(m => <option key={m} value={m} />)}</datalist>
      <datalist id="strength-type-options">{TYPE_OPTIONS.map(t => <option key={t} value={t} />)}</datalist>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-white font-semibold text-sm">Constructor de fuerza</h3>
          <p className="text-xs text-zinc-500">Creá cuadros libres, asigná ejercicios de biblioteca y ordená la estructura.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => createBlock()} className="flex items-center gap-1.5 px-3 py-2 bg-white text-zinc-950 font-semibold rounded-lg text-xs hover:bg-zinc-200 transition-colors"><Plus size={13} /> Nuevo cuadro</button>
          <button onClick={suggestRow} disabled={suggesting} className="flex items-center gap-1.5 px-3 py-2 bg-purple-500/15 border border-purple-500/30 text-purple-300 rounded-lg text-xs hover:bg-purple-500/25 transition-colors disabled:opacity-50"><Sparkles size={13} /> {suggesting ? "Pensando..." : "Sugerir ejercicio"}</button>
          <button onClick={() => setShowImageImport(true)} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs hover:bg-emerald-500/25 transition-colors"><ImagePlus size={13} /> Importar desde imagen</button>
          <StrengthPDFExport session={session} blocks={visibleBlocks} stations={stations} />
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {BLOCK_TEMPLATES.map(template => <button key={template.name} onClick={() => createBlock({ ...template, template_key: uidName(template.name) })} className="px-2.5 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 text-[10px] hover:border-zinc-500 transition-colors">{template.name}</button>)}
      </div>

      {showImageImport && <StrengthImageImportModal session={session} hasExisting={stations.length > 0 || blocks.length > 0} onClose={() => setShowImageImport(false)} onImported={(updatedSession) => { setShowImageImport(false); if (onSessionUpdate) onSessionUpdate(updatedSession); loadData(); }} />}

      {!blocks.length && <div className="border border-dashed border-zinc-700 rounded-2xl p-8 text-center"><p className="text-zinc-500 text-sm">Todavía no hay cuadros de trabajo.</p><button onClick={() => createBlock({ name: "Restaura" })} className="mt-3 px-4 py-2 rounded-lg bg-white text-zinc-950 text-xs font-bold">Crear primer cuadro</button></div>}

      {!!blocks.length && <DragDropContext onDragEnd={onDragEnd}><div className="grid grid-cols-1 xl:grid-cols-2 gap-4">{visibleBlocks.map((block, index) => {
        const blockStations = stationsByBlock[block.id] || [];
        return <StrengthGroupTable key={block.id} block={block} index={index} totalBlocks={visibleBlocks.length} stations={blockStations} summary={summarize(blockStations)} icons={STRENGTH_BLOCK_ICONS} squadId={session?.squad_id} handlers={{ addRow, updateBlock, moveBlock, duplicateBlock, deleteBlock, onChange, onBlurField, onPickLibrary, onDuplicate, onDelete, onMoveInBlock }} />;
      })}</div></DragDropContext>}
    </div>
  );
}
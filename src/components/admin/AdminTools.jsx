import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Wrench, FileDown, FileUp, CheckCircle2, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import OrphanMinutesRepair from "@/components/admin/OrphanMinutesRepair";
import NutritionRepairPanel from "@/components/nutrition/NutritionRepairPanel";

const TOOLS = [
  {
    id: "syncGpsNames",
    label: "Sincronizar nombres GPS",
    description: "Unifica todos los nombres GPS con los jugadores oficiales",
    fn: "unifyAllGpsPlayerNames",
    payload: {},
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
  },
  {
    id: "repairPlayerId",
    label: "Reparar player_id en GPS",
    description: "Migra y repara player_id faltantes en registros GPS de Catapult",
    fn: "migratePlayerIdToCatapult",
    payload: {},
    color: "text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/20",
  },
  {
    id: "repairAlias",
    label: "Reparar alias",
    description: "Sincroniza y normaliza alias de jugadores desde todas las fuentes",
    fn: "syncPlayerNameMappings",
    payload: {},
    color: "text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-500/20",
  },
  {
    id: "reconcileGps",
    label: "Reconciliar GPS con jugadores",
    description: "Vincula registros GPS con jugadores usando alias y nombres normalizados",
    fn: "reconcileGpsPlayers",
    payload: {},
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  {
    id: "normalizeNames",
    label: "Normalizar nombres de jugadores",
    description: "Normaliza todos los nombres de jugadores en la base oficial",
    fn: "normalizePlayerNames",
    payload: {},
    color: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/20",
  },
  {
    id: "assignDivisions",
    label: "Asignar divisiones faltantes",
    description: "Asigna división a jugadores que no tienen una asignada",
    fn: "assignMissingDivisions",
    payload: {},
    color: "text-cyan-400",
    bg: "bg-cyan-500/10 border-cyan-500/20",
  },
  {
    id: "syncPlayerTypes",
    label: "Sincronizar posiciones y tipos",
    description: "Revisa todos los Players y corrige player_type (arquero/jugador_campo) y position_group automáticamente",
    fn: "syncPlayerTypes",
    payload: {},
    color: "text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-500/20",
  },
  {
    id: "repairStrengthLibrary",
    label: "Reparar Biblioteca de Fuerza",
    description: "Elimina ejercicios de la Biblioteca de Fuerza creados desde sesiones que ya no existen",
    fn: "repairStrengthLibrary",
    payload: {},
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
  },
  {
    id: "syncExerciseLibraries",
    label: "Sincronizar bibliotecas con sesiones",
    description: "Vincula ejercicios, detecta duplicados, actualiza plantillas y recalcula carga externa histórica",
    fn: "syncExerciseLibraries",
    payload: {},
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
];

export default function AdminTools() {
  const { toast } = useToast();
  const [running, setRunning] = useState(null);
  const [results, setResults] = useState({});
  const [nutritionRows, setNutritionRows] = useState([]);
  const [players, setPlayers] = useState([]);

  async function loadNutritionRepair() {
    const [rows, playerRows] = await Promise.all([
      base44.entities.NutritionAssessment.list("-fecha", 3000),
      base44.entities.Player.list("full_name", 3000),
    ]);
    setNutritionRows(rows);
    setPlayers(playerRows);
  }

  React.useEffect(() => { loadNutritionRepair(); }, []);

  async function runTool(tool) {
    setRunning(tool.id);
    try {
      const res = await base44.functions.invoke(tool.fn, tool.payload);
      setResults(prev => ({ ...prev, [tool.id]: { ok: true, data: res.data } }));
      toast({ title: `✓ ${tool.label} completado` });
    } catch (e) {
      setResults(prev => ({ ...prev, [tool.id]: { ok: false, error: e.message } }));
      toast({ title: `Error en ${tool.label}`, description: e.message, variant: "destructive" });
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">Herramientas del sistema</h2>
        <p className="text-zinc-500 text-xs mt-0.5">Sincronización, reparación y mantenimiento de datos</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TOOLS.map(tool => {
          const result = results[tool.id];
          const isRunning = running === tool.id;
          return (
            <div key={tool.id} className={`bg-zinc-900 border rounded-xl p-5 space-y-3 ${result?.ok ? "border-emerald-500/30" : result?.ok === false ? "border-red-500/30" : "border-zinc-800"}`}>
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium ${tool.bg} ${tool.color}`}>
                <Wrench size={11} /> {tool.label}
              </div>
              <p className="text-zinc-400 text-xs">{tool.description}</p>
              {result && (
                <div className={`flex items-start gap-2 p-2 rounded-lg text-xs ${result.ok ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>
                  {result.ok ? <CheckCircle2 size={12} className="shrink-0 mt-0.5" /> : <AlertTriangle size={12} className="shrink-0 mt-0.5" />}
                  <span>{result.ok ? (result.data?.summary || "Completado correctamente") : result.error}</span>
                </div>
              )}
              <button
                onClick={() => runTool(tool)}
                disabled={isRunning || !!running}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                <RefreshCw size={13} className={isRunning ? "animate-spin" : ""} />
                {isRunning ? "Ejecutando..." : "Ejecutar"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Reparar minutos huérfanos */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <OrphanMinutesRepair />
      </div>

      <NutritionRepairPanel assessments={nutritionRows} players={players} onReload={loadNutritionRepair} />

      {/* Importaciones / Exportaciones */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
          <FileUp size={15} className="text-pink-400" /> Importaciones y Exportaciones
        </h3>
        <p className="text-zinc-500 text-xs mb-4">Accedé a los módulos de importación desde las secciones correspondientes de la plataforma.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: "Importar jugadores (Excel)", desc: "Sección Admin Plantel → Importar", icon: FileUp },
            { label: "Importar GPS (Catapult)", desc: "Módulo Catapult → Cargar CSV", icon: FileUp },
            { label: "Importar minutos juveniles", desc: "Módulo Performance → Minutos", icon: FileUp },
            { label: "Exportar PDF de minutos", desc: "Módulo Performance → Minutos → PDF", icon: FileDown },
          ].map(item => (
            <div key={item.label} className="flex items-start gap-3 bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-3">
              <item.icon size={14} className="text-pink-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-white font-medium">{item.label}</p>
                <p className="text-xs text-zinc-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
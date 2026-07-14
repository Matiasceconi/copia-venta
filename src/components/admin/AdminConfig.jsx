import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Settings, ChevronDown, ChevronUp, Plus, Trash2, Save } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import NutritionSettingsPanel from "@/components/nutrition/NutritionSettingsPanel";
import ClubSettingsPanel from "@/components/clubs/ClubSettingsPanel";

const DEFAULT_SEASONS = ["2024", "2025", "2026", "2025/2026"];
const DEFAULT_CATEGORIES = ["Sub-14", "Sub-15", "Sub-16", "Sub-17", "Sub-18", "Sub-20", "Reserva", "Primera"];
const DEFAULT_POSITIONS = [
  "Arquero", "Defensor Central", "Lateral Derecho", "Lateral Izquierdo",
  "Mediocampista Central", "Volante Interno", "Extremo Derecho", "Extremo Izquierdo",
  "Mediapunta", "Delantero Centro", "Segundo Delantero"
];
const DEFAULT_GPS_VARS = [
  { key: "total_distance", label: "Distancia Total", unit: "m" },
  { key: "m_min", label: "Metros por minuto", unit: "m/min" },
  { key: "distance_19_8", label: "Distancia 19.8–25 km/h", unit: "m" },
  { key: "distance_25", label: "Distancia D+ 25 km/h", unit: "m" },
  { key: "sprints", label: "Sprint Efforts", unit: "" },
  { key: "acc_3", label: "Aceleraciones +3 m/s²", unit: "" },
  { key: "dec_3", label: "Desaceleraciones +3 m/s²", unit: "" },
  { key: "player_load", label: "Player Load", unit: "" },
  { key: "smax", label: "Velocidad Máxima (Smax)", unit: "km/h" },
];

function ConfigBlock({ title, icon: BlockIcon, children, defaultOpen = false }) {
  const Icon = BlockIcon;
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-800/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon size={15} className="text-cyan-400" />
          <span className="text-white font-semibold text-sm">{title}</span>
        </div>
        {open ? <ChevronUp size={15} className="text-zinc-500" /> : <ChevronDown size={15} className="text-zinc-500" />}
      </button>
      {open && <div className="border-t border-zinc-800 p-5">{children}</div>}
    </div>
  );
}

function ListEditor({ items, placeholder, onAdd, onRemove }) {
  const [input, setInput] = useState("");
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-xs text-zinc-300">
            {item}
            <button onClick={() => onRemove(i)} className="text-zinc-600 hover:text-red-400 transition-colors ml-1">
              <Trash2 size={10} />
            </button>
          </span>
        ))}
        {items.length === 0 && <span className="text-xs text-zinc-600 italic">Sin elementos</span>}
      </div>
      <form onSubmit={e => { e.preventDefault(); if (input.trim()) { onAdd(input.trim()); setInput(""); } }} className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500"
        />
        <button type="submit" className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-xs transition-colors">
          <Plus size={11} /> Agregar
        </button>
      </form>
    </div>
  );
}

export default function AdminConfig() {
  const { toast } = useToast();
  const [seasons, setSeasons] = useState(() => {
    try { return JSON.parse(localStorage.getItem("admin_seasons") || "null") || DEFAULT_SEASONS; } catch { return DEFAULT_SEASONS; }
  });
  const [categories, setCategories] = useState(() => {
    try { return JSON.parse(localStorage.getItem("admin_categories") || "null") || DEFAULT_CATEGORIES; } catch { return DEFAULT_CATEGORIES; }
  });
  const [positions, setPositions] = useState(() => {
    try { return JSON.parse(localStorage.getItem("admin_positions") || "null") || DEFAULT_POSITIONS; } catch { return DEFAULT_POSITIONS; }
  });
  const [nutritionStatuses, setNutritionStatuses] = useState([]);
  const [nutritionReferences, setNutritionReferences] = useState([]);
  const [rivalClubs, setRivalClubs] = useState([]);
  const [matches, setMatches] = useState([]);

  async function loadNutritionConfig() {
    const [statuses, references] = await Promise.all([
      base44.entities.NutritionReadingStatus.list("order", 100).catch(() => []),
      base44.entities.NutritionReferenceRange.list("order", 200).catch(() => []),
    ]);
    setNutritionStatuses(statuses);
    setNutritionReferences(references);
  }

  async function loadClubConfig() {
    const [clubRows, matchRows] = await Promise.all([
      base44.entities.RivalClub.list("official_name", 500).catch(() => []),
      base44.entities.MatchReport.list("-date", 500).catch(() => []),
    ]);
    setRivalClubs(clubRows);
    setMatches(matchRows);
  }

  useEffect(() => { loadNutritionConfig(); loadClubConfig(); }, []);

  function saveConfig() {
    localStorage.setItem("admin_seasons", JSON.stringify(seasons));
    localStorage.setItem("admin_categories", JSON.stringify(categories));
    localStorage.setItem("admin_positions", JSON.stringify(positions));
    toast({ title: "Configuración guardada localmente" });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Configuración del sistema</h2>
          <p className="text-zinc-500 text-xs mt-0.5">Parámetros generales de la plataforma</p>
        </div>
        <button
          onClick={saveConfig}
          className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30 rounded-lg text-sm transition-colors"
        >
          <Save size={13} /> Guardar configuración
        </button>
      </div>

      <ConfigBlock title="Temporadas" icon={Settings} defaultOpen>
        <ListEditor
          items={seasons}
          placeholder="ej: 2027"
          onAdd={v => setSeasons(prev => [...prev, v])}
          onRemove={i => setSeasons(prev => prev.filter((_, idx) => idx !== i))}
        />
      </ConfigBlock>

      <ConfigBlock title="Categorías" icon={Settings}>
        <ListEditor
          items={categories}
          placeholder="ej: Sub-19"
          onAdd={v => setCategories(prev => [...prev, v])}
          onRemove={i => setCategories(prev => prev.filter((_, idx) => idx !== i))}
        />
      </ConfigBlock>

      <ConfigBlock title="Posiciones" icon={Settings}>
        <ListEditor
          items={positions}
          placeholder="ej: Carrilero"
          onAdd={v => setPositions(prev => [...prev, v])}
          onRemove={i => setPositions(prev => prev.filter((_, idx) => idx !== i))}
        />
      </ConfigBlock>

      <ConfigBlock title="Variables GPS" icon={Settings}>
        <div className="space-y-2">
          {DEFAULT_GPS_VARS.map(v => (
            <div key={v.key} className="flex items-center gap-3 px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
              <span className="text-xs font-mono text-zinc-500 w-32 shrink-0">{v.key}</span>
              <span className="text-sm text-white flex-1">{v.label}</span>
              {v.unit && <span className="text-xs text-zinc-500 shrink-0">{v.unit}</span>}
            </div>
          ))}
          <p className="text-xs text-zinc-600 mt-2">Las variables GPS son fijas según el esquema de importación Catapult.</p>
        </div>
      </ConfigBlock>

      <ConfigBlock title="Clubes y rivales" icon={Settings}>
        <ClubSettingsPanel clubs={rivalClubs} matches={matches} onReload={loadClubConfig} />
      </ConfigBlock>

      <ConfigBlock title="Nutrición" icon={Settings}>
        <NutritionSettingsPanel
          readingStatuses={nutritionStatuses}
          referenceRanges={nutritionReferences}
          onReload={loadNutritionConfig}
        />
      </ConfigBlock>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h3 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
          <Settings size={14} className="text-cyan-400" /> Parámetros generales
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "Club", value: "Defensa y Justicia" },
            { label: "Temporada activa", value: seasons[seasons.length - 1] || "—" },
            { label: "Plataforma", value: "PerformancePitch" },
          ].map(p => (
            <div key={p.label} className="bg-zinc-800/40 border border-zinc-700/40 rounded-xl p-3">
              <p className="text-xs text-zinc-500 mb-0.5">{p.label}</p>
              <p className="text-sm text-white font-medium">{p.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATUS_LABELS } from "./medicalStatusConfig";

export default function MedicalSheetFilters({ filters, setFilters, categories, seasons }) {
  const set = (key) => (v) => setFilters((f) => ({ ...f, [key]: v }));

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-2 bg-zinc-900 border border-zinc-800 rounded-xl p-3">
      <Input
        placeholder="Buscar jugador..."
        value={filters.player}
        onChange={(e) => set("player")(e.target.value)}
        className="bg-zinc-800 border-zinc-700 text-white text-xs h-9"
      />
      <Select value={filters.category} onValueChange={set("category")}>
        <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white text-xs h-9"><SelectValue placeholder="Categoría" /></SelectTrigger>
        <SelectContent className="bg-zinc-800 border-zinc-700">
          <SelectItem value="all" className="text-white">Todas las categorías</SelectItem>
          {categories.map((c) => <SelectItem key={c} value={c} className="text-white">{c}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filters.status} onValueChange={set("status")}>
        <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white text-xs h-9"><SelectValue placeholder="Estado" /></SelectTrigger>
        <SelectContent className="bg-zinc-800 border-zinc-700">
          <SelectItem value="all" className="text-white">Todos los estados</SelectItem>
          {Object.entries(STATUS_LABELS).map(([v, label]) => (
            <SelectItem key={v} value={v} className="text-white">{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        placeholder="Tipo de lesión..."
        value={filters.injuryType}
        onChange={(e) => set("injuryType")(e.target.value)}
        className="bg-zinc-800 border-zinc-700 text-white text-xs h-9"
      />
      <Input
        type="date"
        value={filters.date}
        onChange={(e) => set("date")(e.target.value)}
        className="bg-zinc-800 border-zinc-700 text-white text-xs h-9"
      />
      <Select value={filters.season} onValueChange={set("season")}>
        <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white text-xs h-9"><SelectValue placeholder="Temporada" /></SelectTrigger>
        <SelectContent className="bg-zinc-800 border-zinc-700">
          <SelectItem value="all" className="text-white">Todas las temporadas</SelectItem>
          {seasons.map((s) => <SelectItem key={s} value={s} className="text-white">{s}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
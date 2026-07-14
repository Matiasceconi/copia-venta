import React, { useState } from "react";
import { Eye, X, AlertCircle } from "lucide-react";
import { DEFAULT_TEMPLATE_NAMES, MAIN_FIELDS, ALL_FIELDS, saveTemplate } from "@/components/sessions/gps/gpsColumnsConfig";

export default function GpsImportPreview({ preview, selectedFields, setSelectedFields, templates, onTemplatesChange, importing, onCancel, onConfirm }) {
  const [templateChoice, setTemplateChoice] = useState("");
  const { matched, missingMainFields, extraHeaders, parsedRows, fileName } = preview;

  function toggleField(field) {
    setSelectedFields(prev => prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]);
  }

  function applyTemplate(name) {
    setTemplateChoice(name);
    if (name && templates[name]) setSelectedFields(templates[name].filter(f => matched.some(m => m.colDef.field === f)));
  }

  function handleSaveTemplate() {
    const name = window.prompt("Nombre de la plantilla:", "GPS personalizado");
    if (!name) return;
    const updated = saveTemplate(name, selectedFields);
    onTemplatesChange(updated);
  }

  const displayedCols = matched.filter(m => selectedFields.includes(m.colDef.field));

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white flex items-center gap-2">
          <Eye size={14} className="text-blue-400" /> Vista previa — {fileName}
        </p>
        <button onClick={onCancel} className="text-zinc-500 hover:text-white"><X size={16} /></button>
      </div>

      {missingMainFields.length > 0 && (
        <div className="flex items-start gap-2 px-3 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <AlertCircle size={15} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-amber-300">Variable no detectada:</p>
            <p className="text-xs text-amber-400 mt-0.5">{missingMainFields.map(c => c.csvHeader).join(", ")}</p>
            <p className="text-[10px] text-zinc-500 mt-1">No rompe la importación, simplemente no habrá datos para esas columnas.</p>
          </div>
        </div>
      )}

      {/* Quick select + templates */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setSelectedFields(matched.map(m => m.colDef.field))}
          className="px-2.5 py-1 rounded-lg text-[11px] bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700">Todas</button>
        <button onClick={() => setSelectedFields(matched.filter(m => MAIN_FIELDS.includes(m.colDef.field)).map(m => m.colDef.field))}
          className="px-2.5 py-1 rounded-lg text-[11px] bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700">Solo principales</button>
        <button onClick={() => setSelectedFields([])}
          className="px-2.5 py-1 rounded-lg text-[11px] bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700">Ninguna</button>
        <select value={templateChoice} onChange={e => applyTemplate(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-[11px] text-zinc-300 focus:outline-none">
          <option value="">Cargar plantilla...</option>
          {[...new Set([...DEFAULT_TEMPLATE_NAMES, ...Object.keys(templates)])].map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <button onClick={handleSaveTemplate}
          className="px-2.5 py-1 rounded-lg text-[11px] bg-blue-500/15 border border-blue-500/30 text-blue-300 hover:bg-blue-500/25">
          Guardar selección como plantilla
        </button>
      </div>

      {/* Checkboxes per detected column */}
      <div>
        <p className="text-[10px] text-zinc-500 mb-2 uppercase tracking-wider font-medium">Columnas detectadas ({matched.length}) — elegí cuáles importar/visualizar</p>
        <div className="flex flex-wrap gap-2">
          {matched.filter(m => !m.colDef.core).map(({ colDef }) => (
            <label key={colDef.field} className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg border cursor-pointer transition-colors ${
              selectedFields.includes(colDef.field) ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-zinc-800 border-zinc-700 text-zinc-400"
            }`}>
              <input type="checkbox" className="accent-emerald-500" checked={selectedFields.includes(colDef.field)} onChange={() => toggleField(colDef.field)} />
              {colDef.label}
            </label>
          ))}
        </div>
        {extraHeaders.length > 0 && (
          <p className="text-[10px] text-zinc-600 mt-2">Otras columnas del CSV sin mapeo conocido (se guardan igual): {extraHeaders.join(", ")}</p>
        )}
      </div>

      {/* Preview rows (only selected columns) */}
      {parsedRows.length > 0 && (
        <div>
          <p className="text-[10px] text-zinc-500 mb-2 uppercase tracking-wider font-medium">
            Primeras filas ({Math.min(5, parsedRows.length)} de {parsedRows.length})
          </p>
          <div className="overflow-x-auto">
            <table className="text-[10px] border-collapse w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-1.5 px-2 text-zinc-500 font-medium whitespace-nowrap">Jugador</th>
                  {displayedCols.map(({ colDef, header }) => (
                    <th key={header} className="text-left py-1.5 px-2 text-zinc-500 font-medium whitespace-nowrap">{colDef.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsedRows.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-b border-zinc-800/40">
                    <td className="py-1.5 px-2 text-zinc-300 whitespace-nowrap">{row["Name"] || "—"}</td>
                    {displayedCols.map(({ colDef, header }) => (
                      <td key={header} className="py-1.5 px-2 text-zinc-300 whitespace-nowrap">{row[header] || "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded-lg text-xs hover:bg-zinc-700 transition-colors">Cancelar</button>
        <button onClick={onConfirm} disabled={importing}
          className="px-4 py-1.5 bg-white text-zinc-900 font-semibold rounded-lg text-xs hover:bg-zinc-200 transition-colors disabled:opacity-40">
          {importing ? "Importando..." : `Confirmar e importar (${parsedRows.length} jugadores)`}
        </button>
      </div>
    </div>
  );
}
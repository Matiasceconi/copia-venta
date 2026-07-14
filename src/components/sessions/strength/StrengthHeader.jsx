import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";

const MANUAL_FIELDS = [
  { key: "strength_purpose", label: "Propósito mecánico" },
  { key: "strength_session_type", label: "Tipo de sesión" },
  { key: "strength_vector_pattern", label: "Patrón vectorial" },
];

export default function StrengthHeader({ session, onSessionUpdate }) {
  const [vals, setVals] = useState({});
  const { toast } = useToast();

  useEffect(() => {
    const h = {};
    MANUAL_FIELDS.forEach(f => { h[f.key] = session[f.key] || ""; });
    setVals(h);
  }, [session.id]);

  async function save() {
    const update = {};
    MANUAL_FIELDS.forEach(f => { update[f.key] = vals[f.key] || ""; });
    await base44.entities.TrainingSession.update(session.id, update);
    if (onSessionUpdate) onSessionUpdate({ ...session, ...update });
    toast({ title: "✓ Encabezado guardado" });
  }

  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <p className="text-[10px] text-zinc-500 mb-0.5">Fecha</p>
          <p className="text-white font-medium">{moment(session.date).format("DD/MM/YYYY")}</p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-500 mb-0.5">Sesión</p>
          <p className="text-white font-medium">{session.title || "—"}</p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-500 mb-0.5">Plantel</p>
          <p className="text-white font-medium">{session.squad_name || "—"}</p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-500 mb-0.5">MD (Microciclo)</p>
          <p className="text-white font-medium">{session.match_day_code || "—"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-zinc-700 pt-3">
        {MANUAL_FIELDS.map(f => (
          <div key={f.key}>
            <label className="text-[10px] text-zinc-500 mb-1 block">{f.label}</label>
            <input value={vals[f.key] || ""} onChange={e => setVals(p => ({ ...p, [f.key]: e.target.value }))}
              className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none" />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <button onClick={save} className="px-3 py-1.5 bg-zinc-600 hover:bg-zinc-500 text-white rounded-lg text-xs transition-colors">
          Guardar encabezado
        </button>
      </div>
    </div>
  );
}
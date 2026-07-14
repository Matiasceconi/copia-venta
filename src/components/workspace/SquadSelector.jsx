import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, ShieldCheck } from "lucide-react";
import { useWorkspace } from "@/lib/WorkspaceContext";

export default function SquadSelector() {
  const { mySquads, activeSquad, setActiveSquad } = useWorkspace();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  if (mySquads.length === 0) return null;

  // Single squad — static label
  if (mySquads.length === 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700">
        <ShieldCheck size={12} className="text-yellow-400 shrink-0" />
        <div className="min-w-0">
          <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-medium leading-none mb-0.5">Plantel activo</p>
          <p className="text-xs font-bold text-white truncate">{activeSquad?.name || "—"}</p>
        </div>
      </div>
    );
  }

  // Multiple squads — dropdown
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700 hover:bg-zinc-700/60 transition-colors w-full group">
        <ShieldCheck size={12} className="text-yellow-400 shrink-0" />
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-medium leading-none mb-0.5">Plantel activo</p>
          <p className="text-xs font-bold text-white truncate">{activeSquad?.name || "Seleccionar plantel"}</p>
        </div>
        <ChevronDown size={12} className={`text-zinc-400 transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-full min-w-[200px] bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden">
          <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold px-3 pt-2.5 pb-1">Cambiar plantel</p>
          {mySquads.map(squad => (
            <button
              key={squad.id}
              onClick={() => { setActiveSquad(squad); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-zinc-800 transition-colors">
              <Check
                size={11}
                className={`shrink-0 ${activeSquad?.id === squad.id ? "text-yellow-400" : "text-transparent"}`}
              />
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold ${activeSquad?.id === squad.id ? "text-white" : "text-zinc-400"}`}>
                  {squad.name}
                </p>
                {squad.category && <p className="text-[10px] text-zinc-600">{squad.category}</p>}
              </div>
              {activeSquad?.id === squad.id && (
                <span className="text-[9px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full border border-yellow-500/30 font-medium shrink-0">
                  activo
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { BookOpen } from "lucide-react";

export default function StrengthExercisePicker({ squadId, onPick }) {
  const [open, setOpen] = useState(false);
  const [exercises, setExercises] = useState([]);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleOpen() {
    if (!open) {
      base44.entities.StrengthExerciseLibrary.list("-times_used", 300).then(data => {
        setExercises(data.filter(e => e.global === true || e.squad_id === squadId));
      });
    }
    setOpen(o => !o);
  }

  const filtered = exercises.filter(e => !search || (e.name || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={toggleOpen}
        className="p-1 text-zinc-500 hover:text-blue-400 transition-colors shrink-0" title="Elegir desde biblioteca">
        <BookOpen size={13} />
      </button>
      {open && (
        <div className="absolute z-30 top-full left-0 mt-1 w-64 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl max-h-72 flex flex-col">
          <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar ejercicio..."
            className="w-full bg-zinc-800 border-b border-zinc-700 rounded-t-lg px-2 py-1.5 text-xs text-white focus:outline-none" />
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 && <p className="text-zinc-600 text-xs text-center py-3">Sin resultados</p>}
            {filtered.map(ex => (
              <button key={ex.id} type="button"
                onClick={() => { onPick(ex); setOpen(false); setSearch(""); }}
                className="w-full text-left px-2.5 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800 transition-colors flex items-center gap-2">
                {ex.image_url && <img src={ex.image_url} alt="" className="w-6 h-6 object-cover rounded shrink-0" />}
                <span className="truncate">{ex.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
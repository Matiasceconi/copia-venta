import React from "react";
import FieldLibraryPanel from "@/components/sessions/FieldLibraryPanel";
import { useWorkspace } from "@/lib/WorkspaceContext";

export default function FieldLibrary() {
  const { activeSquad } = useWorkspace();
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white">Biblioteca de Campo</h1>
        <p className="text-xs text-zinc-500 mt-1">
          Plantel activo: <span className="text-zinc-300 font-medium">{activeSquad?.name || "—"}</span>
          {" · "}Ejercicios globales + los propios de este plantel
        </p>
      </div>
      <FieldLibraryPanel />
    </div>
  );
}
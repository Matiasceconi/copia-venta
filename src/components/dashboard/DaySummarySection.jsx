import React, { useState } from "react";
import { Activity, AlertCircle, ArrowDown, ArrowUpCircle, ClipboardList, Gauge, Shield, UserCheck, UserCog, UserX, Zap } from "lucide-react";
import DaySummaryCard from "./DaySummaryCard";
import DaySummaryDetailModal from "./DaySummaryDetailModal";

const COLORS = {
  emerald: { text: "text-emerald-400" },
  yellow: { text: "text-yellow-400" },
  red: { text: "text-red-400" },
  amber: { text: "text-amber-400" },
  purple: { text: "text-purple-400" },
  sky: { text: "text-sky-400" },
  blue: { text: "text-blue-400" },
  orange: { text: "text-orange-400" },
  zinc: { text: "text-zinc-300" },
};

function hasPendingLoad(ds = {}) {
  const text = `${ds.load_status || ""} ${ds.gps_status || ""} ${(ds.tags || []).join(" ")} ${ds.notes || ""}`.toLowerCase();
  return ds.load_pending === true || ds.gps_pending === true || text.includes("carga pendiente") || text.includes("gps pendiente");
}

function SummaryGroup({ title, index, items, onOpen }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-3">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{index}. {title}</p>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
        {items.map((item) => (
          <DaySummaryCard
            key={item.key}
            icon={item.icon}
            label={item.label}
            value={item.value}
            colors={COLORS[item.color] || COLORS.zinc}
            onClick={() => onOpen({ title: item.label, records: item.records })}
          />
        ))}
      </div>
    </div>
  );
}

export default function DaySummarySection({ squadRecords, byStatus, subenA = [], subenReservaAPrimera = [], bajanA = [], convocadosOtraCategoria = [], playerMap, isGKFn }) {
  const [detail, setDetail] = useState(null);

  const disponibles = byStatus.disponible || [];
  const modificados = [...(byStatus.molestia || []), ...(byStatus.reintegro || [])];
  const lesionados = byStatus.lesionado || [];
  const diferenciados = byStatus.diferenciado || [];
  const suspendidos = byStatus.suspendido || [];
  const arquerosDisponibles = disponibles.filter(ds => isGKFn(ds));
  const sinEstadoActualizado = squadRecords.filter(ds => ds._synthetic);
  const cargaPendiente = squadRecords.filter(hasPendingLoad);

  const estadoDeportivo = [
    { key: "disponibles", label: "Disponibles", value: disponibles.length, icon: Activity, color: "emerald", records: disponibles },
    { key: "modificados", label: "Modificados", value: modificados.length, icon: UserCog, color: "yellow", records: modificados },
    { key: "lesionados", label: "Lesionados", value: lesionados.length, icon: AlertCircle, color: "red", records: lesionados },
    { key: "diferenciados", label: "Diferenciados", value: diferenciados.length, icon: Zap, color: "purple", records: diferenciados },
    { key: "suspendidos", label: "Suspendidos", value: suspendidos.length, icon: UserX, color: "zinc", records: suspendidos },
  ];

  const movimientos = [
    { key: "subenPrimera", label: "Suben a Primera", value: subenReservaAPrimera.length, icon: ArrowUpCircle, color: "sky", records: subenReservaAPrimera },
    { key: "bajanReserva", label: "Bajan a Reserva", value: bajanA.length, icon: ArrowDown, color: "blue", records: bajanA },
    { key: "otraCategoria", label: "Citados otra categoría", value: convocadosOtraCategoria.length + subenA.length, icon: UserCheck, color: "orange", records: [...convocadosOtraCategoria, ...subenA] },
  ];

  const alertas = [
    { key: "arqueros", label: "Arqueros disponibles", value: arquerosDisponibles.length, icon: Shield, color: "emerald", records: arquerosDisponibles },
    { key: "sinEstado", label: "Sin estado actualizado", value: sinEstadoActualizado.length, icon: AlertCircle, color: "amber", records: sinEstadoActualizado },
    { key: "cargaPendiente", label: "Carga pendiente", value: cargaPendiente.length, icon: Gauge, color: "yellow", records: cargaPendiente },
  ];

  return (
    <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Resumen del día</h2>
        <span className="inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-950 px-2 py-1 text-[11px] text-zinc-500">
          <ClipboardList size={12} /> {squadRecords.length} jugadores considerados
        </span>
      </div>

      <SummaryGroup title="Estado deportivo" index="1" items={estadoDeportivo} onOpen={setDetail} />
      <SummaryGroup title="Movimientos" index="2" items={movimientos} onOpen={setDetail} />
      <SummaryGroup title="Alertas" index="3" items={alertas} onOpen={setDetail} />

      {detail && (
        <DaySummaryDetailModal
          open={!!detail}
          onClose={() => setDetail(null)}
          title={detail.title}
          records={detail.records}
          playerMap={playerMap}
        />
      )}
    </div>
  );
}
import React from "react";
import moment from "moment";
import { AlertCircle, Lock } from "lucide-react";

function fmtDate(d) { return d ? moment(d).format("DD/MM/YYYY") : "—"; }

function EmptyState({ text = "Sin registros" }) {
  return <div className="text-center py-10 text-zinc-600 text-sm">{text}</div>;
}

const MEDICAL_ROLES = ["Administrador", "Coordinador", "Director Deportivo", "Médico", "Kinesiólogo"];

export default function PlayerMedicalTab({ medical, userRole }) {
  const canView = MEDICAL_ROLES.includes(userRole);

  if (!canView) {
    return (
      <div className="text-center py-14 space-y-2">
        <Lock size={22} className="text-zinc-600 mx-auto" />
        <p className="text-zinc-500 text-sm">No tenés permisos para ver información médica</p>
      </div>
    );
  }

  if (!medical.length) return <EmptyState />;
  const active = medical.filter(m => ["Activa", "activa", "En tratamiento"].includes(m.status));
  const history = medical.filter(m => !["Activa", "activa", "En tratamiento"].includes(m.status));

  return (
    <div className="space-y-4">
      {active.length > 0 && (
        <div>
          <p className="text-xs text-red-400 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
            <AlertCircle size={11} /> Lesiones activas ({active.length})
          </p>
          {active.map(m => (
            <div key={m.id} className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-1.5 mb-2">
              <p className="text-white font-semibold">{m.diagnosis}</p>
              <div className="grid grid-cols-2 gap-1 text-xs text-zinc-400">
                {m.body_zone && <span>Zona: {m.body_zone}</span>}
                {m.injury_date && <span>Fecha: {fmtDate(m.injury_date)}</span>}
                {m.expected_return && <span>Alta estimada: {fmtDate(m.expected_return)}</span>}
                {m.days_out && <span>Días de baja: {m.days_out}</span>}
              </div>
              {m.notes && <p className="text-xs text-zinc-500 italic">{m.notes}</p>}
            </div>
          ))}
        </div>
      )}
      {history.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Historial médico</p>
          <div className="space-y-2">
            {history.map(m => (
              <div key={m.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-white">{m.diagnosis}</p>
                  {m.status && <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 shrink-0">{m.status}</span>}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  {fmtDate(m.injury_date)}{m.body_zone ? ` · ${m.body_zone}` : ""}{m.days_out ? ` · ${m.days_out} días` : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
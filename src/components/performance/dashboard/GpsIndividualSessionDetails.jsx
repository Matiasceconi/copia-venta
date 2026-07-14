import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import moment from "moment";

export default function GpsIndividualSessionDetails({ records }) {
  const [expandedRow, setExpandedRow] = useState(null);

  const formatNumber = (num) => {
    if (!num) return "-";
    return Number(num).toFixed(1);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4">Detalle de sesiones</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left py-3 px-4 text-zinc-400 font-semibold text-xs">Fecha</th>
              <th className="text-left py-3 px-4 text-zinc-400 font-semibold text-xs">Sesión</th>
              <th className="text-right py-3 px-4 text-zinc-400 font-semibold text-xs">Distancia</th>
              <th className="text-right py-3 px-4 text-zinc-400 font-semibold text-xs">Sprints</th>
              <th className="text-right py-3 px-4 text-zinc-400 font-semibold text-xs">Carga</th>
              <th className="text-right py-3 px-4 text-zinc-400 font-semibold text-xs">V.Max</th>
              <th className="text-center py-3 px-4 text-zinc-400 font-semibold text-xs">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <React.Fragment key={record.id}>
                <tr
                  className="border-b border-zinc-800 hover:bg-zinc-800/50 cursor-pointer transition-colors"
                  onClick={() =>
                    setExpandedRow(expandedRow === record.id ? null : record.id)
                  }
                >
                  <td className="py-3 px-4 text-white">
                    {moment(record.date).format("DD/MM/YYYY")}
                  </td>
                  <td className="py-3 px-4 text-zinc-300">
                    {record.matchDayCode && (
                      <span className="inline-block bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-full mr-2">
                        {record.matchDayCode}
                      </span>
                    )}
                    <span className="text-xs">{record.sessionTitle || "Entrenamiento"}</span>
                  </td>
                  <td className="py-3 px-4 text-right text-white font-medium">
                    {formatNumber(record.total_distance)} m
                  </td>
                  <td className="py-3 px-4 text-right text-white font-medium">
                    {formatNumber(record.sprints)}
                  </td>
                  <td className="py-3 px-4 text-right text-white font-medium">
                    {formatNumber(record.player_load)} au
                  </td>
                  <td className="py-3 px-4 text-right text-white font-medium">
                    {formatNumber(record.max_speed)} km/h
                  </td>
                  <td className="py-3 px-4 text-center">
                    {expandedRow === record.id ? (
                      <ChevronUp size={16} className="text-zinc-500 mx-auto" />
                    ) : (
                      <ChevronDown size={16} className="text-zinc-500 mx-auto" />
                    )}
                  </td>
                </tr>

                {/* Expanded Row */}
                {expandedRow === record.id && (
                  <tr className="bg-zinc-800/30 border-b border-zinc-800">
                    <td colSpan="7" className="py-4 px-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        <StatDetail label="Distancia total" value={formatNumber(record.total_distance)} unit="m" />
                        <StatDetail label="M/min" value={formatNumber(record.m_min)} unit="" />
                        <StatDetail label="Sprints" value={formatNumber(record.sprints)} unit="" />
                        <StatDetail label="Carga de jugador" value={formatNumber(record.player_load)} unit="au" />
                        <StatDetail label="Velocidad máxima" value={formatNumber(record.max_speed)} unit="km/h" />
                        <StatDetail label="Velocidad promedio" value={formatNumber(record.avg_speed)} unit="km/h" />
                        <StatDetail label="Smax" value={formatNumber(record.smax)} unit="" />
                        <StatDetail label="RHIE bouts" value={formatNumber(record.rhie_bouts)} unit="" />
                        <StatDetail label="Aceleraciones" value={formatNumber(record.accelerations)} unit="" />
                        <StatDetail label="Deceleraciones" value={formatNumber(record.decelerations)} unit="" />
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatDetail({ label, value, unit }) {
  return (
    <div className="bg-zinc-900 rounded-lg p-3">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-lg font-semibold text-white">
        {value} <span className="text-xs text-zinc-400">{unit}</span>
      </p>
    </div>
  );
}
"use client";

import { useState } from "react";
import { Calendar, Check, X, Clock, Ban } from "lucide-react";
import { type Cita, canalLabel, fmtFechaHora, isPast, nombreEsUtil } from "./types";

type Props = {
  citas: Cita[];
  onMarcarAsistio: (id: string, asistio: boolean | null) => Promise<void>;
  onCancelar: (id: string) => void;
};

export default function CitasTable({ citas, onMarcarAsistio, onCancelar }: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleAsistio(id: string, asistio: boolean | null) {
    setLoadingId(id);
    await onMarcarAsistio(id, asistio);
    setLoadingId(null);
  }

  if (citas.length === 0) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 px-6 py-20 text-center">
        <Calendar size={36} className="mx-auto mb-3 text-gray-700" strokeWidth={1.5} />
        <p className="text-sm font-medium text-gray-400">No hay citas agendadas todavía</p>
        <p className="mt-1 text-xs text-gray-600">
          Las citas aparecerán aquí cuando el agente IA las confirme con los leads.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
      {/* Header */}
      <div className="grid grid-cols-[1fr_200px_80px_100px_100px_44px] gap-4 border-b border-gray-800 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
        <span>Lead</span>
        <span>Fecha y hora</span>
        <span>Duración</span>
        <span>Confirmada</span>
        <span>Asistió</span>
        <span className="sr-only">Cancelar</span>
      </div>

      <div className="divide-y divide-gray-800/70">
        {citas.map((c) => {
          const past = isPast(c.fecha_hora);
          return (
            <div
              key={c.id}
              className="grid grid-cols-[1fr_200px_80px_100px_100px_44px] items-center gap-4 px-5 py-4 transition-colors hover:bg-gray-800/40"
            >
              {/* Lead — si el nombre no sirve (vacío o solo emoji), el
                  teléfono pasa a ser el identificador principal */}
              <div className="min-w-0">
                {nombreEsUtil(c.leads?.nombre) ? (
                  <>
                    <p className="truncate text-sm font-semibold text-white">{c.leads!.nombre}</p>
                    {c.leads?.telefono && (
                      <p className="mt-0.5 truncate text-xs text-gray-500">{c.leads.telefono}</p>
                    )}
                  </>
                ) : (
                  <p className="truncate text-sm font-semibold text-white">
                    {c.leads?.telefono ?? "Lead sin nombre ni teléfono"}
                  </p>
                )}
                {c.leads?.canal && (
                  <p className="mt-0.5 text-xs text-gray-500">
                    {canalLabel[c.leads.canal] ?? c.leads.canal}
                  </p>
                )}
                {c.notas && (
                  <p className="mt-0.5 truncate text-xs text-gray-600 italic">{c.notas}</p>
                )}
              </div>

              {/* Fecha y hora */}
              <div className="flex items-center gap-2">
                <Clock
                  size={13}
                  className={past ? "shrink-0 text-gray-600" : "shrink-0 text-blue-400"}
                  strokeWidth={2}
                />
                <span className={`text-sm ${past ? "text-gray-500" : "text-gray-200"}`}>
                  {fmtFechaHora(c.fecha_hora)}
                </span>
              </div>

              {/* Duración */}
              <span className="text-sm text-gray-400">
                {c.duracion_min ? `${c.duracion_min} min` : "—"}
              </span>

              {/* Confirmada */}
              <span>
                {c.confirmada ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-300 border border-emerald-500/30">
                    <Check size={11} strokeWidth={2.5} />
                    Confirmada
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-700/50 px-2.5 py-0.5 text-xs font-medium text-gray-400 border border-gray-700">
                    Pendiente
                  </span>
                )}
              </span>

              {/* Asistió — solo tiene sentido preguntarlo de citas ya pasadas.
                  Se marca a mano; volver a pulsar deja la cita sin marcar. */}
              <span className="flex items-center gap-1.5">
                {past ? (
                  <>
                    <button
                      onClick={() => handleAsistio(c.id, c.asistio === true ? null : true)}
                      disabled={loadingId === c.id}
                      title={c.asistio === true ? "Quitar la marca" : "Marcar que asistió"}
                      aria-label={c.asistio === true ? "Quitar la marca de asistió" : "Marcar que asistió"}
                      className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-colors disabled:opacity-40 ${
                        c.asistio === true
                          ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
                          : "border-gray-700 text-gray-600 hover:border-emerald-500/40 hover:text-emerald-300"
                      }`}
                    >
                      <Check size={14} strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={() => handleAsistio(c.id, c.asistio === false ? null : false)}
                      disabled={loadingId === c.id}
                      title={c.asistio === false ? "Quitar la marca" : "Marcar que no asistió"}
                      aria-label={
                        c.asistio === false ? "Quitar la marca de no asistió" : "Marcar que no asistió"
                      }
                      className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-colors disabled:opacity-40 ${
                        c.asistio === false
                          ? "border-red-500/40 bg-red-500/20 text-red-300"
                          : "border-gray-700 text-gray-600 hover:border-red-500/40 hover:text-red-300"
                      }`}
                    >
                      <X size={14} strokeWidth={2.5} />
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-gray-700">—</span>
                )}
              </span>

              {/* Cancelar */}
              <span className="flex justify-end">
                <button
                  onClick={() => onCancelar(c.id)}
                  title="Cancelar cita (no avisa al cliente)"
                  aria-label="Cancelar cita"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-700 text-gray-600 transition-colors hover:border-red-500/40 hover:text-red-300"
                >
                  <Ban size={14} strokeWidth={2} />
                </button>
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-gray-800 px-5 py-3">
        <p className="text-xs text-gray-600">
          Cancelar aquí no avisa al cliente por WhatsApp — hay que avisarle por tu cuenta.
        </p>
        <p className="text-xs text-gray-600">
          {citas.length} cita{citas.length !== 1 ? "s" : ""} en total
        </p>
      </div>
    </div>
  );
}

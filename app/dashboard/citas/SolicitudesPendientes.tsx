"use client";

import { useState } from "react";
import { CalendarClock, Check } from "lucide-react";
import { type Cita, canalLabel } from "./types";

type Props = { citas: Cita[]; onConfirmar: (id: string) => Promise<void> };

export default function SolicitudesPendientes({ citas, onConfirmar }: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const pendientes = citas
    .filter((c) => !c.confirmada)
    .sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime());

  if (pendientes.length === 0) return null;

  async function handleConfirmar(id: string) {
    setLoadingId(id);
    await onConfirmar(id);
    setLoadingId(null);
  }

  return (
    <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <CalendarClock size={16} className="text-amber-400" strokeWidth={1.75} />
        <p className="text-sm font-medium text-amber-300">
          {pendientes.length} solicitud{pendientes.length > 1 ? "es" : ""} de cita pendiente
          {pendientes.length > 1 ? "s" : ""} de confirmar
        </p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {pendientes.map((c) => (
          <div
            key={c.id}
            className="flex w-64 shrink-0 flex-col gap-1.5 rounded-lg border border-gray-800 bg-gray-900 p-3.5"
          >
            <p className="truncate text-sm font-semibold text-white">
              {c.leads?.nombre ?? "Lead sin nombre"}
            </p>
            <p className="text-xs text-gray-400">
              {new Date(c.fecha_hora).toLocaleString("es-ES", {
                weekday: "short",
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
              {c.leads?.canal ? ` · ${canalLabel[c.leads.canal] ?? c.leads.canal}` : ""}
            </p>
            {c.notas && <p className="truncate text-xs italic text-gray-600">{c.notas}</p>}
            <button
              onClick={() => handleConfirmar(c.id)}
              disabled={loadingId === c.id}
              className="mt-1.5 flex items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
            >
              <Check size={12} strokeWidth={2.5} />
              {loadingId === c.id ? "..." : "Confirmar"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

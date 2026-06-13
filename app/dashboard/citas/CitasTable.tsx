"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Calendar, Check, X, Clock } from "lucide-react";

type Cita = {
  id: string;
  fecha_hora: string;
  duracion_min: number | null;
  confirmada: boolean;
  asistio: boolean | null;
  notas: string | null;
  lead_id: string;
  leads: { nombre: string | null; canal: string | null } | null;
};

const canalLabel: Record<string, string> = {
  whatsapp: "WhatsApp",
  email:    "Email",
  webchat:  "Web Chat",
  sms:      "SMS",
};

function fmtFechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    weekday: "short",
    day:     "2-digit",
    month:   "2-digit",
    year:    "numeric",
    hour:    "2-digit",
    minute:  "2-digit",
  });
}

function isPast(iso: string) {
  return new Date(iso) < new Date();
}

type Props = { initialCitas: Cita[]; empresaId: string | null };

export default function CitasTable({ initialCitas, empresaId }: Props) {
  const [citas, setCitas] = useState<Cita[]>(initialCitas);

  useEffect(() => {
    if (!empresaId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`citas-${empresaId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "citas", filter: `empresa_id=eq.${empresaId}` },
        async (payload) => {
          const { data } = await supabase
            .from("citas")
            .select("id, fecha_hora, duracion_min, confirmada, asistio, notas, lead_id, leads(nombre, canal)")
            .eq("id", (payload.new as Cita).id)
            .single();
          if (data) setCitas((prev) => [data as unknown as Cita, ...prev].sort(
            (a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime()
          ));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "citas", filter: `empresa_id=eq.${empresaId}` },
        (payload) => {
          setCitas((prev) =>
            prev.map((c) =>
              c.id === (payload.new as Cita).id
                ? { ...c, ...(payload.new as Partial<Cita>) }
                : c
            )
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "citas", filter: `empresa_id=eq.${empresaId}` },
        (payload) => {
          setCitas((prev) => prev.filter((c) => c.id !== (payload.old as Cita).id));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [empresaId]);

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
      <div className="grid grid-cols-[1fr_200px_80px_100px_100px] gap-4 border-b border-gray-800 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
        <span>Lead</span>
        <span>Fecha y hora</span>
        <span>Duración</span>
        <span>Confirmada</span>
        <span>Asistió</span>
      </div>

      <div className="divide-y divide-gray-800/70">
        {citas.map((c) => {
          const past = isPast(c.fecha_hora);
          return (
            <div
              key={c.id}
              className="grid grid-cols-[1fr_200px_80px_100px_100px] items-center gap-4 px-5 py-4 transition-colors hover:bg-gray-800/40"
            >
              {/* Lead */}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {c.leads?.nombre ?? "Lead sin nombre"}
                </p>
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

              {/* Asistió */}
              <span>
                {c.asistio === true ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-300 border border-emerald-500/30">
                    <Check size={11} strokeWidth={2.5} />
                    Asistió
                  </span>
                ) : c.asistio === false ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-medium text-red-300 border border-red-500/30">
                    <X size={11} strokeWidth={2.5} />
                    No asistió
                  </span>
                ) : (
                  <span className="text-xs text-gray-600">—</span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <div className="border-t border-gray-800 px-5 py-3 text-right">
        <p className="text-xs text-gray-600">
          {citas.length} cita{citas.length !== 1 ? "s" : ""} en total
        </p>
      </div>
    </div>
  );
}

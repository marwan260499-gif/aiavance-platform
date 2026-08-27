"use client";

import { useEffect, useState } from "react";
import { List, CalendarDays, Ban } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { type Cita } from "./types";
import CitasTable from "./CitasTable";
import CitasCalendar from "./CitasCalendar";
import SolicitudesPendientes from "./SolicitudesPendientes";

type Props = { initialCitas: Cita[]; empresaId: string | null };

type Vista = "calendario" | "lista";

export default function CitasView({ initialCitas, empresaId }: Props) {
  const [citas, setCitas] = useState<Cita[]>(initialCitas);
  const [vista, setVista] = useState<Vista>("calendario");
  const [pendingCancelId, setPendingCancelId] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

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
            .select("id, fecha_hora, duracion_min, confirmada, asistio, cancelada, notas, lead_id, leads(nombre, canal)")
            .eq("id", (payload.new as Cita).id)
            .single();
          if (data)
            setCitas((prev) =>
              [data as unknown as Cita, ...prev].sort(
                (a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime()
              )
            );
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "citas", filter: `empresa_id=eq.${empresaId}` },
        (payload) => {
          const actualizada = payload.new as Cita;
          setCitas((prev) =>
            // Una cita cancelada sale de la agenda: la fila sigue en la base de
            // datos para el historial, pero no debe pintarse en el calendario.
            actualizada.cancelada
              ? prev.filter((c) => c.id !== actualizada.id)
              : prev.map((c) => (c.id === actualizada.id ? { ...c, ...actualizada } : c))
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [empresaId]);

  // Actualiza el estado local sin esperar al realtime: así el botón Confirmar
  // responde al instante aunque el websocket tarde o se haya caído.
  async function confirmarCita(id: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("citas")
      .update({ confirmada: true })
      .eq("id", id);

    if (error) {
      console.error("Error confirmando la cita:", error);
      return;
    }
    setCitas((prev) => prev.map((c) => (c.id === id ? { ...c, confirmada: true } : c)));
  }

  // asistio admite tres estados: true (vino), false (no vino) y null (sin
  // marcar todavía), por eso volver a pulsar el botón activo lo deja en null.
  async function marcarAsistio(id: string, asistio: boolean | null) {
    const supabase = createClient();
    const { error } = await supabase.from("citas").update({ asistio }).eq("id", id);

    if (error) {
      console.error("Error marcando la asistencia:", error);
      return;
    }
    setCitas((prev) => prev.map((c) => (c.id === id ? { ...c, asistio } : c)));
  }

  // Cancelar nunca borra la fila (queda para el historial), solo pone
  // cancelada=true. La agenda ya filtra cancelada=false, así que desaparece
  // de la vista sin que se pierda el registro. La confirmación es un diálogo
  // propio (no window.confirm) para no romper la estética con el pop-up
  // nativo del navegador, que además muestra el dominio de Vercel.
  const pendingCancelCita = citas.find((c) => c.id === pendingCancelId) ?? null;

  async function confirmarCancelacion() {
    if (!pendingCancelId) return;
    setCancelLoading(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("citas")
      .update({ cancelada: true })
      .eq("id", pendingCancelId);

    if (error) {
      console.error("Error cancelando la cita:", error);
      setCancelLoading(false);
      return;
    }
    setCitas((prev) => prev.filter((c) => c.id !== pendingCancelId));
    setCancelLoading(false);
    setPendingCancelId(null);
  }

  return (
    <div>
      <SolicitudesPendientes citas={citas} onConfirmar={confirmarCita} />

      <div className="mb-5 flex items-center justify-end">
        <div className="inline-flex rounded-lg border border-gray-800 bg-gray-900 p-1">
          <button
            onClick={() => setVista("calendario")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              vista === "calendario"
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <CalendarDays size={14} />
            Calendario
          </button>
          <button
            onClick={() => setVista("lista")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              vista === "lista" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            <List size={14} />
            Lista
          </button>
        </div>
      </div>

      {vista === "calendario" ? (
        <CitasCalendar citas={citas} onCancelar={setPendingCancelId} />
      ) : (
        <CitasTable citas={citas} onMarcarAsistio={marcarAsistio} onCancelar={setPendingCancelId} />
      )}

      {pendingCancelCita && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-xl border border-gray-800 bg-gray-900 p-5 shadow-xl">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10">
                <Ban size={18} className="text-red-400" strokeWidth={1.75} />
              </span>
              <p className="text-sm font-semibold text-white">Cancelar cita</p>
            </div>

            <p className="text-sm text-gray-300">
              ¿Seguro que quieres cancelar la cita con{" "}
              <span className="font-medium text-white">
                {pendingCancelCita.leads?.nombre ?? "este lead"}
              </span>
              ?
            </p>
            <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              Esto NO avisa al cliente por WhatsApp — tendrás que avisarle tú por tu cuenta.
            </p>
            <p className="mt-2 text-xs text-gray-500">
              La cita desaparecerá de la agenda, pero queda guardada en el historial.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setPendingCancelId(null)}
                disabled={cancelLoading}
                className="rounded-lg border border-gray-700 px-3.5 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-800 disabled:opacity-50"
              >
                Volver
              </button>
              <button
                onClick={confirmarCancelacion}
                disabled={cancelLoading}
                className="rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {cancelLoading ? "Cancelando..." : "Sí, cancelar cita"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

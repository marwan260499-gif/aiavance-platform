"use client";

import { useEffect, useState } from "react";
import { List, CalendarDays } from "lucide-react";
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
            .select("id, fecha_hora, duracion_min, confirmada, asistio, lead_id, leads(nombre, canal)")
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
          setCitas((prev) =>
            prev.map((c) =>
              c.id === (payload.new as Cita).id ? { ...c, ...(payload.new as Partial<Cita>) } : c
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [empresaId]);

  return (
    <div>
      <SolicitudesPendientes citas={citas} />

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

      {vista === "calendario" ? <CitasCalendar citas={citas} /> : <CitasTable citas={citas} />}
    </div>
  );
}

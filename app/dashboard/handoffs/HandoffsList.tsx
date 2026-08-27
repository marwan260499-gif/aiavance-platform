"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AlertCircle, Phone, CheckCircle } from "lucide-react";
import { MADRID_TZ } from "@/lib/dates";

type Handoff = {
  id: string;
  empresa_id: string;
  lead_id: string;
  conversacion_id: string;
  motivo_escalacion: string;
  estado: string;
  created_at: string;
  resuelto_at: string | null;
  notas: string | null;
  leads: { nombre: string | null; telefono: string | null } | null;
};

const estadoBadge: Record<string, string> = {
  pendiente:   "bg-red-500/20 text-red-300 border border-red-500/30",
  en_progreso: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  resuelto:    "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    timeZone: MADRID_TZ,
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

type Props = { initialHandoffs: Handoff[]; empresaId: string | null };

export default function HandoffsList({ initialHandoffs, empresaId }: Props) {
  const [handoffs,  setHandoffs]  = useState<Handoff[]>(initialHandoffs);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const pendientes = handoffs.filter((h) => h.estado === "pendiente").length;

  // Suscripción realtime
  useEffect(() => {
    if (!empresaId) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`handoffs-${empresaId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "handoffs", filter: `empresa_id=eq.${empresaId}` },
        async (payload) => {
          // Fetch con join para obtener nombre del lead
          const { data } = await supabase
            .from("handoffs")
            .select("*, leads(nombre, telefono)")
            .eq("id", (payload.new as Handoff).id)
            .single();
          if (data) setHandoffs((prev) => [data as Handoff, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "handoffs", filter: `empresa_id=eq.${empresaId}` },
        (payload) => {
          setHandoffs((prev) =>
            prev.map((h) =>
              h.id === (payload.new as Handoff).id
                ? { ...h, estado: (payload.new as Handoff).estado, resuelto_at: (payload.new as Handoff).resuelto_at }
                : h
            )
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "handoffs", filter: `empresa_id=eq.${empresaId}` },
        (payload) => {
          setHandoffs((prev) => prev.filter((h) => h.id !== (payload.old as Handoff).id));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [empresaId]);

  async function handleTomar(id: string) {
    setLoadingId(id);
    const supabase = createClient();
    await supabase
      .from("handoffs")
      .update({ estado: "en_progreso" })
      .eq("id", id);
    setLoadingId(null);
  }

  async function handleResolver(id: string) {
    setLoadingId(id);
    const supabase = createClient();
    await supabase
      .from("handoffs")
      .update({ estado: "resuelto", resuelto_at: new Date().toISOString() })
      .eq("id", id);
    setLoadingId(null);
  }

  if (handoffs.length === 0) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 px-6 py-16 text-center">
        <CheckCircle size={32} className="mx-auto mb-3 text-emerald-500/50" strokeWidth={1.5} />
        <p className="text-gray-400 text-sm">
          No hay escalaciones pendientes. El agente IA está gestionando todas las conversaciones.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Banner de alerta cuando hay pendientes */}
      {pendientes > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-5 py-3.5 animate-pulse">
          <AlertCircle size={18} className="shrink-0 text-red-400" strokeWidth={1.75} />
          <p className="text-sm font-medium text-red-300">
            {pendientes} escalación{pendientes > 1 ? "es" : ""} pendiente{pendientes > 1 ? "s" : ""} — requiere{pendientes > 1 ? "n" : ""} atención inmediata
          </p>
        </div>
      )}

      {/* Lista de handoffs */}
      <div className="divide-y divide-gray-800 overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
        {handoffs.map((h) => (
          <div
            key={h.id}
            className={`flex items-start gap-4 px-5 py-4 ${
              h.estado === "pendiente" ? "bg-red-500/5" : ""
            }`}
          >
            {/* Icono */}
            <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
              h.estado === "pendiente"   ? "bg-red-500/10"   :
              h.estado === "en_progreso" ? "bg-amber-500/10" : "bg-emerald-500/10"
            }`}>
              <Phone size={16} strokeWidth={1.75} className={
                h.estado === "pendiente"   ? "text-red-400"     :
                h.estado === "en_progreso" ? "text-amber-400"   : "text-emerald-400"
              } />
            </div>

            {/* Contenido */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-semibold text-white text-sm">
                  {h.leads?.nombre ?? "Lead sin nombre"}
                </span>
                {h.leads?.telefono && (
                  <span className="text-xs text-gray-500">{h.leads.telefono}</span>
                )}
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoBadge[h.estado] ?? estadoBadge.pendiente}`}>
                  {h.estado.replace("_", " ")}
                </span>
              </div>
              <p className="text-sm text-gray-300 mb-1">{h.motivo_escalacion}</p>
              <p className="text-xs text-gray-600">{fmt(h.created_at)}</p>
            </div>

            {/* Acciones */}
            <div className="shrink-0">
              {h.estado === "pendiente" && (
                <button
                  onClick={() => handleTomar(h.id)}
                  disabled={loadingId === h.id}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
                >
                  {loadingId === h.id ? "..." : "Tomar"}
                </button>
              )}
              {h.estado === "en_progreso" && (
                <button
                  onClick={() => handleResolver(h.id)}
                  disabled={loadingId === h.id}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {loadingId === h.id ? "..." : "Resolver"}
                </button>
              )}
              {h.estado === "resuelto" && (
                <span className="text-xs text-gray-600">
                  {h.resuelto_at ? fmt(h.resuelto_at) : "Resuelto"}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Contador */}
      <p className="text-right text-xs text-gray-600">
        {handoffs.length} escalación{handoffs.length !== 1 ? "es" : ""} en total
      </p>
    </div>
  );
}

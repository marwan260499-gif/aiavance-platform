"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MADRID_TZ } from "@/lib/dates";

type Lead = {
  id: string;
  nombre: string | null;
  email: string | null;
  telefono: string | null;
  canal: string;
  estado: string;
  qualification_score: number;
  created_at: string;
};

const ESTADOS = ["todos", "nuevo", "contactado", "calificado", "convertido", "perdido"] as const;
const CANALES  = ["todos", "whatsapp", "web", "email", "instagram", "otro"] as const;

const estadoBadge: Record<string, string> = {
  nuevo:      "bg-gray-700 text-gray-300",
  contactado: "bg-blue-500/20 text-blue-300",
  calificado: "bg-amber-500/20 text-amber-300",
  convertido: "bg-emerald-500/20 text-emerald-300",
  perdido:    "bg-red-500/20 text-red-300",
};

function scoreColor(n: number) {
  if (n >= 71) return "text-emerald-400";
  if (n >= 41) return "text-amber-400";
  return "text-red-400";
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    timeZone: MADRID_TZ,
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

type Props = { initialLeads: Lead[]; empresaId: string | null };

export default function LeadsTable({ initialLeads, empresaId }: Props) {
  const [leads,       setLeads]       = useState<Lead[]>(initialLeads);
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [filtroCanal,  setFiltroCanal]  = useState<string>("todos");

  // Suscripción realtime
  useEffect(() => {
    if (!empresaId) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`leads-${empresaId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads", filter: `empresa_id=eq.${empresaId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setLeads((prev) => [payload.new as Lead, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setLeads((prev) =>
              prev.map((l) => (l.id === (payload.new as Lead).id ? (payload.new as Lead) : l))
            );
          } else if (payload.eventType === "DELETE") {
            setLeads((prev) => prev.filter((l) => l.id !== (payload.old as Lead).id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [empresaId]);

  const visible = leads.filter((l) => {
    if (filtroEstado !== "todos" && l.estado !== filtroEstado) return false;
    if (filtroCanal  !== "todos" && l.canal  !== filtroCanal)  return false;
    return true;
  });

  const filterBtn = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
      active ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
    }`;

  return (
    <div>
      {/* Filtros */}
      <div className="mb-5 flex flex-wrap gap-4">
        <div className="flex flex-wrap gap-1.5">
          {ESTADOS.map((e) => (
            <button key={e} onClick={() => setFiltroEstado(e)} className={filterBtn(filtroEstado === e)}>
              {e.charAt(0).toUpperCase() + e.slice(1)}
            </button>
          ))}
        </div>
        <div className="w-px bg-gray-800 self-stretch hidden sm:block" />
        <div className="flex flex-wrap gap-1.5">
          {CANALES.map((c) => (
            <button key={c} onClick={() => setFiltroCanal(c)} className={filterBtn(filtroCanal === c)}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      {visible.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900 px-6 py-16 text-center">
          <p className="text-gray-400 text-sm">
            {leads.length === 0
              ? "Aún no hay leads. Se crearán automáticamente cuando lleguen mensajes por WhatsApp."
              : "No hay leads con los filtros seleccionados."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-3">Nombre</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Teléfono</th>
                  <th className="px-5 py-3">Canal</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3 text-right">Score</th>
                  <th className="px-5 py-3 text-right">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {visible.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-white">
                      {lead.nombre ?? <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-gray-400">
                      {lead.email ?? <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-gray-400">
                      {lead.telefono ?? <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 capitalize">{lead.canal}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoBadge[lead.estado] ?? "bg-gray-700 text-gray-300"}`}>
                        {lead.estado}
                      </span>
                    </td>
                    <td className={`px-5 py-3.5 text-right font-mono font-medium ${scoreColor(lead.qualification_score)}`}>
                      {lead.qualification_score}
                    </td>
                    <td className="px-5 py-3.5 text-right text-gray-500">
                      {fmt(lead.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-800 px-5 py-3 text-xs text-gray-600">
            {visible.length} {visible.length === 1 ? "lead" : "leads"}
            {visible.length !== leads.length && ` de ${leads.length} totales`}
          </div>
        </div>
      )}
    </div>
  );
}

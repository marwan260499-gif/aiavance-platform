"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MADRID_TZ, madridDayKey } from "@/lib/dates";
import { MessageSquare, User, Bot, Headphones, ChevronRight, Send, Phone } from "lucide-react";

const VENTANA_24H_MS = 24 * 60 * 60 * 1000;

type Conversacion = {
  id: string;
  estado: string;
  updated_at: string;
  lead_id: string;
  leads: { nombre: string | null; canal: string | null; telefono: string | null } | null;
};

type Mensaje = {
  id: string;
  conversacion_id: string;
  autor: string;
  contenido: string;
  timestamp: string;
  leido: boolean;
  intencion: string | null;
};

const estadoBadge: Record<string, string> = {
  activa:     "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  en_espera:  "bg-amber-500/20  text-amber-300  border border-amber-500/30",
  cerrada:    "bg-gray-500/20   text-gray-400   border border-gray-700",
  handoff:    "bg-red-500/20    text-red-300    border border-red-500/30",
};

const canalLabel: Record<string, string> = {
  whatsapp: "WhatsApp",
  email:    "Email",
  webchat:  "Web Chat",
  sms:      "SMS",
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  // Compara el día en Madrid, no en la zona del dispositivo — evita que
  // un mensaje de madrugada se clasifique como "de ayer" o viceversa.
  const isToday = madridDayKey(iso) === madridDayKey(new Date().toISOString());
  if (isToday)
    return d.toLocaleTimeString("es-ES", { timeZone: MADRID_TZ, hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("es-ES", {
    timeZone: MADRID_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", { timeZone: MADRID_TZ, hour: "2-digit", minute: "2-digit" });
}

type Props = {
  initialConversaciones: Conversacion[];
  empresaId: string | null;
};

export default function ConversacionesView({ initialConversaciones, empresaId }: Props) {
  const searchParams = useSearchParams();
  const conversacionParam = searchParams.get("conversacion");
  const appliedParamRef = useRef(false);

  const [conversaciones, setConversaciones] = useState<Conversacion[]>(initialConversaciones);
  const [selectedId, setSelectedId]         = useState<string | null>(null);
  const [mensajes, setMensajes]             = useState<Mensaje[]>([]);
  const [loadingMsgs, setLoadingMsgs]       = useState(false);
  const [respuesta, setRespuesta]           = useState("");
  const [enviando, setEnviando]             = useState(false);
  const [errorEnvio, setErrorEnvio]         = useState<string | null>(null);
  const bottomRef                           = useRef<HTMLDivElement>(null);
  const esCargaInicialRef                   = useRef(true);

  const selected = conversaciones.find((c) => c.id === selectedId) ?? null;

  // Llegada desde Handoffs con ?conversacion=<id>: la selecciona una sola
  // vez, sin pisar una selección manual posterior si la lista se refresca.
  useEffect(() => {
    if (appliedParamRef.current || !conversacionParam) return;
    if (conversaciones.some((c) => c.id === conversacionParam)) {
      setSelectedId(conversacionParam);
      appliedParamRef.current = true;
    }
  }, [conversacionParam, conversaciones]);

  // Ventana de 24h de Meta: sin un mensaje del lead en las últimas 24h no se
  // puede mandar texto libre. Se calcula con los mensajes ya cargados, sin
  // pedir nada nuevo al servidor.
  const ultimoMensajeLead = [...mensajes].reverse().find((m) => m.autor === "lead");
  const dentroDeVentana =
    !!ultimoMensajeLead &&
    Date.now() - new Date(ultimoMensajeLead.timestamp).getTime() <= VENTANA_24H_MS;

  // Limpia el formulario de respuesta al cambiar de conversación.
  useEffect(() => {
    setRespuesta("");
    setErrorEnvio(null);
  }, [selectedId]);

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !respuesta.trim() || enviando) return;

    setEnviando(true);
    setErrorEnvio(null);

    const res = await fetch("/api/conversaciones/enviar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversacionId: selectedId, contenido: respuesta.trim() }),
    });
    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      setErrorEnvio(data?.error ?? "No se pudo enviar el mensaje.");
      setEnviando(false);
      return;
    }

    // Se añade al instante en vez de esperar al realtime, igual que en Citas.
    if (data.mensaje) setMensajes((prev) => [...prev, data.mensaje]);
    if (data.warning) setErrorEnvio(data.warning);
    setRespuesta("");
    setEnviando(false);
  }

  // Al abrir una conversación distinta, el próximo scroll es "salto directo"
  // (sin animación); los mensajes que lleguen después de eso sí se animan.
  useEffect(() => {
    esCargaInicialRef.current = true;
  }, [selectedId]);

  // Baja al último mensaje: al abrir la conversación (salto instantáneo,
  // importante con historiales largos como el de prueba de 200+ mensajes)
  // y también cuando llega un mensaje nuevo por realtime (con animación).
  useEffect(() => {
    if (mensajes.length === 0) return;
    bottomRef.current?.scrollIntoView({
      behavior: esCargaInicialRef.current ? "auto" : "smooth",
    });
    esCargaInicialRef.current = false;
  }, [mensajes]);

  // Load messages when selection changes
  useEffect(() => {
    if (!selectedId) { setMensajes([]); return; }
    setLoadingMsgs(true);
    const supabase = createClient();
    supabase
      .from("mensajes")
      .select("*")
      .eq("conversacion_id", selectedId)
      .order("timestamp", { ascending: true })
      .then(({ data }) => {
        setMensajes((data as Mensaje[]) ?? []);
        setLoadingMsgs(false);
      });
  }, [selectedId]);

  // Realtime: new messages for selected conversation
  useEffect(() => {
    if (!selectedId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`mensajes-${selectedId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mensajes", filter: `conversacion_id=eq.${selectedId}` },
        (payload) => {
          const nuevo = payload.new as Mensaje;
          // Los mensajes de 'agente' ya se añaden al instante en handleEnviar;
          // sin este chequeo, el propio realtime los duplicaría al llegar.
          setMensajes((prev) => (prev.some((m) => m.id === nuevo.id) ? prev : [...prev, nuevo]));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedId]);

  // Realtime: conversation list updates
  useEffect(() => {
    if (!empresaId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`conversaciones-${empresaId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversaciones", filter: `empresa_id=eq.${empresaId}` },
        async (payload) => {
          const { data } = await supabase
            .from("conversaciones")
            .select("id, estado, updated_at, lead_id, leads(nombre, canal, telefono)")
            .eq("id", (payload.new as Conversacion).id)
            .single();
          if (data) setConversaciones((prev) => [data as unknown as Conversacion, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversaciones", filter: `empresa_id=eq.${empresaId}` },
        (payload) => {
          setConversaciones((prev) =>
            prev.map((c) =>
              c.id === (payload.new as Conversacion).id
                ? { ...c, estado: (payload.new as Conversacion).estado, updated_at: (payload.new as Conversacion).updated_at }
                : c
            )
          );
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [empresaId]);

  if (conversaciones.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-xl border border-gray-800 bg-gray-900 px-6 py-20 text-center">
        <div>
          <MessageSquare size={36} className="mx-auto mb-3 text-gray-700" strokeWidth={1.5} />
          <p className="text-sm font-medium text-gray-400">No hay conversaciones todavía</p>
          <p className="mt-1 text-xs text-gray-600">
            Las conversaciones aparecerán aquí cuando los leads contacten con el agente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 gap-4 overflow-hidden" style={{ height: "calc(100vh - 200px)" }}>
      {/* Lista de conversaciones */}
      <div className="flex w-80 shrink-0 flex-col overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
        <div className="border-b border-gray-800 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            {conversaciones.length} conversación{conversaciones.length !== 1 ? "es" : ""}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversaciones.map((c) => {
            const isSelected = c.id === selectedId;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full border-b border-gray-800/60 px-4 py-3.5 text-left transition-colors last:border-0 hover:bg-gray-800/50 ${
                  isSelected ? "bg-gray-800" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-white">
                    {c.leads?.nombre ?? "Lead sin nombre"}
                  </span>
                  <span className="shrink-0 text-xs text-gray-500">{fmtDate(c.updated_at)}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      estadoBadge[c.estado] ?? estadoBadge.cerrada
                    }`}
                  >
                    {c.estado}
                  </span>
                  {c.leads?.canal && (
                    <span className="text-xs text-gray-500">
                      {canalLabel[c.leads.canal] ?? c.leads.canal}
                    </span>
                  )}
                </div>
                {isSelected && (
                  <ChevronRight
                    size={14}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Panel de mensajes */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
        {!selected ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <MessageSquare size={32} className="mx-auto mb-3 text-gray-700" strokeWidth={1.5} />
              <p className="text-sm text-gray-500">Selecciona una conversación para ver los mensajes</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-800 px-5 py-3.5">
              <div>
                <p className="font-semibold text-white">
                  {selected.leads?.nombre ?? "Lead sin nombre"}
                </p>
                <p className="text-xs text-gray-500">
                  {selected.leads?.canal ? canalLabel[selected.leads.canal] ?? selected.leads.canal : "—"}
                </p>
              </div>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  estadoBadge[selected.estado] ?? estadoBadge.cerrada
                }`}
              >
                {selected.estado}
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {loadingMsgs ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-700 border-t-blue-500" />
                </div>
              ) : mensajes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare size={28} className="mb-2 text-gray-700" strokeWidth={1.5} />
                  <p className="text-sm text-gray-500">No hay mensajes en esta conversación</p>
                </div>
              ) : (
                mensajes.map((m) => {
                  const isLead  = m.autor === "lead";
                  const isIa    = m.autor === "ia";
                  const isAgent = m.autor === "agente";

                  return (
                    <div
                      key={m.id}
                      className={`flex items-end gap-2 ${isLead ? "justify-start" : "justify-end"}`}
                    >
                      {isLead && (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-700">
                          <User size={13} className="text-gray-300" />
                        </div>
                      )}
                      <div
                        className={`max-w-[72%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          isLead
                            ? "rounded-bl-sm bg-gray-800 text-gray-100"
                            : isIa
                            ? "rounded-br-sm bg-blue-600 text-white"
                            : "rounded-br-sm bg-violet-700 text-white"
                        }`}
                      >
                        {!isLead && (
                          <p className="mb-0.5 text-xs font-semibold opacity-70">
                            {isIa ? "IA" : "Agente"}
                          </p>
                        )}
                        <p>{m.contenido}</p>
                        <p className={`mt-1 text-xs ${isLead ? "text-gray-500" : "opacity-60"}`}>
                          {fmtTime(m.timestamp)}
                        </p>
                      </div>
                      {!isLead && isIa && (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-900">
                          <Bot size={13} className="text-blue-300" />
                        </div>
                      )}
                      {!isLead && isAgent && (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-900">
                          <Headphones size={13} className="text-violet-300" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Caja de respuesta */}
            <div className="border-t border-gray-800 px-5 py-3.5">
              {!dentroDeVentana && (
                <p className="mb-2 flex items-start gap-1.5 text-xs text-amber-300">
                  <Phone size={14} className="mt-0.5 shrink-0" strokeWidth={1.75} />
                  <span>
                    Han pasado más de 24h desde el último mensaje de{" "}
                    {selected.leads?.nombre ?? "esta clienta"}. WhatsApp no permite mandar
                    texto libre ahora mismo
                    {selected.leads?.telefono ? (
                      <> — puedes llamarla al <span className="font-semibold">{selected.leads.telefono}</span>.</>
                    ) : (
                      "."
                    )}
                  </span>
                </p>
              )}
              {errorEnvio && (
                <p className="mb-2 text-xs text-red-400">{errorEnvio}</p>
              )}
              <form onSubmit={handleEnviar} className="flex items-end gap-2">
                <textarea
                  value={respuesta}
                  onChange={(e) => setRespuesta(e.target.value)}
                  disabled={!dentroDeVentana || enviando}
                  placeholder={
                    dentroDeVentana ? "Escribe una respuesta..." : "No disponible fuera de la ventana de 24h"
                  }
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleEnviar(e);
                    }
                  }}
                  className="flex-1 resize-none rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!dentroDeVentana || !respuesta.trim() || enviando}
                  className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
                >
                  <Send size={16} strokeWidth={1.75} />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

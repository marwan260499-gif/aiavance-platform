import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

const VENTANA_24H_MS = 24 * 60 * 60 * 1000;
const GRAPH_API_VERSION = "v21.0";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "No autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const conversacionId = body?.conversacionId as string | undefined;
  const contenido = (body?.contenido as string | undefined)?.trim();

  if (!conversacionId || !contenido) {
    return NextResponse.json(
      { ok: false, error: "Falta la conversación o el mensaje." },
      { status: 400 }
    );
  }

  // RLS (mis_empresas()) ya limita esto a conversaciones de la empresa del
  // usuario — si no es suya, esta consulta simplemente no devuelve nada.
  const { data: conversacion, error: convError } = await supabase
    .from("conversaciones")
    .select("id, empresa_id, leads(telefono), empresas(phone_number_id)")
    .eq("id", conversacionId)
    .single();

  if (convError || !conversacion) {
    return NextResponse.json(
      { ok: false, error: "Conversación no encontrada." },
      { status: 404 }
    );
  }

  const lead = conversacion.leads as unknown as { telefono: string | null } | null;
  const empresa = conversacion.empresas as unknown as { phone_number_id: string | null } | null;

  const telefono = lead?.telefono;
  if (!telefono) {
    return NextResponse.json(
      { ok: false, error: "Este lead no tiene un teléfono guardado." },
      { status: 400 }
    );
  }

  const phoneNumberId = empresa?.phone_number_id;
  if (!phoneNumberId) {
    return NextResponse.json(
      {
        ok: false,
        error: "Falta configurar el WhatsApp Phone Number ID en Configuración.",
      },
      { status: 400 }
    );
  }

  // Ventana de 24h de Meta: solo se puede mandar texto libre si la clienta
  // escribió en las últimas 24h. Se recomprueba aquí aunque el cliente ya
  // desactive el botón, porque nunca hay que confiar solo en el frontend.
  const { data: ultimoMensajeLead } = await supabase
    .from("mensajes")
    .select("timestamp")
    .eq("conversacion_id", conversacionId)
    .eq("autor", "lead")
    .order("timestamp", { ascending: false })
    .limit(1)
    .maybeSingle();

  const dentroDeVentana =
    !!ultimoMensajeLead &&
    Date.now() - new Date(ultimoMensajeLead.timestamp).getTime() <= VENTANA_24H_MS;

  if (!dentroDeVentana) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Han pasado más de 24h desde el último mensaje de la clienta. WhatsApp no permite texto libre ahora mismo.",
      },
      { status: 422 }
    );
  }

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Falta configurar WHATSAPP_ACCESS_TOKEN en el servidor." },
      { status: 500 }
    );
  }

  const metaRes = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: telefono,
        type: "text",
        text: { body: contenido },
      }),
    }
  );

  const metaData = await metaRes.json().catch(() => null);

  // Si Meta rechaza el envío, NO se guarda nada en `mensajes` — el dashboard
  // nunca debe mostrar como enviado un mensaje que en realidad no salió.
  if (!metaRes.ok || metaData?.error) {
    const motivo = metaData?.error?.message ?? `Error ${metaRes.status} de WhatsApp.`;
    return NextResponse.json({ ok: false, error: `No se pudo enviar: ${motivo}` }, { status: 502 });
  }

  const metaMessageId = metaData?.messages?.[0]?.id ?? null;

  const { data: mensaje, error: insertError } = await supabase
    .from("mensajes")
    .insert({
      conversacion_id: conversacionId,
      autor: "agente",
      contenido,
      canal_enviado: "whatsapp",
      timestamp: new Date().toISOString(),
      meta_message_id: metaMessageId,
    })
    .select()
    .single();

  if (insertError) {
    // El mensaje ya salió de verdad por WhatsApp, pero no se pudo guardar en
    // el historial. Se lo decimos tal cual — mejor eso que ocultarlo.
    return NextResponse.json({
      ok: true,
      mensaje: null,
      warning:
        "El mensaje se envió a la clienta, pero no se pudo guardar en el historial de esta pantalla.",
    });
  }

  return NextResponse.json({ ok: true, mensaje });
}

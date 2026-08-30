import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ConversacionesView from "./ConversacionesView";

export default async function ConversacionesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: empresa } = await supabase
    .from("empresas")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: conversaciones } = empresa
    ? await supabase
        .from("conversaciones")
        .select("id, estado, updated_at, lead_id, leads(nombre, canal, telefono)")
        .eq("empresa_id", empresa.id)
        .order("updated_at", { ascending: false })
    : { data: [] };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Conversaciones</h1>
        <p className="mt-1 text-sm text-gray-400">
          Chats activos gestionados por el agente IA
        </p>
      </div>

      <ConversacionesView
        initialConversaciones={(conversaciones as any) ?? []}
        empresaId={empresa?.id ?? null}
      />
    </div>
  );
}

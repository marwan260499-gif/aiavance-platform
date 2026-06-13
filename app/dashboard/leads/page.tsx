import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LeadsTable from "./LeadsTable";

export default async function LeadsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: empresa } = await supabase
    .from("empresas")
    .select("id, nombre_negocio")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: leads } = empresa
    ? await supabase
        .from("leads")
        .select("id, nombre, email, telefono, canal, estado, qualification_score, created_at")
        .eq("empresa_id", empresa.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Leads</h1>
        <p className="mt-1 text-sm text-gray-400">
          {empresa
            ? `${empresa.nombre_negocio} — contactos recibidos por todos los canales`
            : "Configura tu empresa en Configuración para empezar a recibir leads."}
        </p>
      </div>

      <LeadsTable
        initialLeads={leads ?? []}
        empresaId={empresa?.id ?? null}
      />
    </div>
  );
}

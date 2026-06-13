import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import HandoffsList from "./HandoffsList";

export default async function HandoffsPage() {
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

  const { data: handoffs } = empresa
    ? await supabase
        .from("handoffs")
        .select("*, leads(nombre, telefono)")
        .eq("empresa_id", empresa.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Handoffs</h1>
        <p className="mt-1 text-sm text-gray-400">
          Escalaciones que requieren intervención humana
        </p>
      </div>

      <HandoffsList
        initialHandoffs={(handoffs as any) ?? []}
        empresaId={empresa?.id ?? null}
      />
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CitasView from "./CitasView";

export default async function CitasPage() {
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

  const { data: citas, error: citasError } = empresa
    ? await supabase
        .from("citas")
        .select("id, fecha_hora, duracion_min, confirmada, asistio, cancelada, notas, lead_id, leads(nombre, telefono, canal)")
        .eq("empresa_id", empresa.id)
        .eq("cancelada", false)
        .order("fecha_hora", { ascending: false })
    : { data: [], error: null };

  // Sin esto un fallo de la consulta (p.ej. una columna que no existe) se ve
  // igual que "no hay citas" y es imposible de diagnosticar desde la UI.
  if (citasError) console.error("Error cargando citas:", citasError);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Citas</h1>
        <p className="mt-1 text-sm text-gray-400">
          Agenda de citas gestionada por el agente IA
        </p>
      </div>

      <CitasView
        initialCitas={(citas as any) ?? []}
        empresaId={empresa?.id ?? null}
      />
    </div>
  );
}

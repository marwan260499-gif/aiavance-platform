import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Users, Calendar, PhoneForwarded, MessageSquare } from "lucide-react";

export default async function DashboardPage() {
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

  let totalLeads = 0;
  let citasAgendadas = 0;
  let handoffsPendientes = 0;
  let conversacionesActivas = 0;

  if (empresa) {
    const [leadsRes, citasRes, handoffsRes, conversacionesRes] = await Promise.all([
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("empresa_id", empresa.id),
      supabase
        .from("citas")
        .select("id", { count: "exact", head: true })
        .eq("empresa_id", empresa.id)
        .eq("cancelada", false),
      supabase
        .from("handoffs")
        .select("id", { count: "exact", head: true })
        .eq("empresa_id", empresa.id)
        .eq("estado", "pendiente"),
      supabase
        .from("conversaciones")
        .select("id", { count: "exact", head: true })
        .eq("empresa_id", empresa.id)
        .neq("estado", "cerrada"),
    ]);

    // Sin comprobar `error` un fallo de consulta se ve igual que "cero
    // resultados" y es imposible de diagnosticar desde la UI.
    for (const [nombre, res] of [
      ["leads", leadsRes],
      ["citas", citasRes],
      ["handoffs", handoffsRes],
      ["conversaciones", conversacionesRes],
    ] as const) {
      if (res.error) console.error(`Error contando ${nombre}:`, res.error);
    }

    totalLeads = leadsRes.count ?? 0;
    citasAgendadas = citasRes.count ?? 0;
    handoffsPendientes = handoffsRes.count ?? 0;
    conversacionesActivas = conversacionesRes.count ?? 0;
  }

  const metrics = [
    {
      label: "Total Leads",
      value: totalLeads,
      icon: Users,
      iconColor: "text-blue-400",
      iconBg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      label: "Citas Agendadas",
      value: citasAgendadas,
      icon: Calendar,
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      label: "Handoffs Pendientes",
      value: handoffsPendientes,
      icon: PhoneForwarded,
      iconColor: "text-orange-400",
      iconBg: "bg-orange-500/10",
      border: "border-orange-500/20",
    },
    {
      label: "Conversaciones Activas",
      value: conversacionesActivas,
      icon: MessageSquare,
      iconColor: "text-purple-400",
      iconBg: "bg-purple-500/10",
      border: "border-purple-500/20",
    },
  ];

  return (
    <div>
      {/* Cabecera */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-400">{user.email}</p>
      </div>

      {/* Tarjetas de métricas */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon, iconColor, iconBg, border }) => (
          <div
            key={label}
            className={`rounded-xl border ${border} bg-gray-900 p-6 flex flex-col gap-5`}
          >
            <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
              <Icon size={20} className={iconColor} strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{value}</p>
              <p className="mt-1 text-sm text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

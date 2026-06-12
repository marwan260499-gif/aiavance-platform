import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Users, Calendar, PhoneForwarded, MessageSquare } from "lucide-react";

const metrics = [
  {
    label: "Total Leads",
    value: 0,
    icon: Users,
    iconColor: "text-blue-400",
    iconBg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  {
    label: "Citas Agendadas",
    value: 0,
    icon: Calendar,
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  {
    label: "Handoffs Pendientes",
    value: 0,
    icon: PhoneForwarded,
    iconColor: "text-orange-400",
    iconBg: "bg-orange-500/10",
    border: "border-orange-500/20",
  },
  {
    label: "Conversaciones Activas",
    value: 0,
    icon: MessageSquare,
    iconColor: "text-purple-400",
    iconBg: "bg-purple-500/10",
    border: "border-purple-500/20",
  },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

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

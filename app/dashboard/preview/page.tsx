import { Users, Calendar, PhoneForwarded, MessageSquare } from "lucide-react";

const metrics = [
  {
    label: "Total Leads",
    value: 24,
    icon: Users,
    iconColor: "text-blue-400",
    iconBg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  {
    label: "Citas Agendadas",
    value: 8,
    icon: Calendar,
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  {
    label: "Handoffs Pendientes",
    value: 3,
    icon: PhoneForwarded,
    iconColor: "text-orange-400",
    iconBg: "bg-orange-500/10",
    border: "border-orange-500/20",
  },
  {
    label: "Conversaciones Activas",
    value: 12,
    icon: MessageSquare,
    iconColor: "text-purple-400",
    iconBg: "bg-purple-500/10",
    border: "border-purple-500/20",
  },
];

const leadsRecientes = [
  { nombre: "María García",    canal: "WhatsApp", estado: "calificado",  score: 82 },
  { nombre: "Carlos López",    canal: "Web",      estado: "nuevo",       score: 40 },
  { nombre: "Ana Martínez",    canal: "Instagram", estado: "contactado", score: 61 },
  { nombre: "José Rodríguez",  canal: "WhatsApp", estado: "convertido",  score: 95 },
  { nombre: "Laura Sánchez",   canal: "Email",    estado: "nuevo",       score: 28 },
];

const estadoColor: Record<string, string> = {
  nuevo:      "bg-gray-700 text-gray-300",
  contactado: "bg-blue-500/20 text-blue-300",
  calificado: "bg-emerald-500/20 text-emerald-300",
  convertido: "bg-purple-500/20 text-purple-300",
  perdido:    "bg-red-500/20 text-red-300",
};

export default function PreviewPage() {
  return (
    <div>
      {/* Banner de aviso */}
      <div className="mb-6 flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-2.5 text-sm text-yellow-400">
        <span className="font-semibold">Modo preview</span>
        <span className="text-yellow-500/60">—</span>
        <span>Datos de ejemplo. Solo visible en desarrollo.</span>
      </div>

      {/* Cabecera */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-400">preview@aiavance.com</p>
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

      {/* Tabla de leads recientes */}
      <div className="mt-8">
        <h2 className="mb-4 text-base font-semibold text-white">Leads recientes</h2>
        <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-3">Nombre</th>
                <th className="px-5 py-3">Canal</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3 text-right">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {leadsRecientes.map((lead) => (
                <tr key={lead.nombre} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-white">{lead.nombre}</td>
                  <td className="px-5 py-3.5 text-gray-400">{lead.canal}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoColor[lead.estado]}`}>
                      {lead.estado}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="font-mono text-gray-300">{lead.score}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

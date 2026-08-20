export type Cita = {
  id: string;
  fecha_hora: string;
  duracion_min: number | null;
  confirmada: boolean;
  asistio: boolean | null;
  cancelada: boolean;
  notas: string | null;
  lead_id: string;
  leads: { nombre: string | null; canal: string | null } | null;
};

export const canalLabel: Record<string, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  webchat: "Web Chat",
  sms: "SMS",
};

export function fmtFechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isPast(iso: string) {
  return new Date(iso) < new Date();
}

export function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

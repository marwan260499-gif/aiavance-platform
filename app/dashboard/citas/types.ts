import { MADRID_TZ } from "@/lib/dates";

export type Cita = {
  id: string;
  fecha_hora: string;
  duracion_min: number | null;
  confirmada: boolean;
  asistio: boolean | null;
  cancelada: boolean;
  notas: string | null;
  lead_id: string;
  leads: { nombre: string | null; telefono: string | null; canal: string | null } | null;
};

export const canalLabel: Record<string, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  webchat: "Web Chat",
  sms: "SMS",
};

export function fmtFechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    timeZone: MADRID_TZ,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// WhatsApp a veces manda el nombre de perfil vacío o como un emoji suelto,
// que no sirve para identificar a nadie. Si no hay ninguna letra o número,
// lo tratamos como "sin nombre útil" y el teléfono pasa a ser lo principal.
export function nombreEsUtil(nombre: string | null | undefined): boolean {
  if (!nombre) return false;
  return /[\p{L}\p{N}]/u.test(nombre);
}

export function isPast(iso: string) {
  return new Date(iso).getTime() < Date.now();
}

// Día de la cuadrícula del calendario (construido localmente con
// new Date(year, month, day), no a partir de un timestamp UTC real).
// Para saber a qué día de Madrid pertenece una cita real, usar
// madridDayKey de "@/lib/dates" en su lugar.
export function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

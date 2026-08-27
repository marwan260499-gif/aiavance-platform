export const MADRID_TZ = "Europe/Madrid";

// Día calendario en Europa/Madrid al que corresponde un instante UTC real
// (p.ej. citas.fecha_hora). No usar con fechas construidas localmente para
// UI (como los días de la cuadrícula del calendario), que no representan
// un instante que necesite conversión de zona.
export function madridDayKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: MADRID_TZ });
}

"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Check, X, Clock, Ban } from "lucide-react";
import { type Cita, canalLabel, dateKey, isPast } from "./types";
import { MADRID_TZ, madridDayKey } from "@/lib/dates";

type Props = {
  citas: Cita[];
  onCancelar: (id: string) => void;
  onMarcarAsistio: (id: string, asistio: boolean | null) => Promise<void>;
};

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

type DayCell = { date: Date; current: boolean };

function buildMonthGrid(year: number, month: number): DayCell[] {
  const firstDay = new Date(year, month, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: DayCell[] = [];

  for (let i = startWeekday - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), current: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), current: true });
  }
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ date: new Date(year, month + 1, nextDay), current: false });
    nextDay++;
  }
  return cells;
}

function citaDotColor(c: Cita) {
  if (c.asistio === true) return "bg-emerald-400";
  if (c.asistio === false) return "bg-red-400";
  if (c.confirmada) return "bg-blue-400";
  return "bg-gray-500";
}

export default function CitasCalendar({ citas, onCancelar, onMarcarAsistio }: Props) {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string | null>(dateKey(today));
  const [asistioLoadingId, setAsistioLoadingId] = useState<string | null>(null);

  async function handleAsistio(id: string, asistio: boolean | null) {
    setAsistioLoadingId(id);
    await onMarcarAsistio(id, asistio);
    setAsistioLoadingId(null);
  }

  const citasPorDia = useMemo(() => {
    const map = new Map<string, Cita[]>();
    for (const c of citas) {
      // Día en Madrid, no en la zona horaria del dispositivo — una cita a
      // las 23:30 UTC puede caer en el día siguiente en Madrid.
      const key = madridDayKey(c.fecha_hora);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return map;
  }, [citas]);

  const grid = useMemo(
    () => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()),
    [cursor]
  );

  const monthLabel = cursor.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  const selectedCitas = selected ? citasPorDia.get(selected) ?? [] : [];

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
      {/* Grid del mes */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        {/* Navegación */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold capitalize text-white">{monthLabel}</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
              aria-label="Mes anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => {
                const now = new Date();
                setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
                setSelected(dateKey(now));
              }}
              className="rounded-lg px-2.5 py-1 text-xs font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
            >
              Hoy
            </button>
            <button
              onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
              aria-label="Mes siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Días de la semana */}
        <div className="grid grid-cols-7 gap-1 pb-2 text-center text-xs font-medium uppercase tracking-wide text-gray-500">
          {DIAS_SEMANA.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        {/* Celdas */}
        <div className="grid grid-cols-7 gap-1">
          {grid.map(({ date, current }) => {
            const key = dateKey(date);
            const dayCitas = citasPorDia.get(key) ?? [];
            const isToday = key === dateKey(today);
            const isSelected = key === selected;

            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className={`flex aspect-square flex-col items-center justify-start gap-1 rounded-lg border pt-1.5 text-xs transition-colors ${
                  isSelected
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-transparent hover:border-gray-700 hover:bg-gray-800/60"
                } ${current ? "text-gray-200" : "text-gray-700"}`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full ${
                    isToday ? "bg-blue-600 font-semibold text-white" : ""
                  }`}
                >
                  {date.getDate()}
                </span>
                {dayCitas.length > 0 && (
                  <span className="flex items-center gap-0.5">
                    {dayCitas.slice(0, 3).map((c) => (
                      <span key={c.id} className={`h-1.5 w-1.5 rounded-full ${citaDotColor(c)}`} />
                    ))}
                    {dayCitas.length > 3 && (
                      <span className="text-[9px] text-gray-500">+{dayCitas.length - 3}</span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Leyenda */}
        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-gray-800 pt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-gray-500" /> Pendiente
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" /> Confirmada
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Asistió
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> No asistió
          </span>
        </div>
      </div>

      {/* Panel del día seleccionado */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <p className="mb-4 text-sm font-semibold text-white">
          {selected
            ? new Date(selected + "T00:00:00").toLocaleDateString("es-ES", {
                weekday: "long",
                day: "2-digit",
                month: "long",
              })
            : "Selecciona un día"}
        </p>

        {selectedCitas.length === 0 ? (
          <p className="text-xs text-gray-600">No hay citas este día.</p>
        ) : (
          <div className="space-y-3">
            {selectedCitas
              .sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime())
              .map((c) => {
                const past = isPast(c.fecha_hora);
                return (
                  <div key={c.id} className="rounded-lg border border-gray-800 bg-gray-950/50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-white">
                        {c.leads?.nombre ?? "Lead sin nombre"}
                      </p>
                      {c.asistio === true ? (
                        <Check size={13} className="shrink-0 text-emerald-400" strokeWidth={2.5} />
                      ) : c.asistio === false ? (
                        <X size={13} className="shrink-0 text-red-400" strokeWidth={2.5} />
                      ) : null}
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500">
                      <Clock size={11} className={past ? "text-gray-600" : "text-blue-400"} />
                      {new Date(c.fecha_hora).toLocaleTimeString("es-ES", {
                        timeZone: MADRID_TZ,
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {c.duracion_min ? ` · ${c.duracion_min} min` : ""}
                      {c.leads?.canal ? ` · ${canalLabel[c.leads.canal] ?? c.leads.canal}` : ""}
                    </div>
                    {c.notas && <p className="mt-1.5 text-xs italic text-gray-600">{c.notas}</p>}

                    {/* Asistió — solo tiene sentido preguntarlo de citas ya pasadas */}
                    {past && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <button
                          onClick={() => handleAsistio(c.id, c.asistio === true ? null : true)}
                          disabled={asistioLoadingId === c.id}
                          title={c.asistio === true ? "Quitar la marca" : "Marcar que asistió"}
                          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors disabled:opacity-40 ${
                            c.asistio === true
                              ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
                              : "border-gray-700 text-gray-500 hover:border-emerald-500/40 hover:text-emerald-300"
                          }`}
                        >
                          <Check size={11} strokeWidth={2.5} />
                          Asistió
                        </button>
                        <button
                          onClick={() => handleAsistio(c.id, c.asistio === false ? null : false)}
                          disabled={asistioLoadingId === c.id}
                          title={c.asistio === false ? "Quitar la marca" : "Marcar que no asistió"}
                          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors disabled:opacity-40 ${
                            c.asistio === false
                              ? "border-red-500/40 bg-red-500/20 text-red-300"
                              : "border-gray-700 text-gray-500 hover:border-red-500/40 hover:text-red-300"
                          }`}
                        >
                          <X size={11} strokeWidth={2.5} />
                          No asistió
                        </button>
                      </div>
                    )}

                    <div className="mt-2 flex items-center justify-between gap-2">
                      {c.confirmada ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-300 border border-emerald-500/30">
                          Confirmada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-700/50 px-2 py-0.5 text-[10px] font-medium text-gray-400 border border-gray-700">
                          Pendiente
                        </span>
                      )}
                      <button
                        onClick={() => onCancelar(c.id)}
                        title="Cancelar cita (no avisa al cliente)"
                        aria-label="Cancelar cita"
                        className="flex items-center gap-1 rounded-full border border-gray-700 px-2 py-0.5 text-[10px] font-medium text-gray-500 transition-colors hover:border-red-500/40 hover:text-red-300"
                      >
                        <Ban size={11} strokeWidth={2} />
                        Cancelar
                      </button>
                    </div>
                  </div>
                );
              })}
            <p className="pt-1 text-[10px] text-gray-600">
              Cancelar aquí no avisa al cliente por WhatsApp — hay que avisarle por tu cuenta.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

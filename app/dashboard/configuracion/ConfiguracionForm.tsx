"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { guardarEmpresa } from "./actions";

type EmpresaData = {
  id?: string;
  nombre_negocio: string;
  sector: string;
  ubicacion: string;
  phone_number_id: string;
  system_prompt: string;
  estado: string;
};

type Props = {
  empresa: EmpresaData | null;
  isPreview: boolean;
};

const sectores = [
  { value: "peluqueria",       label: "Peluquería" },
  { value: "barberia",         label: "Barbería" },
  { value: "centro_estetica",  label: "Centro de estética" },
  { value: "clinica_estetica", label: "Clínica de estética / depilación láser" },
  { value: "unas",             label: "Uñas / manicura" },
  { value: "spa",              label: "Spa / masajes" },
  { value: "clinica_dental",   label: "Clínica dental" },
  { value: "clinica",          label: "Clínica médica" },
  { value: "fisioterapia",     label: "Fisioterapia" },
  { value: "podologia",        label: "Podología" },
  { value: "gimnasio",         label: "Gimnasio / centro deportivo" },
  { value: "veterinaria",      label: "Veterinaria" },
  { value: "restaurante",      label: "Restaurante" },
  { value: "cafeteria",        label: "Cafetería" },
  { value: "inmobiliaria",     label: "Inmobiliaria" },
  { value: "academia",         label: "Academia / clases particulares" },
  { value: "taller",           label: "Taller mecánico" },
  { value: "asesoria",         label: "Asesoría / abogacía" },
  { value: "otro",             label: "Otro" },
];

export default function ConfiguracionForm({ empresa, isPreview }: Props) {
  const [form, setForm] = useState<EmpresaData>({
    nombre_negocio: empresa?.nombre_negocio ?? "",
    sector:         empresa?.sector         ?? "otro",
    ubicacion:      empresa?.ubicacion      ?? "",
    phone_number_id: empresa?.phone_number_id ?? "",
    system_prompt:  empresa?.system_prompt  ?? "",
    estado:         empresa?.estado         ?? "activo",
  });
  const [saving, setSaving]   = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  function set(field: keyof EmpresaData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isPreview) return;
    setSaving(true);
    setMessage(null);

    const { error } = await guardarEmpresa(
      {
        nombre_negocio:  form.nombre_negocio,
        sector:          form.sector,
        ubicacion:       form.ubicacion,
        phone_number_id: form.phone_number_id,
        system_prompt:   form.system_prompt,
        estado:          form.estado,
      },
      empresa?.id
    );

    setMessage(
      error
        ? { text: error, ok: false }
        : { text: "Configuración guardada correctamente.", ok: true }
    );
    setSaving(false);
  }

  const fieldClass =
    "w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50";

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {/* Banner preview */}
      {isPreview && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-2.5 text-sm text-yellow-400">
          <span className="font-semibold">Modo preview</span>
          <span className="text-yellow-500/60">—</span>
          <span>Datos de ejemplo. Inicia sesión para guardar cambios.</span>
        </div>
      )}

      {/* Nombre del negocio */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-300">
          Nombre del negocio
        </label>
        <input
          type="text"
          value={form.nombre_negocio}
          onChange={(e) => set("nombre_negocio", e.target.value)}
          placeholder="Ej. Clínica San Rafael"
          disabled={isPreview}
          className={fieldClass}
        />
      </div>

      {/* Sector */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-300">Sector</label>
        <select
          value={form.sector}
          onChange={(e) => set("sector", e.target.value)}
          disabled={isPreview}
          className={fieldClass}
        >
          {sectores.map((s) => (
            <option key={s.value} value={s.value} className="bg-gray-800">
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Ubicación */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-300">Ubicación</label>
        <input
          type="text"
          value={form.ubicacion}
          onChange={(e) => set("ubicacion", e.target.value)}
          placeholder="Ej. Calle Mayor 12, Madrid"
          disabled={isPreview}
          className={fieldClass}
        />
      </div>

      {/* WhatsApp Phone Number ID */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-300">
          WhatsApp Phone Number ID
        </label>
        <input
          type="text"
          value={form.phone_number_id}
          onChange={(e) => set("phone_number_id", e.target.value)}
          placeholder="Ej. 123456789012345"
          disabled={isPreview}
          className={`${fieldClass} font-mono`}
        />
      </div>

      {/* System Prompt */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-300">
          System Prompt del agente IA
        </label>
        <p className="text-xs text-gray-500">
          Define cómo debe comportarse y hablar el agente con tus clientes.
        </p>
        <textarea
          value={form.system_prompt}
          onChange={(e) => set("system_prompt", e.target.value)}
          placeholder={`Eres el asistente virtual de [nombre del negocio]. Habla siempre en español, de forma cercana y profesional. Tu objetivo es responder preguntas sobre servicios, horarios y precios, y agendar citas cuando el cliente lo solicite.`}
          rows={9}
          disabled={isPreview}
          className={`${fieldClass} resize-y leading-relaxed`}
        />
      </div>

      {/* Estado */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-300">Estado</label>
        <div className="flex gap-2">
          {(["activo", "inactivo"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              disabled={isPreview}
              onClick={() => set("estado", opt)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                form.estado === opt
                  ? opt === "activo"
                    ? "bg-emerald-600 text-white"
                    : "bg-red-700 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback */}
      {message && (
        <p className={`text-sm ${message.ok ? "text-emerald-400" : "text-red-400"}`}>
          {message.text}
        </p>
      )}

      {/* Botón guardar */}
      <button
        type="submit"
        disabled={isPreview || saving}
        className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
      >
        <Save size={16} strokeWidth={1.75} />
        {saving ? "Guardando..." : "Guardar configuración"}
      </button>
    </form>
  );
}

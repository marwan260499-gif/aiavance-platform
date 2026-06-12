import { createClient } from "@/lib/supabase/server";
import ConfiguracionForm from "./ConfiguracionForm";

const previewEmpresa = {
  nombre_negocio:  "Peluquería El Estilo",
  sector:          "peluqueria",
  ubicacion:       "Calle Mayor 12, Madrid",
  phone_number_id: "123456789012345",
  system_prompt:
    "Eres el asistente virtual de Peluquería El Estilo. Habla siempre en español, de forma cercana y profesional. Tu objetivo es responder preguntas sobre servicios, horarios y precios, y agendar citas cuando el cliente lo solicite. Nunca hagas promesas que no puedas cumplir y, si no sabes algo, deriva al equipo humano.",
  estado: "activo",
};

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div>
        <h1 className="mb-1 text-2xl font-bold text-white">Configuración</h1>
        <p className="mb-8 text-sm text-gray-400">
          Ajusta los datos y el comportamiento del agente IA de tu negocio.
        </p>
        <ConfiguracionForm empresa={previewEmpresa} userId={null} isPreview />
      </div>
    );
  }

  const { data: empresa } = await supabase
    .from("empresas")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-white">Configuración</h1>
      <p className="mb-8 text-sm text-gray-400">
        Ajusta los datos y el comportamiento del agente IA de tu negocio.
      </p>
      <ConfiguracionForm empresa={empresa} userId={user.id} isPreview={false} />
    </div>
  );
}

"use server";

import { createClient } from "@/lib/supabase/server";

type EmpresaPayload = {
  nombre_negocio: string;
  sector: string;
  ubicacion: string;
  phone_number_id: string;
  system_prompt: string;
  estado: string;
};

export async function guardarEmpresa(
  payload: EmpresaPayload,
  empresaId: string | undefined
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  if (empresaId) {
    const { error } = await supabase
      .from("empresas")
      .update(payload)
      .eq("id", empresaId)
      .eq("user_id", user.id);
    return { error: error?.message ?? null };
  } else {
    const { error } = await supabase
      .from("empresas")
      .insert({ ...payload, user_id: user.id });
    return { error: error?.message ?? null };
  }
}

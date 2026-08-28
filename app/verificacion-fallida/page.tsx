"use client";

import { useState } from "react";
import { Clock, RefreshCw } from "lucide-react";

// Distinta de /acceso-denegado a propósito: aquí no sabemos si el usuario
// tiene permiso o no, solo que no pudimos comprobarlo a tiempo (timeout de
// red al hablar con Supabase desde proxy.ts). Decirle "denegado" sería
// confuso y falso para alguien que sí tiene acceso.
export default function VerificacionFallidaPage() {
  const [reintentando, setReintentando] = useState(false);

  function handleReintentar() {
    setReintentando(true);
    window.location.href = "/dashboard";
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Clock size={26} className="text-amber-400" strokeWidth={1.75} />
          </div>
        </div>

        <h1 className="text-xl font-bold text-white mb-3">
          No hemos podido verificar tu acceso
        </h1>

        <p className="text-gray-400 text-sm leading-relaxed mb-8">
          Ha habido un problema puntual de conexión al comprobar tu sesión.
          No significa que no tengas permiso — solo que no pudimos
          confirmarlo a tiempo. Prueba de nuevo en unos segundos.
        </p>

        <button
          onClick={handleReintentar}
          disabled={reintentando}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw size={15} className={reintentando ? "animate-spin" : ""} />
          {reintentando ? "Reintentando..." : "Reintentar"}
        </button>
      </div>
    </main>
  );
}

import Link from "next/link";

export default function AccesoDenegadoPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-red-400"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          </div>
        </div>

        <h1 className="text-xl font-bold text-white mb-3">Acceso denegado</h1>

        <p className="text-gray-400 text-sm leading-relaxed mb-8">
          Tu cuenta no tiene acceso a AIAVANCE.
          <br />
          Contacta con nosotros en{" "}
          <a
            href="mailto:contacto@aiavance.es"
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            contacto@aiavance.es
          </a>
        </p>

        <Link
          href="/login"
          className="inline-block text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          ← Volver al login
        </Link>
      </div>
    </main>
  );
}

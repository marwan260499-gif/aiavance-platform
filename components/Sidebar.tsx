"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Calendar,
  PhoneForwarded,
  Settings,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/dashboard",                label: "Dashboard",       icon: LayoutDashboard },
  { href: "/dashboard/leads",          label: "Leads",           icon: Users },
  { href: "/dashboard/conversaciones", label: "Conversaciones",  icon: MessageSquare },
  { href: "/dashboard/citas",          label: "Citas",           icon: Calendar },
  { href: "/dashboard/handoffs",       label: "Handoffs",        icon: PhoneForwarded },
  { href: "/dashboard/configuracion",  label: "Configuración",   icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-800">
        <span className="text-xl font-bold tracking-tight text-white">
          AI<span className="text-blue-500">AVANCE</span>
        </span>
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              <Icon size={18} strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer del sidebar */}
      <div className="px-3 py-4 border-t border-gray-800 space-y-1">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <LogOut size={18} strokeWidth={1.75} />
          Cerrar sesión
        </button>
        <p className="text-xs text-gray-700 text-center pt-1">AIAVANCE v0.1</p>
      </div>
    </aside>
  );
}

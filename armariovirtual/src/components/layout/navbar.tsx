"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Home,
  Image as ImageIcon,
  Layers,
  LogIn,
  LogOut,
  Menu,
  ShoppingBag,
  User,
  X,
} from "lucide-react";

interface NavbarProps {
  usuario: { id: number; nombre: string } | null;
  paraLavar?: number;
}

const navItems = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/catalogo", label: "Catálogo", icon: ShoppingBag },
  { href: "/looks", label: "Looks", icon: Layers },
  { href: "/probador", label: "Probador Virtual", icon: ImageIcon },
  { href: "/estadisticas", label: "Estadísticas", icon: BarChart3 },
  { href: "/usuario", label: "Mi Perfil", icon: User },
];

function BadgeParaLavar({ cantidad }: { cantidad: number }) {
  if (cantidad <= 0) return null;
  return (
    <span
      title={`${cantidad} prenda${cantidad === 1 ? "" : "s"} para lavar`}
      className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm"
    >
      {cantidad}
    </span>
  );
}

export function Navbar({ usuario, paraLavar = 0 }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const cerrarSesion = async () => {
    if (saliendo) return;
    setSaliendo(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setOpen(false);
      router.replace("/login");
      router.refresh();
      setSaliendo(false);
    }
  };

  const esActivo = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 border-b border-input bg-background/90 backdrop-blur">
      <div className="flex items-center justify-between gap-3 px-4 py-2 sm:py-3">
        <Link href={usuario ? "/" : "/login"} className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
            A
          </div>
          <span className="font-bold text-lg tracking-tight">
            Armario<span className="hidden sm:inline"> Virtual</span>
          </span>
        </Link>

        {usuario ? (
          <>
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    esActivo(item.href)
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  {item.label}
                  {item.href === "/catalogo" && (
                    <BadgeParaLavar cantidad={paraLavar} />
                  )}
                </Link>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-2">
              <span className="max-w-40 truncate rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground">
                Hola, {usuario.nombre}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={cerrarSesion}
                disabled={saliendo}
                title="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
                <span className="ml-1.5">{saliendo ? "Saliendo..." : "Salir"}</span>
              </Button>
            </div>

            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="md:hidden cursor-pointer rounded-md p-2 text-foreground transition-colors hover:bg-accent active:scale-95"
              aria-label={open ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={open}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </>
        ) : (
          <Button asChild size="sm">
            <Link href="/login">
              <LogIn className="h-4 w-4 mr-1.5" /> Iniciar sesión
            </Link>
          </Button>
        )}
      </div>

      {usuario && open && (
        <div className="md:hidden border-t border-input bg-background">
          <div className="space-y-1 p-4">
            <p className="mb-2 truncate rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground">
              Hola, {usuario.nombre}
            </p>
            {navItems.map((item) => {
              const Icono = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                    esActivo(item.href)
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-accent"
                  }`}
                >
                  <Icono className="h-4 w-4" />
                  {item.label}
                  {item.href === "/catalogo" && (
                    <BadgeParaLavar cantidad={paraLavar} />
                  )}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={cerrarSesion}
              disabled={saliendo}
              className="mt-2 flex w-full cursor-pointer items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 active:scale-[0.98] disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              {saliendo ? "Cerrando sesión..." : "Cerrar sesión"}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Image as ImageIcon,
  Layers,
  Plus,
  Shirt,
  User,
} from "lucide-react";

interface MobileBottomNavProps {
  paraLavar?: number;
}

interface ItemNav {
  href: string;
  label: string;
  icono: typeof Home;
}

const ITEMS: ItemNav[] = [
  { href: "/", label: "Inicio", icono: Home },
  { href: "/catalogo", label: "Armario", icono: Shirt },
  { href: "/prendas/nueva", label: "Subir", icono: Plus },
  { href: "/looks", label: "Looks", icono: Layers },
  { href: "/usuario", label: "Perfil", icono: User },
];

/**
 * Barra de navegación inferior para móvil con 5 accesos cómodos para el pulgar.
 * Solo se muestra en pantallas pequeñas (`sm:hidden`).
 */
export function MobileBottomNav({ paraLavar = 0 }: MobileBottomNavProps) {
  const pathname = usePathname();
  const [looksAbierto, setLooksAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!looksAbierto) return;
    const manejarClick = (evento: MouseEvent) => {
      if (
        contenedorRef.current &&
        !contenedorRef.current.contains(evento.target as Node)
      ) {
        setLooksAbierto(false);
      }
    };
    document.addEventListener("mousedown", manejarClick);
    return () => document.removeEventListener("mousedown", manejarClick);
  }, [looksAbierto]);

  const esActivo = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav
      aria-label="Navegación principal móvil"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-input bg-white/90 backdrop-blur-md dark:bg-background/90 sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="relative mx-auto grid max-w-md grid-cols-5 items-end px-2 pt-2">
        {ITEMS.map((item) => {
          const Icono = item.icono;
          const activa = esActivo(item.href);

          if (item.href === "/looks") {
            return (
              <div key={item.href} ref={contenedorRef} className="relative">
                {looksAbierto && (
                  <div className="absolute bottom-14 left-1/2 w-40 -translate-x-1/2 overflow-hidden rounded-xl border border-input bg-background shadow-lg">
                    <Link
                      href="/looks"
                      onClick={() => setLooksAbierto(false)}
                      className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent active:scale-[0.97]"
                    >
                      <Layers className="h-4 w-4" /> Mis looks
                    </Link>
                    <Link
                      href="/probador"
                      onClick={() => setLooksAbierto(false)}
                      className="flex items-center gap-2 border-t border-input px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent active:scale-[0.97]"
                    >
                      <ImageIcon className="h-4 w-4" /> Probador IA
                    </Link>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setLooksAbierto((v) => !v)}
                  aria-expanded={looksAbierto}
                  aria-label="Looks y probador"
                  className={`flex w-full flex-col items-center gap-1 rounded-lg py-1 text-[10px] font-medium transition-all active:scale-[0.97] ${
                    activa
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icono className="h-5 w-5" />
                  {item.label}
                </button>
              </div>
            );
          }

          if (item.href === "/prendas/nueva") {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label="Subir prenda"
                className="flex flex-col items-center gap-1 text-[10px] font-medium text-muted-foreground"
              >
                <span className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-background transition-all active:scale-[0.95]">
                  <Icono className="h-6 w-6" />
                </span>
                <span className="pb-1">{item.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center gap-1 rounded-lg py-1 text-[10px] font-medium transition-all active:scale-[0.97] ${
                activa
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icono className="h-5 w-5" />
              {item.label}
              {item.href === "/usuario" && paraLavar > 0 && (
                <span className="absolute right-1/2 top-0 flex h-4 min-w-4 translate-x-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">
                  {paraLavar}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

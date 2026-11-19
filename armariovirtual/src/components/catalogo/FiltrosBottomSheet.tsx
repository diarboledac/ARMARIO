"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import FiltrosAvanzados from "@/components/catalogo/FiltrosAvanzados";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, X } from "lucide-react";

const PARAMETROS_FILTRO = [
  "temporada",
  "ocasion",
  "patron",
  "estado",
  "favoritos",
] as const;

/**
 * Botón pill "Filtros" con contador de filtros activos que abre un cajón
 * inferior (bottom sheet) con todos los filtros del catálogo.
 */
export default function FiltrosBottomSheet() {
  const [abierto, setAbierto] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filtrosActivos = PARAMETROS_FILTRO.filter((param) =>
    Boolean(searchParams.get(param))
  ).length;

  useEffect(() => {
    if (!abierto) return;

    const manejarEscape = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAbierto(false);
    };

    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", manejarEscape);

    return () => {
      document.removeEventListener("keydown", manejarEscape);
      document.body.style.overflow = overflowPrevio;
    };
  }, [abierto]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-input bg-background px-3.5 py-2 text-sm font-medium shadow-sm transition-all hover:bg-accent active:scale-[0.97]"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filtros
        {filtrosActivos > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
            {filtrosActivos}
          </span>
        )}
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Filtros del catálogo"
        >
          <button
            type="button"
            aria-label="Cerrar filtros"
            onClick={() => setAbierto(false)}
            className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm"
          />

          <div className="sheet-enter relative z-10 max-h-[88vh] w-full overflow-y-auto rounded-t-3xl border border-input bg-background p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-input sm:hidden" />

            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Filtrar catálogo
                </h2>
                <p className="text-sm text-muted-foreground">
                  Afina tu armario por temporada, ocasión, estado o favoritos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar filtros"
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-input transition-all hover:bg-accent active:scale-[0.95]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5">
              <FiltrosAvanzados
                mostrarCabecera={false}
                onInteract={() => setAbierto(false)}
              />
            </div>

            <div className="mt-6 flex gap-2 border-t border-input pt-4">
              <Button asChild variant="outline" className="flex-1">
                <Link href={pathname} onClick={() => setAbierto(false)}>
                  Limpiar todo
                </Link>
              </Button>
              <Button
                type="button"
                onClick={() => setAbierto(false)}
                className="flex-1 transition-all active:scale-[0.97]"
              >
                Ver resultados
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import {
  OCASION_LABEL,
  TEMPORADA_LABEL,
} from "@/lib/prenda-metadata";
import type { Prenda } from "@/lib/db/types";

interface BuscadorCatalogoProps {
  color?: string;
  temporada?: string;
  ocasion?: string;
}

/**
 * Buscador global del catálogo con debounce de 300 ms.
 * Consulta `/api/buscar`, que siempre filtra por el usuario autenticado.
 */
export default function BuscadorCatalogo({
  color,
  temporada,
  ocasion,
}: BuscadorCatalogoProps) {
  const router = useRouter();
  const [consulta, setConsulta] = useState("");
  const [resultados, setResultados] = useState<Prenda[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  const manejarCambio = (valor: string) => {
    setConsulta(valor);
    if (!valor.trim()) {
      setResultados([]);
      setCargando(false);
      setError(null);
    } else {
      setCargando(true);
    }
  };

  // Debounce de 300 ms antes de consultar la API.
  useEffect(() => {
    const termino = consulta.trim();
    if (!termino) return;

    let cancelado = false;
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: termino });
        if (color) params.set("color", color);
        if (temporada) params.set("temporada", temporada);
        if (ocasion) params.set("ocasion", ocasion);

        const res = await fetch(`/api/buscar?${params.toString()}`);
        const data = (await res.json().catch(() => null)) as
          | Prenda[]
          | { error?: string }
          | null;

        if (cancelado) return;
        if (!res.ok) {
          const mensaje =
            data && !Array.isArray(data) ? data.error : undefined;
          throw new Error(mensaje ?? "Error en la búsqueda");
        }
        setResultados(Array.isArray(data) ? data : []);
        setError(null);
      } catch (err) {
        if (cancelado) return;
        setError(
          err instanceof Error ? err.message : "Error en la búsqueda"
        );
        setResultados([]);
      } finally {
        if (!cancelado) setCargando(false);
      }
    }, 300);

    return () => {
      cancelado = true;
      window.clearTimeout(timer);
    };
  }, [consulta, color, temporada, ocasion]);

  // Cierra el desplegable al hacer clic fuera.
  useEffect(() => {
    const manejarClick = (evento: MouseEvent) => {
      if (
        contenedorRef.current &&
        !contenedorRef.current.contains(evento.target as Node)
      ) {
        setAbierto(false);
      }
    };
    document.addEventListener("mousedown", manejarClick);
    return () => document.removeEventListener("mousedown", manejarClick);
  }, []);

  const verTodos = () => {
    const params = new URLSearchParams();
    params.set("q", consulta.trim());
    if (color) params.set("color", color);
    if (temporada) params.set("temporada", temporada);
    if (ocasion) params.set("ocasion", ocasion);
    setAbierto(false);
    router.push(`/catalogo?${params.toString()}`);
  };

  const mostrarDesplegable =
    abierto && (consulta.trim().length > 0 || cargando || error);

  return (
    <div ref={contenedorRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={consulta}
          onChange={(e) => manejarCambio(e.target.value)}
          onFocus={() => setAbierto(true)}
          placeholder="Buscar por nombre, color o descripción..."
          aria-label="Buscar prendas"
          className="h-10 pl-9 pr-9"
        />
        {cargando ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <Spinner size="sm" />
          </span>
        ) : consulta ? (
          <button
            type="button"
            onClick={() => setConsulta("")}
            aria-label="Limpiar búsqueda"
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-accent active:scale-[0.95]"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {mostrarDesplegable && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-input bg-background shadow-lg">
          {error ? (
            <p className="px-4 py-3 text-sm text-destructive">{error}</p>
          ) : resultados.length === 0 && !cargando ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              Sin resultados para “{consulta.trim()}”
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {resultados.slice(0, 8).map((prenda) => {
                const src = prenda.imagen_sin_fondo_url || prenda.imagen_url;
                return (
                  <li key={prenda.id}>
                    <Link
                      href={`/prendas/${prenda.id}`}
                      onClick={() => setAbierto(false)}
                      className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-accent active:scale-[0.99]"
                    >
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                        {src && (
                          <Image
                            src={src}
                            alt={prenda.nombre}
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {prenda.nombre}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {prenda.temporada !== "todas" && (
                            <Badge
                              variant="secondary"
                              className="text-[10px]"
                            >
                              {TEMPORADA_LABEL[prenda.temporada]}
                            </Badge>
                          )}
                          {prenda.ocasion !== "todas" && (
                            <Badge
                              variant="outline"
                              className="text-[10px]"
                            >
                              {OCASION_LABEL[prenda.ocasion]}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {resultados.length > 0 && (
            <button
              type="button"
              onClick={verTodos}
              className="w-full cursor-pointer border-t border-input px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-accent active:scale-[0.99]"
            >
              Ver los {resultados.length} resultados en el catálogo
            </button>
          )}
        </div>
      )}
    </div>
  );
}

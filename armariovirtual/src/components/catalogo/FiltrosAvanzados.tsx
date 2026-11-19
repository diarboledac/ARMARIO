"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Check, Heart, SlidersHorizontal, X } from "lucide-react";
import {
  OCASIONES,
  OCASION_LABEL,
  PATRONES,
  PATRON_LABEL,
  TEMPORADAS,
  TEMPORADA_LABEL,
} from "@/lib/prenda-metadata";
import type { Ocasion, Patron, Temporada } from "@/lib/db/types";

interface OpcionPill {
  valor: string;
  etiqueta: string;
}

const ESTADOS: OpcionPill[] = [
  { valor: "limpia", etiqueta: "Limpias" },
  { valor: "para_lavar", etiqueta: "Para lavar" },
];

interface PillsFiltroProps {
  etiqueta: string;
  opciones: OpcionPill[];
  param: string;
  valorActual: string | null;
  searchParams: URLSearchParams;
  pathname: string;
  onInteract?: () => void;
}

function PillsFiltro({
  etiqueta,
  opciones,
  param,
  valorActual,
  searchParams,
  pathname,
  onInteract,
}: PillsFiltroProps) {
  const construirHref = (valor: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (valor) {
      params.set(param, valor);
    } else {
      params.delete(param);
    }
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {etiqueta}
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <Link
          href={construirHref(null)}
          onClick={onInteract}
          aria-pressed={!valorActual}
          className={`inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-150 active:scale-[0.97] ${
            !valorActual
              ? "border-primary bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30"
              : "border-input bg-background hover:bg-accent"
          }`}
        >
          {!valorActual && <Check className="h-3.5 w-3.5" />}
          Todas
        </Link>
        {opciones.map((opcion) => {
          const activa = valorActual === opcion.valor;
          return (
            <Link
              key={opcion.valor}
              href={construirHref(activa ? null : opcion.valor)}
              onClick={onInteract}
              aria-pressed={activa}
              className={`inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-150 active:scale-[0.97] ${
                activa
                  ? "border-primary bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30"
                  : "border-input bg-background hover:bg-accent"
              }`}
            >
              {activa && <Check className="h-3.5 w-3.5" />}
              {opcion.etiqueta}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

interface FiltrosAvanzadosProps {
  /** Clases extra del contenedor (por ejemplo, para el bottom sheet). */
  className?: string;
  /** Oculta la cabecera interna cuando el contenedor ya aporta su propio título. */
  mostrarCabecera?: boolean;
  /** Se invoca al pulsar cualquier filtro (permite cerrar el bottom sheet). */
  onInteract?: () => void;
}

/**
 * Filtros avanzados del catálogo (temporada, ocasión, estado, patrón y
 * favoritos). Se muestra dentro del bottom sheet móvil o en línea en
 * escritorio.
 */
export default function FiltrosAvanzados({
  className = "",
  mostrarCabecera = true,
  onInteract,
}: FiltrosAvanzadosProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const temporada = searchParams.get("temporada");
  const ocasion = searchParams.get("ocasion");
  const patron = searchParams.get("patron");
  const estado = searchParams.get("estado");
  const favoritos = searchParams.get("favoritos");

  const hayFiltros = Boolean(temporada || ocasion || patron || estado || favoritos);

  const opcionesTemporada: OpcionPill[] = (TEMPORADAS as readonly Temporada[])
    .filter((t) => t !== "todas")
    .map((t) => ({ valor: t, etiqueta: TEMPORADA_LABEL[t] }));

  const opcionesOcasion: OpcionPill[] = (OCASIONES as readonly Ocasion[])
    .filter((o) => o !== "todas")
    .map((o) => ({ valor: o, etiqueta: OCASION_LABEL[o] }));

  const opcionesPatron: OpcionPill[] = (PATRONES as readonly Patron[])
    .filter((p) => p !== "liso")
    .map((p) => ({ valor: p, etiqueta: PATRON_LABEL[p] }));

  const paramsActuales = new URLSearchParams(searchParams.toString());
  const hrefFavoritos = (() => {
    const params = new URLSearchParams(paramsActuales.toString());
    if (favoritos) {
      params.delete("favoritos");
    } else {
      params.set("favoritos", "1");
    }
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  })();

  return (
    <section
      aria-label="Filtros avanzados"
      className={`space-y-4 ${className}`}
    >
      {mostrarCabecera && (
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal className="h-4 w-4" /> Filtros
          </h2>
          {hayFiltros && (
            <Link
              href={pathname}
              onClick={onInteract}
              className="inline-flex items-center gap-1 rounded-full border border-input px-2.5 py-1 text-xs font-medium text-muted-foreground transition-all hover:bg-accent active:scale-[0.97]"
            >
              <X className="h-3 w-3" /> Limpiar filtros
            </Link>
          )}
        </div>
      )}

      <PillsFiltro
        etiqueta="Temporada"
        opciones={opcionesTemporada}
        param="temporada"
        valorActual={temporada}
        searchParams={paramsActuales}
        pathname={pathname}
        onInteract={onInteract}
      />

      <PillsFiltro
        etiqueta="Ocasión"
        opciones={opcionesOcasion}
        param="ocasion"
        valorActual={ocasion}
        searchParams={paramsActuales}
        pathname={pathname}
        onInteract={onInteract}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <PillsFiltro
          etiqueta="Estado"
          opciones={ESTADOS}
          param="estado"
          valorActual={estado}
          searchParams={paramsActuales}
          pathname={pathname}
          onInteract={onInteract}
        />
        <PillsFiltro
          etiqueta="Patrón"
          opciones={opcionesPatron}
          param="patron"
          valorActual={patron}
          searchParams={paramsActuales}
          pathname={pathname}
          onInteract={onInteract}
        />
      </div>

      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Favoritos
        </p>
        <Link
          href={hrefFavoritos}
          onClick={onInteract}
          aria-pressed={Boolean(favoritos)}
          className={`inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-150 active:scale-[0.97] ${
            favoritos
              ? "border-rose-400 bg-rose-500 text-white shadow-sm ring-2 ring-rose-300/40"
              : "border-input bg-background hover:bg-accent"
          }`}
        >
          <Heart
            className={`h-3.5 w-3.5 ${favoritos ? "fill-current" : ""}`}
          />
          Solo favoritos
        </Link>
      </div>
    </section>
  );
}

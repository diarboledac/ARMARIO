"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import MarcarUsadaHoy from "@/components/prendas/MarcarUsadaHoy";
import ToggleEstado from "@/components/prendas/ToggleEstado";
import { useRecorteFondo } from "@/hooks/useRecorteFondo";
import {
  OCASION_LABEL,
  TEMPORADA_LABEL,
} from "@/lib/prenda-metadata";
import type { Prenda } from "@/lib/db/types";
import { Ellipsis, Heart, Loader2, Sparkles } from "lucide-react";

export type VistaCatalogo = "galeria" | "lista";

interface TarjetaPrendaProps {
  prenda: Prenda;
  vista?: VistaCatalogo;
  /** Estado actual del favorito (controlado por el catálogo). */
  esFavorito?: boolean;
  /** Callback para alternar el favorito con actualización optimista. */
  onToggleFavorito?: (prendaId: number) => void;
  /** Nombre legible de la categoría de la prenda. */
  nombreCategoria?: string;
}

function BadgesPrenda({ prenda }: { prenda: Prenda }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {prenda.temporada !== "todas" && (
        <Badge variant="secondary" className="text-[11px] font-medium">
          {TEMPORADA_LABEL[prenda.temporada]}
        </Badge>
      )}
      {prenda.ocasion !== "todas" && (
        <Badge variant="outline" className="text-[11px] font-medium">
          {OCASION_LABEL[prenda.ocasion]}
        </Badge>
      )}
      {prenda.estado === "para_lavar" && (
        <Badge
          variant="outline"
          className="border-amber-500/50 bg-amber-500/15 text-[11px] font-medium text-amber-700"
        >
          Para lavar
        </Badge>
      )}
      {prenda.veces_usada > 0 && (
        <span className="text-[11px] text-muted-foreground">
          {prenda.veces_usada} {prenda.veces_usada === 1 ? "uso" : "usos"}
        </span>
      )}
    </div>
  );
}

/** Botón de favorito con estado optimista. */
function BotonFavorito({
  esFavorito,
  onToggle,
  nombre,
  className = "",
}: {
  esFavorito: boolean;
  onToggle?: () => void;
  nombre: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!onToggle}
      aria-pressed={esFavorito}
      aria-label={
        esFavorito
          ? `Quitar ${nombre} de favoritos`
          : `Añadir ${nombre} a favoritos`
      }
      className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/85 text-neutral-700 shadow-sm backdrop-blur transition-all duration-200 hover:bg-white active:scale-[0.92] disabled:cursor-default ${className}`}
    >
      <Heart
        className={`h-[18px] w-[18px] transition-colors ${
          esFavorito ? "fill-rose-500 text-rose-500" : "text-neutral-700"
        }`}
      />
    </button>
  );
}

/** Menú contextual con las acciones rápidas de la prenda. */
function MenuRapido({ prenda }: { prenda: Prenda }) {
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;

    const manejarClick = (evento: MouseEvent) => {
      if (
        contenedorRef.current &&
        !contenedorRef.current.contains(evento.target as Node)
      ) {
        setAbierto(false);
      }
    };
    const manejarEscape = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAbierto(false);
    };

    document.addEventListener("mousedown", manejarClick);
    document.addEventListener("keydown", manejarEscape);
    return () => {
      document.removeEventListener("mousedown", manejarClick);
      document.removeEventListener("keydown", manejarEscape);
    };
  }, [abierto]);

  return (
    <div ref={contenedorRef} className="absolute right-2 top-2 z-20">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-haspopup="menu"
        aria-label={`Acciones de ${prenda.nombre}`}
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/85 text-neutral-700 shadow-sm backdrop-blur transition-all duration-200 hover:bg-white active:scale-[0.92]"
      >
        <Ellipsis className="h-[18px] w-[18px]" />
      </button>

      {abierto && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-30 w-52 overflow-hidden rounded-xl border border-input bg-background p-1 shadow-xl"
        >
          <MarcarUsadaHoy prendaId={prenda.id} estilo="menu" />
          <ToggleEstado
            prendaId={prenda.id}
            estado={prenda.estado}
            estilo="menu"
          />
          <Link
            href={`/prendas/${prenda.id}`}
            role="menuitem"
            onClick={() => setAbierto(false)}
            className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            Ver detalle
          </Link>
        </div>
      )}
    </div>
  );
}

/** Indicador pulsante mientras la IA recorta el fondo. */
function IndicadorRecorte({ intentos }: { intentos: number }) {
  return (
    <span className="animate-pulse-soft inline-flex items-center gap-1.5 rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur">
      <Loader2 className="h-3 w-3 animate-spin" />
      Recortando fondo con IA...
      {intentos > 0 && (
        <span className="opacity-70">({intentos}/6)</span>
      )}
    </span>
  );
}

export default function TarjetaPrenda({
  prenda,
  vista = "galeria",
  esFavorito = false,
  onToggleFavorito,
  nombreCategoria,
}: TarjetaPrendaProps) {
  const { imagenRecortada, procesando, intentos } = useRecorteFondo(prenda);
  const src = imagenRecortada || prenda.imagen_sin_fondo_url || prenda.imagen_url;

  const colorPunto = prenda.color ? (
    <span
      aria-label={`Color ${prenda.color}`}
      title={prenda.color}
      className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-black/10 shadow-sm"
      style={{ backgroundColor: prenda.color }}
    />
  ) : null;

  if (vista === "lista") {
    return (
      <article className="group relative flex items-center gap-3 rounded-2xl border border-input bg-background p-3 transition-all duration-200 hover:shadow-md">
        <Link
          href={`/prendas/${prenda.id}`}
          className="relative block h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-[#F6F6F4] dark:bg-card"
        >
          {src ? (
            <Image
              src={src}
              alt={prenda.nombre}
              fill
              sizes="80px"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              Sin imagen
            </span>
          )}
          {procesando && (
            <span className="absolute bottom-1 left-1 right-1 flex justify-center">
              <IndicadorRecorte intentos={intentos} />
            </span>
          )}
        </Link>

        <Link
          href={`/prendas/${prenda.id}`}
          className="min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
            {colorPunto}
            <span className="truncate">{prenda.nombre}</span>
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {nombreCategoria ?? ""}
            {nombreCategoria && prenda.descripcion ? " · " : ""}
            {prenda.descripcion ?? "Sin descripción"}
          </p>
          <div className="mt-1.5">
            <BadgesPrenda prenda={prenda} />
          </div>
        </Link>

        <div className="absolute right-2 top-2">
          <BotonFavorito
            esFavorito={esFavorito}
            onToggle={
              onToggleFavorito ? () => onToggleFavorito(prenda.id) : undefined
            }
            nombre={prenda.nombre}
            className="static"
          />
        </div>
      </article>
    );
  }

  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-black/5 bg-[#F6F6F4] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl dark:border-input dark:bg-card">
      <div className="relative aspect-[3/4] overflow-hidden rounded-t-2xl">
        <Link
          href={`/prendas/${prenda.id}`}
          aria-label={prenda.nombre}
          className="absolute inset-0 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          {src ? (
            <Image
              src={src}
              alt={prenda.nombre}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
              Sin imagen
            </span>
          )}
        </Link>

        <BotonFavorito
          esFavorito={esFavorito}
          onToggle={
            onToggleFavorito ? () => onToggleFavorito(prenda.id) : undefined
          }
          nombre={prenda.nombre}
          className="absolute left-2 top-2 z-10"
        />

        {procesando && (
          <span className="absolute bottom-2 left-2 z-10">
            <IndicadorRecorte intentos={intentos} />
          </span>
        )}

        {prenda.estado === "para_lavar" && (
          <span className="absolute bottom-2 right-2 z-10">
            <Badge
              variant="outline"
              className="border-amber-500/50 bg-white/90 text-[10px] font-medium text-amber-700 backdrop-blur"
            >
              Para lavar
            </Badge>
          </span>
        )}
      </div>

      {/* Menú contextual fuera del contenedor de la imagen para que el
          desplegable nunca quede recortado por el `overflow-hidden`. */}
      <MenuRapido prenda={prenda} />

      <div className="flex flex-1 flex-col gap-1 rounded-b-2xl px-3 pb-3 pt-2.5">
        <Link
          href={`/prendas/${prenda.id}`}
          className="truncate text-sm font-medium tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {prenda.nombre}
        </Link>
        <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
          {colorPunto}
          {nombreCategoria ?? "Prenda"}
          {prenda.imagen_sin_fondo_url && (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide">
              <Sparkles className="h-3 w-3" /> sin fondo
            </span>
          )}
        </p>
      </div>
    </article>
  );
}

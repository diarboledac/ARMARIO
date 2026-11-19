"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/ToastProvider";
import { AlertCircle, Check, Heart, Search, Sparkles } from "lucide-react";
import {
  OCASIONES,
  OCASION_LABEL,
  SLOT_LABEL,
} from "@/lib/prenda-metadata";
import type { Ocasion, SlotLook } from "@/lib/db/types";

export interface PrendaConstructor {
  id: number;
  nombre: string;
  categoria_id: number;
  imagen_url: string;
  imagen_sin_fondo_url: string | null;
}

const SLOTS: SlotLook[] = ["superior", "inferior", "calzado", "complemento"];

/** Sugerencia de slot según la categoría de la prenda (categorías base). */
const SLOT_SUGERIDO: Record<number, SlotLook> = {
  1: "superior",
  2: "inferior",
  3: "superior",
  4: "superior",
  5: "calzado",
  6: "complemento",
};

interface ConstructorLookProps {
  prendas: PrendaConstructor[];
}

export default function ConstructorLook({ prendas }: ConstructorLookProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [nombre, setNombre] = useState("");
  const [ocasion, setOcasion] = useState<Ocasion>("todas");
  const [descripcion, setDescripcion] = useState("");
  const [esFavorito, setEsFavorito] = useState(false);
  const [slotActivo, setSlotActivo] = useState<SlotLook>("superior");
  const [busqueda, setBusqueda] = useState("");
  const [seleccion, setSeleccion] = useState<
    Partial<Record<SlotLook, number>>
  >({});
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prendasFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return prendas;
    return prendas.filter((p) => p.nombre.toLowerCase().includes(termino));
  }, [prendas, busqueda]);

  const seleccionadas = useMemo(
    () =>
      Object.entries(seleccion)
        .filter((entry): entry is [SlotLook, number] => Boolean(entry[1]))
        .map(([slot, prendaId]) => ({
          slot,
          prendaId,
          prenda: prendas.find((p) => p.id === prendaId),
        })),
    [seleccion, prendas]
  );

  const totalSeleccionadas = seleccionadas.length;

  const alternarPrenda = (prendaId: number) => {
    setSeleccion((actual) => {
      const siguiente = { ...actual };
      if (siguiente[slotActivo] === prendaId) {
        delete siguiente[slotActivo];
        return siguiente;
      }
      siguiente[slotActivo] = prendaId;
      return siguiente;
    });
  };

  const quitar = (slot: SlotLook) => {
    setSeleccion((actual) => {
      const siguiente = { ...actual };
      delete siguiente[slot];
      return siguiente;
    });
  };

  const guardar = async () => {
    if (enviando) return;
    if (!nombre.trim()) {
      setError("Ponle un nombre al look");
      return;
    }
    if (totalSeleccionadas === 0) {
      setError("Selecciona al menos una prenda");
      return;
    }

    setEnviando(true);
    setError(null);
    try {
      const payload = {
        nombre: nombre.trim(),
        ocasion,
        descripcion: descripcion.trim() || null,
        es_favorito: esFavorito,
        prendas: seleccionadas.map((item, indice) => ({
          prenda_id: item.prendaId,
          slot: item.slot,
          posicion: indice,
        })),
      };

      const res = await fetch("/api/looks/collage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => null)) as {
        id?: number;
        error?: string;
      } | null;

      if (!res.ok || !data?.id) {
        throw new Error(data?.error ?? "No se pudo crear el look");
      }

      toast({
        title: "¡Look creado!",
        description: `“${nombre.trim()}” ya está en tu armario con su collage.`,
        variant: "success",
      });

      router.push(`/looks/${data.id}`);
      router.refresh();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "Error creando el look";
      setError(mensaje);
      toast({
        title: "No se pudo crear el look",
        description: mensaje,
        variant: "error",
      });
      setEnviando(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Selector de prendas */}
      <section className="space-y-4">
        <div className="space-y-3 rounded-xl border border-input p-4">
          <div>
            <label
              htmlFor="nombre-look"
              className="mb-1.5 block text-sm font-medium"
            >
              Nombre del look
            </label>
            <Input
              id="nombre-look"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Look casual de fin de semana"
              maxLength={150}
            />
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium">Ocasión</p>
            <div className="flex flex-wrap gap-2">
              {OCASIONES.map((valor) => {
                const activa = ocasion === valor;
                return (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => setOcasion(valor)}
                    aria-pressed={activa}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-150 active:scale-[0.97] ${
                      activa
                        ? "border-primary bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30"
                        : "border-input bg-background hover:bg-accent"
                    }`}
                  >
                    {activa && <Check className="h-3.5 w-3.5" />}
                    {OCASION_LABEL[valor]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="descripcion-look"
              className="mb-1.5 block text-sm font-medium"
            >
              Descripción (opcional)
            </label>
            <Input
              id="descripcion-look"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Con notas para este look"
              maxLength={2000}
            />
          </div>

          <button
            type="button"
            onClick={() => setEsFavorito((v) => !v)}
            aria-pressed={esFavorito}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-all active:scale-[0.97] ${
              esFavorito
                ? "border-rose-500 bg-rose-500 text-white shadow-sm ring-2 ring-rose-500/30"
                : "border-input bg-background hover:bg-accent"
            }`}
          >
            <Heart
              className={`h-4 w-4 ${esFavorito ? "fill-current" : ""}`}
            />
            Favorito
          </button>
        </div>

        <div className="space-y-3 rounded-xl border border-input p-4">
          <div>
            <p className="mb-1.5 text-sm font-medium">Elige el slot</p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {SLOTS.map((slot) => {
                const activa = slotActivo === slot;
                const ocupada = Boolean(seleccion[slot]);
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSlotActivo(slot)}
                    aria-pressed={activa}
                    className={`inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-150 active:scale-[0.97] ${
                      activa
                        ? "border-primary bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30"
                        : "border-input bg-background hover:bg-accent"
                    }`}
                  >
                    {ocupada && <Check className="h-3.5 w-3.5" />}
                    {SLOT_LABEL[slot]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar prenda"
              className="h-9 pl-9"
            />
          </div>

          {prendasFiltradas.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {prendas.length === 0
                ? "Primero sube prendas a tu armario"
                : "Ninguna prenda coincide con la búsqueda"}
            </p>
          ) : (
            <div className="grid max-h-[420px] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
              {prendasFiltradas.map((prenda) => {
                const seleccionadaEnSlot = seleccion[slotActivo] === prenda.id;
                const sugerida = SLOT_SUGERIDO[prenda.categoria_id] === slotActivo;
                const src = prenda.imagen_sin_fondo_url || prenda.imagen_url;
                return (
                  <button
                    key={prenda.id}
                    type="button"
                    onClick={() => alternarPrenda(prenda.id)}
                    aria-pressed={seleccionadaEnSlot}
                    title={prenda.nombre}
                    className={`relative aspect-square cursor-pointer overflow-hidden rounded-lg border-2 transition-all duration-150 active:scale-[0.97] ${
                      seleccionadaEnSlot
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border hover:border-muted-foreground/50"
                    }`}
                  >
                    {src ? (
                      <Image
                        src={src}
                        alt={prenda.nombre}
                        fill
                        sizes="(max-width: 640px) 33vw, 20vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-muted text-[10px] text-muted-foreground">
                        Sin img
                      </div>
                    )}
                    {seleccionadaEnSlot && (
                      <div className="absolute inset-0 flex items-center justify-center bg-primary/30">
                        <div className="rounded-full bg-primary p-1.5 shadow-lg">
                          <Check className="h-4 w-4 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                      <span className="block truncate text-[10px] font-medium text-white">
                        {prenda.nombre}
                      </span>
                    </div>
                    {sugerida && !seleccionadaEnSlot && (
                      <span className="absolute left-1 top-1 rounded-full bg-emerald-500/90 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                        Sugerido
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Vista previa */}
      <section className="space-y-4">
        <div className="space-y-3 rounded-xl border border-input p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Vista previa</p>
            <Badge variant="secondary">
              {totalSeleccionadas}/4 prendas
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {SLOTS.map((slot) => {
              const prendaId = seleccion[slot];
              const prenda = prendaId
                ? prendas.find((p) => p.id === prendaId)
                : null;
              const src = prenda
                ? prenda.imagen_sin_fondo_url || prenda.imagen_url
                : null;
              const activa = slotActivo === slot;
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSlotActivo(slot)}
                  className={`relative aspect-square cursor-pointer overflow-hidden rounded-lg border-2 bg-muted transition-all duration-150 active:scale-[0.97] ${
                    activa
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-dashed border-input"
                  }`}
                >
                  {src ? (
                    <Image
                      src={src}
                      alt={prenda?.nombre ?? SLOT_LABEL[slot]}
                      fill
                      sizes="50vw"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-muted-foreground">
                      {SLOT_LABEL[slot]}
                    </span>
                  )}
                  {prenda && (
                    <>
                      <span className="absolute left-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                        {SLOT_LABEL[slot]}
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          quitar(slot);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.stopPropagation();
                            quitar(slot);
                          }
                        }}
                        className="absolute right-1 top-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition-all hover:bg-destructive active:scale-[0.95]"
                        aria-label={`Quitar ${SLOT_LABEL[slot]}`}
                      >
                        ×
                      </span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <Button
          type="button"
          onClick={guardar}
          disabled={enviando}
          className="w-full transition-all active:scale-[0.97]"
        >
          {enviando ? (
            <>
              <Spinner size="sm" className="mr-2" /> Generando collage...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" /> Crear look y collage
            </>
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          El collage 2x2 se genera con tus prendas y se guarda en tu
          armario.
        </p>
      </section>
    </div>
  );
}

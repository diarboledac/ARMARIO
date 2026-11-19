"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import Image from "next/image";
import Link from "next/link";
import { Check, RefreshCw, ShoppingBag, User } from "lucide-react";
import MarcarUsadaHoy from "@/components/prendas/MarcarUsadaHoy";
import ToggleEstado from "@/components/prendas/ToggleEstado";
import type { EstadoPrenda } from "@/lib/db/types";

interface Prenda {
  id: number;
  nombre: string;
  imagen_url: string;
  imagen_sin_fondo_url: string | null;
  estado: EstadoPrenda;
}

interface PruebaVirtualProps {
  usuario: {
    id: number;
    nombre: string;
    foto_base_url: string | null;
  };
  prendas: Prenda[];
}

export default function PruebaVirtual({
  usuario,
  prendas,
}: PruebaVirtualProps) {
  const [prendaSeleccionada, setPrendaSeleccionada] = useState<Prenda | null>(
    null
  );
  const [montajeUrl, setMontajeUrl] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const manejarSeleccion = (prenda: Prenda) => {
    setPrendaSeleccionada(prenda);
    setMontajeUrl(null);
    setError(null);
  };

  const manejarMontaje = async () => {
    if (!prendaSeleccionada) return;
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/probador", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prenda_id: prendaSeleccionada.id,
          nombre: `Montaje ${prendaSeleccionada.nombre}`,
        }),
      });

      const data = (await res.json().catch(() => null)) as
        | { montaje_url?: string; error?: string }
        | null;

      if (!res.ok) {
        throw new Error(data?.error ?? "Error al crear el montaje");
      }
      setMontajeUrl(data?.montaje_url ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creando el montaje");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Izquierda: controles y foto base */}
        <div className="lg:col-span-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Tu foto de base <User className="h-4 w-4 ml-1 inline" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 rounded-xl bg-muted flex items-center justify-center overflow-hidden relative">
                {usuario.foto_base_url ? (
                  <Image
                    src={usuario.foto_base_url}
                    alt={`Foto base de ${usuario.nombre}`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                    <p className="text-sm">Sin foto configurada</p>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/usuario">Configurar foto</Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Seleccionar prenda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-80 overflow-y-auto p-4 sm:p-6">
              {prendas.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    No hay prendas disponibles
                  </p>
                  <Button variant="outline" size="sm" asChild className="mt-3">
                    <Link href="/prendas/nueva">Añadir prenda</Link>
                  </Button>
                </div>
              ) : (
                prendas.map((p: Prenda) => {
                  const seleccionada = prendaSeleccionada?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => manejarSeleccion(p)}
                      aria-pressed={seleccionada}
                      className={`relative flex w-full cursor-pointer items-center gap-3 rounded-lg border p-3 text-left transition-all duration-150 active:scale-[0.98] ${
                        seleccionada
                          ? "border-primary bg-primary/5 ring-2 ring-primary shadow-sm"
                          : "border-input bg-background hover:border-primary/40 hover:bg-accent"
                      }`}
                    >
                      {seleccionada && (
                        <span className="absolute -top-2 right-2 z-10 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow">
                          <Check className="h-3 w-3" /> Seleccionada
                        </span>
                      )}
                      <div
                        className={`h-12 w-12 shrink-0 overflow-hidden rounded relative ${
                          seleccionada ? "ring-2 ring-primary/50" : ""
                        }`}
                      >
                        {p.imagen_sin_fondo_url || p.imagen_url ? (
                          <Image
                            src={p.imagen_sin_fondo_url || p.imagen_url}
                            alt={p.nombre}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                            Sin img
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {p.nombre}
                        </p>
                        {p.imagen_sin_fondo_url && (
                          <Badge variant="secondary" className="text-[10px]">
                            Sin fondo IA
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Button
            onClick={manejarMontaje}
            disabled={!prendaSeleccionada || cargando}
            className="w-full"
          >
            {cargando ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Creando montaje...
              </>
            ) : (
              <>
                <ShoppingBag className="h-4 w-4 mr-2" />
                Crear montaje IA
              </>
            )}
          </Button>
        </div>

        {/* Derecha: vista previa del montaje */}
        <div className="lg:col-span-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Vista previa del montaje</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center min-h-[400px]">
              {cargando && !montajeUrl ? (
                <div className="flex flex-col items-center gap-4">
                  <Spinner size="lg" />
                  <p className="text-sm text-muted-foreground">
                    Generando montaje con IA... puede tardar hasta un minuto.
                  </p>
                </div>
              ) : montajeUrl ? (
                <>
                  <div className="relative max-w-md w-full aspect-square bg-muted rounded-xl overflow-hidden shadow-lg">
                    <Image
                      src={montajeUrl}
                      alt="Montaje"
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-cover"
                    />
                    <Badge variant="default" className="absolute top-3 right-3 z-10">
                      Montaje IA
                    </Badge>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">
                    Montaje listo: {prendaSeleccionada?.nombre}
                  </p>
                  {prendaSeleccionada && (
                    <div className="mt-4 grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
                      <MarcarUsadaHoy prendaId={prendaSeleccionada.id} />
                      <ToggleEstado
                        prendaId={prendaSeleccionada.id}
                        estado={prendaSeleccionada.estado}
                      />
                    </div>
                  )}
                </>
              ) : error ? (
                <div className="flex max-w-md flex-col items-center gap-4 text-center">
                  <p className="text-sm text-destructive">{error}</p>
                  <Button
                    onClick={manejarMontaje}
                    disabled={!prendaSeleccionada || cargando}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" /> Reintentar
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <ShoppingBag className="h-12 w-12 opacity-30 mb-4" />
                  <p>Selecciona una prenda y crea el montaje</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

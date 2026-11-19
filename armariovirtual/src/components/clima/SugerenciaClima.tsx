"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CloudRain,
  CloudSun,
  Droplets,
  MapPin,
  RefreshCw,
  Sun,
  ThermometerSun,
} from "lucide-react";
import type { SugerenciaClima } from "@/lib/clima";
import { OCASION_LABEL, TEMPORADA_LABEL } from "@/lib/prenda-metadata";

const TIMEOUT_GEOLOCALIZACION_MS = 8000;

interface Coordenadas {
  lat: number;
  lon: number;
}

/**
 * Solicita la ubicación al navegador. Devuelve null si el usuario la
 * rechaza, no está disponible o tarda demasiado.
 */
function obtenerCoordenadas(): Promise<Coordenadas | null> {
  return new Promise((resolve) => {
    if (
      typeof navigator === "undefined" ||
      !navigator.geolocation?.getCurrentPosition
    ) {
      resolve(null);
      return;
    }

    let resuelto = false;
    const finalizar = (valor: Coordenadas | null) => {
      if (resuelto) return;
      resuelto = true;
      window.clearTimeout(timeout);
      resolve(valor);
    };

    const timeout = window.setTimeout(
      () => finalizar(null),
      TIMEOUT_GEOLOCALIZACION_MS
    );

    try {
      navigator.geolocation.getCurrentPosition(
        (posicion) =>
          finalizar({
            lat: posicion.coords.latitude,
            lon: posicion.coords.longitude,
          }),
        () => finalizar(null),
        {
          enableHighAccuracy: false,
          timeout: TIMEOUT_GEOLOCALIZACION_MS,
          maximumAge: 5 * 60 * 1000,
        }
      );
    } catch {
      finalizar(null);
    }
  });
}

function IconoClima({ icono }: { icono: SugerenciaClima["icono"] }) {
  if (icono === "lluvia") return <CloudRain className="h-6 w-6" />;
  if (icono === "calor") return <ThermometerSun className="h-6 w-6" />;
  if (icono === "frio") return <CloudSun className="h-6 w-6" />;
  return <Sun className="h-6 w-6" />;
}

/**
 * Widget de sugerencias por clima (Open-Meteo).
 * Pide la ubicación al navegador y, si no se comparte, usa el fallback
 * de Manizales configurado en el servidor.
 */
export default function SugerenciaClimaWidget() {
  const [datos, setDatos] = useState<SugerenciaClima | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const consultar = useCallback(async (coordenadas?: {
    lat: number;
    lon: number;
  }) => {
    setCargando(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (coordenadas) {
        params.set("lat", String(coordenadas.lat));
        params.set("lon", String(coordenadas.lon));
      }
      const query = params.toString();
      const res = await fetch(`/api/clima${query ? `?${query}` : ""}`);
      const data = (await res.json().catch(() => null)) as
        | SugerenciaClima
        | { error?: string }
        | null;
      if (!res.ok) {
        const mensaje =
          data && "error" in data ? data.error : undefined;
        throw new Error(mensaje ?? "No se pudo consultar el clima");
      }
      setDatos(data as SugerenciaClima);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo consultar el clima"
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    let cancelado = false;

    const cargar = async () => {
      const coordenadas = await obtenerCoordenadas();
      if (cancelado) return;
      // Si el navegador no concede la ubicación se consulta sin coordenadas
      // y el servidor aplica el fallback de Manizales. Nunca se hace una
      // segunda petición que sobrescriba el resultado con coordenadas reales.
      await consultar(coordenadas ?? undefined);
    };

    void cargar();

    return () => {
      cancelado = true;
    };
  }, [consultar]);

  if (cargando) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="space-y-3 p-4 sm:p-5">
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-9 w-32 animate-pulse rounded-full bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (error || !datos) {
    return (
      <Card className="overflow-hidden border-destructive/40">
        <CardContent className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error ?? "No se pudo consultar el clima"}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void consultar()}
            className="transition-all active:scale-[0.97]"
          >
            <RefreshCw className="mr-1.5 h-4 w-4" /> Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  const parametros = new URLSearchParams({
    temporada: datos.temporada,
    ocasion: datos.ocasion,
  });

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-3 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600">
              <IconoClima icono={datos.icono} />
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight">
                {Math.round(datos.temperatura)}°C
              </p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {datos.ubicacion}
                {datos.lluvia > 0 && (
                  <span className="ml-2 inline-flex items-center gap-0.5 text-sky-600">
                    <Droplets className="h-3 w-3" /> {datos.lluvia} mm
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="secondary">{TEMPORADA_LABEL[datos.temporada]}</Badge>
            <Badge variant="outline">{OCASION_LABEL[datos.ocasion]}</Badge>
          </div>
        </div>

        <div>
          <p className="font-semibold">{datos.titulo}</p>
          <p className="text-sm text-muted-foreground">{datos.mensaje}</p>
        </div>

        <Button asChild size="sm" className="w-full sm:w-auto">
          <Link href={`/catalogo?${parametros.toString()}`}>
            Ver prendas sugeridas
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

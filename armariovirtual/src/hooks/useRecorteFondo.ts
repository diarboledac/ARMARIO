"use client";

import { useEffect, useRef, useState } from "react";
import {
  INTERVALO_POLLING_MS,
  MAX_INTENTOS_POLLING,
  esPrendaReciente,
  type PrendaRecortable,
} from "@/lib/recorte-fondo";

export interface EstadoRecorteFondo {
  /** URL de la imagen recortada si ya está disponible. */
  imagenRecortada: string | null;
  /** true mientras se espera el resultado del recorte con IA. */
  procesando: boolean;
  /** Número de intentos de polling realizados. */
  intentos: number;
}

/**
 * Polling ligero del recorte de fondo con IA.
 *
 * Solo se activa cuando la prenda se creó hace menos de 2 minutos y aún no
 * tiene `imagen_sin_fondo_url`. Consulta `GET /api/prendas/[id]` cada 4 s
 * hasta 6 intentos y actualiza la imagen en pantalla sin recargar la página.
 */
export function useRecorteFondo(prenda: PrendaRecortable): EstadoRecorteFondo {
  const [imagenRecortada, setImagenRecortada] = useState<string | null>(
    prenda.imagen_sin_fondo_url
  );
  const [intentos, setIntentos] = useState(0);
  const intentosRef = useRef(0);

  // Si el servidor ya trae la imagen (por ejemplo tras un refresh), se adopta.
  const [imagenDelServidor, setImagenDelServidor] = useState(
    prenda.imagen_sin_fondo_url
  );
  if (imagenDelServidor !== prenda.imagen_sin_fondo_url) {
    setImagenDelServidor(prenda.imagen_sin_fondo_url);
    setImagenRecortada(prenda.imagen_sin_fondo_url);
  }

  const pendiente =
    imagenRecortada === null && esPrendaReciente(prenda.created_at);

  useEffect(() => {
    if (!pendiente) return;

    let cancelado = false;

    const consultar = async () => {
      if (cancelado) return;
      intentosRef.current += 1;
      setIntentos(intentosRef.current);

      if (intentosRef.current > MAX_INTENTOS_POLLING) return;

      try {
        const res = await fetch(`/api/prendas/${prenda.id}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json().catch(() => null)) as {
          imagen_sin_fondo_url?: string | null;
        } | null;
        const url = data?.imagen_sin_fondo_url ?? null;
        if (url && !cancelado) {
          setImagenRecortada(url);
        }
      } catch {
        // El siguiente tick reintenta; tras 6 intentos se abandona.
      }
    };

    const intervalo = window.setInterval(() => {
      void consultar();
    }, INTERVALO_POLLING_MS);

    return () => {
      cancelado = true;
      window.clearInterval(intervalo);
    };
  }, [pendiente, prenda.id]);

  return {
    imagenRecortada,
    procesando: pendiente,
    intentos,
  };
}

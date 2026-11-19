"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { useRecorteFondo } from "@/hooks/useRecorteFondo";
import { Loader2 } from "lucide-react";

interface ImagenPrendaDetalleProps {
  id: number;
  nombre: string;
  imagenUrl: string;
  imagenSinFondoUrl: string | null;
  createdAt: Date | string;
}

/**
 * Imagen de la prenda con polling del recorte de fondo con IA.
 * Si la prenda se acaba de subir, actualiza la foto recortada en pantalla
 * sin necesidad de recargar la página.
 */
export default function ImagenPrendaDetalle({
  id,
  nombre,
  imagenUrl,
  imagenSinFondoUrl,
  createdAt,
}: ImagenPrendaDetalleProps) {
  const { imagenRecortada, procesando, intentos } = useRecorteFondo({
    id,
    imagen_sin_fondo_url: imagenSinFondoUrl,
    created_at: createdAt,
  });

  const recortada = imagenRecortada || imagenSinFondoUrl;
  const principal = recortada || imagenUrl;

  return (
    <div className="space-y-4">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#F6F6F4] shadow-sm dark:bg-card">
        {principal ? (
          <Image
            src={principal}
            alt={nombre}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
            priority
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            Sin imagen disponible
          </div>
        )}

        {procesando && (
          <span className="animate-pulse-soft absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/65 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Recortando fondo con IA...
            {intentos > 0 && <span className="opacity-70">({intentos}/6)</span>}
          </span>
        )}
      </div>

      {recortada && imagenUrl && (
        <div className="grid grid-cols-2 gap-2">
          <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-muted">
            <Image
              src={imagenUrl}
              alt="Original"
              fill
              sizes="25vw"
              className="object-cover opacity-60"
            />
            <Badge
              variant="outline"
              className="absolute right-1 top-1 z-10 text-xs"
            >
              Original
            </Badge>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-muted">
            <Image
              src={recortada}
              alt="Sin fondo"
              fill
              sizes="25vw"
              className="object-cover"
            />
            <Badge className="absolute right-1 top-1 z-10 text-xs">IA</Badge>
          </div>
        </div>
      )}
    </div>
  );
}

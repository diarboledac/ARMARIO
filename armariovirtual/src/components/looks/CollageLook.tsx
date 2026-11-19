import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { ImageIcon, LayoutGrid } from "lucide-react";

export interface PrendaParaCollage {
  id: number;
  nombre: string;
  imagen_url: string;
  imagen_sin_fondo_url: string | null;
}

interface CollageLookProps {
  collageUrl?: string | null;
  montajeUrl?: string | null;
  prendas: PrendaParaCollage[];
  className?: string;
}

/**
 * Muestra el collage 2x2 del look; si no existe, cae al montaje IA y,
 * en último caso, a una cuadrícula con las prendas asociadas.
 */
export default function CollageLook({
  collageUrl,
  montajeUrl,
  prendas,
  className = "",
}: CollageLookProps) {
  if (collageUrl) {
    return (
      <div
        className={`relative aspect-square overflow-hidden rounded-xl bg-muted shadow-sm ${className}`}
      >
        <Image
          src={collageUrl}
          alt="Collage del look"
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
          priority
        />
        <Badge className="absolute right-3 top-3 z-10">
          <LayoutGrid className="mr-1 h-3 w-3" /> Collage
        </Badge>
      </div>
    );
  }

  if (montajeUrl) {
    return (
      <div
        className={`relative aspect-square overflow-hidden rounded-xl bg-muted shadow-sm ${className}`}
      >
        <Image
          src={montajeUrl}
          alt="Montaje del look"
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
          priority
        />
        <Badge variant="secondary" className="absolute right-3 top-3 z-10">
          <ImageIcon className="mr-1 h-3 w-3" /> Montaje IA
        </Badge>
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-2 gap-1 overflow-hidden rounded-xl bg-muted p-1 ${className}`}
    >
      {prendas.length === 0 ? (
        <p className="col-span-2 py-10 text-center text-sm text-muted-foreground">
          Este look aún no tiene prendas
        </p>
      ) : (
        prendas.slice(0, 4).map((prenda) => {
          const src = prenda.imagen_sin_fondo_url || prenda.imagen_url;
          return (
            <div
              key={prenda.id}
              className="relative aspect-square overflow-hidden rounded-lg bg-muted"
            >
              {src ? (
                <Image
                  src={src}
                  alt={prenda.nombre}
                  fill
                  sizes="25vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                  Sin img
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

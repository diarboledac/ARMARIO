"use client";

import { Grid3X3, List } from "lucide-react";
import type { VistaCatalogo } from "@/components/catalogo/TarjetaPrenda";

interface ToggleVistaGaleriaProps {
  vista: VistaCatalogo;
  onCambia: (vista: VistaCatalogo) => void;
}

/**
 * Alterna entre la vista de cuadrícula (galería) y la vista de lista compacta.
 * La preferencia se persiste en localStorage.
 */
export default function ToggleVistaGaleria({
  vista,
  onCambia,
}: ToggleVistaGaleriaProps) {
  const opciones: Array<{
    valor: VistaCatalogo;
    etiqueta: string;
    icono: typeof Grid3X3;
  }> = [
    { valor: "galeria", etiqueta: "Vista de galería", icono: Grid3X3 },
    { valor: "lista", etiqueta: "Vista de lista", icono: List },
  ];

  return (
    <div
      role="group"
      aria-label="Cambiar vista del catálogo"
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-input bg-background p-1"
    >
      {opciones.map((opcion) => {
        const activa = vista === opcion.valor;
        const Icono = opcion.icono;
        return (
          <button
            key={opcion.valor}
            type="button"
            onClick={() => onCambia(opcion.valor)}
            aria-pressed={activa}
            aria-label={opcion.etiqueta}
            title={opcion.etiqueta}
            className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-all duration-150 active:scale-[0.97] ${
              activa
                ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Icono className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}

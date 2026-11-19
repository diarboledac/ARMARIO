"use client";

import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  OCASIONES,
  OCASION_LABEL,
  PATRONES,
  PATRON_LABEL,
  TEMPORADAS,
  TEMPORADA_LABEL,
} from "@/lib/prenda-metadata";
import type { Ocasion, Patron, Temporada } from "@/lib/db/types";

interface MetadatosPrendaProps {
  temporada: Temporada;
  ocasion: Ocasion;
  patron: Patron;
  precio: string;
  onTemporada: (valor: Temporada) => void;
  onOcasion: (valor: Ocasion) => void;
  onPatron: (valor: Patron) => void;
  onPrecio: (valor: string) => void;
  disabled?: boolean;
}

function Pills<T extends string>({
  etiqueta,
  opciones,
  etiquetas,
  valor,
  onCambio,
  disabled,
}: {
  etiqueta: string;
  opciones: readonly T[];
  etiquetas: Record<T, string>;
  valor: T;
  onCambio: (valor: T) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <p className="mb-2 block text-sm font-medium">{etiqueta}</p>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {opciones.map((opcion) => {
          const activa = valor === opcion;
          return (
            <button
              key={opcion}
              type="button"
              onClick={() => onCambio(opcion)}
              aria-pressed={activa}
              disabled={disabled}
              className={`inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                activa
                  ? "border-primary bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30"
                  : "border-input bg-background hover:bg-accent"
              }`}
            >
              {activa && <Check className="h-3.5 w-3.5" />}
              {etiquetas[opcion]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function MetadatosPrenda({
  temporada,
  ocasion,
  patron,
  precio,
  onTemporada,
  onOcasion,
  onPatron,
  onPrecio,
  disabled,
}: MetadatosPrendaProps) {
  return (
    <div className="space-y-5 rounded-xl border border-input bg-background p-4">
      <div>
        <h3 className="text-sm font-semibold">Detalles del armario</h3>
        <p className="text-xs text-muted-foreground">
          Ayudan a filtrar, buscar y recibir mejores sugerencias.
        </p>
      </div>

      <Pills
        etiqueta="Temporada"
        opciones={TEMPORADAS}
        etiquetas={TEMPORADA_LABEL}
        valor={temporada}
        onCambio={onTemporada}
        disabled={disabled}
      />

      <Pills
        etiqueta="Ocasión"
        opciones={OCASIONES}
        etiquetas={OCASION_LABEL}
        valor={ocasion}
        onCambio={onOcasion}
        disabled={disabled}
      />

      <Pills
        etiqueta="Patrón"
        opciones={PATRONES}
        etiquetas={PATRON_LABEL}
        valor={patron}
        onCambio={onPatron}
        disabled={disabled}
      />

      <div>
        <label
          htmlFor="precio-prenda"
          className="mb-1.5 block text-sm font-medium"
        >
          Precio (opcional)
        </label>
        <div className="relative max-w-xs">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            $
          </span>
          <Input
            id="precio-prenda"
            name="precio"
            type="number"
            inputMode="decimal"
            min="0"
            max="999999.99"
            step="0.01"
            value={precio}
            onChange={(e) => onPrecio(e.target.value)}
            placeholder="0.00"
            className="pl-7"
            disabled={disabled}
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Se usa para estadísticas de tu armario. Puedes dejarlo vacío.
        </p>
      </div>
    </div>
  );
}

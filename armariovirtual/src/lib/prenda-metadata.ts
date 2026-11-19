/**
 * Metadatos de prendas: enums, etiquetas y validaciones puras.
 * Se comparte entre Client Components y Route Handlers sin dependencias de Node.
 */

import type {
  EstadoPrenda,
  Ocasion,
  Patron,
  SlotLook,
  Temporada,
} from "@/lib/db/types";

export const TEMPORADAS: readonly Temporada[] = [
  "primavera",
  "verano",
  "otono",
  "invierno",
  "todas",
];

export const OCASIONES: readonly Ocasion[] = [
  "casual",
  "formal",
  "deporte",
  "salida",
  "trabajo",
  "todas",
];

export const PATRONES: readonly Patron[] = [
  "liso",
  "rayas",
  "cuadros",
  "flores",
  "geometrico",
  "otro",
];

export const ESTADOS: readonly EstadoPrenda[] = ["limpia", "para_lavar"];

export const SLOTS: readonly SlotLook[] = [
  "superior",
  "inferior",
  "calzado",
  "complemento",
  "completo",
];

export const TEMPORADA_LABEL: Record<Temporada, string> = {
  primavera: "Primavera",
  verano: "Verano",
  otono: "Otoño",
  invierno: "Invierno",
  todas: "Todas",
};

export const OCASION_LABEL: Record<Ocasion, string> = {
  casual: "Casual",
  formal: "Formal",
  deporte: "Deporte",
  salida: "Salida",
  trabajo: "Trabajo",
  todas: "Todas",
};

export const PATRON_LABEL: Record<Patron, string> = {
  liso: "Liso",
  rayas: "Rayas",
  cuadros: "Cuadros",
  flores: "Flores",
  geometrico: "Geométrico",
  otro: "Otro",
};

export const ESTADO_LABEL: Record<EstadoPrenda, string> = {
  limpia: "Limpia",
  para_lavar: "Para lavar",
};

export const SLOT_LABEL: Record<SlotLook, string> = {
  superior: "Superior",
  inferior: "Inferior",
  calzado: "Calzado",
  complemento: "Complemento",
  completo: "Look completo",
};

export const PRECIO_MAX = 999999.99;

export function esTemporada(valor: unknown): valor is Temporada {
  return (
    typeof valor === "string" &&
    (TEMPORADAS as readonly string[]).includes(valor)
  );
}

export function esOcasion(valor: unknown): valor is Ocasion {
  return (
    typeof valor === "string" &&
    (OCASIONES as readonly string[]).includes(valor)
  );
}

export function esPatron(valor: unknown): valor is Patron {
  return (
    typeof valor === "string" && (PATRONES as readonly string[]).includes(valor)
  );
}

export function esEstado(valor: unknown): valor is EstadoPrenda {
  return (
    typeof valor === "string" && (ESTADOS as readonly string[]).includes(valor)
  );
}

export function esSlot(valor: unknown): valor is SlotLook {
  return typeof valor === "string" && (SLOTS as readonly string[]).includes(valor);
}

export function validarPrecio(
  valor: unknown
): { ok: true; valor: number | null } | { ok: false; error: string } {
  if (valor === null || valor === undefined || valor === "") {
    return { ok: true, valor: null };
  }

  const numero =
    typeof valor === "number"
      ? valor
      : typeof valor === "string"
        ? Number(valor.replace(",", ".").trim())
        : Number.NaN;

  if (!Number.isFinite(numero)) {
    return { ok: false, error: "El precio debe ser un número válido." };
  }
  if (numero < 0) {
    return { ok: false, error: "El precio no puede ser negativo." };
  }
  if (numero > PRECIO_MAX) {
    return {
      ok: false,
      error: `El precio no puede superar ${PRECIO_MAX.toFixed(2)}.`,
    };
  }

  return { ok: true, valor: Math.round(numero * 100) / 100 };
}

export function validarTemporada(
  valor: unknown
): { ok: true; valor: Temporada } | { ok: false; error: string } {
  if (valor === null || valor === undefined || valor === "") {
    return { ok: true, valor: "todas" };
  }
  if (!esTemporada(valor)) {
    return { ok: false, error: "Temporada no válida." };
  }
  return { ok: true, valor };
}

export function validarOcasion(
  valor: unknown
): { ok: true; valor: Ocasion } | { ok: false; error: string } {
  if (valor === null || valor === undefined || valor === "") {
    return { ok: true, valor: "todas" };
  }
  if (!esOcasion(valor)) {
    return { ok: false, error: "Ocasión no válida." };
  }
  return { ok: true, valor };
}

export function validarPatron(
  valor: unknown
): { ok: true; valor: Patron } | { ok: false; error: string } {
  if (valor === null || valor === undefined || valor === "") {
    return { ok: true, valor: "liso" };
  }
  if (!esPatron(valor)) {
    return { ok: false, error: "Patrón no válido." };
  }
  return { ok: true, valor };
}

export function validarEstado(
  valor: unknown
): { ok: true; valor: EstadoPrenda } | { ok: false; error: string } {
  if (!esEstado(valor)) {
    return { ok: false, error: "Estado no válido." };
  }
  return { ok: true, valor };
}

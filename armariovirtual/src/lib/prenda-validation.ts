/** Validaciones de campos de una prenda (puras, reutilizables en cliente/servidor). */

export const PRENDA_NOMBRE_MAX = 150;
export const PRENDA_COLOR_MAX = 30;

export function validarColorPrenda(
  valor: unknown
): { ok: true; valor: string | null } | { ok: false; error: string } {
  if (valor === null || valor === undefined || valor === "") {
    return { ok: true, valor: null };
  }
  if (typeof valor !== "string") {
    return { ok: false, error: "El color debe ser un texto válido." };
  }

  const color = valor.trim();
  if (color.length === 0) {
    return { ok: true, valor: null };
  }
  if (color.length > PRENDA_COLOR_MAX) {
    return {
      ok: false,
      error: `El color no puede superar ${PRENDA_COLOR_MAX} caracteres.`,
    };
  }
  if (!/^#?[0-9a-zA-ZáéíóúüñÁÉÍÓÚÜÑ ,._-]+$/.test(color)) {
    return { ok: false, error: "El color contiene caracteres no permitidos." };
  }

  return { ok: true, valor: color };
}

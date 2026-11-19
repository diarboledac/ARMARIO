/**
 * Validaciones compartidas entre la UI de login/registro y los Route Handlers.
 * Este módulo es puro (sin Node ni Next.js) para poder importarse desde el
 * cliente sin arrastrar dependencias de servidor.
 */

export const NOMBRE_USUARIO_MIN = 3;
export const NOMBRE_USUARIO_MAX = 30;
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 72;

export type Validacion<T> =
  | { ok: true; valor: T }
  | { ok: false; error: string };

export function validarNombreUsuario(valor: unknown): Validacion<string> {
  if (typeof valor !== "string") {
    return { ok: false, error: "Escribe un nombre de usuario." };
  }

  const nombre = valor.trim().replace(/\s+/g, " ");

  if (nombre.length < NOMBRE_USUARIO_MIN) {
    return {
      ok: false,
      error: `El nombre debe tener al menos ${NOMBRE_USUARIO_MIN} caracteres.`,
    };
  }
  if (nombre.length > NOMBRE_USUARIO_MAX) {
    return {
      ok: false,
      error: `El nombre no puede superar ${NOMBRE_USUARIO_MAX} caracteres.`,
    };
  }
  if (!/^[\p{L}\p{N}._ -]+$/u.test(nombre)) {
    return {
      ok: false,
      error:
        "Usa solo letras, números, espacios, puntos, guiones o guiones bajos.",
    };
  }

  return { ok: true, valor: nombre };
}

export function validarPassword(valor: unknown): Validacion<string> {
  if (typeof valor !== "string") {
    return { ok: false, error: "Escribe una contraseña." };
  }
  if (valor.length < PASSWORD_MIN) {
    return {
      ok: false,
      error: `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`,
    };
  }
  if (valor.length > PASSWORD_MAX) {
    return {
      ok: false,
      error: `La contraseña no puede superar ${PASSWORD_MAX} caracteres.`,
    };
  }
  return { ok: true, valor };
}

/**
 * Autenticación y sesiones de armariovirtual.
 *
 * - Contraseñas con scrypt (node:crypto), sal aleatoria y comparación en
 *   tiempo constante. No se guarda nunca la contraseña en claro.
 * - Cookie HttpOnly con un token aleatorio de 32 bytes. En MySQL solo se
 *   almacena el hash SHA-256 del token, con fecha de expiración.
 * - getCurrentUser() resuelve la sesión en Server Components y Route Handlers.
 */

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { SesionModel } from "@/lib/db/client";
import type { Usuario } from "@/lib/db/types";

export const SESSION_COOKIE = "armario_session";

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const SCRYPT_KEYLEN = 64;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

/** Genera `scrypt$<sal base64url>$<hash base64url>`. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_OPTIONS);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

/** Verifica una contraseña contra un hash almacenado. */
export function verifyPassword(
  password: string,
  stored: string | null
): boolean {
  if (!stored) return false;

  const [scheme, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;

  try {
    const salt = Buffer.from(saltB64, "base64url");
    const expected = Buffer.from(hashB64, "base64url");
    const actual = scryptSync(password, salt, expected.length, SCRYPT_OPTIONS);

    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  } catch {
    return false;
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Crea la sesión en MySQL y escribe la cookie HttpOnly. */
export async function createSession(usuarioId: number): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await SesionModel.create(hashToken(token), usuarioId, expiresAt);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/** Elimina la sesión actual de MySQL y la cookie. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await SesionModel.deleteByTokenHash(hashToken(token));
  }

  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Devuelve el usuario autenticado o null.
 * Memoizado por request para evitar varias consultas en layout + página.
 */
export const getCurrentUser = cache(async (): Promise<Usuario | null> => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    return await SesionModel.findUsuarioByTokenHash(hashToken(token));
  } catch {
    // Sin sesión válida si la BD no está disponible o la cookie es inválida.
    return null;
  }
});

/** Exige sesión en una página; si no existe, redirige a /login. */
export async function requireUser(): Promise<Usuario> {
  const usuario = await getCurrentUser();
  if (!usuario) {
    redirect("/login");
  }
  return usuario;
}

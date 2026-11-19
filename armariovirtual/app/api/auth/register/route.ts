import { NextResponse } from "next/server";
import { UsuarioModel } from "@/lib/db/client";
import { createSession, hashPassword } from "@/lib/auth";
import {
  validarNombreUsuario,
  validarPassword,
} from "@/lib/auth-validation";

/**
 * POST /api/auth/register
 * Crea una cuenta con nombre + contraseña, inicia sesión y devuelve el usuario.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la petición no es JSON válido" },
      { status: 400 }
    );
  }

  const datos = (body ?? {}) as { nombre?: unknown; password?: unknown };

  const nombreValidado = validarNombreUsuario(datos.nombre);
  if (!nombreValidado.ok) {
    return NextResponse.json({ error: nombreValidado.error }, { status: 400 });
  }

  const passwordValidada = validarPassword(datos.password);
  if (!passwordValidada.ok) {
    return NextResponse.json(
      { error: passwordValidada.error },
      { status: 400 }
    );
  }

  const nombre = nombreValidado.valor;

  try {
    const existente = await UsuarioModel.findByNombre(nombre);
    if (existente) {
      return NextResponse.json(
        { error: "Ese nombre de usuario ya está en uso." },
        { status: 409 }
      );
    }

    const usuario = await UsuarioModel.createAuthUser(
      nombre,
      hashPassword(passwordValidada.valor)
    );

    await createSession(usuario.id);

    return NextResponse.json({ usuario }, { status: 201 });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "ER_DUP_ENTRY"
    ) {
      return NextResponse.json(
        { error: "Ese nombre de usuario ya está en uso." },
        { status: 409 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Error creando la cuenta";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

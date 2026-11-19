import { NextResponse } from "next/server";
import { UsuarioModel } from "@/lib/db/client";
import { createSession, verifyPassword } from "@/lib/auth";

/**
 * POST /api/auth/login
 * Verifica nombre + contraseña y establece la cookie de sesión.
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
  const nombre =
    typeof datos.nombre === "string" ? datos.nombre.trim().replace(/\s+/g, " ") : "";
  const password = typeof datos.password === "string" ? datos.password : "";

  if (!nombre || !password) {
    return NextResponse.json(
      { error: "Escribe tu nombre de usuario y contraseña." },
      { status: 400 }
    );
  }

  try {
    const usuario = await UsuarioModel.findAuthByNombre(nombre);

    // Mensaje genérico para no revelar si el nombre existe.
    if (!usuario || !verifyPassword(password, usuario.password_hash)) {
      return NextResponse.json(
        { error: "Nombre de usuario o contraseña incorrectos." },
        { status: 401 }
      );
    }

    const usuarioPublico = {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      foto_base_url: usuario.foto_base_url,
      created_at: usuario.created_at,
      updated_at: usuario.updated_at,
    };

    await createSession(usuario.id);

    return NextResponse.json({ usuario: usuarioPublico });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error iniciando sesión";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

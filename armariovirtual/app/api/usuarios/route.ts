import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/usuarios
 * Devuelve únicamente el usuario de la sesión actual.
 * Se mantiene como array por compatibilidad con el cliente del probador.
 */
export async function GET() {
  try {
    const usuario = await getCurrentUser();
    if (!usuario) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    return NextResponse.json([usuario]);
  } catch {
    return NextResponse.json(
      { error: "Error obteniendo el usuario" },
      { status: 500 }
    );
  }
}

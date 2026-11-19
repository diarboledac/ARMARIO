import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { obtenerEstadisticas } from "@/lib/estadisticas";

/**
 * GET /api/estadisticas
 * Devuelve las métricas del armario del usuario autenticado.
 */
export async function GET() {
  try {
    const usuario = await getCurrentUser();
    if (!usuario) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const estadisticas = await obtenerEstadisticas(usuario.id);
    return NextResponse.json(estadisticas);
  } catch {
    return NextResponse.json(
      { error: "Error obteniendo estadísticas" },
      { status: 500 }
    );
  }
}

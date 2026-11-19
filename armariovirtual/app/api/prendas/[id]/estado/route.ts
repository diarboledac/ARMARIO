import { NextResponse } from "next/server";
import { PrendaModel } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";
import { validarEstado } from "@/lib/prenda-metadata";

/**
 * PATCH /api/prendas/[id]/estado
 * Cambia el estado de limpieza entre 'limpia' y 'para_lavar'.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const usuario = await getCurrentUser();
    if (!usuario) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const prendaId = Number(id);
    if (!Number.isInteger(prendaId) || prendaId <= 0) {
      return NextResponse.json(
        { error: "ID de prenda inválido" },
        { status: 400 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Cuerpo JSON inválido" },
        { status: 400 }
      );
    }

    const estadoRaw =
      typeof body === "object" && body !== null && "estado" in body
        ? (body as { estado?: unknown }).estado
        : undefined;

    const estado = validarEstado(estadoRaw);
    if (!estado.ok) {
      return NextResponse.json({ error: estado.error }, { status: 400 });
    }

    const prenda = await PrendaModel.setEstado(
      prendaId,
      usuario.id,
      estado.valor
    );
    if (!prenda) {
      return NextResponse.json(
        { error: "Prenda no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ prenda });
  } catch {
    return NextResponse.json(
      { error: "Error actualizando el estado de la prenda" },
      { status: 500 }
    );
  }
}

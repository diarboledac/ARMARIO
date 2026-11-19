import { NextResponse } from "next/server";
import { PrendaModel, RegistroUsoModel } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";

/**
 * POST /api/prendas/[id]/usar
 * Registra el uso de la prenda (hoy) e incrementa `veces_usada`.
 * Solo el propietario autenticado puede registrar su propia prenda.
 */
export async function POST(
  _req: Request,
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

    const prenda = await PrendaModel.findByIdForUsuario(
      prendaId,
      usuario.id
    );
    if (!prenda) {
      return NextResponse.json(
        { error: "Prenda no encontrada" },
        { status: 404 }
      );
    }

    const registrado = await RegistroUsoModel.registrarPrenda(
      usuario.id,
      prendaId,
      null
    );
    if (!registrado) {
      return NextResponse.json(
        { error: "No se pudo registrar el uso" },
        { status: 404 }
      );
    }

    const actualizada = await PrendaModel.findByIdForUsuario(
      prendaId,
      usuario.id
    );

    return NextResponse.json({ prenda: actualizada });
  } catch {
    return NextResponse.json(
      { error: "Error registrando el uso de la prenda" },
      { status: 500 }
    );
  }
}

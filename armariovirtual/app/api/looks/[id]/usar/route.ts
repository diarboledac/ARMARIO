import { NextResponse } from "next/server";
import { LookModel, RegistroUsoModel } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";

/**
 * POST /api/looks/[id]/usar
 * Registra el uso del look e incrementa `veces_usada` de sus prendas.
 * Todo se filtra por el usuario autenticado.
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
    const lookId = Number(id);
    if (!Number.isInteger(lookId) || lookId <= 0) {
      return NextResponse.json(
        { error: "ID de look inválido" },
        { status: 400 }
      );
    }

    const look = await LookModel.findByIdForUsuario(lookId, usuario.id);
    if (!look) {
      return NextResponse.json(
        { error: "Look no encontrado" },
        { status: 404 }
      );
    }

    const prendasRegistradas = await RegistroUsoModel.registrarLook(
      usuario.id,
      lookId
    );

    return NextResponse.json({
      look_id: lookId,
      prendas_registradas: prendasRegistradas,
    });
  } catch {
    return NextResponse.json(
      { error: "Error registrando el uso del look" },
      { status: 500 }
    );
  }
}

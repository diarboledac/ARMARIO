import { NextResponse } from "next/server";
import { LookModel, PrendaModel } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";

/**
 * Endpoint para crear un look de probador virtual sin montaje IA.
 * El montaje real se genera con POST /api/probador.
 */
export async function POST(req: Request) {
  try {
    const usuario = await getCurrentUser();
    if (!usuario) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const prendaId = Number(body.prenda_id);
    const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";

    if (!Number.isInteger(prendaId) || prendaId <= 0 || !nombre) {
      return NextResponse.json(
        { error: "prenda_id y nombre son requeridos" },
        { status: 400 }
      );
    }

    const prenda = await PrendaModel.findByIdForUsuario(prendaId, usuario.id);
    if (!prenda) {
      return NextResponse.json(
        { error: "Prenda no encontrada" },
        { status: 404 }
      );
    }

    const look = await LookModel.create({
      usuario_id: usuario.id,
      nombre,
      montaje_url: null,
    });

    return NextResponse.json({
      look_id: look.id,
      montaje_url: look.montaje_url,
      message: "Look creado. Usa /api/probador para generar el montaje IA.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error creando montaje";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

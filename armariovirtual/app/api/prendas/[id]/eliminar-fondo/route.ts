import { NextResponse } from "next/server";
import { eliminarFondoDePrenda } from "@/lib/bg-removal";
import { PrendaModel } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";

/**
 * Elimina el fondo de una prenda propia usando Hugging Face (briaai/RMBG-1.4).
 * Reutiliza el pipeline compartido: descarga de Cloudinary, IA, subida del
 * resultado y actualización de MySQL con la URL final.
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

    const prenda = await PrendaModel.findByIdForUsuario(prendaId, usuario.id);
    if (!prenda) {
      return NextResponse.json(
        { error: "Prenda no encontrada" },
        { status: 404 }
      );
    }

    const urlSinFondo = await eliminarFondoDePrenda(prendaId);

    if (!urlSinFondo) {
      return NextResponse.json(
        {
          error:
            "No se pudo eliminar el fondo. Verifica que la prenda exista, tenga imagen y que la API de Hugging Face esté disponible.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      imagen_sin_fondo_url: urlSinFondo,
      message: "Fondo eliminado exitosamente con IA",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error procesando eliminación de fondo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

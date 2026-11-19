import { NextResponse } from "next/server";
import { FavoritoModel, PrendaModel } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";

/**
 * API de favoritos del usuario autenticado.
 *  - GET    → lista de ids de prendas marcadas como favoritas
 *  - POST   → marca una prenda propia como favorita
 *  - DELETE → quita el favorito
 */
export async function GET() {
  try {
    const usuario = await getCurrentUser();
    if (!usuario) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const favoritos = await FavoritoModel.listByUsuario(usuario.id);
    return NextResponse.json({ ids: favoritos.map((f) => f.prenda_id) });
  } catch {
    return NextResponse.json(
      { error: "Error obteniendo favoritos" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const usuario = await getCurrentUser();
    if (!usuario) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
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

    const prendaId =
      typeof body === "object" && body !== null && "prenda_id" in body
        ? Number((body as { prenda_id?: unknown }).prenda_id)
        : Number.NaN;

    if (!Number.isInteger(prendaId) || prendaId <= 0) {
      return NextResponse.json(
        { error: "prenda_id inválido" },
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

    await FavoritoModel.add(usuario.id, prendaId);
    return NextResponse.json({ favorito: true, prenda_id: prendaId });
  } catch {
    return NextResponse.json(
      { error: "Error guardando el favorito" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const usuario = await getCurrentUser();
    if (!usuario) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const prendaId = Number(searchParams.get("prenda_id"));

    if (!Number.isInteger(prendaId) || prendaId <= 0) {
      return NextResponse.json(
        { error: "prenda_id inválido" },
        { status: 400 }
      );
    }

    await FavoritoModel.remove(usuario.id, prendaId);
    return NextResponse.json({ favorito: false, prenda_id: prendaId });
  } catch {
    return NextResponse.json(
      { error: "Error quitando el favorito" },
      { status: 500 }
    );
  }
}

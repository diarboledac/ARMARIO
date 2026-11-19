import { NextResponse } from "next/server";
import { PrendaModel, type FiltrosPrenda } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";
import { esOcasion, esTemporada } from "@/lib/prenda-metadata";
import type { Ocasion, Temporada } from "@/lib/db/types";

/**
 * GET /api/buscar?q=texto&color=&temporada=&ocasion=
 * Búsqueda global sobre el armario del usuario autenticado.
 * Los LIKE se parametrizan y se escapan los comodines.
 */
export async function GET(req: Request) {
  try {
    const usuario = await getCurrentUser();
    if (!usuario) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim().slice(0, 100);
    const color = (searchParams.get("color") ?? "").trim().slice(0, 30);
    const temporadaRaw = searchParams.get("temporada");
    const ocasionRaw = searchParams.get("ocasion");

    if (temporadaRaw && !esTemporada(temporadaRaw)) {
      return NextResponse.json(
        { error: "Temporada inválida" },
        { status: 400 }
      );
    }
    if (ocasionRaw && !esOcasion(ocasionRaw)) {
      return NextResponse.json(
        { error: "Ocasión inválida" },
        { status: 400 }
      );
    }

    const filtros: FiltrosPrenda = {
      q: q || null,
      color: color || null,
      temporada: (temporadaRaw as Temporada | null) ?? null,
      ocasion: (ocasionRaw as Ocasion | null) ?? null,
      limite: 50,
    };

    const prendas = await PrendaModel.buscar(usuario.id, filtros);
    return NextResponse.json(prendas);
  } catch {
    return NextResponse.json(
      { error: "Error buscando prendas" },
      { status: 500 }
    );
  }
}

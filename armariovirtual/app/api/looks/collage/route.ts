import { NextResponse } from "next/server";
import { LookModel, PrendaModel } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";
import { uploadImageBuffer } from "@/lib/cloudinary";
import { generarCollage2x2 } from "@/lib/collage";
import { esSlot, validarOcasion } from "@/lib/prenda-metadata";
import type { LookPrendaInput, SlotLook } from "@/lib/db/types";

interface PrendaEntrada {
  prenda_id: number;
  slot: SlotLook;
  posicion: number;
}

function esEnteroPositivo(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isInteger(valor) && valor > 0;
}

/**
 * POST /api/looks/collage
 * Crea un look visual (sin IA) a partir de prendas del usuario autenticado:
 *  - valida la entrada y la propiedad de cada prenda,
 *  - genera un collage 2x2 con sharp,
 *  - lo sube a Cloudinary (armariovirtual/collages),
 *  - guarda el look con sus prendas y actualiza `looks.collage_url`.
 */
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

    if (typeof body !== "object" || body === null) {
      return NextResponse.json(
        { error: "Cuerpo JSON inválido" },
        { status: 400 }
      );
    }

    const datos = body as Record<string, unknown>;

    const nombre =
      typeof datos.nombre === "string" ? datos.nombre.trim().slice(0, 150) : "";
    if (!nombre) {
      return NextResponse.json(
        { error: "El nombre del look es requerido" },
        { status: 400 }
      );
    }

    const ocasion = validarOcasion(datos.ocasion ?? "todas");
    if (!ocasion.ok) {
      return NextResponse.json({ error: ocasion.error }, { status: 400 });
    }

    const descripcion =
      typeof datos.descripcion === "string"
        ? datos.descripcion.trim().slice(0, 2000) || null
        : null;

    const esFavorito = datos.es_favorito === true;

    const entradas = Array.isArray(datos.prendas) ? datos.prendas : [];
    if (entradas.length < 1 || entradas.length > 4) {
      return NextResponse.json(
        { error: "Selecciona entre 1 y 4 prendas para el look" },
        { status: 400 }
      );
    }

    const prendas: PrendaEntrada[] = [];
    const vistas = new Set<number>();

    for (const entrada of entradas) {
      if (typeof entrada !== "object" || entrada === null) {
        return NextResponse.json(
          { error: "Formato de prenda inválido" },
          { status: 400 }
        );
      }
      const item = entrada as Record<string, unknown>;
      if (!esEnteroPositivo(item.prenda_id)) {
        return NextResponse.json(
          { error: "prenda_id inválido" },
          { status: 400 }
        );
      }
      if (vistas.has(item.prenda_id)) {
        return NextResponse.json(
          { error: "Hay prendas repetidas en el look" },
          { status: 400 }
        );
      }
      vistas.add(item.prenda_id);

      const slot = esSlot(item.slot) ? item.slot : "completo";
      const posicion =
        typeof item.posicion === "number" && Number.isInteger(item.posicion)
          ? Math.min(Math.max(item.posicion, 0), 255)
          : prendas.length;

      prendas.push({ prenda_id: item.prenda_id, slot, posicion });
    }

    // Aislamiento multiusuario: cada prenda debe pertenecer al usuario.
    const propias: PrendaEntrada[] = [];
    const urls: string[] = [];
    for (const prenda of prendas) {
      const encontrada = await PrendaModel.findByIdForUsuario(
        prenda.prenda_id,
        usuario.id
      );
      if (!encontrada) {
        return NextResponse.json(
          { error: "Alguna prenda no existe o no te pertenece" },
          { status: 404 }
        );
      }
      propias.push(prenda);
      const url = encontrada.imagen_sin_fondo_url || encontrada.imagen_url;
      if (url) urls.push(url);
    }

    let collageBuffer: Buffer;
    try {
      collageBuffer = await generarCollage2x2(urls);
    } catch {
      return NextResponse.json(
        { error: "No se pudo generar el collage con las imágenes seleccionadas" },
        { status: 502 }
      );
    }

    const { secure_url: collageUrl } = await uploadImageBuffer(collageBuffer, {
      folder: "armariovirtual/collages",
    });

    const look = await LookModel.createConPrendas(
      {
        usuario_id: usuario.id,
        nombre,
        montaje_url: null,
        ocasion: ocasion.valor,
        descripcion,
        es_favorito: esFavorito,
      },
      propias.map(
        (p): LookPrendaInput => ({
          prenda_id: p.prenda_id,
          slot: p.slot,
          posicion: p.posicion,
        })
      )
    );

    const conCollage = await LookModel.setCollageUrl(
      look.id,
      usuario.id,
      collageUrl
    );

    return NextResponse.json(conCollage ?? look, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error creando el look";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

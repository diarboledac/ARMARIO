import { NextResponse } from "next/server";
import {
  CategoriaModel,
  PrendaModel,
  type FiltrosPrenda,
} from "@/lib/db/client";
import type {
  EstadoPrenda,
  Ocasion,
  Patron,
  Temporada,
} from "@/lib/db/types";
import { uploadImageBuffer } from "@/lib/cloudinary";
import { eliminarFondoDePrenda } from "@/lib/bg-removal";
import { getCurrentUser } from "@/lib/auth";
import { validarColorPrenda } from "@/lib/prenda-validation";
import {
  esEstado,
  esOcasion,
  esPatron,
  esTemporada,
  validarEstado,
  validarOcasion,
  validarPatron,
  validarPrecio,
  validarTemporada,
} from "@/lib/prenda-metadata";

export async function GET(req: Request) {
  try {
    const usuario = await getCurrentUser();
    if (!usuario) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const categoriaRaw = searchParams.get("categoria");
    const temporadaRaw = searchParams.get("temporada");
    const ocasionRaw = searchParams.get("ocasion");
    const patronRaw = searchParams.get("patron");
    const estadoRaw = searchParams.get("estado");
    const color = searchParams.get("color");
    const q = searchParams.get("q");
    const favoritosRaw = searchParams.get("favoritos");
    const soloFavoritos = favoritosRaw === "1" || favoritosRaw === "true";

    let categoriaId: number | null = null;
    if (categoriaRaw) {
      const valor = Number(categoriaRaw);
      if (!Number.isInteger(valor) || valor <= 0) {
        return NextResponse.json(
          { error: "Categoría inválida" },
          { status: 400 }
        );
      }
      categoriaId = valor;
    }

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
    if (patronRaw && !esPatron(patronRaw)) {
      return NextResponse.json(
        { error: "Patrón inválido" },
        { status: 400 }
      );
    }
    if (estadoRaw && !esEstado(estadoRaw)) {
      return NextResponse.json(
        { error: "Estado inválido" },
        { status: 400 }
      );
    }

    const filtros: FiltrosPrenda = {
      categoriaId,
      temporada: (temporadaRaw as Temporada | null) ?? undefined,
      ocasion: (ocasionRaw as Ocasion | null) ?? undefined,
      patron: (patronRaw as Patron | null) ?? undefined,
      estado: (estadoRaw as EstadoPrenda | null) ?? undefined,
      color,
      q,
      soloFavoritos,
    };

    const prendas = await PrendaModel.findByUsuarioConFiltros(
      usuario.id,
      filtros
    );

    return NextResponse.json(prendas);
  } catch {
    return NextResponse.json(
      { error: "Error obteniendo prendas" },
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

    const formData = await req.formData();
    const nombreRaw = formData.get("nombre");
    const categoriaRaw = formData.get("categoria_id");
    const descripcionRaw = formData.get("descripcion");
    const colorRaw = formData.get("color");
    const file = formData.get("file");

    const nombre = typeof nombreRaw === "string" ? nombreRaw.trim() : "";
    const categoriaId = Number(categoriaRaw);
    const descripcion =
      typeof descripcionRaw === "string" && descripcionRaw.trim()
        ? descripcionRaw.trim()
        : null;

    if (!nombre || !Number.isInteger(categoriaId) || categoriaId <= 0) {
      return NextResponse.json(
        { error: "Faltan campos requeridos (nombre, categoria_id, file)" },
        { status: 400 }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Debes adjuntar una imagen de la prenda" },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "El archivo debe ser una imagen" },
        { status: 400 }
      );
    }

    const colorValidado = validarColorPrenda(colorRaw);
    if (!colorValidado.ok) {
      return NextResponse.json(
        { error: colorValidado.error },
        { status: 400 }
      );
    }

    const temporada = validarTemporada(formData.get("temporada"));
    if (!temporada.ok) {
      return NextResponse.json({ error: temporada.error }, { status: 400 });
    }
    const ocasion = validarOcasion(formData.get("ocasion"));
    if (!ocasion.ok) {
      return NextResponse.json({ error: ocasion.error }, { status: 400 });
    }
    const patron = validarPatron(formData.get("patron"));
    if (!patron.ok) {
      return NextResponse.json({ error: patron.error }, { status: 400 });
    }
    const estado = validarEstado(formData.get("estado") ?? "limpia");
    if (!estado.ok) {
      return NextResponse.json({ error: estado.error }, { status: 400 });
    }
    const precio = validarPrecio(formData.get("precio"));
    if (!precio.ok) {
      return NextResponse.json({ error: precio.error }, { status: 400 });
    }

    const categorias = await CategoriaModel.findAll();
    if (!categorias.some((c) => c.id === categoriaId)) {
      return NextResponse.json(
        { error: "La categoría seleccionada no existe" },
        { status: 400 }
      );
    }

    // Subir imagen original a Cloudinary (solo se guarda la URL en MySQL).
    const buffer = Buffer.from(await file.arrayBuffer());
    const { secure_url } = await uploadImageBuffer(buffer, {
      folder: "armariovirtual/prendas",
    });

    const prenda = await PrendaModel.create({
      usuario_id: usuario.id,
      categoria_id: categoriaId,
      nombre,
      descripcion,
      color: colorValidado.valor,
      temporada: temporada.valor,
      ocasion: ocasion.valor,
      patron: patron.valor,
      estado: estado.valor,
      precio: precio.valor,
      imagen_url: secure_url,
      imagen_sin_fondo_url: null,
    });

    // Disparar eliminación de fondo en segundo plano (no bloquea la respuesta).
    void eliminarFondoDePrenda(prenda.id).catch((err) => {
      console.error("Eliminación de fondo en segundo plano falló:", err);
    });

    return NextResponse.json(prenda, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error creando prenda";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

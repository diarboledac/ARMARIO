import { NextResponse } from "next/server";
import { PrendaModel, execute } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";
import { validarColorPrenda } from "@/lib/prenda-validation";
import {
  validarEstado,
  validarOcasion,
  validarPatron,
  validarPrecio,
  validarTemporada,
} from "@/lib/prenda-metadata";

function textoOpcional(valor: unknown): string | null | undefined {
  if (valor === undefined) return undefined;
  if (valor === null) return null;
  if (typeof valor !== "string") return undefined;
  const texto = valor.trim();
  return texto.length > 0 ? texto : null;
}

export async function GET(
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
    return NextResponse.json(prenda);
  } catch {
    return NextResponse.json(
      { error: "Error obteniendo prenda" },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const actual = await PrendaModel.findByIdForUsuario(prendaId, usuario.id);
    if (!actual) {
      return NextResponse.json(
        { error: "Prenda no encontrada" },
        { status: 404 }
      );
    }

    const body = (await req.json()) as Record<string, unknown>;

    const nombre =
      typeof body.nombre === "string" && body.nombre.trim()
        ? body.nombre.trim()
        : actual.nombre;

    const categoriaId =
      body.categoria_id === undefined
        ? actual.categoria_id
        : Number(body.categoria_id);
    if (!Number.isInteger(categoriaId) || categoriaId <= 0) {
      return NextResponse.json(
        { error: "Categoría inválida" },
        { status: 400 }
      );
    }

    const descripcion =
      body.descripcion === undefined
        ? actual.descripcion
        : textoOpcional(body.descripcion) ?? null;

    const colorValidado =
      body.color === undefined
        ? { ok: true as const, valor: actual.color }
        : validarColorPrenda(body.color);
    if (!colorValidado.ok) {
      return NextResponse.json(
        { error: colorValidado.error },
        { status: 400 }
      );
    }

    const imagenUrl =
      typeof body.imagen_url === "string" && body.imagen_url.trim()
        ? body.imagen_url.trim()
        : actual.imagen_url;

    const imagenSinFondo =
      body.imagen_sin_fondo_url === undefined
        ? actual.imagen_sin_fondo_url
        : textoOpcional(body.imagen_sin_fondo_url) ?? null;

    const temporada =
      body.temporada === undefined
        ? { ok: true as const, valor: actual.temporada }
        : validarTemporada(body.temporada);
    if (!temporada.ok) {
      return NextResponse.json({ error: temporada.error }, { status: 400 });
    }

    const ocasion =
      body.ocasion === undefined
        ? { ok: true as const, valor: actual.ocasion }
        : validarOcasion(body.ocasion);
    if (!ocasion.ok) {
      return NextResponse.json({ error: ocasion.error }, { status: 400 });
    }

    const patron =
      body.patron === undefined
        ? { ok: true as const, valor: actual.patron }
        : validarPatron(body.patron);
    if (!patron.ok) {
      return NextResponse.json({ error: patron.error }, { status: 400 });
    }

    const estado =
      body.estado === undefined
        ? { ok: true as const, valor: actual.estado }
        : validarEstado(body.estado);
    if (!estado.ok) {
      return NextResponse.json({ error: estado.error }, { status: 400 });
    }

    const precio =
      body.precio === undefined
        ? { ok: true as const, valor: actual.precio }
        : validarPrecio(body.precio);
    if (!precio.ok) {
      return NextResponse.json({ error: precio.error }, { status: 400 });
    }

    await execute(
      `UPDATE prendas
       SET nombre = ?, descripcion = ?, color = ?, categoria_id = ?,
           imagen_url = ?, imagen_sin_fondo_url = ?, temporada = ?, ocasion = ?,
           patron = ?, estado = ?, precio = ?
       WHERE id = ? AND usuario_id = ?`,
      [
        nombre,
        descripcion,
        colorValidado.valor,
        categoriaId,
        imagenUrl,
        imagenSinFondo,
        temporada.valor,
        ocasion.valor,
        patron.valor,
        estado.valor,
        precio.valor,
        prendaId,
        usuario.id,
      ]
    );

    const prenda = await PrendaModel.findByIdForUsuario(prendaId, usuario.id);
    if (!prenda) {
      return NextResponse.json(
        { error: "Prenda no encontrada" },
        { status: 404 }
      );
    }
    return NextResponse.json(prenda);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error actualizando prenda";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
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

    const actual = await PrendaModel.findByIdForUsuario(prendaId, usuario.id);
    if (!actual) {
      return NextResponse.json(
        { error: "Prenda no encontrada" },
        { status: 404 }
      );
    }

    await execute("DELETE FROM prendas WHERE id = ? AND usuario_id = ?", [
      prendaId,
      usuario.id,
    ]);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json(
      { error: "Error eliminando prenda" },
      { status: 500 }
    );
  }
}

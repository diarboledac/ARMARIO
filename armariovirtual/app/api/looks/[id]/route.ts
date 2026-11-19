import { NextResponse } from "next/server";
import { LookModel, execute } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";

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
    return NextResponse.json(look);
  } catch {
    return NextResponse.json(
      { error: "Error obteniendo look" },
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
    const lookId = Number(id);
    if (!Number.isInteger(lookId) || lookId <= 0) {
      return NextResponse.json(
        { error: "ID de look inválido" },
        { status: 400 }
      );
    }

    const actual = await LookModel.findByIdForUsuario(lookId, usuario.id);
    if (!actual) {
      return NextResponse.json(
        { error: "Look no encontrado" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const nombre =
      typeof body.nombre === "string" && body.nombre.trim()
        ? body.nombre.trim()
        : actual.nombre;
    const montajeUrl =
      body.montaje_url === undefined
        ? actual.montaje_url
        : typeof body.montaje_url === "string" && body.montaje_url.trim()
          ? body.montaje_url.trim()
          : null;

    await execute(
      "UPDATE looks SET nombre = ?, montaje_url = ? WHERE id = ? AND usuario_id = ?",
      [nombre, montajeUrl, lookId, usuario.id]
    );

    const look = await LookModel.findByIdForUsuario(lookId, usuario.id);
    if (!look) {
      return NextResponse.json(
        { error: "Look no encontrado" },
        { status: 404 }
      );
    }
    return NextResponse.json(look);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error actualizando look";
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
    const lookId = Number(id);
    if (!Number.isInteger(lookId) || lookId <= 0) {
      return NextResponse.json(
        { error: "ID de look inválido" },
        { status: 400 }
      );
    }

    const actual = await LookModel.findByIdForUsuario(lookId, usuario.id);
    if (!actual) {
      return NextResponse.json(
        { error: "Look no encontrado" },
        { status: 404 }
      );
    }

    await execute("DELETE FROM looks WHERE id = ? AND usuario_id = ?", [
      lookId,
      usuario.id,
    ]);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json(
      { error: "Error eliminando look" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { UsuarioModel } from "@/lib/db/client";
import { execute } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";

async function usuarioPropio(idParam: string) {
  const usuario = await getCurrentUser();
  if (!usuario) {
    return { error: "No autenticado", status: 401 as const };
  }
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) {
    return { error: "ID de usuario inválido", status: 400 as const };
  }
  if (id !== usuario.id) {
    return { error: "No puedes acceder a otro usuario", status: 403 as const };
  }
  return { usuario };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const acceso = await usuarioPropio(id);
    if ("error" in acceso) {
      return NextResponse.json(
        { error: acceso.error },
        { status: acceso.status }
      );
    }
    return NextResponse.json(acceso.usuario);
  } catch {
    return NextResponse.json(
      { error: "Error obteniendo usuario" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const acceso = await usuarioPropio(id);
    if ("error" in acceso) {
      return NextResponse.json(
        { error: acceso.error },
        { status: acceso.status }
      );
    }

    const body = await req.json();
    const { foto_base_url } = body;

    if (foto_base_url !== null && typeof foto_base_url !== "string") {
      return NextResponse.json(
        { error: "foto_base_url debe ser una URL o null" },
        { status: 400 }
      );
    }

    await execute(
      "UPDATE usuarios SET foto_base_url = ? WHERE id = ?",
      [foto_base_url ?? null, acceso.usuario.id]
    );

    const usuario = await UsuarioModel.findById(acceso.usuario.id);
    if (!usuario) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }
    return NextResponse.json(usuario);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error actualizando usuario";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const acceso = await usuarioPropio(id);
    if ("error" in acceso) {
      return NextResponse.json(
        { error: acceso.error },
        { status: acceso.status }
      );
    }

    await execute("DELETE FROM usuarios WHERE id = ?", [acceso.usuario.id]);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json(
      { error: "Error eliminando usuario" },
      { status: 500 }
    );
  }
}

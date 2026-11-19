import { NextResponse } from "next/server";
import { LookModel } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const usuario = await getCurrentUser();
    if (!usuario) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const looks = await LookModel.findByUsuario(usuario.id);
    return NextResponse.json(looks);
  } catch {
    return NextResponse.json(
      { error: "Error obteniendo looks" },
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

    const body = await req.json();
    const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
    const montajeUrl =
      typeof body.montaje_url === "string" ? body.montaje_url.trim() : null;

    if (!nombre) {
      return NextResponse.json(
        { error: "El nombre del look es requerido" },
        { status: 400 }
      );
    }

    const look = await LookModel.create({
      usuario_id: usuario.id,
      nombre,
      montaje_url: montajeUrl,
    });
    return NextResponse.json(look, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error creando look";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

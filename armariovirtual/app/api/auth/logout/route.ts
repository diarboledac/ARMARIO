import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

/** POST /api/auth/logout — elimina la sesión de MySQL y la cookie. */
export async function POST() {
  try {
    await destroySession();
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error cerrando sesión";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

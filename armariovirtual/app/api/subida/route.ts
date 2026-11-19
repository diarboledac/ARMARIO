import { NextResponse } from "next/server";
import { uploadImageBuffer } from "@/lib/cloudinary";
import { getCurrentUser } from "@/lib/auth";

/**
 * Endpoint dedicado para subir imágenes a Cloudinary.
 * Requiere sesión y limita las carpetas al espacio del proyecto.
 */
export async function POST(req: Request) {
  try {
    const usuario = await getCurrentUser();
    if (!usuario) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const folderRaw = formData.get("folder");
    const folder =
      typeof folderRaw === "string" && folderRaw.trim()
        ? folderRaw.trim()
        : "armariovirtual/usuarios";

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No se proporcionó ningún archivo" },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "El archivo debe ser una imagen" },
        { status: 400 }
      );
    }

    if (
      !folder.startsWith("armariovirtual/") ||
      folder.includes("..") ||
      folder.length > 120
    ) {
      return NextResponse.json(
        { error: "La carpeta de destino no es válida" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { secure_url, public_id } = await uploadImageBuffer(buffer, {
      folder,
    });

    return NextResponse.json({
      secure_url,
      public_id,
      message: "Imagen subida a Cloudinary exitosamente",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error subiendo imagen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

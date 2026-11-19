/**
 * Pipeline completo de eliminación de fondo para una prenda.
 * 1. Descarga la imagen original desde Cloudinary.
 * 2. Aplica eliminación de fondo con IA (Hugging Face).
 * 3. Sube el resultado a Cloudinary.
 * 4. Actualiza MySQL con la URL sin fondo (consulta parametrizada).
 */

import { PrendaModel, execute } from "@/lib/db/client";
import { eliminarFondo, blobToBuffer } from "@/lib/huggingface";
import { uploadImageBuffer } from "@/lib/cloudinary";

export async function eliminarFondoDePrenda(
  prendaId: number
): Promise<string | null> {
  const prenda = await PrendaModel.findById(prendaId);  if (!prenda || !prenda.imagen_url) {
    return null;
  }

  const imagenRes = await fetch(prenda.imagen_url);
  if (!imagenRes.ok) {
    return null;
  }

  const imagenBuffer = Buffer.from(await imagenRes.arrayBuffer());

  const resultado = await eliminarFondo(imagenBuffer);
  if (!resultado.ok || !resultado.blob) {
    return null;
  }

  const fondoBuffer = await blobToBuffer(resultado.blob);

  const { secure_url } = await uploadImageBuffer(fondoBuffer, {
    folder: "armariovirtual/prendas/sin-fondo",
    public_id: `prenda_${prendaId}_sin_fondo`,
  });

  await execute(
    "UPDATE prendas SET imagen_sin_fondo_url = ? WHERE id = ?",
    [secure_url, prendaId]
  );

  return secure_url;
}

/**
 * Configuración de Cloudinary para armariovirtual.
 * Sube imágenes directamente a Cloudinary y guarda solo la URL en MySQL.
 * Nunca se almacenan imágenes en base64 en la base de datos.
 */

import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

function validarConfiguracionCloudinary(): void {
  const faltantes = (
    [
      ["CLOUDINARY_CLOUD_NAME", process.env.CLOUDINARY_CLOUD_NAME],
      ["CLOUDINARY_API_KEY", process.env.CLOUDINARY_API_KEY],
      ["CLOUDINARY_API_SECRET", process.env.CLOUDINARY_API_SECRET],
    ] as const
  )
    .filter(([, valor]) => !valor)
    .map(([nombre]) => nombre);

  if (faltantes.length > 0) {
    throw new Error(
      `Faltan variables de entorno de Cloudinary: ${faltantes.join(", ")}`
    );
  }
}

/**
 * Sube un buffer de imagen a Cloudinary.
 * Devuelve la URL segura y el public_id.
 */
export async function uploadImageBuffer(
  buffer: Buffer,
  options: {
    folder?: string;
    public_id?: string;
    resource_type?: "image" | "video" | "raw" | "auto";
  } = {}
): Promise<{ secure_url: string; public_id: string }> {
  validarConfiguracionCloudinary();

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder ?? "armariovirtual",
        public_id: options.public_id,
        resource_type: options.resource_type ?? "image",
        transformation: [
          { quality: "auto:good" },
          { fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error || !result) {
          const mensaje =
            error?.message ?? "Cloudinary no devolvió ningún resultado";
          const codigo = error?.http_code ? ` (HTTP ${error.http_code})` : "";
          reject(
            new Error(`Error subiendo a Cloudinary: ${mensaje}${codigo}`)
          );
          return;
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
        });
      }
    );
    uploadStream.end(buffer);
  });
}

/**
 * Elimina una imagen de Cloudinary por su public_id.
 */
export async function deleteImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

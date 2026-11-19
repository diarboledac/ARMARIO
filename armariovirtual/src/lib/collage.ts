/**
 * Generación de collages de looks con sharp.
 *
 * Layouts editoriales adaptativos según el número de prendas (1, 2, 3 o 4)
 * sobre un fondo blanco cálido (#FAFAFA) con padding generoso:
 *  - 1 prenda  : centrada, grande.
 *  - 2 prendas : dos columnas equilibradas (torso + piernas).
 *  - 3 prendas : una principal a la izquierda y dos apiladas a la derecha.
 *  - 4 prendas : cuadrícula 2x2 simétrica.
 *
 * Las imágenes se descargan desde URLs ya guardadas en Cloudinary y el
 * resultado (Buffer PNG) se sube a Cloudinary; nunca se guarda base64 en MySQL.
 */

import sharp from "sharp";

const TAMANO_CANVAS = 1000;
const FONDO_EDITORIAL = { r: 250, g: 250, b: 250 };
const PADDING = 40;
const GAP = 20;

const TIMEOUT_DESCARGA_MS = 20000;
const TAMANO_MAXIMO_BYTES = 12 * 1024 * 1024;

export class ErrorDescargaImagen extends Error {
  readonly url: string;

  constructor(url: string, message: string) {
    super(message);
    this.url = url;
    this.name = "ErrorDescargaImagen";
  }
}

/** Descarga una imagen remota con timeout y límite de tamaño. */
export async function descargarImagen(url: string): Promise<Buffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_DESCARGA_MS);
  try {
    const respuesta = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!respuesta.ok) {
      throw new ErrorDescargaImagen(
        url,
        `No se pudo descargar la imagen (HTTP ${respuesta.status})`
      );
    }

    const tipo = respuesta.headers.get("content-type") ?? "";
    if (!tipo.startsWith("image/")) {
      throw new ErrorDescargaImagen(url, "La URL no apunta a una imagen");
    }

    const largo = Number(respuesta.headers.get("content-length") ?? "0");
    if (largo > TAMANO_MAXIMO_BYTES) {
      throw new ErrorDescargaImagen(url, "La imagen es demasiado grande");
    }

    const buffer = Buffer.from(await respuesta.arrayBuffer());
    if (buffer.length === 0) {
      throw new ErrorDescargaImagen(url, "La imagen descargada está vacía");
    }
    if (buffer.length > TAMANO_MAXIMO_BYTES) {
      throw new ErrorDescargaImagen(url, "La imagen es demasiado grande");
    }
    return buffer;
  } catch (error) {
    if (error instanceof ErrorDescargaImagen) throw error;
    throw new ErrorDescargaImagen(
      url,
      error instanceof Error ? error.message : "Error de red"
    );
  } finally {
    clearTimeout(timeout);
  }
}

interface Celda {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

interface ComponenteCollage {
  input: Buffer;
  left: number;
  top: number;
}

/**
 * Calcula las celdas del lienzo según la cantidad de prendas.
 * Nunca deja bloques vacíos: cada prenda ocupa su propia celda.
 */
export function calcularCeldas(cantidad: number): Celda[] {
  const area = TAMANO_CANVAS - PADDING * 2;

  switch (cantidad) {
    case 1: {
      // Una prenda protagonista centrada, con aire editorial.
      const lado = Math.round(area * 0.82);
      const offset = Math.round((TAMANO_CANVAS - lado) / 2);
      return [{ x: offset, y: offset, ancho: lado, alto: lado }];
    }
    case 2: {
      // Dos columnas equilibradas: torso a la izquierda, piernas a la derecha.
      const ancho = Math.floor((area - GAP) / 2);
      return [
        { x: PADDING, y: PADDING, ancho, alto: area },
        {
          x: PADDING + ancho + GAP,
          y: PADDING,
          ancho: TAMANO_CANVAS - PADDING * 2 - ancho - GAP,
          alto: area,
        },
      ];
    }
    case 3: {
      // Prenda principal a la izquierda y dos apiladas a la derecha.
      const anchoPrincipal = Math.round(area * 0.54);
      const anchoLateral = area - anchoPrincipal - GAP;
      const altoLateral = Math.floor((area - GAP) / 2);
      return [
        {
          x: PADDING,
          y: PADDING,
          ancho: anchoPrincipal,
          alto: area,
        },
        {
          x: PADDING + anchoPrincipal + GAP,
          y: PADDING,
          ancho: anchoLateral,
          alto: altoLateral,
        },
        {
          x: PADDING + anchoPrincipal + GAP,
          y: PADDING + altoLateral + GAP,
          ancho: anchoLateral,
          alto: area - altoLateral - GAP,
        },
      ];
    }
    default: {
      // Cuadrícula 2x2 simétrica.
      const lado = Math.floor((area - GAP) / 2);
      return [
        { x: PADDING, y: PADDING, ancho: lado, alto: lado },
        {
          x: PADDING + lado + GAP,
          y: PADDING,
          ancho: area - lado - GAP,
          alto: lado,
        },
        {
          x: PADDING,
          y: PADDING + lado + GAP,
          ancho: lado,
          alto: area - lado - GAP,
        },
        {
          x: PADDING + lado + GAP,
          y: PADDING + lado + GAP,
          ancho: area - lado - GAP,
          alto: area - lado - GAP,
        },
      ];
    }
  }
}

/**
 * Genera la composición del look con hasta 4 imágenes.
 * Las imágenes que fallen al descargarse se omiten; si no queda ninguna,
 * se lanza un error para no subir un collage vacío.
 */
export async function generarCollage2x2(urls: string[]): Promise<Buffer> {
  const validas = urls.filter(Boolean).slice(0, 4);
  if (validas.length === 0) {
    throw new Error("No hay imágenes para generar el collage");
  }

  const descargadas: Buffer[] = [];
  for (const url of validas) {
    try {
      descargadas.push(await descargarImagen(url));
    } catch {
      // Se omite la imagen que falle y se continúa con el resto.
    }
  }

  if (descargadas.length === 0) {
    throw new Error("No se pudo descargar ninguna imagen del look");
  }

  const celdas = calcularCeldas(descargadas.length);
  const componentes: ComponenteCollage[] = [];

  for (const [indice, original] of descargadas.entries()) {
    const celda = celdas[indice];
    const redimensionada = await sharp(original)
      .rotate()
      .resize(celda.ancho, celda.alto, {
        fit: "inside",
        withoutEnlargement: false,
      })
      .toBuffer();

    const meta = await sharp(redimensionada).metadata();
    const ancho = meta.width ?? celda.ancho;
    const alto = meta.height ?? celda.alto;

    componentes.push({
      input: redimensionada,
      left: Math.round(celda.x + (celda.ancho - ancho) / 2),
      top: Math.round(celda.y + (celda.alto - alto) / 2),
    });
  }

  return sharp({
    create: {
      width: TAMANO_CANVAS,
      height: TAMANO_CANVAS,
      channels: 3,
      background: FONDO_EDITORIAL,
    },
  })
    .composite(componentes)
    .png()
    .toBuffer();
}

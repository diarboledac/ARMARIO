import { NextResponse } from "next/server";
import { Client, handle_file } from "@gradio/client";
import { PrendaModel, LookModel } from "@/lib/db/client";
import { uploadImageBuffer } from "@/lib/cloudinary";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Spaces de Hugging Face usados para el probador virtual.
 *
 * - Kolors-Virtual-Try-On es el Space solicitado por el proyecto. Su API
 *   pública está cerrada (`api_name=False`, `api_open=False`), por lo que la
 *   llamada puede fallar; en ese caso usamos IDM-VTON como respaldo para que
 *   la funcionalidad siga siendo real y no un placeholder.
 */
const KOLORS_SPACE = "Kwai-Kolors/Kolors-Virtual-Try-On";
const KOLORS_HOST = "https://kwai-kolors-kolors-virtual-try-on.hf.space";
const IDM_VTON_SPACE = "yisol/IDM-VTON";
const IDM_VTON_HOST = "https://yisol-idm-vton.hf.space";

const DESCARGA_TIMEOUT_MS = 20_000;
const KOLORS_TIMEOUT_MS = 60_000;
const IDM_VTON_TIMEOUT_MS = 240_000;

interface GradioFileData {
  path?: string;
  url?: string | null;
  orig_name?: string | null;
  mime_type?: string | null;
}

interface MontajeGenerado {
  blob: Blob;
  proveedor: string;
}

interface ErrorProveedor {
  proveedor: string;
  motivo: string;
}

class TryOnError extends Error {
  readonly proveedor: string;

  constructor(proveedor: string, motivo: string) {
    super(`${proveedor}: ${motivo}`);
    this.name = "TryOnError";
    this.proveedor = proveedor;
  }
}

function obtenerTokenHf(): `hf_${string}` | undefined {
  const token = process.env.HUGGINGFACE_API_KEY;
  if (!token || !token.startsWith("hf_")) {
    return undefined;
  }
  return token as `hf_${string}`;
}

function conTimeout<T>(
  promesa: Promise<T>,
  ms: number,
  etiqueta: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          `${etiqueta} superó el tiempo máximo de espera (${Math.round(
            ms / 1000
          )} s). El Space puede tener la cola llena o la cuota de GPU ocupada.`
        )
      );
    }, ms);

    promesa.then(
      (valor) => {
        clearTimeout(timer);
        resolve(valor);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

async function descargarImagen(url: string, etiqueta: string): Promise<Blob> {
  const res = await conTimeout(
    fetch(url),
    DESCARGA_TIMEOUT_MS,
    `Descarga de ${etiqueta}`
  );

  if (!res.ok) {
    throw new Error(
      `No se pudo descargar ${etiqueta} (HTTP ${res.status} ${res.statusText})`
    );
  }

  const tipo = res.headers.get("content-type") ?? "";
  const buffer = await res.arrayBuffer();
  return new Blob([buffer], {
    type: tipo.startsWith("image/") ? tipo : "image/jpeg",
  });
}

function esFileData(valor: unknown): valor is GradioFileData {
  return typeof valor === "object" && valor !== null;
}

function construirUrlArchivo(
  archivo: GradioFileData,
  host: string
): string | null {
  if (archivo.url) {
    return archivo.url;
  }
  if (archivo.path) {
    return `${host}/file=${archivo.path}`;
  }
  return null;
}

async function extraerBlobResultado(
  valor: unknown,
  host: string,
  proveedor: string
): Promise<Blob> {
  if (valor instanceof Blob) {
    return valor;
  }

  if (esFileData(valor)) {
    const url = construirUrlArchivo(valor, host);
    if (url) {
      return descargarImagen(url, `el resultado de ${proveedor}`);
    }
  }

  throw new Error(
    `La respuesta de ${proveedor} no contiene una imagen válida`
  );
}

/**
 * Comprueba si el cliente cargó el endpoint nombrado en la configuración del
 * Space. Evita invocar `predict` cuando la API está cerrada y el Space no
 * expone el endpoint, que de otro modo imprime una traza de error.
 */
function espacioExponeEndpoint(client: Client, endpoint: string): boolean {
  const nombre = endpoint.replace(/^\//, "");
  return Object.prototype.hasOwnProperty.call(client.api_map, nombre);
}

/**
 * Intenta generar el montaje con Kolors-Virtual-Try-On.
 * Lanza TryOnError si el Space rechaza la petición (API cerrada, cola, cuota).
 */
async function intentarKolors(
  persona: Blob,
  prenda: Blob,
  token: `hf_${string}` | undefined
): Promise<MontajeGenerado> {
  let client: Client | null = null;

  try {
    client = await conTimeout(
      Client.connect(KOLORS_SPACE, token ? { token } : {}),
      KOLORS_TIMEOUT_MS,
      "Conexión con Kolors Virtual Try-On"
    );

    if (!espacioExponeEndpoint(client, "/tryon")) {
      throw new Error(
        "El Space no expone el endpoint público /tryon (API cerrada)."
      );
    }

    const resultado = await conTimeout(
      client.predict("/tryon", [
        handle_file(persona),
        handle_file(prenda),
        42,
        false,
      ]),
      KOLORS_TIMEOUT_MS,
      "Generación del montaje en Kolors Virtual Try-On"
    );

    const datos = Array.isArray(resultado.data)
      ? resultado.data
      : [resultado.data];
    const blob = await extraerBlobResultado(
      datos[0],
      KOLORS_HOST,
      "Kolors Virtual Try-On"
    );

    return { blob, proveedor: "Kolors Virtual Try-On" };
  } catch (error) {
    const motivo =
      error instanceof Error ? error.message : "Error desconocido";
    throw new TryOnError("Kolors Virtual Try-On", motivo);
  } finally {
    try {
      client?.close();
    } catch {
      // El cierre del cliente no debe enmascarar el resultado real.
    }
  }
}

/**
 * Respaldo funcional: IDM-VTON expone el endpoint público `/tryon`.
 */
async function intentarIdmVton(
  persona: Blob,
  prenda: Blob,
  token: `hf_${string}` | undefined
): Promise<MontajeGenerado> {
  let client: Client | null = null;

  try {
    client = await conTimeout(
      Client.connect(IDM_VTON_SPACE, token ? { token } : {}),
      IDM_VTON_TIMEOUT_MS,
      "Conexión con IDM-VTON"
    );

    const resultado = await conTimeout(
      client.predict("/tryon", {
        dict: {
          background: handle_file(persona),
          layers: [],
          composite: null,
        },
        garm_img: handle_file(prenda),
        garment_des: "prenda de vestir",
        is_checked: true,
        is_checked_crop: false,
        denoise_steps: 30,
        seed: 42,
      }),
      IDM_VTON_TIMEOUT_MS,
      "Generación del montaje en IDM-VTON"
    );

    const datos = Array.isArray(resultado.data)
      ? resultado.data
      : [resultado.data];
    const blob = await extraerBlobResultado(
      datos[0],
      IDM_VTON_HOST,
      "IDM-VTON"
    );

    return { blob, proveedor: "IDM-VTON" };
  } catch (error) {
    const motivo =
      error instanceof Error ? error.message : "Error desconocido";
    throw new TryOnError("IDM-VTON", motivo);
  } finally {
    try {
      client?.close();
    } catch {
      // El cierre del cliente no debe enmascarar el resultado real.
    }
  }
}

function esErrorDeColaOCuota(mensaje: string): boolean {
  const texto = mensaje.toLowerCase();
  return (
    texto.includes("quota") ||
    texto.includes("cuota") ||
    texto.includes("zerogpu") ||
    texto.includes("gpu") ||
    texto.includes("queue") ||
    texto.includes("cola") ||
    texto.includes("too many requests") ||
    texto.includes("429") ||
    texto.includes("exceeded") ||
    texto.includes("api_open") ||
    texto.includes("endpoint") ||
    texto.includes("timeout") ||
    texto.includes("tiempo máximo")
  );
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      prenda_id?: number | string;
      nombre?: string;
    };

    const usuario = await getCurrentUser();
    if (!usuario) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const prendaId = Number(body.prenda_id);
    const nombre =
      typeof body.nombre === "string" ? body.nombre.trim() : "";

    if (
      !Number.isInteger(prendaId) ||
      prendaId <= 0 ||
      !nombre
    ) {
      return NextResponse.json(
        {
          error: "prenda_id y nombre son requeridos y deben ser válidos",
        },
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

    if (!usuario.foto_base_url) {
      return NextResponse.json(
        {
          error:
            "El usuario no tiene foto de base configurada. Súbela en Mi Perfil antes de usar el probador.",
        },
        { status: 400 }
      );
    }

    const prendaImagenUrl = prenda.imagen_sin_fondo_url || prenda.imagen_url;
    if (!prendaImagenUrl) {
      return NextResponse.json(
        { error: "La prenda no tiene imagen disponible" },
        { status: 400 }
      );
    }

    const [personaBlob, prendaBlob] = await Promise.all([
      descargarImagen(usuario.foto_base_url, "la foto base del usuario"),
      descargarImagen(prendaImagenUrl, "la imagen de la prenda"),
    ]);

    const token = obtenerTokenHf();
    const errores: ErrorProveedor[] = [];
    let montaje: MontajeGenerado | null = null;

    try {
      montaje = await intentarKolors(personaBlob, prendaBlob, token);
    } catch (error) {
      const motivo =
        error instanceof Error ? error.message : "Error desconocido";
      errores.push({ proveedor: "Kolors Virtual Try-On", motivo });
    }

    if (!montaje) {
      try {
        montaje = await intentarIdmVton(personaBlob, prendaBlob, token);
      } catch (error) {
        const motivo =
          error instanceof Error ? error.message : "Error desconocido";
        errores.push({ proveedor: "IDM-VTON", motivo });
      }
    }

    if (!montaje) {
      const detalle = errores
        .map((e) => `${e.proveedor}: ${e.motivo}`)
        .join(" | ");
      const colaOCuota = errores.some((e) => esErrorDeColaOCuota(e.motivo));

      return NextResponse.json(
        {
          error: colaOCuota
            ? "No se pudo generar el montaje: los Spaces de Hugging Face (ZeroGPU) están con la cola llena o la cuota de GPU agotada. Espera unos minutos y vuelve a intentarlo."
            : "No se pudo generar el montaje con ninguno de los Spaces de prueba virtual disponibles.",
          detalle,
          proveedores: errores.map((e) => e.proveedor),
        },
        { status: 503 }
      );
    }

    const montajeBuffer = Buffer.from(await montaje.blob.arrayBuffer());
    const { secure_url } = await uploadImageBuffer(montajeBuffer, {
      folder: "armariovirtual/probador/montajes",
    });

    const look = await LookModel.create({
      usuario_id: usuario.id,
      nombre,
      montaje_url: secure_url,
    });

    return NextResponse.json({
      look,
      montaje_url: look.montaje_url,
      proveedor: montaje.proveedor,
      message: `Montaje generado con ${montaje.proveedor} y guardado en Cloudinary.`,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error creando montaje de probador";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

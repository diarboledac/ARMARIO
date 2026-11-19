/**
 * Cliente de Hugging Face para armariovirtual.
 * - Usa HUGGINGFACE_API_KEY de .env.local (nunca expuesta al cliente).
 * - Maneja flujos binarios (ArrayBuffer / Blob).
 * - Reintentos automáticos ante errores 503 "Model is currently loading".
 */

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

if (!HF_API_KEY) {
  // No lanzar aquí para no romper la compilación en build; se lanza al llamar.
}

/**
 * Modelo por defecto para eliminación de fondo.
 */
export const BG_REMOVAL_MODEL = "briaai/RMBG-1.4";

/**
 * Opciones de llamada a Hugging Face.
 */
export interface HFFetchOptions {
  model?: string;
  inputs?: Blob | ArrayBuffer | Uint8Array;
  wait_for_model?: boolean;
  retries?: number;
  retryDelayMs?: number;
}

/**
 * Resultado de una llamada a Hugging Face.
 */
export interface HFResponse {
  ok: boolean;
  data?: Blob;
  json?: unknown;
  status: number;
  error?: string;
}

/**
 * Llama a la API de inferencia de Hugging Face con reintentos ante 503.
 */
export async function hfInference({
  model = BG_REMOVAL_MODEL,
  inputs,
  wait_for_model = true,
  retries = 5,
  retryDelayMs = 3000,
}: HFFetchOptions): Promise<HFResponse> {
  if (!HF_API_KEY) {
    return {
      ok: false,
      status: 500,
      error: "HUGGINGFACE_API_KEY no configurada en el entorno",
    };
  }

  const url = `https://api-inference.huggingface.co/models/${model}`;
  let ultimoError: string | undefined = undefined;

  for (let intento = 0; intento <= retries; intento++) {
    try {
      const headers: HeadersInit = {
        Authorization: `Bearer ${HF_API_KEY}`,
      };

      if (wait_for_model) {
        headers["x-wait-for-model"] = "true";
      }

      let body: BodyInit | null = null;
      if (inputs !== undefined) {
        if (Buffer.isBuffer(inputs)) {
          headers["Content-Type"] = "application/octet-stream";
          body = Buffer.from(inputs);
        } else if (inputs instanceof Blob) {
          headers["Content-Type"] = inputs.type || "application/octet-stream";
          body = inputs;
        } else if (inputs instanceof ArrayBuffer) {
          headers["Content-Type"] = "application/octet-stream";
          body = inputs;
        } else if (inputs instanceof Uint8Array) {
          headers["Content-Type"] = "application/octet-stream";
          body = Buffer.from(inputs);
        }
      }

      const res = await fetch(url, {
        method: "POST",
        headers,
        body,
      });

      // 503 = modelo cargándose, reintentar
      if (res.status === 503) {
        const retryAfter = res.headers.get("retry-after");
        const waitMs = parseInt(retryAfter ?? "0", 10) * 1000 || retryDelayMs;
        ultimoError = `Modelo cargándose (503). Reintento ${intento + 1}/${retries}`;
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      // Respuesta exitosa
      if (res.ok) {
        const contentType = res.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          const json = await res.json();
          return { ok: true, status: res.status, json };
        } else {
          const blob = await res.blob();
          return { ok: true, status: res.status, data: blob };
        }
      }

      // Error no reintenteable (4xx, etc.)
      const errorText = await res.text().catch(() => "");
      ultimoError = `Error ${res.status}: ${errorText}`;
      return { ok: false, status: res.status, error: ultimoError };
    } catch (err) {
      ultimoError = err instanceof Error ? err.message : "Error desconocido en Hugging Face";
      if (intento < retries) {
        await new Promise((r) => setTimeout(r, retryDelayMs));
        continue;
      }
      return { ok: false, status: 500, error: ultimoError };
    }
  }

  return {
    ok: false,
    status: 503,
    error: ultimoError || "Modelo no disponible tras varios reintentos",
  };
}

/**
 * Elimina el fondo de una imagen usando briaai/RMBG-1.4 o similar.
 * Recibe un Buffer o ArrayBuffer y devuelve un Blob con la imagen sin fondo.
 */
export async function eliminarFondo(
  imageBuffer: Buffer | ArrayBuffer | Uint8Array
): Promise<{ ok: boolean; blob?: Blob; error?: string }> {
  let input: Blob | ArrayBuffer | Uint8Array;
  if (Buffer.isBuffer(imageBuffer)) {
    input = Uint8Array.from(imageBuffer);
  } else {
    input = imageBuffer;
  }

  const result = await hfInference({
    model: BG_REMOVAL_MODEL,
    inputs: input,
    wait_for_model: true,
    retries: 5,
    retryDelayMs: 4000,
  });

  if (!result.ok || !result.data) {
    return { ok: false, error: result.error || "Error eliminando fondo" };
  }

  return { ok: true, blob: result.data };
}

/**
 * Convierte un Blob a Buffer (para uso en Node.js).
 */
export async function blobToBuffer(blob: Blob): Promise<Buffer> {
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

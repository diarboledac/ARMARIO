import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  esCoordenadaValida,
  sugerirPorClima,
  UBICACION_POR_DEFECTO,
  type SugerenciaClima,
} from "@/lib/clima";

interface RespuestaOpenMeteo {
  current?: {
    temperature_2m?: number;
    precipitation?: number;
    weather_code?: number;
  };
}

const TIMEOUT_MS = 8000;

/**
 * GET /api/clima?lat=...&lon=...
 * Consulta Open-Meteo (sin API key). Si no llegan coordenadas válidas
 * se usa el fallback por defecto: Manizales (5.07, -75.52).
 */
export async function GET(req: Request) {
  try {
    const usuario = await getCurrentUser();
    if (!usuario) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const latRaw = searchParams.get("lat");
    const lonRaw = searchParams.get("lon");

    const lat = latRaw === null ? UBICACION_POR_DEFECTO.lat : Number(latRaw);
    const lon = lonRaw === null ? UBICACION_POR_DEFECTO.lon : Number(lonRaw);

    const coordenadasValidas =
      esCoordenadaValida(lat) &&
      esCoordenadaValida(lon) &&
      lat >= -90 &&
      lat <= 90 &&
      lon >= -180 &&
      lon <= 180;

    const latitud = coordenadasValidas ? lat : UBICACION_POR_DEFECTO.lat;
    const longitud = coordenadasValidas ? lon : UBICACION_POR_DEFECTO.lon;
    const ubicacion = coordenadasValidas
      ? "Tu ubicación"
      : UBICACION_POR_DEFECTO.nombre;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.searchParams.set("latitude", String(latitud));
      url.searchParams.set("longitude", String(longitud));
      url.searchParams.set(
        "current",
        "temperature_2m,precipitation,weather_code"
      );
      url.searchParams.set("timezone", "auto");

      const respuesta = await fetch(url, {
        signal: controller.signal,
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      if (!respuesta.ok) {
        return NextResponse.json(
          { error: "No se pudo consultar el clima" },
          { status: 502 }
        );
      }

      const datos = (await respuesta.json()) as RespuestaOpenMeteo;
      const temperatura = Number(datos.current?.temperature_2m ?? 0);
      const lluvia = Number(datos.current?.precipitation ?? 0);
      const codigo = Number(datos.current?.weather_code ?? 0);

      const sugerencia: SugerenciaClima = {
        ...sugerirPorClima(temperatura, lluvia, ubicacion),
        codigoClima: codigo,
      };

      return NextResponse.json(sugerencia);
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return NextResponse.json(
      { error: "Error consultando el clima" },
      { status: 500 }
    );
  }
}

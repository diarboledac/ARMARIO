/**
 * Sugerencias de vestimenta según el clima.
 * Mapea temperatura y lluvia de Open-Meteo a temporada/ocasión sugeridas.
 */

import type { Ocasion, Temporada } from "@/lib/db/types";

export const UBICACION_POR_DEFECTO = {
  lat: 5.07,
  lon: -75.52,
  nombre: "Manizales",
} as const;

export type IconoClima = "calor" | "suave" | "frio" | "lluvia";

export interface SugerenciaClima {
  temperatura: number;
  lluvia: number;
  codigoClima: number;
  ubicacion: string;
  temporada: Temporada;
  ocasion: Ocasion;
  titulo: string;
  mensaje: string;
  icono: IconoClima;
}

export function sugerirPorClima(
  temperatura: number,
  lluvia: number,
  ubicacion: string = UBICACION_POR_DEFECTO.nombre
): SugerenciaClima {
  let temporada: Temporada = "todas";
  let ocasion: Ocasion = "casual";
  let titulo = "Día moderado";
  let mensaje =
    "Combina prendas cómodas de media estación para el día de hoy.";
  let icono: IconoClima = "suave";

  if (temperatura >= 27) {
    temporada = "verano";
    ocasion = "salida";
    titulo = "¡Día caluroso!";
    mensaje =
      "Elige prendas ligeras de verano: telas transpirables, shorts y tops.";
    icono = "calor";
  } else if (temperatura >= 21) {
    temporada = "verano";
    ocasion = "casual";
    titulo = "Clima agradable";
    mensaje =
      "Toca ropa fresca y cómoda: prendas de verano y accesorios ligeros.";
    icono = "suave";
  } else if (temperatura >= 15) {
    temporada = "primavera";
    ocasion = "casual";
    titulo = "Temperatura media";
    mensaje =
      "Una camisa con pantalón ligero o chaqueta fina funciona perfecto.";
    icono = "suave";
  } else if (temperatura >= 9) {
    temporada = "otono";
    ocasion = "trabajo";
    titulo = "Jornada fresca";
    mensaje =
      "Suma una chaqueta de punto o un abrigo ligero a tu look de trabajo.";
    icono = "frio";
  } else {
    temporada = "invierno";
    ocasion = "formal";
    titulo = "Frío intenso";
    mensaje =
      "Abrígate bien: abrigo, bufanda y calzado cerrado son clave hoy.";
    icono = "frio";
  }

  if (lluvia > 0) {
    titulo = "Hay lluvia";
    mensaje =
      "Está lloviendo: prioriza prendas oscuras, repelente y calzado resistente al agua.";
    icono = "lluvia";
  }

  return {
    temperatura,
    lluvia,
    codigoClima: 0,
    ubicacion,
    temporada,
    ocasion,
    titulo,
    mensaje,
    icono,
  };
}

export function esCoordenadaValida(valor: number): boolean {
  return Number.isFinite(valor);
}

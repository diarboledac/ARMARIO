/**
 * Reglas puras del polling de recorte de fondo con IA.
 * Se separan del hook para poder verificarlas sin React.
 */

/** Intervalo entre consultas de polling (ms). */
export const INTERVALO_POLLING_MS = 4000;
/** Número máximo de intentos de polling. */
export const MAX_INTENTOS_POLLING = 6;
/** Solo se hace polling para prendas creadas en los últimos 2 minutos. */
export const VENTANA_RECIENTE_MS = 2 * 60 * 1000;

export interface PrendaRecortable {
  id: number;
  imagen_sin_fondo_url: string | null;
  created_at: Date | string;
}

function aFecha(valor: Date | string): Date | null {
  const fecha = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/** Indica si la prenda se acaba de crear (dentro de la ventana reciente). */
export function esPrendaReciente(created_at: Date | string): boolean {
  const fecha = aFecha(created_at);
  if (!fecha) return false;
  const transcurrido = Date.now() - fecha.getTime();
  return transcurrido >= 0 && transcurrido < VENTANA_RECIENTE_MS;
}

/** Indica si la prenda todavía necesita polling del recorte de fondo. */
export function necesitaPolling(prenda: PrendaRecortable): boolean {
  return (
    prenda.imagen_sin_fondo_url === null &&
    esPrendaReciente(prenda.created_at)
  );
}

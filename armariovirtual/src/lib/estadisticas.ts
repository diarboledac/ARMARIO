/**
 * Agregaciones del armario para el dashboard de estadísticas.
 * Todas las consultas se filtran por usuario_id.
 */

import { LookModel, PrendaModel } from "@/lib/db/client";
import type { Prenda, Temporada } from "@/lib/db/types";

export interface ConteoCategoria {
  categoria_id: number;
  nombre: string;
  total: number;
}

export interface ConteoTemporada {
  temporada: Temporada;
  total: number;
}

export interface EstadisticasArmario {
  total_prendas: number;
  prendas_por_categoria: ConteoCategoria[];
  prendas_por_temporada: ConteoTemporada[];
  top_usadas: Prenda[];
  olvidadas: Prenda[];
  para_lavar: number;
  total_looks: number;
}

export const DIAS_OLVIDO = 30;

export async function obtenerEstadisticas(
  usuarioId: number
): Promise<EstadisticasArmario> {
  const [
    totalPrendas,
    porCategoria,
    porTemporada,
    topUsadas,
    olvidadas,
    paraLavar,
    totalLooks,
  ] = await Promise.all([
    PrendaModel.countByUsuario(usuarioId),
    PrendaModel.contarPorCategoria(usuarioId),
    PrendaModel.contarPorTemporada(usuarioId),
    PrendaModel.findTopUsadas(usuarioId, 5),
    PrendaModel.findOlvidadas(usuarioId, DIAS_OLVIDO),
    PrendaModel.countParaLavar(usuarioId),
    LookModel.countByUsuario(usuarioId),
  ]);

  return {
    total_prendas: totalPrendas,
    prendas_por_categoria: porCategoria,
    prendas_por_temporada: porTemporada,
    top_usadas: topUsadas.filter((p) => p.veces_usada > 0),
    olvidadas,
    para_lavar: paraLavar,
    total_looks: totalLooks,
  };
}

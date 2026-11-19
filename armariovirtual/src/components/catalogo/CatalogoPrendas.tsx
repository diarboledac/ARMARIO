"use client";

import { useState, useSyncExternalStore } from "react";
import ToggleVistaGaleria from "@/components/catalogo/ToggleVistaGaleria";
import TarjetaPrenda, {
  type VistaCatalogo,
} from "@/components/catalogo/TarjetaPrenda";
import { useToast } from "@/components/ui/ToastProvider";
import type { Prenda } from "@/lib/db/types";

const CLAVE_VISTA = "armariovirtual:vista-catalogo";
const EVENTO_VISTA = "armariovirtual:cambio-vista";

function leerVista(): VistaCatalogo {
  try {
    return window.localStorage.getItem(CLAVE_VISTA) === "lista"
      ? "lista"
      : "galeria";
  } catch {
    return "galeria";
  }
}

function suscribir(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENTO_VISTA, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENTO_VISTA, callback);
  };
}

const vistaInicial: VistaCatalogo = "galeria";

interface CategoriaSimple {
  id: number;
  nombre: string;
}

interface CatalogoPrendasProps {
  prendas: Prenda[];
  /** Ids de prendas marcadas como favorita por el usuario de la sesión. */
  favoritosIniciales?: number[];
  /** Categorías disponibles para etiquetar las tarjetas. */
  categorias?: CategoriaSimple[];
  /** true cuando el catálogo está filtrado por favoritos. */
  soloFavoritos?: boolean;
}

/**
 * Contenedor de resultados del catálogo: alterna entre cuadrícula y lista
 * compacta guardando la preferencia en localStorage y gestiona los
 * favoritos con actualización optimista.
 */
export default function CatalogoPrendas({
  prendas,
  favoritosIniciales = [],
  categorias = [],
  soloFavoritos = false,
}: CatalogoPrendasProps) {
  const { toast } = useToast();
  const vista = useSyncExternalStore(suscribir, leerVista, () => vistaInicial);
  const [favoritos, setFavoritos] = useState<Set<number>>(
    () => new Set(favoritosIniciales)
  );

  const cambiarVista = (nueva: VistaCatalogo) => {
    try {
      window.localStorage.setItem(CLAVE_VISTA, nueva);
    } catch {
      // Sin persistencia disponible: la vista sigue funcionando en memoria.
    }
    window.dispatchEvent(new Event(EVENTO_VISTA));
  };

  const alternarFavorito = async (prendaId: number) => {
    const eraFavorito = favoritos.has(prendaId);

    // Actualización optimista: la UI responde al instante.
    setFavoritos((previos) => {
      const siguiente = new Set(previos);
      if (eraFavorito) {
        siguiente.delete(prendaId);
      } else {
        siguiente.add(prendaId);
      }
      return siguiente;
    });

    try {
      const res =
        eraFavorito
          ? await fetch(`/api/favoritos?prenda_id=${prendaId}`, {
              method: "DELETE",
            })
          : await fetch("/api/favoritos", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prenda_id: prendaId }),
            });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "No se pudo actualizar el favorito");
      }

      toast({
        title: eraFavorito ? "Quitada de favoritos" : "Añadida a favoritos",
        description: eraFavorito
          ? "La prenda vuelve a tu catálogo completo."
          : "La guardarás en tus favoritos para verla rápido.",
        variant: "success",
      });
    } catch (error) {
      // Se revierte el cambio optimista si la API falla.
      setFavoritos((previos) => {
        const siguiente = new Set(previos);
        if (eraFavorito) {
          siguiente.add(prendaId);
        } else {
          siguiente.delete(prendaId);
        }
        return siguiente;
      });
      toast({
        title: "No se pudo actualizar el favorito",
        description:
          error instanceof Error ? error.message : "Error inesperado",
        variant: "error",
      });
    }
  };

  const visibles = soloFavoritos
    ? prendas.filter((prenda) => favoritos.has(prenda.id))
    : prendas;

  const nombreCategoria = (categoriaId: number) =>
    categorias.find((c) => c.id === categoriaId)?.nombre;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {visibles.length}{" "}
          {visibles.length === 1 ? "prenda" : "prendas"}
        </p>
        <ToggleVistaGaleria vista={vista} onCambia={cambiarVista} />
      </div>

      {visibles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-input py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No hay prendas que coincidan con estos filtros.
          </p>
        </div>
      ) : vista === "lista" ? (
        <div className="space-y-3">
          {visibles.map((prenda) => (
            <TarjetaPrenda
              key={prenda.id}
              prenda={prenda}
              vista="lista"
              esFavorito={favoritos.has(prenda.id)}
              onToggleFavorito={alternarFavorito}
              nombreCategoria={nombreCategoria(prenda.categoria_id)}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {visibles.map((prenda) => (
            <TarjetaPrenda
              key={prenda.id}
              prenda={prenda}
              vista="galeria"
              esFavorito={favoritos.has(prenda.id)}
              onToggleFavorito={alternarFavorito}
              nombreCategoria={nombreCategoria(prenda.categoria_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

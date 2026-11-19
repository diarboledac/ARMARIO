import {
  PrendaModel,
  CategoriaModel,
  FavoritoModel,
  type FiltrosPrenda,
} from "@/lib/db/client";
import type { Categoria, Prenda } from "@/lib/db/types";
import { requireUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Layers, Plus } from "lucide-react";
import FiltrosAvanzados from "@/components/catalogo/FiltrosAvanzados";
import FiltrosBottomSheet from "@/components/catalogo/FiltrosBottomSheet";
import BuscadorCatalogo from "@/components/catalogo/BuscadorCatalogo";
import CatalogoPrendas from "@/components/catalogo/CatalogoPrendas";
import {
  esEstado,
  esOcasion,
  esPatron,
  esTemporada,
} from "@/lib/prenda-metadata";

export const dynamic = "force-dynamic";

type Params = {
  categoria?: string;
  temporada?: string;
  ocasion?: string;
  patron?: string;
  estado?: string;
  q?: string;
  color?: string;
  favoritos?: string;
};

export default async function Catalogo({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const usuario = await requireUser();
  const params = await searchParams;
  const { categoria } = params;
  const categorias: Categoria[] = [];
  let prendas: Prenda[] = [];
  let favoritosIds: number[] = [];
  let categoriaSeleccionada: string | null = null;
  let categoriaId: number | null = null;

  const soloFavoritos =
    params.favoritos === "1" || params.favoritos === "true";

  try {
    const cats = await CategoriaModel.findAll();
    categorias.push(...cats);

    const catId = categoria ? Number.parseInt(categoria, 10) : NaN;
    if (Number.isInteger(catId) && catId > 0) {
      categoriaId = catId;
      const cat = categorias.find((c) => c.id === catId);
      categoriaSeleccionada = cat ? cat.nombre : "Categoría desconocida";
    }

    const filtros: FiltrosPrenda = {
      categoriaId,
      temporada: esTemporada(params.temporada) ? params.temporada : null,
      ocasion: esOcasion(params.ocasion) ? params.ocasion : null,
      patron: esPatron(params.patron) ? params.patron : null,
      estado: esEstado(params.estado) ? params.estado : null,
      q: params.q?.trim() ? params.q.trim() : null,
      color: params.color?.trim() ? params.color.trim() : null,
      soloFavoritos,
    };

    prendas = await PrendaModel.findByUsuarioConFiltros(usuario.id, filtros);

    const favoritos = await FavoritoModel.listByUsuario(usuario.id);
    favoritosIds = favoritos.map((f) => f.prenda_id);
  } catch {
    // Si la BD no está disponible, mostrar arrays vacíos
  }

  const construirHrefCategoria = (catId: number | null) => {
    const query = new URLSearchParams();
    if (catId) query.set("categoria", String(catId));
    if (params.temporada) query.set("temporada", params.temporada);
    if (params.ocasion) query.set("ocasion", params.ocasion);
    if (params.patron) query.set("patron", params.patron);
    if (params.estado) query.set("estado", params.estado);
    if (params.q) query.set("q", params.q);
    if (params.color) query.set("color", params.color);
    if (params.favoritos) query.set("favoritos", params.favoritos);
    const qs = query.toString();
    return qs ? `/catalogo?${qs}` : "/catalogo";
  };

  const hayFiltrosAvanzados = Boolean(
    params.temporada ||
      params.ocasion ||
      params.patron ||
      params.estado ||
      params.q ||
      params.color ||
      soloFavoritos
  );

  return (
    <div className="py-4 max-w-6xl mx-auto px-4 space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tu armario</h1>
          <p className="text-sm text-muted-foreground">
            Explora y gestiona las prendas de tu colección
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/looks/nuevo">
              <Layers className="mr-1.5 h-4 w-4" /> Crear look
            </Link>
          </Button>
          <Button asChild>
            <Link href="/prendas/nueva">
              <Plus className="h-4 w-4" /> Nueva Prenda
            </Link>
          </Button>
        </div>
      </div>

      <BuscadorCatalogo
        color={params.color}
        temporada={params.temporada}
        ocasion={params.ocasion}
      />

      {/* Categorías + acceso a filtros */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Link
            href={construirHrefCategoria(null)}
            className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-medium transition-all active:scale-[0.97] ${
              categoriaId
                ? "border-input bg-background hover:bg-accent"
                : "border-primary bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30"
            }`}
          >
            Todas
          </Link>
          {categorias.map((cat) => {
            const activa = categoriaId === cat.id;
            return (
              <Link
                key={cat.id}
                href={construirHrefCategoria(cat.id)}
                className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-medium transition-all active:scale-[0.97] ${
                  activa
                    ? "border-primary bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30"
                    : "border-input bg-background hover:bg-accent"
                }`}
              >
                {cat.nombre}
              </Link>
            );
          })}
        </div>

        <div className="sm:hidden">
          <FiltrosBottomSheet />
        </div>
      </div>

      {/* En escritorio los filtros se muestran en línea */}
      <div className="hidden rounded-2xl border border-input bg-background p-4 sm:block">
        <FiltrosAvanzados />
      </div>

      {/* Resultados con vista de galería o lista */}
      {prendas.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">
            {categoriaSeleccionada
              ? `No tienes prendas en ${categoriaSeleccionada} con estos filtros`
              : hayFiltrosAvanzados
                ? "No hay prendas que coincidan con los filtros"
                : "Tu armario aún está vacío"}
          </p>
          <Button asChild className="mt-4">
            <Link href="/prendas/nueva">
              <Plus className="h-4 w-4 mr-2" /> Añadir primera prenda
            </Link>
          </Button>
        </div>
      ) : (
        <CatalogoPrendas
          prendas={prendas}
          favoritosIniciales={favoritosIds}
          categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre }))}
          soloFavoritos={soloFavoritos}
        />
      )}
    </div>
  );
}

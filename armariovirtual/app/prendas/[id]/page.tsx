import { CategoriaModel, PrendaModel } from "@/lib/db/client";
import { requireUser } from "@/lib/auth";
import type { Categoria, Prenda } from "@/lib/db/types";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { notFound } from "next/navigation";
import MarcarUsadaHoy from "@/components/prendas/MarcarUsadaHoy";
import ToggleEstado from "@/components/prendas/ToggleEstado";
import AccionesPrenda from "@/components/prendas/AccionesPrenda";
import ImagenPrendaDetalle from "@/components/prendas/ImagenPrendaDetalle";
import {
  ESTADO_LABEL,
  OCASION_LABEL,
  PATRON_LABEL,
  TEMPORADA_LABEL,
} from "@/lib/prenda-metadata";

export const dynamic = "force-dynamic";

export default async function PrendaDetalle({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const usuario = await requireUser();
  const id = parseInt(idParam, 10);
  let prenda: Prenda | null = null;
  let categorias: Categoria[] = [];

  try {
    prenda = Number.isInteger(id)
      ? await PrendaModel.findByIdForUsuario(id, usuario.id)
      : null;
    categorias = await CategoriaModel.findAll();
  } catch {
    prenda = prenda ?? null;
  }

  if (!prenda) {
    notFound();
  }

  return (
    <div className="py-4 max-w-4xl mx-auto px-4 space-y-6">
      <nav className="flex items-center gap-2 text-sm">
        <Link
          href="/catalogo"
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          Catálogo
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-foreground font-medium">{prenda.nombre}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Imagen */}
        <div className="space-y-4">
          <ImagenPrendaDetalle
            id={prenda.id}
            nombre={prenda.nombre}
            imagenUrl={prenda.imagen_url}
            imagenSinFondoUrl={prenda.imagen_sin_fondo_url}
            createdAt={prenda.created_at}
          />
        </div>

        {/* Detalles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2 text-xl">
              <span>{prenda.nombre}</span>
              <Badge
                variant="outline"
                className={
                  prenda.estado === "para_lavar"
                    ? "border-amber-500/50 bg-amber-500/15 text-amber-700"
                    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
                }
              >
                {ESTADO_LABEL[prenda.estado]}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {prenda.descripcion && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Descripción
                </h3>
                <p className="text-foreground">{prenda.descripcion}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {prenda.temporada !== "todas" && (
                <Badge variant="secondary">
                  {TEMPORADA_LABEL[prenda.temporada]}
                </Badge>
              )}
              {prenda.ocasion !== "todas" && (
                <Badge variant="outline">
                  {OCASION_LABEL[prenda.ocasion]}
                </Badge>
              )}
              <Badge variant="outline">{PATRON_LABEL[prenda.patron]}</Badge>
            </div>
            <div className="flex items-center justify-between pt-4 border-t">
              <span className="text-sm text-muted-foreground">Veces usada:</span>
              <span className="text-sm font-medium">
                {prenda.veces_usada}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-muted-foreground">Precio:</span>
              <span className="text-sm font-medium">
                {prenda.precio === null
                  ? "Sin registrar"
                  : `$${prenda.precio.toFixed(2)}`}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-muted-foreground">ID:</span>
              <span className="text-sm font-mono">#{prenda.id}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-muted-foreground">Categoría:</span>
              <span className="text-sm font-medium">
                {String(prenda.categoria_id)}
              </span>
            </div>
            {prenda.color && (
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm text-muted-foreground">Color:</span>
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span
                    className="inline-block h-4 w-4 rounded-full border border-input"
                    style={{ backgroundColor: prenda.color }}
                  />
                  {prenda.color}
                </span>
              </div>
            )}
            <div className="grid grid-cols-1 gap-2 pt-4 border-t sm:grid-cols-2">
              <MarcarUsadaHoy
                prendaId={prenda.id}
                vecesUsada={prenda.veces_usada}
              />
              <ToggleEstado prendaId={prenda.id} estado={prenda.estado} />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button variant="outline" asChild className="w-full">
              <Link href="/catalogo">Volver al catálogo</Link>
            </Button>
            <AccionesPrenda
              prendaId={prenda.id}
              nombre={prenda.nombre}
              descripcion={prenda.descripcion}
              categoriaId={prenda.categoria_id}
              color={prenda.color}
              temporada={prenda.temporada}
              ocasion={prenda.ocasion}
              patron={prenda.patron}
              estado={prenda.estado}
              precio={prenda.precio}
              categorias={categorias.map((c) => ({
                id: c.id,
                nombre: c.nombre,
                slug: c.slug,
              }))}
              tieneRecorte={Boolean(prenda.imagen_sin_fondo_url)}
            />
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

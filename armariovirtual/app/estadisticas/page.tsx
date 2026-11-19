import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { requireUser } from "@/lib/auth";
import { obtenerEstadisticas, DIAS_OLVIDO } from "@/lib/estadisticas";
import { TEMPORADA_LABEL } from "@/lib/prenda-metadata";
import TarjetaMetrica from "@/components/estadisticas/TarjetaMetrica";
import GraficoBarras from "@/components/estadisticas/GraficoBarras";
import ListaPrendasOlvidadas from "@/components/estadisticas/ListaPrendasOlvidadas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Droplets,
  Layers,
  Plus,
  Shirt,
  Sparkles,
  Trophy,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Estadísticas | Armario Virtual",
};

export default async function EstadisticasPage() {
  const usuario = await requireUser();
  const datos = await obtenerEstadisticas(usuario.id);

  const porCategoria = datos.prendas_por_categoria.map((c) => ({
    etiqueta: c.nombre,
    valor: c.total,
    href: `/catalogo?categoria=${c.categoria_id}`,
  }));

  const porTemporada = datos.prendas_por_temporada
    .map((t) => ({
      etiqueta: TEMPORADA_LABEL[t.temporada],
      valor: t.total,
    }))
    .sort((a, b) => b.valor - a.valor);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Estadísticas</h1>
          <p className="text-muted-foreground">
            Un vistazo a cómo usas tu armario, {usuario.nombre}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/catalogo">
              <Shirt className="mr-1.5 h-4 w-4" /> Catálogo
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/looks/nuevo">
              <Plus className="mr-1.5 h-4 w-4" /> Nuevo look
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TarjetaMetrica
          titulo="Prendas"
          valor={datos.total_prendas}
          descripcion="en tu armario"
          icono={Shirt}
          tono="primary"
        />
        <TarjetaMetrica
          titulo="Looks"
          valor={datos.total_looks}
          descripcion="combinaciones guardadas"
          icono={Layers}
          tono="sky"
        />
        <TarjetaMetrica
          titulo="Para lavar"
          valor={datos.para_lavar}
          descripcion="necesitan atención"
          icono={Droplets}
          tono="amber"
        />
        <TarjetaMetrica
          titulo="Olvidadas"
          valor={datos.olvidadas.length}
          descripcion={`sin uso en ${DIAS_OLVIDO} días`}
          icono={Clock}
          tono="emerald"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <GraficoBarras
          titulo="Prendas por categoría"
          datos={porCategoria}
          vacioTexto="Añade prendas para ver el desglose"
        />
        <GraficoBarras
          titulo="Prendas por temporada"
          datos={porTemporada}
          colorClass="bg-sky-500"
          vacioTexto="Añade prendas para ver el desglose"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4" /> Top 5 más usadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {datos.top_usadas.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Registra el uso de tus prendas para ver el ranking.
              </p>
            ) : (
              <ol className="divide-y divide-input">
                {datos.top_usadas.map((prenda, indice) => {
                  const src =
                    prenda.imagen_sin_fondo_url || prenda.imagen_url;
                  return (
                    <li key={prenda.id}>
                      <Link
                        href={`/prendas/${prenda.id}`}
                        className="flex items-center gap-3 rounded-lg py-2.5 transition-colors hover:bg-accent/60 active:scale-[0.99]"
                      >
                        <span className="w-5 shrink-0 text-center text-sm font-bold text-muted-foreground">
                          {indice + 1}
                        </span>
                        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-muted">
                          {src ? (
                            <Image
                              src={src}
                              alt={prenda.nombre}
                              fill
                              sizes="44px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                              Sin img
                            </div>
                          )}
                        </div>
                        <p className="min-w-0 flex-1 truncate text-sm font-medium">
                          {prenda.nombre}
                        </p>
                        <Badge variant="secondary" className="shrink-0">
                          {prenda.veces_usada}{" "}
                          {prenda.veces_usada === 1 ? "uso" : "usos"}
                        </Badge>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>

        <ListaPrendasOlvidadas
          prendas={datos.olvidadas}
          dias={DIAS_OLVIDO}
        />
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
          <Sparkles className="h-6 w-6 text-primary" />
          <p className="text-sm text-muted-foreground">
            ¿Buscas inspiración? Crea un look con tus prendas y guarda el
            collage.
          </p>
          <Button asChild>
            <Link href="/looks/nuevo">
              <Plus className="mr-1.5 h-4 w-4" /> Crear un look
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

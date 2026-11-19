import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { requireUser } from "@/lib/auth";
import { LookModel } from "@/lib/db/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OCASION_LABEL } from "@/lib/prenda-metadata";
import { Heart, Layers, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mis looks | Armario Virtual",
};

export default async function LooksPage() {
  const usuario = await requireUser();
  const looks = await LookModel.findByUsuario(usuario.id);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mis looks</h1>
          <p className="text-muted-foreground">
            Combinaciones que guardaste en tu armario.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/looks/nuevo">
            <Plus className="mr-1.5 h-4 w-4" /> Crear look
          </Link>
        </Button>
      </div>

      {looks.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <Layers className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">
            Todavía no has creado ningún look.
          </p>
          <Button asChild className="mt-4">
            <Link href="/looks/nuevo">Crear mi primer look</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {looks.map((look) => {
            const src = look.collage_url || look.montaje_url;
            return (
              <Link
                key={look.id}
                href={`/looks/${look.id}`}
                className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="h-full overflow-hidden transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg group-hover:ring-2 group-hover:ring-primary/30 group-active:scale-[0.99]">
                  <div className="relative aspect-square bg-muted">
                    {src ? (
                      <Image
                        src={src}
                        alt={look.nombre}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <Layers className="h-8 w-8 opacity-40" />
                      </div>
                    )}
                    {look.es_favorito && (
                      <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 backdrop-blur">
                        <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
                      </span>
                    )}
                  </div>
                  <CardContent className="space-y-2 p-4">
                    <p className="truncate font-semibold">{look.nombre}</p>
                    <Badge variant="secondary">
                      {OCASION_LABEL[look.ocasion]}
                    </Badge>
                    {look.descripcion && (
                      <p className="truncate text-xs text-muted-foreground">
                        {look.descripcion}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

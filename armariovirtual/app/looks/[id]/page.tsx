import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { LookModel } from "@/lib/db/client";
import CollageLook from "@/components/looks/CollageLook";
import UsarLookHoy from "@/components/looks/UsarLookHoy";
import AccionesLook from "@/components/looks/AccionesLook";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OCASION_LABEL, SLOT_LABEL } from "@/lib/prenda-metadata";
import { ArrowLeft, Heart, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Look | Armario Virtual",
};

export default async function LookDetalle({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const usuario = await requireUser();
  const lookId = Number.parseInt(idParam, 10);

  if (!Number.isInteger(lookId) || lookId <= 0) {
    notFound();
  }

  const look = await LookModel.findByIdForUsuario(lookId, usuario.id);
  if (!look) {
    notFound();
  }

  const prendas = await LookModel.findPrendasDeLook(lookId, usuario.id);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-4">
      <nav className="flex items-center gap-2 text-sm">
        <Link
          href="/looks"
          className="text-muted-foreground transition-colors hover:text-primary"
        >
          Mis looks
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="truncate font-medium text-foreground">{look.nombre}</span>
      </nav>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CollageLook
          collageUrl={look.collage_url}
          montajeUrl={look.montaje_url}
          prendas={prendas}
        />

        <div className="space-y-4">
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold">
              {look.nombre}
              {look.es_favorito && (
                <Heart className="h-5 w-5 fill-rose-500 text-rose-500" />
              )}
            </h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary">{OCASION_LABEL[look.ocasion]}</Badge>
              <Badge variant="outline">{prendas.length} prendas</Badge>
            </div>
          </div>

          {look.descripcion && (
            <p className="text-sm text-muted-foreground">{look.descripcion}</p>
          )}

          <UsarLookHoy lookId={look.id} />

          <Card>
            <CardContent className="space-y-1 p-4">
              <p className="mb-2 text-sm font-semibold">Prendas del look</p>
              {prendas.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Este look no tiene prendas asociadas.
                </p>
              ) : (
                <ul className="divide-y divide-input">
                  {prendas.map((prenda) => {
                    const src =
                      prenda.imagen_sin_fondo_url || prenda.imagen_url;
                    return (
                      <li key={prenda.id}>
                        <Link
                          href={`/prendas/${prenda.id}`}
                          className="flex items-center gap-3 rounded-lg py-2 transition-colors hover:bg-accent/60 active:scale-[0.99]"
                        >
                          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-muted">
                            {src && (
                              <Image
                                src={src}
                                alt={prenda.nombre}
                                fill
                                sizes="44px"
                                className="object-cover"
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {prenda.nombre}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {SLOT_LABEL[prenda.slot]}
                            </p>
                          </div>
                          <Badge variant="outline" className="shrink-0 text-[10px]">
                            {prenda.veces_usada} usos
                          </Badge>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/looks">
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Ver mis looks
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/looks/nuevo">
                <Plus className="mr-1.5 h-4 w-4" /> Nuevo look
              </Link>
            </Button>
          </div>

          <AccionesLook
            lookId={look.id}
            nombre={look.nombre}
            totalPrendas={prendas.length}
            collageUrl={look.collage_url}
            montajeUrl={look.montaje_url}
          />
        </div>
      </div>
    </div>
  );
}

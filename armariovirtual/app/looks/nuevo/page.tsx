import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { PrendaModel } from "@/lib/db/client";
import ConstructorLook from "@/components/looks/ConstructorLook";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nuevo look | Armario Virtual",
};

export default async function NuevoLookPage() {
  const usuario = await requireUser();

  let prendas: Awaited<
    ReturnType<typeof PrendaModel.findByUsuario>
  > = [];

  try {
    prendas = await PrendaModel.findByUsuario(usuario.id);
  } catch {
    prendas = [];
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Crear un look</h1>
          <p className="text-muted-foreground">
            Combina tus prendas por slot y genera un collage 2x2 para tu
            armario.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/catalogo">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Volver al catálogo
          </Link>
        </Button>
      </div>

      {prendas.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="text-muted-foreground">
            Necesitas al menos una prenda en tu armario para crear un look.
          </p>
          <Button asChild className="mt-4">
            <Link href="/prendas/nueva">Subir mi primera prenda</Link>
          </Button>
        </div>
      ) : (
        <ConstructorLook
          prendas={prendas.map((p) => ({
            id: p.id,
            nombre: p.nombre,
            categoria_id: p.categoria_id,
            imagen_url: p.imagen_url,
            imagen_sin_fondo_url: p.imagen_sin_fondo_url,
          }))}
        />
      )}
    </div>
  );
}

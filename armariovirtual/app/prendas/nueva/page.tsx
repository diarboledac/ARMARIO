import { CategoriaModel } from "@/lib/db/client";
import type { Categoria } from "@/lib/db/types";
import { requireUser } from "@/lib/auth";
import FormNuevaPrenda from "@/components/prendas/FormNuevaPrenda";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NuevaPrenda() {
  await requireUser();
  const categorias: Categoria[] = [];

  try {
    categorias.push(...(await CategoriaModel.findAll()));
  } catch {
    // Sin datos si la BD no está disponible
  }

  return (
    <div className="py-4 max-w-2xl mx-auto px-4 space-y-6">
      <div className="flex items-center gap-2">
        <Plus className="h-5 w-5" />
        <h1 className="text-2xl font-bold">Añadir Nueva Prenda</h1>
      </div>

      <FormNuevaPrenda
        categorias={categorias.map((c) => ({
          id: c.id,
          nombre: c.nombre,
          slug: c.slug,
        }))}
      />
    </div>
  );
}

import { Suspense } from "react";
import PruebaVirtual from "@/components/probador/PruebaVirtual";
import { PrendaModel } from "@/lib/db/client";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Probador() {
  const usuario = await requireUser();
  let prendas: {
    id: number;
    nombre: string;
    imagen_url: string;
    imagen_sin_fondo_url: string | null;
    estado: "limpia" | "para_lavar";
  }[] = [];

  try {
    const propias = await PrendaModel.findByUsuario(usuario.id);
    prendas = propias.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      imagen_url: p.imagen_url,
      imagen_sin_fondo_url: p.imagen_sin_fondo_url,
      estado: p.estado,
    }));
  } catch {
    prendas = [];
  }

  return (
    <div className="py-4 max-w-5xl mx-auto px-4 space-y-6">
      <h1 className="text-2xl font-bold">Probador Virtual</h1>
      <p className="text-muted-foreground">
        Combina tu foto de base con prendas para visualizar outfits con IA.
      </p>
      <Suspense fallback={<ProbadorSkeleton />}>
        <PruebaVirtual
          usuario={{
            id: usuario.id,
            nombre: usuario.nombre,
            foto_base_url: usuario.foto_base_url,
          }}
          prendas={prendas}
        />
      </Suspense>
    </div>
  );
}

function ProbadorSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-4">
        <div className="h-80 bg-muted rounded-xl"></div>
        <div className="h-4 bg-muted rounded w-3/4"></div>
        <div className="h-4 bg-muted rounded w-1/2"></div>
        <button className="h-10 w-32 bg-muted rounded disabled:opacity-100 cursor-not-allowed">
          Crear montaje
        </button>
      </div>
      <div className="space-y-4">
        <div className="h-96 bg-muted rounded-xl"></div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted rounded w-full"></div>
        ))}
      </div>
    </div>
  );
}

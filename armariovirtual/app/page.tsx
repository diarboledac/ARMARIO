import { PrendaModel, LookModel } from "@/lib/db/client";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, Image as ImageIcon, Camera, Layers } from "lucide-react";
import SugerenciaClima from "@/components/clima/SugerenciaClima";
import GuiaInicio from "@/components/onboarding/GuiaInicio";

export const dynamic = "force-dynamic";

export default async function Home() {
  const usuario = await requireUser();
  let prendasCount = 0;
  let looksCount = 0;

  try {
    const [prendas, looks] = await Promise.all([
      PrendaModel.findByUsuario(usuario.id),
      LookModel.findByUsuario(usuario.id),
    ]);
    prendasCount = prendas.length;
    looksCount = looks.length;
  } catch {
    // Si la BD no está disponible, mostrar valores por defecto
  }

  return (
    <div className="space-y-8 py-4 max-w-5xl mx-auto px-4">
      <section className="flex flex-col items-center justify-center text-center px-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-primary font-medium mb-4">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          Armario Virtual Activo
        </div>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
          Tu armario digital con IA
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
          Organiza tus prendas, elimina fondos automáticamente y prueba
          outfits con el probador virtual.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/catalogo" className="w-full flex items-center justify-center gap-2">
              <ShoppingBag className="h-4 w-4" /> Ver Catálogo
            </Link>
          </Button>
          <Button variant="outline" asChild size="lg" className="w-full sm:w-auto">
            <Link href="/probador" className="w-full flex items-center justify-center gap-2">
              <Camera className="h-4 w-4" /> Probador Virtual
            </Link>
          </Button>
        </div>
      </section>

      {/* Onboarding guiado cuando el armario está vacío */}
      {(prendasCount === 0 || !usuario.foto_base_url) && (
        <GuiaInicio
          tieneFotoBase={Boolean(usuario.foto_base_url)}
          totalPrendas={prendasCount}
        />
      )}

      {/* Sugerencias por clima */}
      <section>
        <SugerenciaClima />
      </section>

      {/* Estadísticas rápidas */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Prendas en tu armario</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-end">
            <div className="text-4xl font-bold">{prendasCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Looks creados</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-end">
            <div className="text-4xl font-bold">{looksCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Foto de base configurada</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-end">
            <div className={`h-12 w-12 rounded-full border ${usuario?.foto_base_url ? "bg-primary" : "bg-muted"}`}>
              {usuario?.foto_base_url ? (
                <Image
                  src={usuario.foto_base_url}
                  alt="Foto base"
                  width={48}
                  height={48}
                  className="h-full w-full object-cover rounded-full"
                />
              ) : (
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Acciones rápidas */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="group cursor-pointer hover:border-primary transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-normal">Añadir prenda nueva</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Sube una foto de tu prenda y el fondo se eliminará automáticamente con IA.
            </p>
            <Button variant="outline" asChild className="w-full flex items-center justify-center gap-2">
              <Link href="/prendas/nueva">
                <Camera className="h-4 w-4" /> Subir con cámara
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="group cursor-pointer hover:border-primary transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-normal">Gestionar foto de base</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Configura tu foto de referencia para usar en el probador virtual.
            </p>
            <Button variant="outline" asChild className="w-full flex items-center justify-center gap-2">
              <Link href="/usuario">
                <ImageIcon className="h-4 w-4" /> Configurar foto
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="group cursor-pointer hover:border-primary transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-normal">Crear un look</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Combina prendas por slot y genera un collage 2x2 de tu outfit.
            </p>
            <Button variant="outline" asChild className="w-full flex items-center justify-center gap-2">
              <Link href="/looks/nuevo">
                <Layers className="h-4 w-4" /> Constructor de looks
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="group cursor-pointer hover:border-primary transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-normal">Probador virtual</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Visualiza el montaje de una prenda con IA sobre tu foto.
            </p>
            <Button variant="outline" asChild className="w-full flex items-center justify-center gap-2">
              <Link href="/probador">
                <ShoppingBag className="h-4 w-4" /> Ir al probador
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

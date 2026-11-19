import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Camera, Check, Image as ImageIcon, Sparkles } from "lucide-react";

interface GuiaInicioProps {
  tieneFotoBase: boolean;
  totalPrendas: number;
}

interface Paso {
  numero: number;
  titulo: string;
  descripcion: string;
  cta: string;
  href: string;
  completado: boolean;
  icono: typeof Camera;
}

/**
 * Onboarding editorial en el inicio: guía paso a paso cuando el usuario
 * todavía no tiene foto base o prendas digitalizadas.
 */
export default function GuiaInicio({
  tieneFotoBase,
  totalPrendas,
}: GuiaInicioProps) {
  const pasos: Paso[] = [
    {
      numero: 1,
      titulo: "Sube tu foto base",
      descripcion:
        "Una foto nítida de cuerpo entero sirve de base para probar cualquier look.",
      cta: tieneFotoBase ? "Actualizar foto" : "Configurar foto",
      href: "/usuario",
      completado: tieneFotoBase,
      icono: ImageIcon,
    },
    {
      numero: 2,
      titulo: "Digitaliza tus primeras 3 prendas",
      descripcion:
        "Sube las prendas que más usas: la IA recorta el fondo y las ordena en tu armario.",
      cta: "Subir prendas",
      href: "/prendas/nueva",
      completado: totalPrendas >= 3,
      icono: Camera,
    },
    {
      numero: 3,
      titulo: "Prueba tu primer outfit",
      descripcion:
        "Combina prendas en un look visual o monta un outfit con el probador de IA.",
      cta: "Ir al probador",
      href: "/probador",
      completado: false,
      icono: Sparkles,
    },
  ];

  const completados = pasos.filter((p) => p.completado).length;

  return (
    <section className="overflow-hidden rounded-3xl border border-input bg-[#F6F6F4] dark:bg-card">
      <div className="grid grid-cols-1 gap-8 p-6 sm:p-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div className="space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            Bienvenido a tu armario
          </span>
          <h2 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            Tres pasos y tu closet
            <br />
            cobra vida.
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Te guiamos para que registres tu ropa real, la combines en looks y
            veas cómo te queda antes de salir.
          </p>
          <div className="flex items-center gap-3 pt-1">
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{
                  width: `${Math.round((completados / pasos.length) * 100)}%`,
                }}
              />
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {completados} de {pasos.length} completados
            </span>
          </div>
        </div>

        <ol className="space-y-3">
          {pasos.map((paso) => {
            const Icono = paso.icono;
            return (
              <li
                key={paso.numero}
                className="flex items-start gap-4 rounded-2xl border border-input bg-background/80 p-4 transition-all hover:border-primary/40"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                    paso.completado
                      ? "bg-emerald-500 text-white"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {paso.completado ? <Check className="h-5 w-5" /> : paso.numero}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Icono className="h-4 w-4 text-muted-foreground" />
                    {paso.titulo}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {paso.descripcion}
                  </p>
                  {!paso.completado && (
                    <Button asChild size="sm" variant="outline" className="mt-3">
                      <Link href={paso.href}>{paso.cta}</Link>
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

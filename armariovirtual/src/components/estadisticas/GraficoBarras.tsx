import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface DatoBarra {
  etiqueta: string;
  valor: number;
  /** Enlace opcional para llevar la barra a otra vista (p. ej. el catálogo). */
  href?: string;
}

interface GraficoBarrasProps {
  titulo: string;
  datos: DatoBarra[];
  vacioTexto?: string;
  colorClass?: string;
}

/**
 * Gráfico de barras horizontales con CSS/Tailwind, sin librerías externas.
 * Mobile-first: etiqueta arriba y barra a ancho completo. Si el dato trae
 * `href`, la barra es navegable.
 */
export default function GraficoBarras({
  titulo,
  datos,
  vacioTexto = "Sin datos todavía",
  colorClass = "bg-primary",
}: GraficoBarrasProps) {
  const visibles = datos.filter((d) => d.valor > 0);
  const maximo = Math.max(1, ...visibles.map((d) => d.valor));

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        {visibles.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {vacioTexto}
          </p>
        ) : (
          <ul className="space-y-3">
            {visibles.map((dato) => {
              const porcentaje = Math.round((dato.valor / maximo) * 100);
              const barra = (
                <div
                  className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
                  role="img"
                  aria-label={`${dato.etiqueta}: ${dato.valor}`}
                >
                  <div
                    className={`h-full rounded-full ${colorClass} transition-all duration-500`}
                    style={{ width: `${porcentaje}%` }}
                  />
                </div>
              );

              return (
                <li key={dato.etiqueta}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    {dato.href ? (
                      <Link
                        href={dato.href}
                        className="truncate font-medium underline-offset-2 transition-colors hover:text-primary hover:underline"
                      >
                        {dato.etiqueta}
                      </Link>
                    ) : (
                      <span className="truncate font-medium">
                        {dato.etiqueta}
                      </span>
                    )}
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {dato.valor}
                    </span>
                  </div>
                  {dato.href ? (
                    <Link
                      href={dato.href}
                      aria-label={`Ver ${dato.etiqueta} en el catálogo`}
                      className="block rounded-full transition-transform active:scale-[0.99]"
                    >
                      {barra}
                    </Link>
                  ) : (
                    barra
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

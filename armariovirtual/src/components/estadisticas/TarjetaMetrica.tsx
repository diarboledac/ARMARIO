import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type Tono = "primary" | "amber" | "emerald" | "sky";

const TONOS: Record<Tono, { fondo: string; icono: string }> = {
  primary: { fondo: "bg-primary/10", icono: "text-primary" },
  amber: { fondo: "bg-amber-500/15", icono: "text-amber-600" },
  emerald: { fondo: "bg-emerald-500/15", icono: "text-emerald-600" },
  sky: { fondo: "bg-sky-500/15", icono: "text-sky-600" },
};

interface TarjetaMetricaProps {
  titulo: string;
  valor: number | string;
  descripcion?: string;
  icono: LucideIcon;
  tono?: Tono;
}

export default function TarjetaMetrica({
  titulo,
  valor,
  descripcion,
  icono: Icono,
  tono = "primary",
}: TarjetaMetricaProps) {
  const estilo = TONOS[tono];
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-center gap-4 p-4 sm:p-5">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${estilo.fondo}`}
        >
          <Icono className={`h-5 w-5 ${estilo.icono}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {titulo}
          </p>
          <p className="text-2xl font-bold leading-tight">{valor}</p>
          {descripcion && (
            <p className="truncate text-xs text-muted-foreground">
              {descripcion}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

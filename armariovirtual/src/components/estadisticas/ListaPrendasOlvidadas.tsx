import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import type { Prenda } from "@/lib/db/types";

interface ListaPrendasOlvidadasProps {
  prendas: Prenda[];
  dias?: number;
}

export default function ListaPrendasOlvidadas({
  prendas,
  dias = 30,
}: ListaPrendasOlvidadasProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" /> Olvidadas
          <span className="text-xs font-normal text-muted-foreground">
            sin uso en {dias} días
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {prendas.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Ninguna prenda olvidada. ¡Buen trabajo!
          </p>
        ) : (
          <ul className="divide-y divide-input">
            {prendas.map((prenda) => {
              const src = prenda.imagen_sin_fondo_url || prenda.imagen_url;
              return (
                <li key={prenda.id}>
                  <Link
                    href={`/prendas/${prenda.id}`}
                    className="flex items-center gap-3 rounded-lg py-2.5 transition-colors hover:bg-accent/60 active:scale-[0.99]"
                  >
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
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {prenda.nombre}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {prenda.veces_usada === 0
                          ? "Nunca usada"
                          : `Usada ${prenda.veces_usada} ${
                              prenda.veces_usada === 1 ? "vez" : "veces"
                            }`}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {prenda.veces_usada === 0 ? "Nueva" : "Olvidada"}
                    </Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

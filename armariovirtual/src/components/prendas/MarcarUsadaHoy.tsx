"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/ToastProvider";
import { Check, Shirt } from "lucide-react";

type Estado = "idle" | "cargando" | "ok" | "error";

interface MarcarUsadaHoyProps {
  prendaId: number;
  vecesUsada?: number;
  compacto?: boolean;
  className?: string;
  /** `menu` renderiza el control como una opción dentro de un menú contextual. */
  estilo?: "boton" | "menu";
}

/**
 * Botón táctil para registrar el uso de una prenda hoy.
 * Muestra spinner durante la petición, confirmación visual y un toast global.
 */
export default function MarcarUsadaHoy({
  prendaId,
  vecesUsada,
  compacto = false,
  className = "",
  estilo = "boton",
}: MarcarUsadaHoyProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [estado, setEstado] = useState<Estado>("idle");
  const [usos, setUsos] = useState<number | undefined>(vecesUsada);

  const registrar = async () => {
    if (estado === "cargando") return;
    setEstado("cargando");
    try {
      const res = await fetch(`/api/prendas/${prendaId}/usar`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("No se pudo registrar");
      const data = (await res.json()) as {
        prenda?: { veces_usada?: number };
      };
      if (typeof data.prenda?.veces_usada === "number") {
        setUsos(data.prenda.veces_usada);
      } else if (typeof usos === "number") {
        setUsos(usos + 1);
      }
      setEstado("ok");
      toast({
        title: "Prenda marcada como usada",
        description: "Sumamos este uso a tu historial.",
        variant: "success",
      });
      router.refresh();
      window.setTimeout(() => setEstado("idle"), 2500);
    } catch {
      setEstado("error");
      toast({
        title: "No se pudo registrar el uso",
        description: "Inténtalo de nuevo en unos segundos.",
        variant: "error",
      });
      window.setTimeout(() => setEstado("idle"), 3000);
    }
  };

  const clasesMenu =
    "w-full justify-start rounded-lg border-0 bg-transparent px-3 py-2 text-sm font-medium hover:bg-accent hover:text-foreground";

  return (
    <div className={className}>
      <Button
        type="button"
        size={compacto ? "sm" : "default"}
        variant={estado === "ok" ? "secondary" : "default"}
        onClick={registrar}
        disabled={estado === "cargando"}
        aria-live="polite"
        className={
          estilo === "menu"
            ? clasesMenu
            : `w-full transition-all active:scale-[0.97] ${
                estado === "ok"
                  ? "bg-green-600 text-white hover:bg-green-600/90"
                  : ""
              }`
        }
        title="Registrar que usaste esta prenda hoy"
      >
        {estado === "cargando" ? (
          <>
            <Spinner size="sm" className="mr-2" /> Registrando...
          </>
        ) : estado === "ok" ? (
          <>
            <Check className="mr-2 h-4 w-4" /> Usada hoy
          </>
        ) : estado === "error" ? (
          <>No se pudo · Reintentar</>
        ) : (
          <>
            <Shirt className="mr-2 h-4 w-4" /> Usar hoy
            {typeof usos === "number" && usos > 0 && estilo === "boton" && (
              <span className="ml-1.5 rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-[11px] font-semibold">
                {usos}
              </span>
            )}
          </>
        )}
      </Button>
      <span className="sr-only" role="status">
        {estado === "ok"
          ? "Uso registrado correctamente"
          : estado === "error"
            ? "Error al registrar el uso"
            : ""}
      </span>
    </div>
  );
}

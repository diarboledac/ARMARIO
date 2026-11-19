"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/ToastProvider";
import { Check, Droplets } from "lucide-react";
import type { EstadoPrenda } from "@/lib/db/types";

interface ToggleEstadoProps {
  prendaId: number;
  estado: EstadoPrenda;
  compacto?: boolean;
  className?: string;
  /** `menu` renderiza el control como una opción dentro de un menú contextual. */
  estilo?: "boton" | "menu";
}

/**
 * Alterna el estado de limpieza de una prenda entre 'limpia' y 'para_lavar'.
 * Optimista en la UI, con spinner, toast global y refresco del servidor.
 */
export default function ToggleEstado({
  prendaId,
  estado,
  compacto = false,
  className = "",
  estilo = "boton",
}: ToggleEstadoProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(false);

  const nuevoEstado: EstadoPrenda =
    estado === "limpia" ? "para_lavar" : "limpia";

  const alternar = async () => {
    if (cargando) return;
    setCargando(true);
    setError(false);
    try {
      const res = await fetch(`/api/prendas/${prendaId}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (!res.ok) throw new Error("No se pudo actualizar");
      toast({
        title:
          nuevoEstado === "para_lavar" ? "Enviada a lavar" : "Prenda marcada limpia",
        description:
          nuevoEstado === "para_lavar"
            ? "La apartamos para el próximo lavado."
            : "Vuelve a estar disponible en tu armario.",
        variant: "success",
      });
      router.refresh();
    } catch {
      setError(true);
      toast({
        title: "No se pudo actualizar el estado",
        description: "Inténtalo de nuevo en unos segundos.",
        variant: "error",
      });
      window.setTimeout(() => setError(false), 3000);
    } finally {
      setCargando(false);
    }
  };

  const clasesMenu =
    "w-full justify-start rounded-lg border-0 bg-transparent px-3 py-2 text-sm font-medium hover:bg-accent hover:text-foreground";

  return (
    <div className={className}>
      <Button
        type="button"
        size={compacto ? "sm" : "default"}
        variant="outline"
        onClick={alternar}
        disabled={cargando}
        aria-label={
          estado === "limpia"
            ? "Marcar prenda para lavar"
            : "Marcar prenda como limpia"
        }
        className={
          estilo === "menu"
            ? clasesMenu
            : `w-full transition-all active:scale-[0.97] ${
                estado === "limpia"
                  ? "border-amber-500/50 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20"
              }`
        }
        title={
          estado === "limpia" ? "Está limpia: marcar para lavar" : "Marcar limpia"
        }
      >
        {cargando ? (
          <>
            <Spinner size="sm" className="mr-2" /> Guardando...
          </>
        ) : estado === "limpia" ? (
          <>
            <Droplets className="mr-2 h-4 w-4" /> Enviar a lavar
          </>
        ) : (
          <>
            <Check className="mr-2 h-4 w-4" /> Marcar limpia
          </>
        )}
      </Button>
      <span className="sr-only" role="status" aria-live="polite">
        {error
          ? "Error al actualizar el estado"
          : estado === "limpia"
            ? "La prenda está limpia"
            : "La prenda está para lavar"}
      </span>
    </div>
  );
}

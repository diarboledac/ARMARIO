"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/ToastProvider";
import { Check, Shirt } from "lucide-react";

interface UsarLookHoyProps {
  lookId: number;
  className?: string;
}

/**
 * Registra el uso de un look completo: queda en `registros_uso` y sus
 * prendas incrementan `veces_usada`.
 */
export default function UsarLookHoy({
  lookId,
  className = "",
}: UsarLookHoyProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [estado, setEstado] = useState<"idle" | "cargando" | "ok" | "error">(
    "idle"
  );
  const [prendasRegistradas, setPrendasRegistradas] = useState<number | null>(
    null
  );

  const registrar = async () => {
    if (estado === "cargando") return;
    setEstado("cargando");
    try {
      const res = await fetch(`/api/looks/${lookId}/usar`, { method: "POST" });
      const data = (await res.json().catch(() => null)) as {
        prendas_registradas?: number;
        error?: string;
      } | null;
      if (!res.ok) throw new Error(data?.error ?? "No se pudo registrar");
      setPrendasRegistradas(data?.prendas_registradas ?? 0);
      setEstado("ok");
      toast({
        title: "Look registrado",
        description: "Sumamos este uso a tu historial del armario.",
        variant: "success",
      });
      router.refresh();
      window.setTimeout(() => setEstado("idle"), 2500);
    } catch {
      setEstado("error");
      toast({
        title: "No se pudo registrar el look",
        description: "Inténtalo de nuevo en unos segundos.",
        variant: "error",
      });
      window.setTimeout(() => setEstado("idle"), 3000);
    }
  };

  return (
    <div className={className}>
      <Button
        type="button"
        onClick={registrar}
        disabled={estado === "cargando"}
        className={`w-full transition-all active:scale-[0.97] ${
          estado === "ok"
            ? "bg-green-600 text-white hover:bg-green-600/90"
            : ""
        }`}
      >
        {estado === "cargando" ? (
          <>
            <Spinner size="sm" className="mr-2" /> Registrando look...
          </>
        ) : estado === "ok" ? (
          <>
            <Check className="mr-2 h-4 w-4" />
            Look usado
            {prendasRegistradas !== null && prendasRegistradas > 0
              ? ` (${prendasRegistradas} prendas)`
              : ""}
          </>
        ) : estado === "error" ? (
          <>No se pudo · Reintentar</>
        ) : (
          <>
            <Shirt className="mr-2 h-4 w-4" /> Usar este look hoy
          </>
        )}
      </Button>
    </div>
  );
}

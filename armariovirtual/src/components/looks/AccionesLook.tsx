"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/ToastProvider";
import { AlertTriangle, Download, Share2, Trash2 } from "lucide-react";

interface AccionesLookProps {
  lookId: number;
  nombre: string;
  totalPrendas: number;
  collageUrl?: string | null;
  montajeUrl?: string | null;
}

/**
 * Acciones sobre un look: compartir, descargar la imagen y eliminar con
 * confirmación. El borrado usa `DELETE /api/looks/[id]`, que valida la sesión.
 */
export default function AccionesLook({
  lookId,
  nombre,
  totalPrendas,
  collageUrl,
  montajeUrl,
}: AccionesLookProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirmando, setConfirmando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [compartiendo, setCompartiendo] = useState(false);

  const imagen = collageUrl || montajeUrl || null;
  const nombreArchivo = `${nombre.trim().replace(/\s+/g, "-").toLowerCase() || "look"}.png`;

  const eliminar = async () => {
    if (borrando) return;
    setBorrando(true);
    try {
      const res = await fetch(`/api/looks/${lookId}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "No se pudo eliminar el look");
      }
      setConfirmando(false);
      toast({
        title: "Look eliminado",
        description: "Ya no está en tu armario.",
        variant: "success",
      });
      router.push("/looks");
      router.refresh();
    } catch (error) {
      toast({
        title: "No se pudo eliminar",
        description:
          error instanceof Error ? error.message : "Error inesperado",
        variant: "error",
      });
    } finally {
      setBorrando(false);
    }
  };

  const descargar = async () => {
    if (!imagen) {
      toast({
        title: "Este look no tiene imagen",
        description: "Genera el collage o el montaje antes de descargarlo.",
        variant: "error",
      });
      return;
    }
    if (descargando) return;
    setDescargando(true);
    try {
      const res = await fetch(imagen);
      if (!res.ok) throw new Error("No se pudo obtener la imagen");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = nombreArchivo;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
      toast({
        title: "Imagen descargada",
        description: `Guardamos ${nombreArchivo} en tu dispositivo.`,
        variant: "success",
      });
    } catch {
      // Si el servidor de imágenes no permite CORS, se abre en una pestaña
      // nueva para que el usuario pueda guardarla manualmente.
      window.open(imagen, "_blank", "noopener,noreferrer");
      toast({
        title: "Abriendo la imagen",
        description: "Guarda la imagen desde el navegador para descargarla.",
        variant: "info",
      });
    } finally {
      setDescargando(false);
    }
  };

  const compartir = async () => {
    if (!imagen) {
      toast({
        title: "Este look no tiene imagen",
        description: "Genera el collage o el montaje antes de compartirlo.",
        variant: "error",
      });
      return;
    }
    if (compartiendo) return;
    setCompartiendo(true);
    try {
      const datos = {
        title: `Look ${nombre}`,
        text: `Mira mi look “${nombre}” en Armario Virtual.`,
        url: imagen,
      };

      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        try {
          await navigator.share(datos);
          toast({
            title: "Look compartido",
            description: "Ya está en tus-apps.",
            variant: "success",
          });
        } catch (error) {
          // El usuario puede cerrar la hoja de compartir: no es un error.
          if (error instanceof Error && error.name === "AbortError") return;
          throw error;
        }
      } else if (
        typeof navigator !== "undefined" &&
        navigator.clipboard?.writeText
      ) {
        await navigator.clipboard.writeText(imagen);
        toast({
          title: "Enlace copiado",
          description: "Pégalo donde quieras compartir tu look.",
          variant: "success",
        });
      } else {
        throw new Error("Compartir no está disponible en este dispositivo");
      }
    } catch (error) {
      toast({
        title: "No se pudo compartir",
        description:
          error instanceof Error ? error.message : "Error inesperado",
        variant: "error",
      });
    } finally {
      setCompartiendo(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={descargar}
          disabled={descargando || !imagen}
          className="transition-all active:scale-[0.97]"
        >
          {descargando ? (
            <>
              <Spinner size="sm" className="mr-2" /> Descargando...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" /> Descargar
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={compartir}
          disabled={compartiendo || !imagen}
          className="transition-all active:scale-[0.97]"
        >
          {compartiendo ? (
            <>
              <Spinner size="sm" className="mr-2" /> Compartiendo...
            </>
          ) : (
            <>
              <Share2 className="mr-2 h-4 w-4" /> Compartir
            </>
          )}
        </Button>
      </div>

      <Button
        type="button"
        variant="destructive"
        onClick={() => setConfirmando(true)}
        className="w-full transition-all active:scale-[0.97]"
      >
        <Trash2 className="mr-2 h-4 w-4" /> Eliminar look
      </Button>

      <Modal open={confirmando} onClose={() => setConfirmando(false)}>
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">¿Eliminar el look?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                “{nombre}” y sus {totalPrendas} prenda
                {totalPrendas === 1 ? "" : "s"} dejarán de aparecer en tu
                armario. El historial de uso se conserva.
              </p>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmando(false)}
              disabled={borrando}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={eliminar}
              disabled={borrando}
              className="transition-all active:scale-[0.97]"
            >
              {borrando ? (
                <>
                  <Spinner size="sm" className="mr-2" /> Eliminando...
                </>
              ) : (
                "Sí, eliminar"
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

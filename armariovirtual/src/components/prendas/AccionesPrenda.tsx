"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/ToastProvider";
import MetadatosPrenda from "@/components/prendas/MetadatosPrenda";
import {
  AlertTriangle,
  Pencil,
  Scissors,
  Trash2,
} from "lucide-react";
import type {
  EstadoPrenda,
  Ocasion,
  Patron,
  Temporada,
} from "@/lib/db/types";

export interface CategoriaOpcion {
  id: number;
  nombre: string;
  slug: string;
}

interface AccionesPrendaProps {
  prendaId: number;
  nombre: string;
  descripcion: string | null;
  categoriaId: number;
  color: string | null;
  temporada: Temporada;
  ocasion: Ocasion;
  patron: Patron;
  estado: EstadoPrenda;
  precio: number | null;
  categorias: CategoriaOpcion[];
  tieneRecorte: boolean;
}

/**
 * Acciones completas sobre una prenda: editar, reintentar el recorte de
 * fondo con IA y eliminar (con confirmación). Todo se ejecuta contra los
 * endpoints del usuario autenticado.
 */
export default function AccionesPrenda({
  prendaId,
  nombre,
  descripcion,
  categoriaId,
  color,
  temporada,
  ocasion,
  patron,
  estado,
  precio,
  categorias,
  tieneRecorte,
}: AccionesPrendaProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [editando, setEditando] = useState(false);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [recortando, setRecortando] = useState(false);

  const [formNombre, setFormNombre] = useState(nombre);
  const [formDescripcion, setFormDescripcion] = useState(descripcion ?? "");
  const [formCategoria, setFormCategoria] = useState(categoriaId);
  const [formColor, setFormColor] = useState(color ?? "#6366f1");
  const [formTemporada, setFormTemporada] = useState<Temporada>(temporada);
  const [formOcasion, setFormOcasion] = useState<Ocasion>(ocasion);
  const [formPatron, setFormPatron] = useState<Patron>(patron);
  const [formPrecio, setFormPrecio] = useState(
    precio === null ? "" : precio.toFixed(2)
  );

  const abrirEditor = () => {
    setFormNombre(nombre);
    setFormDescripcion(descripcion ?? "");
    setFormCategoria(categoriaId);
    setFormColor(color ?? "#6366f1");
    setFormTemporada(temporada);
    setFormOcasion(ocasion);
    setFormPatron(patron);
    setFormPrecio(precio === null ? "" : precio.toFixed(2));
    setEditando(true);
  };

  const guardar = async () => {
    if (guardando) return;
    if (!formNombre.trim()) {
      toast({
        title: "El nombre no puede quedar vacío",
        variant: "error",
      });
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch(`/api/prendas/${prendaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: formNombre.trim(),
          descripcion: formDescripcion.trim(),
          categoria_id: formCategoria,
          color: formColor,
          temporada: formTemporada,
          ocasion: formOcasion,
          patron: formPatron,
          estado,
          precio: formPrecio.trim() === "" ? null : formPrecio.trim(),
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudo actualizar la prenda");
      }
      setEditando(false);
      toast({
        title: "Prenda actualizada",
        description: "Los cambios ya están guardados en tu armario.",
        variant: "success",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "No se pudo actualizar",
        description:
          error instanceof Error ? error.message : "Error inesperado",
        variant: "error",
      });
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    if (borrando) return;
    setBorrando(true);
    try {
      const res = await fetch(`/api/prendas/${prendaId}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "No se pudo eliminar la prenda");
      }
      setConfirmandoBorrado(false);
      toast({
        title: "Prenda eliminada",
        description: "La quitamos de tu armario.",
        variant: "success",
      });
      router.push("/catalogo");
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

  const reintentarRecorte = async () => {
    if (recortando) return;
    setRecortando(true);
    try {
      const res = await fetch(`/api/prendas/${prendaId}/eliminar-fondo`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        imagen_sin_fondo_url?: string;
      } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudo quitar el fondo");
      }
      toast({
        title: "Fondo eliminado con IA",
        description: "Ya puedes ver la prenda recortada.",
        variant: "success",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "El recorte falló",
        description:
          error instanceof Error ? error.message : "Error inesperado",
        variant: "error",
      });
    } finally {
      setRecortando(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          onClick={abrirEditor}
          className="transition-all active:scale-[0.97]"
        >
          <Pencil className="mr-2 h-4 w-4" /> Editar prenda
        </Button>

        {!tieneRecorte && (
          <Button
            type="button"
            variant="outline"
            onClick={reintentarRecorte}
            disabled={recortando}
            className="transition-all active:scale-[0.97]"
          >
            {recortando ? (
              <>
                <Spinner size="sm" className="mr-2" /> Recortando...
              </>
            ) : (
              <>
                <Scissors className="mr-2 h-4 w-4" /> Reintentar recorte IA
              </>
            )}
          </Button>
        )}
      </div>

      <Button
        type="button"
        variant="destructive"
        onClick={() => setConfirmandoBorrado(true)}
        className="w-full transition-all active:scale-[0.97]"
      >
        <Trash2 className="mr-2 h-4 w-4" /> Eliminar prenda
      </Button>

      {/* Modal de edición */}
      <Modal open={editando} onClose={() => setEditando(false)}>
        <div className="max-h-[85vh] overflow-y-auto p-5">
          <h2 className="text-lg font-semibold">Editar prenda</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Actualiza los datos de {nombre}.
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="editar-nombre"
                className="mb-1.5 block text-sm font-medium"
              >
                Nombre
              </label>
              <Input
                id="editar-nombre"
                value={formNombre}
                onChange={(e) => setFormNombre(e.target.value)}
                maxLength={150}
              />
            </div>

            <div>
              <label
                htmlFor="editar-descripcion"
                className="mb-1.5 block text-sm font-medium"
              >
                Descripción
              </label>
              <Input
                id="editar-descripcion"
                value={formDescripcion}
                onChange={(e) => setFormDescripcion(e.target.value)}
                maxLength={500}
              />
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium">Categoría</p>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {categorias.map((cat) => {
                  const activa = formCategoria === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFormCategoria(cat.id)}
                      aria-pressed={activa}
                      className={`inline-flex cursor-pointer items-center whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-all active:scale-[0.97] ${
                        activa
                          ? "border-primary bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30"
                          : "border-input bg-background hover:bg-accent"
                      }`}
                    >
                      {cat.nombre}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                htmlFor="editar-color"
                className="mb-1.5 block text-sm font-medium"
              >
                Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="editar-color"
                  type="color"
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded-md border border-input bg-background p-1"
                />
                <span className="text-sm text-muted-foreground">
                  {formColor}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFormColor("")}
                >
                  Quitar color
                </Button>
              </div>
            </div>

            <MetadatosPrenda
              temporada={formTemporada}
              ocasion={formOcasion}
              patron={formPatron}
              precio={formPrecio}
              onTemporada={setFormTemporada}
              onOcasion={setFormOcasion}
              onPatron={setFormPatron}
              onPrecio={setFormPrecio}
              disabled={guardando}
            />
          </div>

          <div className="mt-5 flex justify-end gap-2 border-t border-input pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditando(false)}
              disabled={guardando}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={guardar}
              disabled={guardando}
              className="transition-all active:scale-[0.97]"
            >
              {guardando ? (
                <>
                  <Spinner size="sm" className="mr-2" /> Guardando...
                </>
              ) : (
                "Guardar cambios"
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmación de borrado */}
      <Modal
        open={confirmandoBorrado}
        onClose={() => setConfirmandoBorrado(false)}
      >
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">¿Eliminar la prenda?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                “{nombre}” se borrará de tu armario junto con su historial de
                uso. Esta acción no se puede deshacer.
              </p>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmandoBorrado(false)}
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

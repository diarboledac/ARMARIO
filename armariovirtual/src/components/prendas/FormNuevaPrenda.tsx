"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/ToastProvider";
import MetadatosPrenda from "@/components/prendas/MetadatosPrenda";
import type { Ocasion, Patron, Temporada } from "@/lib/db/types";
import {
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";

interface CategoriaOption {
  id: number;
  nombre: string;
  slug: string;
}

interface FormNuevaPrendaProps {
  categorias: CategoriaOption[];
}

export default function FormNuevaPrenda({
  categorias,
}: FormNuevaPrendaProps) {
  const router = useRouter();
  const { toast } = useToast();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [color, setColor] = useState("");
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [temporada, setTemporada] = useState<Temporada>("todas");
  const [ocasion, setOcasion] = useState<Ocasion>("todas");
  const [patron, setPatron] = useState<Patron>("liso");
  const [precio, setPrecio] = useState("");
  const [cargando, setCargando] = useState(false);
  const [exito, setExito] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reiniciarInputs = () => {
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const manejarArchivo = (e: ChangeEvent<HTMLInputElement>) => {
    const seleccionado = e.target.files?.[0] ?? null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(seleccionado);
    setPreviewUrl(seleccionado ? URL.createObjectURL(seleccionado) : null);
    setError(null);
    setExito(null);
    // Permite volver a elegir el mismo archivo más adelante.
    e.target.value = "";
  };

  const quitarFoto = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    reiniciarInputs();
  };

  const manejarSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setExito(null);

    if (!file) {
      setError("Selecciona o toma una foto de la prenda.");
      return;
    }
    if (!nombre.trim()) {
      setError("Escribe un nombre para la prenda.");
      return;
    }
    if (!categoriaId) {
      setError("Selecciona una categoría.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("nombre", nombre.trim());
    formData.append("descripcion", descripcion.trim());
    formData.append("categoria_id", String(categoriaId));
    if (color) formData.append("color", color);
    formData.append("temporada", temporada);
    formData.append("ocasion", ocasion);
    formData.append("patron", patron);
    if (precio.trim()) formData.append("precio", precio);

    setCargando(true);
    try {
      const res = await fetch("/api/prendas", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error ?? "Error subiendo la prenda");
      }

      const prenda = (await res.json()) as { id: number; nombre: string };
      setExito(
        `"${prenda.nombre}" guardada. La eliminación de fondo con IA se procesará en segundo plano.`
      );

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(null);
      setPreviewUrl(null);
      setNombre("");
      setDescripcion("");
      setColor("");
      setCategoriaId(null);
      setTemporada("todas");
      setOcasion("todas");
      setPatron("liso");
      setPrecio("");
      reiniciarInputs();

      // Aviso global con acción rápida para seguir subiendo prendas.
      toast({
        title: "¡Prenda guardada!",
        description: `"${prenda.nombre}" ya está en tu armario.`,
        variant: "success",
        accion: {
          label: "Añadir otra",
          onClick: () => router.push("/prendas/nueva"),
        },
      });

      // Redirección automática al catálogo.
      router.push("/catalogo");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error inesperado al guardar la prenda"
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <form onSubmit={manejarSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Subir foto de la prenda</CardTitle>
          <p className="text-sm text-muted-foreground">
            Toma una foto en el momento o elige una imagen de tu galería. El
            fondo se eliminará automáticamente con IA.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-input p-5 text-center transition-colors hover:border-primary/60 sm:p-8">
            {previewUrl ? (
              <div className="group relative h-56 w-56 overflow-hidden rounded-xl bg-muted">
                <Image
                  src={previewUrl}
                  alt="Vista previa de la prenda"
                  fill
                  sizes="224px"
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={quitarFoto}
                  className="absolute right-2 top-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-background/90 text-destructive shadow transition-all hover:bg-destructive hover:text-destructive-foreground active:scale-95"
                  aria-label="Quitar foto"
                  title="Quitar foto"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Camera className="h-8 w-8" />
              </div>
            )}

            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
              <Button
                type="button"
                size="lg"
                onClick={() => cameraInputRef.current?.click()}
                disabled={cargando}
                className="w-full"
              >
                <Camera className="h-4 w-4" />
                {previewUrl ? "Repetir con cámara" : "Tomar foto con cámara"}
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                onClick={() => galleryInputRef.current?.click()}
                disabled={cargando}
                className="w-full"
              >
                <ImageIcon className="h-4 w-4" />
                {previewUrl ? "Cambiar por galería" : "Elegir de galería / archivos"}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              La cámara abre directamente en el móvil; la galería funciona en
              móvil y escritorio.
            </p>

            <input
              ref={cameraInputRef}
              id="foto-camara"
              name="foto-camara"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={manejarArchivo}
              className="hidden"
            />
            <input
              ref={galleryInputRef}
              id="foto-galeria"
              name="foto-galeria"
              type="file"
              accept="image/*"
              onChange={manejarArchivo}
              className="hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="nombre-prenda"
                className="block text-sm font-medium mb-1"
              >
                Nombre / etiqueta
              </label>
              <Input
                id="nombre-prenda"
                name="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Camiseta blanca"
                maxLength={150}
                required
              />
            </div>
            <div>
              <label
                htmlFor="descripcion-prenda"
                className="block text-sm font-medium mb-1"
              >
                Descripción
              </label>
              <Input
                id="descripcion-prenda"
                name="descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Categoría</label>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {categorias.map((cat) => {
                const activa = categoriaId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoriaId(cat.id)}
                    aria-pressed={activa}
                    className={`inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-150 active:scale-95 ${
                      activa
                        ? "border-primary bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30"
                        : "border-input hover:bg-accent"
                    }`}
                  >
                    {activa && <Check className="h-3.5 w-3.5" />}
                    {cat.nombre}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="color-prenda"
              className="block text-sm font-medium mb-2"
            >
              Color (opcional)
            </label>
            <div className="flex items-center gap-3">
              <input
                id="color-prenda"
                name="color"
                type="color"
                value={color || "#6366f1"}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-md border border-input bg-background p-1"
              />
              <span className="text-sm text-muted-foreground">
                {color ? color : "Sin color seleccionado"}
              </span>
              {color && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setColor("")}
                >
                  Quitar color
                </Button>
              )}
            </div>
          </div>

          <MetadatosPrenda
            temporada={temporada}
            ocasion={ocasion}
            patron={patron}
            precio={precio}
            onTemporada={setTemporada}
            onOcasion={setOcasion}
            onPatron={setPatron}
            onPrecio={setPrecio}
            disabled={cargando}
          />

          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3"
            >
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}
          {exito && (
            <div
              role="status"
              className="flex items-center gap-2 text-sm text-green-700 bg-green-500/10 rounded-lg p-3"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" /> {exito}
            </div>
          )}

          <div className="pt-4 border-t flex justify-end">
            <Button
              type="submit"
              disabled={cargando}
              className="w-full sm:w-auto"
            >
              {cargando ? (
                <>
                  <Spinner size="sm" className="mr-2" /> Subiendo y procesando...
                </>
              ) : (
                "Guardar prenda en el armario"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

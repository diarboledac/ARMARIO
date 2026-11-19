"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertCircle,
  CheckCircle2,
  Upload,
  User as UserIcon,
} from "lucide-react";

interface SubirFotoBaseProps {
  usuarioId: number | null;
  fotoActual: string | null;
}

export default function SubirFotoBase({
  usuarioId,
  fotoActual,
}: SubirFotoBaseProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const manejarCambio = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!usuarioId) {
      setError("No hay un usuario configurado en la base de datos.");
      return;
    }

    setError(null);
    setExito(null);
    setCargando(true);

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    try {
      // 1) Subir la imagen a Cloudinary
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "armariovirtual/usuarios");

      const subidaRes = await fetch("/api/subida", {
        method: "POST",
        body: formData,
      });

      if (!subidaRes.ok) {
        const data = (await subidaRes.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error ?? "Error subiendo la imagen a Cloudinary");
      }

      const { secure_url } = (await subidaRes.json()) as {
        secure_url: string;
      };

      // 2) Guardar solo la URL en MySQL
      const usuarioRes = await fetch(`/api/usuarios/${usuarioId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foto_base_url: secure_url }),
      });

      if (!usuarioRes.ok) {
        const data = (await usuarioRes.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error ?? "Error actualizando la foto de base");
      }

      setExito("Foto de base actualizada correctamente.");
      router.refresh();
    } catch (err) {
      setPreview(null);
      setError(
        err instanceof Error ? err.message : "Error inesperado subiendo la foto"
      );
    } finally {
      setCargando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const fotoMostrar = preview ?? fotoActual;

  return (
    <div className="flex flex-col items-center gap-4">
      {fotoMostrar ? (
        <div className="relative h-48 w-48 rounded-full overflow-hidden border-4 border-primary">
          <Image
            src={fotoMostrar}
            alt="Foto de base del usuario"
            fill
            sizes="192px"
            className="object-cover"
          />
        </div>
      ) : (
        <div className="h-48 w-48 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground">
          <UserIcon className="h-10 w-10 text-muted-foreground" />
        </div>
      )}

      {cargando && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner size="sm" /> Subiendo foto...
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3 w-full">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {exito && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-500/10 rounded-lg p-3 w-full">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {exito}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        {fotoActual
          ? "Foto configurada"
          : "Aún no has subido tu foto de base"}
      </p>

      <input
        ref={inputRef}
        id="foto-base"
        type="file"
        accept="image/*"
        onChange={manejarCambio}
        className="hidden"
      />
      <Button
        asChild
        className={`w-full ${cargando ? "pointer-events-none opacity-50" : ""}`}
      >
        <label
          htmlFor="foto-base"
          className="cursor-pointer w-full flex items-center justify-center gap-2"
        >
          <Upload className="h-4 w-4" />{" "}
          {fotoActual ? "Cambiar foto de base" : "Subir foto de base"}
        </label>
      </Button>
    </div>
  );
}

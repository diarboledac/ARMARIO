"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  validarNombreUsuario,
  validarPassword,
} from "@/lib/auth-validation";
import {
  AlertCircle,
  Eye,
  EyeOff,
  LogIn,
  Sparkles,
  UserPlus,
} from "lucide-react";

type Modo = "login" | "register";

export default function AuthForm() {
  const router = useRouter();

  const [modo, setModo] = useState<Modo>("login");
  const [nombre, setNombre] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cambiarModo = (nuevo: Modo) => {
    if (nuevo === modo) return;
    setModo(nuevo);
    setPassword("");
    setError(null);
    setMostrarPassword(false);
  };

  const manejarSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const nombreValidado = validarNombreUsuario(nombre);
    if (!nombreValidado.ok) {
      setError(nombreValidado.error);
      return;
    }

    const passwordValidada = validarPassword(password);
    if (!passwordValidada.ok) {
      setError(passwordValidada.error);
      return;
    }

    setCargando(true);
    try {
      const endpoint =
        modo === "login" ? "/api/auth/login" : "/api/auth/register";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombreValidado.valor,
          password: passwordValidada.valor,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(
          data?.error ??
            (modo === "login"
              ? "No se pudo iniciar sesión"
              : "No se pudo crear la cuenta")
        );
      }

      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error inesperado de autenticación"
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
        <button
          type="button"
          onClick={() => cambiarModo("login")}
          className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-150 active:scale-[0.98] ${
            modo === "login"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
          }`}
          aria-pressed={modo === "login"}
        >
          <LogIn className="h-4 w-4" /> Iniciar sesión
        </button>
        <button
          type="button"
          onClick={() => cambiarModo("register")}
          className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-150 active:scale-[0.98] ${
            modo === "register"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
          }`}
          aria-pressed={modo === "register"}
        >
          <UserPlus className="h-4 w-4" /> Crear cuenta
        </button>
      </div>

      <div className="space-y-1 text-center">
        <h2 className="text-xl font-bold tracking-tight">
          {modo === "login" ? "Bienvenido de nuevo" : "Crea tu armario"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {modo === "login"
            ? "Entra con tu nombre de usuario y contraseña."
            : "Elige un nombre único y una contraseña segura."}
        </p>
      </div>

      <form onSubmit={manejarSubmit} className="space-y-4" noValidate>
        <div>
          <label
            htmlFor="auth-nombre"
            className="mb-1.5 block text-sm font-medium"
          >
            Nombre de usuario
          </label>
          <Input
            id="auth-nombre"
            name="nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: ana_moda"
            autoComplete="username"
            maxLength={30}
            required
            disabled={cargando}
          />
        </div>

        <div>
          <label
            htmlFor="auth-password"
            className="mb-1.5 block text-sm font-medium"
          >
            Contraseña
          </label>
          <div className="relative">
            <Input
              id="auth-password"
              name="password"
              type={mostrarPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              autoComplete={
                modo === "login" ? "current-password" : "new-password"
              }
              maxLength={72}
              required
              disabled={cargando}
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setMostrarPassword((v) => !v)}
              className="absolute right-1 top-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground active:scale-95"
              aria-label={
                mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"
              }
            >
              {mostrarPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {modo === "register" && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Entre 6 y 72 caracteres. No se guarda en texto plano.
            </p>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={cargando}>
          {cargando ? (
            <>
              <Spinner size="sm" className="mr-2" />
              {modo === "login" ? "Entrando..." : "Creando cuenta..."}
            </>
          ) : (
            <>
              {modo === "login" ? (
                <LogIn className="mr-2 h-4 w-4" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {modo === "login" ? "Entrar a mi armario" : "Crear mi cuenta"}
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

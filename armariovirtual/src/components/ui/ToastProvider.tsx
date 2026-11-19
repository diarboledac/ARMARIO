"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export type ToastVariant = "default" | "success" | "error" | "info";

export interface ToastAccion {
  label: string;
  onClick: () => void;
}

export interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
  accion?: ToastAccion;
}

interface ToastItem extends ToastInput {
  id: number;
}

interface ToastContextValue {
  toast: (input: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANTES: Record<
  ToastVariant,
  { icono: typeof Info; clases: string }
> = {
  default: {
    icono: Info,
    clases:
      "border-input bg-background/95 text-foreground dark:bg-card/95",
  },
  success: {
    icono: CheckCircle2,
    clases:
      "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  },
  error: {
    icono: AlertCircle,
    clases:
      "border-destructive/40 bg-destructive/10 text-destructive dark:text-red-300",
  },
  info: {
    icono: Info,
    clases:
      "border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-200",
  },
};

const DURACION_TOAST_MS = 4500;

/**
 * Proveedor global de notificaciones flotantes.
 * Los toasts se animan desde abajo en móvil y desde arriba en escritorio.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((previos) => previos.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = Date.now() + Math.random();
      setToasts((previos) => [...previos.slice(-2), { ...input, id }]);
      window.setTimeout(() => {
        setToasts((previos) => previos.filter((t) => t.id !== id));
      }, DURACION_TOAST_MS);
    },
    []
  );

  const valor = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={valor}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-auto sm:top-20"
      >
        {toasts.map((item) => {
          const variante = VARIANTES[item.variant ?? "default"];
          const Icono = variante.icono;
          return (
            <div
              key={item.id}
              role="status"
              className={`toast-enter pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-md ${variante.clases}`}
            >
              <Icono className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{item.title}</p>
                {item.description && (
                  <p className="mt-0.5 text-xs opacity-80">{item.description}</p>
                )}
                {item.accion && (
                  <button
                    type="button"
                    onClick={() => {
                      item.accion?.onClick();
                      dismiss(item.id);
                    }}
                    className="mt-2 cursor-pointer rounded-full border border-current/20 px-2.5 py-1 text-xs font-semibold transition-all active:scale-[0.97]"
                  >
                    {item.accion.label}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Cerrar notificación"
                className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full transition-all hover:bg-black/5 active:scale-[0.95]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

/** Hook para emitir toasts desde cualquier Client Component. */
export function useToast(): ToastContextValue {
  const contexto = useContext(ToastContext);
  if (!contexto) {
    throw new Error("useToast debe usarse dentro de ToastProvider");
  }
  return contexto;
}

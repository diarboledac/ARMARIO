"use client";

import * as React from "react";
import { cn } from "./cn";

export interface ModalProps extends React.HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({ open, onClose, children, className }: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "relative bg-card text-card-foreground rounded-xl border border-input shadow-xl w-full max-w-md mx-4 transform transition-all",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

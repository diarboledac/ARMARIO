import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { getCurrentUser } from "@/lib/auth";
import { PrendaModel } from "@/lib/db/client";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Armario Virtual - Gestión de Prendas",
  description: "Tu armario digital con probador virtual y eliminación de fondo IA",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await getCurrentUser();
  let paraLavar = 0;
  if (usuario) {
    try {
      paraLavar = await PrendaModel.countParaLavar(usuario.id);
    } catch {
      paraLavar = 0;
    }
  }

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col pt-14 sm:pt-16">
        <ToastProvider>
          <Navbar
            usuario={
              usuario ? { id: usuario.id, nombre: usuario.nombre } : null
            }
            paraLavar={paraLavar}
          />
          <main className="flex-1 w-full pb-24 sm:pb-8">{children}</main>
          <MobileBottomNav paraLavar={paraLavar} />
        </ToastProvider>
      </body>
    </html>
  );
}

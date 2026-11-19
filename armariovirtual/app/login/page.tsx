import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import AuthForm from "@/components/auth/AuthForm";
import { Shirt } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const usuario = await getCurrentUser();
  if (usuario) {
    redirect("/");
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-primary/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-accent blur-3xl"
      />

      <div className="relative mx-auto flex max-w-md flex-col gap-6 px-4 py-8 sm:py-12">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <Shirt className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Armario Virtual
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Tu armario digital con IA, ahora privado para cada usuario.
            </p>
          </div>
        </div>

        <Card className="shadow-xl shadow-primary/5">
          <CardContent className="p-6 sm:p-8">
            <AuthForm />
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Tus prendas, looks y fotos solo son visibles para tu cuenta.
        </p>
      </div>
    </div>
  );
}

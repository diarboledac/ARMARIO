import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SubirFotoBase from "@/components/usuario/SubirFotoBase";
import { User as UserIcon } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function UsuarioPage() {
  const usuario = await requireUser();

  return (
    <div className="py-4 max-w-3xl mx-auto px-4 space-y-8">
      <div className="flex items-center gap-2">
        <UserIcon className="h-5 w-5" />
        <h1 className="text-2xl font-bold">Mi Perfil</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Foto de Base</CardTitle>
          <p className="text-sm text-muted-foreground">
            Esta foto se usará como referencia en el Probador Virtual.
          </p>
        </CardHeader>
        <CardContent>
          <SubirFotoBase
            usuarioId={usuario.id}
            fotoActual={usuario.foto_base_url ?? null}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Información de la cuenta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Nombre</span>
            <span className="text-sm font-medium">
              {usuario.nombre}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm font-medium">
              {usuario.email ?? "No especificado"}
            </span>
          </div>
          <div className="flex items-center justify-between pt-4 border-t">
            <span className="text-sm text-muted-foreground">Miembro desde</span>
            <span className="text-sm font-medium">
              {usuario.created_at
                ? new Date(usuario.created_at).toLocaleDateString("es-ES")
                : "-"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

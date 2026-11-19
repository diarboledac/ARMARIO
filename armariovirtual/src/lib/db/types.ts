/**
 * Tipos de entidades de la base de datos (MySQL) — armariovirtual
 * Tipado estricto en TypeScript, sin imágenes en base64 (solo URLs de Cloudinary).
 */

export type Temporada =
  | "primavera"
  | "verano"
  | "otono"
  | "invierno"
  | "todas";

export type Ocasion =
  | "casual"
  | "formal"
  | "deporte"
  | "salida"
  | "trabajo"
  | "todas";

export type Patron =
  | "liso"
  | "rayas"
  | "cuadros"
  | "flores"
  | "geometrico"
  | "otro";

export type EstadoPrenda = "limpia" | "para_lavar";

export type SlotLook =
  | "superior"
  | "inferior"
  | "calzado"
  | "complemento"
  | "completo";

export interface Usuario {
  id: number;
  nombre: string;
  email: string | null;
  foto_base_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Categoria {
  id: number;
  nombre: string;
  slug: string;
  created_at: Date;
}

export interface Prenda {
  id: number;
  usuario_id: number;
  categoria_id: number;
  nombre: string;
  descripcion: string | null;
  color: string | null;
  temporada: Temporada;
  ocasion: Ocasion;
  patron: Patron;
  estado: EstadoPrenda;
  veces_usada: number;
  precio: number | null;
  imagen_url: string; // URL en Cloudinary (nunca base64 en MySQL)
  imagen_sin_fondo_url: string | null; // URL en Cloudinary tras eliminación de fondo (IA)
  created_at: Date;
  updated_at: Date;
}

export interface Look {
  id: number;
  usuario_id: number;
  nombre: string;
  montaje_url: string | null; // URL del montaje IA (Cloudinary)
  collage_url: string | null; // URL del collage 2x2 (Cloudinary)
  ocasion: Ocasion;
  descripcion: string | null;
  es_favorito: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface LookPrenda {
  look_id: number;
  prenda_id: number;
  slot: SlotLook;
  posicion: number;
}

export interface PrendaDeLook extends Prenda {
  slot: SlotLook;
  posicion: number;
}

export interface RegistroUso {
  id: number;
  usuario_id: number;
  prenda_id: number | null;
  look_id: number | null;
  usado_en: Date;
  created_at: Date;
}

export interface Favorito {
  usuario_id: number;
  prenda_id: number;
  created_at: Date;
}

/**
 * Parámetros de entrada para creación/actualización (evita exponer campos sensibles).
 */
export type UsuarioInput = Pick<Usuario, "nombre" | "email" | "foto_base_url">;

export type PrendaInput = Pick<
  Prenda,
  | "usuario_id"
  | "categoria_id"
  | "nombre"
  | "descripcion"
  | "color"
  | "temporada"
  | "ocasion"
  | "patron"
  | "estado"
  | "precio"
  | "imagen_url"
  | "imagen_sin_fondo_url"
>;

export type LookInput = Pick<
  Look,
  "usuario_id" | "nombre" | "montaje_url"
> & {
  ocasion?: Ocasion;
  descripcion?: string | null;
  es_favorito?: boolean;
};

export type LookPrendaInput = {
  prenda_id: number;
  slot: SlotLook;
  posicion?: number;
};

export type CategoriaInput = Pick<Categoria, "nombre" | "slug">;

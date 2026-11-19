# TASKS.md — armariovirtual

**Proyecto:** armariovirtual (Next.js 16 App Router, TypeScript, Tailwind CSS, MySQL, Cloudinary, Hugging Face)
**Estado actual:** Ciclo de pulido UX mobile + corrección de bugs (Fases 1–5) completado y verificado: acciones reales de prenda/look (editar, eliminar, reintentar recorte IA), collage adaptativo 1/2/3/4 prendas sobre `#FAFAFA`, fix del doble fetch de clima, barras de estadísticas navegables, bottom nav móvil, toasts globales, onboarding editorial, catálogo con bottom sheet de filtros y favoritos, polling del recorte IA, flujo post-subida y compartir/descargar de looks. `tsc`, `lint` y `build` pasan con 0 errores y 0 warnings. El E2E real con dos usuarios pasó 76/76 comprobaciones (favoritos, aislamiento A/B, collages analizados píxel a píxel, onboarding, páginas y APIs) y la limpieza devolvió la base de datos a su estado previo sin assets huérfanos en Cloudinary.
**Cloudinary:** operativo con el cloud `xrtf9mzi` (`api.ping()` OK). El bloqueo anterior por `Invalid cloud_name armario` quedó resuelto al corregir `CLOUDINARY_CLOUD_NAME` en `.env.local`.
**Última verificación:** 2026-11-16 — `npx tsc --noEmit`, `npm run lint`, `npm run build` (36 rutas), pruebas HTTP reales y E2E completo de las Fases 1–5 con limpieza de datos y assets.

## Reglas (AGENTS.md)
- Server Components por defecto para consultas a BD; Client Components (`'use client'`) únicamente para interactividad (cámara, formularios, filtros, probador virtual).
- Subidas de archivo vía `FormData` en Route Handlers (`/app/api/...`).
- Hugging Face: eliminación de fondo de prendas (`briaai/RMBG-1.4` o similar) y Probador Virtual / Virtual Try-On; flujos binarios (`ArrayBuffer`/`Blob`) con reintentos automáticos ante `503`.
- Nunca guardar imágenes en base64 en MySQL; subir directamente a Cloudinary y guardar solo la URL resultante en la base de datos.
- Mobile-first, 100% responsivo. Incluir siempre indicadores visuales de carga (skeletons/spinners) durante procesamiento de IA.
- Esquema MySQL limpio, tipado en TypeScript y protegido contra inyecciones SQL mediante consultas parametrizadas.
- Actualizar este archivo (y `progress.md` si aplica) antes y después de cada módulo, marcando con `[OpenCode]`.

---

## Módulo 1 — Base de datos (MySQL)

- [x] [OpenCode] Diseñar esquema MySQL: `usuarios` (con campo `foto_base_url`), `prendas`, `categorias`, `looks` (con campo `montaje_url`), `favoritos`
- [x] [OpenCode] Instalar dependencias (mysql2, etc.) y configurar cliente de conexión a MySQL usando `DATABASE_URL` (`.env.local`)
- [x] [OpenCode] Crear migraciones (tablas, relaciones, índices) y ejecutarlas en Aiven
- [x] [OpenCode] Ejecutar seed inicial (categorías de prendas y usuario por defecto)
- [x] [OpenCode] Verificar conexión a la base de datos y consultas de prueba (consultas parametrizadas, sin SQL injection)
- [x] [OpenCode] Tipado de entidades (TypeScript interfaces/types)

## Módulo 2 — Maquetación y UI (Tailwind, App Router)

- [x] [OpenCode] Layout raíz y barra de navegación (mobile-first)
- [x] [OpenCode] Página de inicio (`/`) y gestión de foto base del usuario
- [x] [OpenCode] Página de catálogo de prendas con filtros y modal/cámara para subir nueva prenda
- [x] [OpenCode] Página de detalle de prenda
- [x] [OpenCode] Página de Probador Virtual / Outfits (selección de prendas + vista previa de montaje IA)
- [x] [OpenCode] Componentes UI compartidos (tarjetas, botones, modales, estados de carga/skeletons) 100% responsivos

## Módulo 3 — API e imágenes (Cloudinary + Route Handlers)

- [x] [OpenCode] Route Handler de subida de imágenes (`FormData`, integración con eliminación de fondo, subida a Cloudinary y solo URL en BD)
- [x] [OpenCode] Route Handlers CRUD para usuarios (foto base), prendas y looks/outfits
- [x] [OpenCode] Validación de archivos y manejo de errores

## Módulo 4 — IA (Hugging Face)

- [x] [OpenCode] Endpoint de eliminación de fondo de prendas (`briaai/RMBG-1.4` o similar) usando `HUGGINGFACE_API_KEY`
- [x] [OpenCode] Endpoint de Probador Virtual / Virtual Try-On (montaje de foto base + prendas)
- [x] [OpenCode] Manejo de flujos binarios (`ArrayBuffer`/`Blob`) y reintentos automáticos ante `503`

## Módulo 5 — Verificación y cierre

- [x] [OpenCode] Lint (`eslint`) sin errores
- [x] [OpenCode] Build (`next build`) exitoso
- [x] [OpenCode] Servidor dev (`next dev`) iniciado y endpoints respondiendo
- [x] [OpenCode] Revisión final sin regresiones

---

## Corrección de bugs críticos (auditoría)

### Fase 1 — Next.js 16, imágenes y base de datos

1. [x] [OpenCode] `next.config.ts`: `images.remotePatterns` para `https://res.cloudinary.com` y `experimental.serverActions.bodySizeLimit: "15mb"`.
2. [x] [OpenCode] `app/catalogo/page.tsx` y `app/prendas/[id]/page.tsx`: `searchParams` y `params` tipados como `Promise<...>` y resueltos con `await`.
3. [x] [OpenCode] `src/components/probador/PruebaVirtual.tsx`: los 3 `<Image>` usan `fill` + `sizes` dentro de contenedores `relative` (foto base, miniatura de prenda y montaje).
4. [x] [OpenCode] `src/lib/db/client.ts`: `parseDatabaseUrl` reescrito con `new URL()` y `decodeURIComponent` para usuario/contraseña; `ssl-mode=REQUIRED` soportado.

### Fase 2 — Formularios interactivos (Client Components reales)

5. [x] [OpenCode] `src/components/prendas/FormNuevaPrenda.tsx`: formulario con `useState`, `htmlFor`/`id`, input `accept="image/*" capture="environment"`, vista previa, `FormData` + `fetch('/api/prendas')`, spinner y mensajes de error/éxito. `app/prendas/nueva/page.tsx` ahora es Server Component que inyecta categorías y usuario.
6. [x] [OpenCode] `src/components/usuario/SubirFotoBase.tsx`: `onChange` real, subida a `POST /api/subida`, actualización con `PUT /api/usuarios/[id]` y `router.refresh()`. `app/usuario/page.tsx` ahora es Server Component que inyecta el usuario.

### Fase 3 — Pipeline de IA (Hugging Face y probador virtual)

7. [x] [OpenCode] `src/lib/huggingface.ts`: `hfInference` soporta `Buffer.isBuffer(inputs)` (y `Blob`, `ArrayBuffer`, `Uint8Array`) sin dejar el body en `null`; se restauró el `return` de los errores 4xx no reintentables y se envía `x-wait-for-model`.
8. [x] [OpenCode] `app/api/probador/route.ts` reescrito con `@gradio/client`:
   - Intenta `Kwai-Kolors/Kolors-Virtual-Try-On` con `HUGGINGFACE_API_KEY` como `token`.
   - Respaldo funcional `yisol/IDM-VTON` (`/tryon`) porque la API pública de Kolors está cerrada (`api_name=False`, `api_open=False`).
   - Descarga foto base + prenda, genera el montaje, lo sube a Cloudinary y crea el look en MySQL.
   - Errores 503 con mensaje claro de cola/cuota de ZeroGPU e identificación de proveedores.
   - `export const runtime = "nodejs"` y `maxDuration = 300`.

### Fase 4 — Seguridad y cierre

9. [x] [OpenCode] `.gitignore` incluye `.env*` y `.env.local` (verificado con `git check-ignore`).
10. [x] [OpenCode] Verificación final y actualización de `TASKS.md` y `progress.md`.

---

## Verificación final (evidencia)

| Comprobación | Resultado |
|---|---|
| `npx tsc --noEmit` | 0 errores |
| `npm run lint` | 0 errores, 0 warnings |
| `npm run build` | Exitoso (Next.js 16.4.6, Turbopack, 17 rutas) |
| `GET /`, `/catalogo`, `/prendas/nueva`, `/probador`, `/usuario` | HTTP 200 |
| `GET /api/usuarios`, `/api/prendas`, `/api/looks` | HTTP 200 |
| `POST /api/probador` con body inválido | HTTP 400 con validación clara |
| Gradio `yisol/IDM-VTON` `/tryon` con imágenes de ejemplo | Imagen real devuelta en ~21 s |
| E2E completo (foto base → Cloudinary → usuario → prenda → probador → montaje → MySQL) | OK: subida y prenda en Cloudinary, montaje IDM-VTON en 18 s, descarga `image/jpeg` 46 KB, limpieza total sin residuos |
| `cloudinary.api.ping()` | `{"status":"ok"}` con `cloud_name: xrtf9mzi` |
| Base de datos y Cloudinary tras el E2E | 0 prendas y 0 looks temporales; 0 assets en `armariovirtual/_verificacion`, `prendas` y `probador/montajes` |
| `.env.local` ignorado por Git | Sí (`ARMARIO/armariovirtual/.gitignore:35`) |

### Cloudinary (resuelto)

- El error `Invalid cloud_name armario (HTTP 401)` se debía a un `CLOUDINARY_CLOUD_NAME` que no correspondía a la API key/secret.
- Tras corregir la variable, `cloudinary.api.ping()` responde OK y las subidas reales funcionan en `/api/subida`, `/api/prendas` y `/api/probador`.
- El pipeline del probador comprueba los endpoints del Space antes de invocar Kolors (API cerrada) y usa `yisol/IDM-VTON` como respaldo, sin trazas de error en el log.

---

## Mejoras multi-usuario, subida dual y micro-interacciones (2026-11-16)

### 1) Autenticación multi-usuario (nombre + contraseña)

- [x] [OpenCode] Migración idempotente `scripts/migrate-auth.mjs`: `usuarios.password_hash VARCHAR(255)`, `usuarios.email` nullable, índice `UNIQUE uq_usuarios_nombre`, `prendas.color VARCHAR(30)` y tabla `sesiones`. Sin borrar datos existentes (1 usuario y 1 prenda conservados).
- [x] [OpenCode] `scripts/setup-db.mjs` actualizado para instalaciones nuevas con el mismo esquema.
- [x] [OpenCode] Contraseñas con `crypto.scryptSync` nativo (sal aleatoria de 16 bytes, hash de 64 bytes, comparación en tiempo constante). Sin dependencias nuevas (`bcryptjs` no instalado).
- [x] [OpenCode] `src/lib/auth.ts`: cookie `armario_session` HttpOnly, SameSite=Lax, expiración 30 días; en MySQL solo se guarda el SHA-256 del token. Helpers `hashPassword`, `verifyPassword`, `createSession`, `destroySession`, `getCurrentUser` y `requireUser`.
- [x] [OpenCode] Endpoints `POST /api/auth/register`, `POST /api/auth/login` y `POST /api/auth/logout` con validación de nombre (3–30), contraseña (6–72), 409 en duplicados y mensaje genérico en credenciales incorrectas.
- [x] [OpenCode] Aislamiento por `usuario_id` de la sesión en `/`, `/catalogo`, `/prendas/nueva`, `/prendas/[id]`, `/probador` y `/usuario`; páginas sin sesión redirigen a `/login`.
- [x] [OpenCode] APIs scoped por sesión: prendas (listar, ver, editar, borrar, eliminar fondo), looks (listar, ver, editar, borrar, montaje), probador, usuarios y subida. El `usuario_id` enviado por el cliente se ignora.
- [x] [OpenCode] UI `/login` mobile-first con pestañas Iniciar sesión / Crear cuenta, mostrar/ocultar contraseña y redirección si ya hay sesión. Navbar con nombre del usuario, menú móvil y botón de cerrar sesión.

### 2) Subida dual en "Nueva Prenda" (cámara + galería)

- [x] [OpenCode] `FormNuevaPrenda.tsx` con dos botones grandes: cámara (`capture="environment"`) y galería/archivos (sin `capture`).
- [x] [OpenCode] Ambos inputs actualizan el mismo estado, muestran vista previa con opción de quitar/repetir y permiten nombre, descripción, categoría y color antes de guardar.
- [x] [OpenCode] El color se valida en servidor (`src/lib/prenda-validation.ts`), se guarda en `prendas.color` y se muestra en catálogo y detalle.

### 3) Micro-interacciones y feedback táctil

- [x] [OpenCode] Botones globales con `active:scale-[0.97] transition-all duration-150 cursor-pointer` y estado deshabilitado sin efecto de pulsación.
- [x] [OpenCode] Filtros de `/catalogo` con fondo sólido, texto contrastado y sombra en el activo; inactivos con `hover` y `active:scale-95`.
- [x] [OpenCode] Selección del probador con `ring-2 ring-primary border-primary`, fondo realzado y badge `✓ Seleccionada`; tarjetas del catálogo con feedback de elevación, sombra e imagen.
- [x] [OpenCode] Tokens de tema (`primary`, `muted`, `accent`, `input`, `ring`, etc.) definidos en `globals.css` y utilidad `scrollbar-hide`.

### Verificación de las 3 mejoras

| Comprobación | Resultado |
|---|---|
| `node scripts/migrate-auth.mjs` | OK: columnas, índice UNIQUE y tabla `sesiones`; 1 usuario y 1 prenda conservados |
| `npx tsc --noEmit` | 0 errores |
| `npm run lint` | 0 errores, 0 warnings |
| `npm run build` | Exitoso (21 rutas, incluidas `/login` y `/api/auth/*`) |
| E2E autenticación con 2 usuarios | `E2E AUTH COMPLETO OK`: 20 comprobaciones |
| Contraseñas en BD | Prefijo `scrypt$`, sin contraseña en claro |
| Sesiones en BD | `token_hash` SHA-256 hex; la cookie no contiene el hash |
| Cookie de sesión | HttpOnly, SameSite=Lax, Path=/ |
| Aislamiento A/B | B no ve ni edita/borra prendas, looks ni usuario de A (404/403) |
| `usuario_id` adulterado en `POST /api/prendas` | Ignorado; la prenda queda en el usuario de la sesión |
| Probador con prenda ajena | 404 antes de comprobar la foto base |
| Probador propio | IDM-VTON en 28 s; montaje en Cloudinary y look en MySQL |
| Logout / login | Logout invalida la cookie (401 después); login correcto la renueva |
| Limpieza final | 1 usuario, 1 prenda, 2 looks, 0 sesiones; 3 assets temporales borrados de Cloudinary |

---

## Mejoras por fases A–F (plan inspirado en `wardrowbe`, 2026-11-16)

> Referencia consultada: `https://github.com/Anyesh/wardrowbe` (clon temporal en la carpeta temporal, eliminado al terminar). Se adaptaron sus patrones de UI (grid de selección con overlay de check, chips de ocasión, toggle de vista, widget de clima) al stack propio: Tailwind, español, MySQL/Aiven, Cloudinary y `getCurrentUser()`.

### Fase A — Metadatos de prendas y filtros avanzados
- [x] [OpenCode] `scripts/migrate-wardrowbe-fase-a.mjs` (idempotente, consulta `INFORMATION_SCHEMA` antes de cada `ALTER TABLE`): `prendas.temporada`, `ocasion`, `patron`, `estado`, `veces_usada`, `precio` + índices `idx_prendas_temporada|ocasion|estado`. Ejecutada en Aiven sin borrar datos (1 prenda conservada).
- [x] [OpenCode] `src/lib/db/types.ts`: enums `Temporada`, `Ocasion`, `Patron`, `EstadoPrenda`, `SlotLook`, `RegistroUso`, `PrendaDeLook`, `LookPrendaInput` y campos nuevos en `Prenda`/`Look`.
- [x] [OpenCode] `src/lib/prenda-metadata.ts`: enums, etiquetas y validadores compartidos entre cliente y servidor (`validarTemporada`, `validarOcasion`, `validarPatron`, `validarEstado`, `validarPrecio`).
- [x] [OpenCode] `src/lib/db/client.ts`: mapeadores MySQL (`DECIMAL`→`number`, `TINYINT`→`boolean`), `withTransaction`, `findByUsuarioConFiltros` (filtros parametrizados, `LIKE` escapado, `LIMIT` saneado), `buscar`, `contarPorCategoria`, `contarPorTemporada`, `findTopUsadas`, `findOlvidadas`, `countParaLavar`.
- [x] [OpenCode] `src/components/prendas/MetadatosPrenda.tsx` (pills táctiles de temporada/ocasión/patrón + precio) integrado en `FormNuevaPrenda.tsx` y validado en `POST /api/prendas`.
- [x] [OpenCode] `src/components/catalogo/FiltrosAvanzados.tsx` (pills de temporada, ocasión, estado y patrón; enlaces que preservan el resto de filtros) integrado en `app/catalogo/page.tsx` y en `GET /api/prendas`.

### Fase B — Seguimiento de uso y estado de limpieza
- [x] [OpenCode] `scripts/migrate-wardrowbe-fase-b.mjs` (idempotente): tabla `registros_uso` (`id`, `usuario_id`, `prenda_id` NULL, `look_id` NULL, `usado_en`, `created_at`) con FKs `ON DELETE CASCADE/SET NULL` e índices por usuario/fecha, prenda y look. Ejecutada en Aiven.
- [x] [OpenCode] `RegistroUsoModel` en `src/lib/db/client.ts` (`registrarPrenda`, `registrarLook`, `listByUsuario`) con incrementos de `veces_usada` dentro de la misma transacción.
- [x] [OpenCode] Endpoints protegidos por sesión y con comprobación de propiedad (404): `POST /api/prendas/[id]/usar`, `PATCH /api/prendas/[id]/estado`, `POST /api/looks/[id]/usar`.
- [x] [OpenCode] `src/components/prendas/MarcarUsadaHoy.tsx` y `src/components/prendas/ToggleEstado.tsx` (spinner, confirmación verde, `active:scale-[0.97]`) integrados en el detalle de prenda, las tarjetas del catálogo (`src/components/catalogo/TarjetaPrenda.tsx`) y el flujo de éxito de `PruebaVirtual.tsx`.
- [x] [OpenCode] Badge discreto de prendas `para_lavar` en el `Navbar` (datos del servidor vía `PrendaModel.countParaLavar`).

### Fase C — Dashboard de estadísticas (`/estadisticas`)
- [x] [OpenCode] `src/lib/estadisticas.ts` + `GET /api/estadisticas`: `total_prendas`, `prendas_por_categoria`, `prendas_por_temporada`, `top_usadas` (5), `olvidadas` (sin uso en 30 días o nunca usadas), `para_lavar` y `total_looks`, todo filtrado por `usuario_id`.
- [x] [OpenCode] `app/estadisticas/page.tsx` (Server Component) con `TarjetaMetrica.tsx`, `GraficoBarras.tsx` (barras CSS/Tailwind puras) y `ListaPrendasOlvidadas.tsx`, más enlace en el `Navbar`.

### Fase D — Constructor visual de looks / collage
- [x] [OpenCode] `scripts/migrate-wardrowbe-fase-d.mjs` (idempotente): `look_prendas.slot`/`posicion`, `looks.collage_url`/`ocasion`/`descripcion`/`es_favorito` e índice `idx_looks_favorito`. Ejecutada en Aiven (2 looks conservados).
- [x] [OpenCode] `sharp` instalado (`^0.35.5`) y `src/lib/collage.ts` con descarga remota con timeout/límite de tamaño y composición 2x2 de 1000×1000.
- [x] [OpenCode] `POST /api/looks/collage`: valida 1–4 prendas del usuario, genera el collage, lo sube a Cloudinary (`armariovirtual/collages`), crea el look con sus slots en transacción y actualiza `looks.collage_url`.
- [x] [OpenCode] `app/looks/nuevo/page.tsx`, `app/looks/[id]/page.tsx`, `app/looks/page.tsx`, `src/components/looks/ConstructorLook.tsx` (selección táctil por slots con sugerencia por categoría), `src/components/looks/CollageLook.tsx` y `src/components/looks/UsarLookHoy.tsx`. Constructor enlazado desde `/catalogo` y `/`.

### Fase E — Búsqueda global y toggle de vista
- [x] [OpenCode] `GET /api/buscar` (`q`, `color`, `temporada`, `ocasion`; `LIKE` escapado y parametrizado; 400 en enums inválidos).
- [x] [OpenCode] `src/components/catalogo/BuscadorCatalogo.tsx` con debounce de 300 ms, spinner y resultados en desplegable; `src/components/catalogo/ToggleVistaGaleria.tsx` + `CatalogoPrendas.tsx` alternan cuadrícula/lista con persistencia en `localStorage` (`armariovirtual:vista-catalogo`).
- [x] [OpenCode] Badges de temporada/ocasión/estado en las tarjetas del catálogo y soporte de `q`/`color` en la página de catálogo.

### Fase F — Sugerencias por clima
- [x] [OpenCode] `GET /api/clima?lat=&lon=`: Open-Meteo sin API key, timeout de 8 s y fallback por defecto a Manizales (`lat=5.07&lon=-75.52`).
- [x] [OpenCode] `src/lib/clima.ts` mapea temperatura/lluvia a temporada y ocasión sugeridas; `src/components/clima/SugerenciaClima.tsx` (geolocalización opcional, skeleton, error con reintento) integrado en `app/page.tsx`.

### Verificación de las Fases A–F

| Comprobación | Resultado |
|---|---|
| `node scripts/migrate-wardrowbe-fase-a.mjs` | OK: 6 columnas + 3 índices; 1 prenda conservada |
| `node scripts/migrate-wardrowbe-fase-b.mjs` | OK: tabla `registros_uso` con FKs e índices |
| `node scripts/migrate-wardrowbe-fase-d.mjs` | OK: `slot`, `posicion`, `collage_url`, `ocasion`, `descripcion`, `es_favorito`; 2 looks conservados |
| `npx tsc --noEmit` | 0 errores |
| `npm run lint` | 0 errores, 0 warnings |
| `npm run build` | Exitoso (Next.js 16.4.6, Turbopack, 31 rutas) |
| E2E real con usuarios A/B | `RESULTADO: 40 PASS, 0 FALLA` (metadatos, filtros, uso, estado, collage real en Cloudinary, estadísticas, búsqueda, clima, 401 sin sesión y 404 de recursos ajenos) |
| Aislamiento A/B | B no ve prendas/looks de A; no puede usar, cambiar estado ni crear looks con recursos ajenos (404) |
| Limpieza final | 1 usuario, 1 prenda, 2 looks, 0 sesiones, 0 registros de uso; assets temporales de Cloudinary eliminados |

---

## Ciclo UX mobile + corrección de bugs (2026-11-16, Fases 1–5)

> Objetivo: elevar la experiencia visual/móvil al nivel de una app de moda (Indyx/Acloset/Zara) y corregir los 5 bugs técnicos de la auditoría, manteniendo Next.js 16 App Router, TypeScript, Tailwind, MySQL/Aiven, Cloudinary, IDM-VTON y la autenticación por cookies con `requireUser()`/`getCurrentUser()`. Aislamiento estricto por `usuario_id` de sesión en toda consulta y mutación.

### Fase 1 — Bugs críticos y lógica técnica

- [x] [OpenCode] `src/components/prendas/AccionesPrenda.tsx`: **Editar prenda** (modal con `MetadatosPrenda`), **Eliminar prenda** (confirmación → `DELETE /api/prendas/[id]` → toast → `/catalogo`) y **Reintentar recorte IA** (`POST /api/prendas/[id]/eliminar-fondo`), todo con estados de carga y feedback táctil.
- [x] [OpenCode] `PUT /api/prendas/[id]` extendido a `temporada`, `ocasion`, `patron`, `estado` y `precio` usando los validadores compartidos de `src/lib/prenda-metadata.ts` (400 en valores inválidos).
- [x] [OpenCode] `src/components/looks/AccionesLook.tsx`: **Eliminar look** con confirmación (`DELETE /api/looks/[id]`) y aislamiento por sesión (404 si el look es de otro usuario).
- [x] [OpenCode] `src/lib/collage.ts` reescrito: layouts adaptativos según cantidad de prendas (**1** centrada, **2** columnas, **3** principal + 2 apiladas, **4** cuadrícula 2×2) sobre fondo editorial `#FAFAFA`, con `fit: inside` y centrado por metadatos de `sharp` (fin de los bloques grises vacíos).
- [x] [OpenCode] `src/components/clima/SugerenciaClima.tsx`: helper `obtenerCoordenadas()` (permiso/timeout → `null`) y **una sola** llamada a `/api/clima`; se eliminó el fallback que sobrescribía el resultado con coordenadas reales.
- [x] [OpenCode] `src/components/estadisticas/GraficoBarras.tsx`: soporte de `href` por dato; `/estadisticas` enlaza cada categoría con `/catalogo?categoria=<id>`.

### Fase 2 — Estética editorial mobile-first y navegación inferior

- [x] [OpenCode] `src/components/ui/ToastProvider.tsx`: contexto global (`useToast`) con variantes, acción opcional y animación propia `toast-enter` (sin `tailwindcss-animate`); montado en `app/layout.tsx`.
- [x] [OpenCode] `src/components/layout/MobileBottomNav.tsx`: 5 accesos para el pulgar (**Inicio**, **Armario**, **Subir** FAB central, **Looks** con popover “Mis looks / Probador IA”, **Perfil** con badge de prendas para lavar), translúcida (`backdrop-blur bg-white/90 border-t`) y `sm:hidden`.
- [x] [OpenCode] Navbar móvil simplificado (“Armario”) y layout con `pt-14 sm:pt-16` + `main pb-24 sm:pb-8` para que la barra inferior no tape contenido.
- [x] [OpenCode] `src/components/onboarding/GuiaInicio.tsx`: guía editorial de 3 pasos (“Sube tu foto base”, “Digitaliza tus primeras 3 prendas”, “Prueba tu primer outfit”) en `/` cuando hay 0 prendas o falta `foto_base_url`.
- [x] [OpenCode] Toasts integrados en las acciones clave: subir prenda, marcar usada, enviar a lavar/marcar limpia, favoritos, crear look, usar look, eliminar prenda y eliminar look.

### Fase 3 — Catálogo limpio, bottom sheet de filtros y favoritos

- [x] [OpenCode] `app/api/favoritos/route.ts`: `GET` (ids), `POST` (marcar) y `DELETE` (quitar) con `getCurrentUser()` y validación de que la prenda pertenece al usuario de la sesión (404 si no).
- [x] [OpenCode] `FiltrosPrenda.soloFavoritos` + `construirFiltros()` con `EXISTS` sobre `favoritos` ligado al `usuario_id` de la sesión; `GET /api/prendas?favoritos=1` y `/catalogo?favoritos=1`.
- [x] [OpenCode] `src/components/catalogo/TarjetaPrenda.tsx`: tarjeta editorial con foto `aspect-[3/4]`, fondo `#F6F6F4`, esquinas redondeadas, título y categoría/color discretos, **corazón de favorito optimista** y acciones agrupadas en un menú contextual `...` (Usar hoy / Enviar a lavar / Ver detalle).
- [x] [OpenCode] `src/components/catalogo/FiltrosBottomSheet.tsx`: pill **“Filtros”** con contador de filtros activos que abre un cajón inferior (`sheet-enter`) con temporada, ocasión, estado, patrón y “Solo favoritos”; en escritorio los filtros siguen en línea.
- [x] [OpenCode] `src/components/catalogo/CatalogoPrendas.tsx`: estado de favoritos con actualización optimista y reversión ante error, filtro por favoritos en vivo y etiquetas de categoría.

### Fase 4 — Polling de fondo IA y flujo de subida

- [x] [OpenCode] `src/lib/recorte-fondo.ts` (reglas puras) + `src/hooks/useRecorteFondo.ts`: polling de `GET /api/prendas/[id]` **cada 4 s, máximo 6 intentos**, solo si `imagen_sin_fondo_url === null` y la prenda se creó hace menos de 2 minutos; la imagen se actualiza en pantalla sin recargar.
- [x] [OpenCode] Indicador pulsante “Recortando fondo con IA...” en la tarjeta del catálogo (`TarjetaPrenda.tsx`) y en el detalle (`src/components/prendas/ImagenPrendaDetalle.tsx`).
- [x] [OpenCode] `src/components/prendas/FormNuevaPrenda.tsx`: tras guardar, toast de confirmación con acción rápida **“Añadir otra”** y redirección automática a `/catalogo`.
- [x] [OpenCode] `src/components/looks/AccionesLook.tsx`: **Descargar** (blob con fallback a pestaña nueva) y **Compartir** (`navigator.share` con copia al portapapeles como respaldo) del collage/montaje.

### Fase 5 — Verificación y cierre

| Comprobación | Resultado |
|---|---|
| `npx tsc --noEmit` | 0 errores |
| `npm run lint` | 0 errores, 0 warnings |
| `npm run build` | Exitoso (Next.js 16.4.6, Turbopack, 36 rutas) |
| E2E real con usuarios A/B | `RESULTADO: 76 PASS, 0 FALLA` |
| Favoritos | `POST`/`GET`/`DELETE /api/favoritos` OK; `?favoritos=1` filtra; B no puede marcar la prenda de A (404) |
| Aislamiento A/B | B no ve, no edita, no borra prendas/looks de A (404 en todos los casos) |
| Collages 1/2/3/4 prendas | Lienzo 1000×1000, fondo `#FAFAFA` en las esquinas y **todas** las celdas con contenido (sin bloques vacíos) |
| Poll de recorte IA | Reglas verificadas: 4 s de intervalo, 6 intentos máximos y ventana de 2 minutos |
| Clima | Una sola llamada a `/api/clima` por carga (verificado en el código y contra la API) |
| UI renderizada | `/catalogo` (pill Filtros, fila de categorías, bottom nav, toasts, `aspect-[3/4]`), `/prendas/[id]` (Editar/Eliminar/Reintentar), `/looks/[id]` (Descargar/Compartir/Eliminar), `/` con y sin onboarding, `/estadisticas` con enlaces `?categoria=` |
| Limpieza | Usuarios de prueba y 13 assets temporales eliminados; BD sin residuos del E2E y sin assets huérfanos en Cloudinary |
| Scripts temporales | `_tmp-e2e-ux.mjs`, `_tmp-estado.mjs` y `_tmp-assets.mjs` eliminados |

---

### Progreso por módulo
| Módulo | Estado | Comentario |
|--------|--------|------------|
| 1 — Base de datos | Completado | Esquema en Aiven, 6 tablas, 6 categorías, 1 usuario, consultas parametrizadas verificadas |
| 2 — Maquetación y UI | Completado | Navbar, inicio, catálogo con filtros, detalle, probador con skeletons, perfil con subida real |
| 3 — API e imágenes | Completado | Cloudinary SDK, CRUD de usuarios/prendas/looks, subida FormData y montaje verificados con E2E real |
| 4 — IA (Hugging Face) | Completado | Cliente HF con reintentos 503, eliminación de fondo, probador con Kolors + respaldo IDM-VTON verificado |
| 5 — Verificación y cierre | Completado | tsc 0, lint 0, build OK, páginas/endpoints 200, Gradio verificado |

### Notas
- Las claves secretas de `.env.local` no se registran aquí ni en ningún log.
- `[OpenCode]` marca el seguimiento de tareas requerido por AGENTS.md.

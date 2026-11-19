# progress.md — armariovirtual

## Estado actual
Proyecto completo a nivel de código y verificado técnicamente. Los 10 bugs críticos de la auditoría están corregidos, las 4 fases del ciclo inicial están finalizadas y el ciclo de pulido UX mobile (Fases 1–5) está implementado y verificado:
- Fase 1 — Next.js 16, imágenes y base de datos: completada
- Fase 2 — Formularios interactivos (Client Components reales): completada
- Fase 3 — Pipeline de IA (Hugging Face + probador virtual): completada
- Fase 4 — Seguridad y cierre: completada
- Ciclo UX mobile (Fases 1–5: bugs → estética/bottom nav → catálogo/filtros/favoritos → polling/subida/compartir → verificación): completada

**Ciclo UX mobile verificado (2026-11-16):** se corrigieron los 5 bugs técnicos (eliminar/editar prenda y look, collage adaptativo 1/2/3/4 prendas sobre `#FAFAFA`, doble fetch del clima y barras de estadísticas navegables) y se añadió la capa editorial móvil: bottom nav de 5 accesos, toasts globales, onboarding de 3 pasos, tarjetas `aspect-[3/4]` con favorito optimista y menú contextual, bottom sheet de filtros con contador, polling del recorte IA (4 s × 6 intentos), flujo post-subida con “Añadir otra” y botones de descargar/compartir del look. El E2E real con dos usuarios pasó **76/76 comprobaciones** (incluye análisis píxel a píxel de los 4 collages) y la limpieza dejó la BD y Cloudinary sin residuos del test.

**Cloudinary y flujo E2E verificados (2026-11-16):** el cloud `xrtf9mzi` responde `api.ping()` OK. Se ejecutó el flujo real completo (subida de foto base → usuario → prenda → probador virtual → montaje en Cloudinary → MySQL) y terminó con `E2E COMPLETO OK`, con limpieza total de datos y assets temporales.

**Mejoras multi-usuario verificadas (2026-11-16):** autenticación con nombre + contraseña (scrypt), sesiones en MySQL con token hasheado en cookie HttpOnly, aislamiento de todos los datos por `usuario_id`, subida dual cámara/galería y micro-interacciones táctiles. El E2E con dos usuarios pasó 20/20 comprobaciones, IDM-VTON generó un montaje real en 28 s y la limpieza devolvió la BD a 1 usuario, 1 prenda, 2 looks y 0 sesiones.

**Fases A–F (wardrowbe) verificadas (2026-11-16):** metadatos y filtros avanzados (A), wear tracking y estado de limpieza (B), dashboard de estadísticas (C), constructor de looks con collage 2x2 generado con `sharp` y subido a Cloudinary (D), búsqueda global con debounce de 300 ms y toggle de vista persistido (E) y sugerencias por clima con Open-Meteo y fallback a Manizales (F). Las tres migraciones idempotentes se ejecutaron en Aiven sin borrar datos y el E2E real con dos usuarios pasó 40/40 comprobaciones, con limpieza total (1 usuario, 1 prenda, 2 looks, 0 sesiones, 0 registros de uso, 0 assets huérfanos).

## Tareas completadas

### Módulos originales
- [x] Leer AGENTS.md del proyecto (Next.js App Router, MySQL, Cloudinary, Hugging Face)
- [x] Verificar variables de entorno en `.env.local` sin imprimir secretos (`scripts/verify-env.mjs`)
- [x] Crear `TASKS.md` con estructura de 5 módulos y `opencode.json` en modo autónomo
- [x] Módulo 1 — Base de datos:
    - [x] Esquema en Aiven: 6 tablas (`usuarios`, `categorias`, `prendas`, `looks`, `look_prendas`, `favoritos`)
    - [x] Seed: 6 categorías + 1 usuario por defecto
    - [x] Cliente MySQL con consultas parametrizadas (`src/lib/db/client.ts`) y tipos (`src/lib/db/types.ts`)
    - [x] Conexión y consultas verificadas
- [x] Módulo 2 — Maquetación y UI:
    - [x] Navbar móvil, inicio, catálogo con filtros, detalle de prenda, probador y perfil
    - [x] Formulario real de nueva prenda con cámara (`capture="environment"`) y vista previa
    - [x] Subida real de foto base con `onChange`, Cloudinary y `router.refresh()`
    - [x] Componentes UI compartidos y estados de carga (skeletons/spinners)
    - [x] Lecturas con Server Components desde `src/lib/db/client.ts`
- [x] Módulo 3 — API e imágenes:
    - [x] SDK de Cloudinary (`src/lib/cloudinary.ts`) con validación de variables y errores claros
    - [x] CRUD de usuarios, prendas y looks con consultas parametrizadas
    - [x] Subida `FormData` → Cloudinary → solo URL en MySQL
    - [x] Endpoint de montaje del probador
- [x] Módulo 4 — IA (Hugging Face):
    - [x] `hfInference` con reintentos 503, soporte `Buffer`/`Blob`/`ArrayBuffer`/`Uint8Array`, `x-wait-for-model` y retorno correcto en errores 4xx
    - [x] Eliminación de fondo con `briaai/RMBG-1.4` (helper compartido `src/lib/bg-removal.ts`)
    - [x] Probador virtual con `@gradio/client`: Kolors como motor principal y `yisol/IDM-VTON` como respaldo funcional
    - [x] Subida del montaje a Cloudinary y creación del look en MySQL
    - [x] Manejo claro de cola/cuota de ZeroGPU (HTTP 503 con detalle por proveedor)
- [x] Módulo 5 — Verificación y cierre:
    - [x] `npx tsc --noEmit`: 0 errores
    - [x] `npm run lint`: 0 errores, 0 warnings
    - [x] `npm run build`: exitoso (Turbopack)
    - [x] Páginas y endpoints críticos respondiendo 200
    - [x] Gradio IDM-VTON verificado con imagen real

### Correcciones de la auditoría
- [x] `next.config.ts`: `images.remotePatterns` para Cloudinary y `serverActions.bodySizeLimit: "15mb"`
- [x] `searchParams`/`params` tipados como `Promise` y resueltos con `await`
- [x] 3 `<Image>` del probador con `fill` + `sizes` y contenedores `relative`
- [x] `parseDatabaseUrl` con `new URL()` y `decodeURIComponent`
- [x] `FormNuevaPrenda.tsx` con estado, `FormData`, spinner y mensajes
- [x] `SubirFotoBase.tsx` con subida, `PUT` del usuario y refresco
- [x] `hfInference` con soporte de `Buffer` y body nunca `null`
- [x] `/api/probador` con `@gradio/client`, token de Hugging Face, respaldo IDM-VTON y errores ZeroGPU
- [x] `.gitignore` con `.env*` y `.env.local` (verificado con `git check-ignore`)
- [x] Reporte final en `TASKS.md` y `progress.md`

### Mejoras multi-usuario, subida dual y micro-interacciones
- [x] Migración `scripts/migrate-auth.mjs` (idempotente): `password_hash`, `email` nullable, `UNIQUE uq_usuarios_nombre`, `prendas.color` y tabla `sesiones`; datos existentes conservados
- [x] `src/lib/auth.ts`: scrypt nativo, cookie HttpOnly `armario_session`, token SHA-256 en MySQL, `getCurrentUser()` y `requireUser()`
- [x] Endpoints `/api/auth/register`, `/api/auth/login`, `/api/auth/logout` con validación y mensajes seguros
- [x] Todas las páginas y APIs filtran por el `usuario_id` de la sesión; sin sesión redirigen a `/login` o devuelven 401
- [x] `/login` mobile-first con pestañas Iniciar sesión / Crear cuenta; Navbar con nombre y cierre de sesión
- [x] `FormNuevaPrenda` con cámara (`capture="environment"`) y galería (sin `capture`), mismo estado y preview, quitar/repetir foto, categoría, nombre y color
- [x] Micro-interacciones: botones con pulsación, filtros activos con contraste y sombra, tarjetas con feedback y prenda del probador con `ring-2 ring-primary` + badge `✓ Seleccionada`
- [x] E2E de autenticación con dos usuarios: 20/20 comprobaciones, IDM-VTON en 28 s y limpieza total

### Fases A–F (plan inspirado en `wardrowbe`)
- [x] Referencia `wardrowbe` clonada en carpeta temporal, inspeccionada (patrones de grid de selección, chips de ocasión, toggle de vista y widget de clima) y eliminada al terminar
- [x] Fase A — `scripts/migrate-wardrowbe-fase-a.mjs` (idempotente) ejecutada: `temporada`, `ocasion`, `patron`, `estado`, `veces_usada`, `precio` + 3 índices
- [x] Fase A — tipos, validadores compartidos (`src/lib/prenda-metadata.ts`), `PrendaModel` con filtros parametrizados, `MetadatosPrenda.tsx` en el formulario y `FiltrosAvanzados.tsx` en `/catalogo` y `GET /api/prendas`
- [x] Fase B — `scripts/migrate-wardrowbe-fase-b.mjs` (idempotente) ejecutada: tabla `registros_uso` con FKs e índices
- [x] Fase B — `RegistroUsoModel` y endpoints `POST /api/prendas/[id]/usar`, `PATCH /api/prendas/[id]/estado`, `POST /api/looks/[id]/usar` (404 si el recurso es de otro usuario)
- [x] Fase B — `MarcarUsadaHoy.tsx` y `ToggleEstado.tsx` en detalle, tarjetas y probador; badge `para_lavar` en el Navbar
- [x] Fase C — `src/lib/estadisticas.ts`, `GET /api/estadisticas` y página `/estadisticas` con `TarjetaMetrica.tsx`, `GraficoBarras.tsx` y `ListaPrendasOlvidadas.tsx`; enlace en el Navbar
- [x] Fase D — `scripts/migrate-wardrowbe-fase-d.mjs` (idempotente) ejecutada: `slot`/`posicion` en `look_prendas` y `collage_url`/`ocasion`/`descripcion`/`es_favorito` en `looks`
- [x] Fase D — `sharp` instalado, `src/lib/collage.ts` (composición 2x2 con timeout y límites) y `POST /api/looks/collage` (subida a `armariovirtual/collages`)
- [x] Fase D — `/looks`, `/looks/nuevo`, `/looks/[id]`, `ConstructorLook.tsx`, `CollageLook.tsx` y `UsarLookHoy.tsx`; constructor enlazado desde `/catalogo` y `/`
- [x] Fase E — `GET /api/buscar`, `BuscadorCatalogo.tsx` (debounce 300 ms) y `ToggleVistaGaleria.tsx` + `CatalogoPrendas.tsx` con persistencia en `localStorage`; badges de temporada/ocasión en las tarjetas
- [x] Fase F — `GET /api/clima` (Open-Meteo, fallback Manizales), `src/lib/clima.ts` y `SugerenciaClima.tsx` integrado en `app/page.tsx`
- [x] `scripts/setup-db.mjs` actualizado con el esquema completo (Fases A, B y D) para instalaciones nuevas
- [x] E2E real de las Fases A–F con dos usuarios: 40/40 comprobaciones, collage real en Cloudinary y limpieza total de datos y assets

### Ciclo UX mobile + corrección de bugs (Fases 1–5)
- [x] Fase 1 — `AccionesPrenda.tsx` (editar, eliminar con confirmación, reintentar recorte IA), `PUT /api/prendas/[id]` extendido a metadatos, `AccionesLook.tsx` (eliminar look), `src/lib/collage.ts` con layouts 1/2/3/4 sobre `#FAFAFA`, `SugerenciaClima.tsx` con una sola llamada a `/api/clima` y barras de estadísticas navegables a `/catalogo?categoria=<id>`
- [x] Fase 2 — `ToastProvider.tsx` global montado en `app/layout.tsx`, `MobileBottomNav.tsx` (Inicio/Armario/Subir/Looks/Perfil con badge de lavado), navbar móvil simplificado, `pb-24 sm:pb-8` en el layout y `GuiaInicio.tsx` con el onboarding de 3 pasos
- [x] Fase 3 — `app/api/favoritos/route.ts` (GET/POST/DELETE con sesión), `FiltrosPrenda.soloFavoritos` con `EXISTS` sobre `favoritos`, `TarjetaPrenda.tsx` editorial (`aspect-[3/4]`, fondo `#F6F6F4`, corazón optimista, menú `...`) y `FiltrosBottomSheet.tsx` con pill y contador
- [x] Fase 4 — `src/lib/recorte-fondo.ts` + `src/hooks/useRecorteFondo.ts` (4 s × 6 intentos, ventana de 2 min) aplicados en tarjeta y detalle (`ImagenPrendaDetalle.tsx`), toast + redirección a `/catalogo` con “Añadir otra” en `FormNuevaPrenda.tsx` y descarga/compartición del look en `AccionesLook.tsx`
- [x] Fase 5 — E2E real con dos usuarios: **76 PASS / 0 FALLA** (favoritos, aislamiento A/B, collages analizados píxel a píxel, onboarding, páginas y APIs), `tsc`/`lint`/`build` en verde (36 rutas) y limpieza de datos y assets

## Próximas tareas
1. [x] Corregir las credenciales de Cloudinary en `.env.local` (hecho por el usuario; cloud `xrtf9mzi` operativo).
2. [x] Ejecutar la prueba E2E completa de subida + prenda + probador + Cloudinary + MySQL.
3. [x] Implementar y verificar las Fases A–F del plan `wardrowbe` (metadatos, wear tracking, estadísticas, constructor de looks con collage, búsqueda global, clima).
4. Opcional: confirmar si se desea mantener Kolors como motor principal (su API pública está cerrada) o usar IDM-VTON directamente para ahorrar la comprobación inicial.
5. Opcional: revisar la cuota/cola de Hugging Face de `briaai/RMBG-1.4` cuando la eliminación de fondo tarde más de lo esperado; no bloquea el probador.
6. Opcional: permitir editar un look ya creado (reemplazar prendas/slots) reutilizando `LookModel.reemplazarPrendas`, que ya está implementado en el modelo.
7. Opcional: persistir la preferencia de vista del catálogo y el contador de filtros por usuario (hoy en `localStorage`/query string) y añadir “ordenar por” al bottom sheet.
8. Opcional: ofrecer favoritos también para looks (`looks.es_favorito` ya existe en la BD) con el mismo patrón optimista de `/api/favoritos`.

## Problemas conocidos
- La API pública de Kolors está cerrada (`api_name=False`, `api_open=False`). El código comprueba los endpoints del Space y usa `yisol/IDM-VTON` como respaldo real, sin trazas de error.
- La eliminación de fondo con `briaai/RMBG-1.4` puede tardar o quedar en cola si Hugging Face limita el modelo; el probador usa `imagen_url` mientras tanto y no se bloquea.
- `/api/categorias` no existe como route dedicada; las categorías se consultan desde Server Components con `CategoriaModel.findAll()` (consistente con AGENTS.md).

## Última verificación (2026-11-16)
- `npx tsc --noEmit`: 0 errores
- `npm run lint`: 0 errores, 0 warnings
- `npm run build`: exitoso (Next.js 16.4.6, Turbopack, 17 rutas)
- `cloudinary.api.ping()`: `{"status":"ok"}` con `cloud_name: xrtf9mzi`
- E2E completo real: `POST /api/subida` → foto base en Cloudinary; `PUT /api/usuarios/1`; `POST /api/prendas` → prenda en Cloudinary; `POST /api/probador` → IDM-VTON en 18 s → montaje en Cloudinary (descarga HTTP 200, `image/jpeg`, 46 KB) → look en MySQL. Resultado: `E2E COMPLETO OK`.
- Limpieza posterior: look y prenda eliminados (HTTP 204), foto base restaurada (HTTP 200), 3 assets borrados de Cloudinary (`ok`), 0 filas y 0 assets residuales.
- `GET /`, `/catalogo`, `/prendas/nueva`, `/probador`, `/usuario`: HTTP 200
- `GET /api/usuarios`, `/api/prendas`, `/api/looks`: HTTP 200
- `POST /api/probador` con body inválido: HTTP 400 con validación
- Gradio `yisol/IDM-VTON` `/tryon`: imagen real devuelta en ~18-21 s
- `git check-ignore`: `.env.local` ignorado por `.gitignore:35`

## Verificación de las mejoras (2026-11-16, segunda ronda)
- `node scripts/migrate-auth.mjs`: migración idempotente OK; 1 usuario y 1 prenda conservados
- `npx tsc --noEmit`: 0 errores
- `npm run lint`: 0 errores, 0 warnings
- `npm run build`: exitoso (21 rutas, incluidas `/login` y `/api/auth/*`)
- E2E autenticación (usuarios temporales A/B, contraseña `E2ePass!2026`):
    - Sin sesión: `/` → 307 a `/login`; `/api/prendas` → 401
    - `/login` muestra las pestañas Iniciar sesión y Crear cuenta
    - Contraseña corta → 400; nombre duplicado (case-insensitive) → 409
    - `password_hash` con prefijo `scrypt$`, sin contraseña en claro
    - `sesiones.token_hash` SHA-256 hex; cookie HttpOnly, SameSite=Lax, Path=/
    - `/api/usuarios` devuelve solo el usuario de la sesión y nunca `password_hash`
    - Aislamiento A/B: B no ve prendas ni looks de A; ver/editar/borrar prenda de A → 404; acceder al usuario A → 403
    - `usuario_id` adulterado en `POST /api/prendas` ignorado; la prenda pertenece a la sesión A y guarda color `#4f46e5`
    - Probador con prenda de A desde B → 404 (se comprueba la propiedad antes de la foto base)
    - Probador de A: IDM-VTON en 28 s, montaje en Cloudinary y look en MySQL
    - Logout → 204 y la cookie deja de valer (401); login correcto → 200 y nueva cookie
    - Home con sesión → 200; `/login` con sesión → redirección
    - Resultado: `E2E AUTH COMPLETO OK` (20 comprobaciones)
- Limpieza final: 1 usuario, 1 prenda, 2 looks, 0 sesiones; 3 assets temporales borrados de Cloudinary; sin huérfanos recientes en `armariovirtual/prendas`, `armariovirtual/probador` ni `armariovirtual/_verificacion`
- Servidor dev detenido y puerto 3000 liberado

## Verificación de las Fases A–F (2026-11-16)
- Migraciones idempotentes ejecutadas en Aiven: `migrate-wardrowbe-fase-a.mjs` (6 columnas + 3 índices), `migrate-wardrowbe-fase-b.mjs` (tabla `registros_uso`) y `migrate-wardrowbe-fase-d.mjs` (`slot`, `posicion`, `collage_url`, `ocasion`, `descripcion`, `es_favorito`)
- `npx tsc --noEmit`: 0 errores
- `npm run lint`: 0 errores, 0 warnings
- `npm run build`: exitoso (Next.js 16.4.6, Turbopack, 31 rutas)
- E2E real contra `next start` (usuarios temporales A y B):
    - Sin sesión: `/api/prendas`, `/api/estadisticas`, `/api/buscar` y `/api/clima` → 401
    - Fase A: `POST /api/prendas` guarda `temporada=verano`, `ocasion=casual`, `patron=rayas`, `precio=123.45`, `estado=limpia`, `veces_usada=0`; los filtros por temporada/estado devuelven solo lo esperado
    - Fase B: `POST /api/prendas/[id]/usar` → `veces_usada=1` + fila en `registros_uso`; `PATCH /api/prendas/[id]/estado` → `para_lavar`; estado inválido → 400
    - Fase C: `/api/estadisticas` de A = 1 prenda, 1 look, 1 para lavar, top 1, 0 olvidadas; de B = todo en cero
    - Fase D: `POST /api/looks/collage` → 201 con `collage_url` HTTPS en Cloudinary y `look_prendas` con `slot=superior`, `posicion=0`
    - Fase E: `/api/buscar?q=azul` encuentra la prenda de A, B no la ve; `temporada` inválida → 400; filtro por color correcto
    - Fase F: `/api/clima` y `/api/clima?lat=5.07&lon=-75.52` → 200 con temperatura, temporada y ocasión sugeridas
    - Páginas `/`, `/catalogo`, `/estadisticas`, `/looks`, `/looks/nuevo`, `/looks/[id]` y `/prendas/[id]` → HTTP 200 con sesión
    - Aislamiento: B no puede usar/cambiar estado de la prenda de A, ni crear/usar looks con recursos de A (404 en todos los casos)
    - Resultado: `RESULTADO: 40 PASS, 0 FALLA`
- Limpieza posterior: 0 usuarios de prueba, 0 huérfanos en `registros_uso`, `looks` ni `prendas`; assets creados durante la prueba borrados de Cloudinary (`armariovirtual/prendas`, `armariovirtual/collages`)
- Estado final de la BD: 1 usuario, 1 prenda, 2 looks, 0 sesiones, 0 registros de uso
- Clon temporal de `wardrowbe` y scripts temporales (`_tmp-inspect-fases.mjs`, `_tmp-e2e-fases.mjs`) eliminados

## Verificación del ciclo UX mobile (2026-11-16, Fases 1–5)
- `npx tsc --noEmit`: 0 errores
- `npm run lint`: 0 errores, 0 warnings
- `npm run build`: exitoso (Next.js 16.4.6, Turbopack, 36 rutas, incluidas `/api/favoritos`)
- E2E real contra `next start` en el puerto 3100 (usuarios temporales A y B, contraseña `E2ePass!2026`):
    - Reglas puras del polling: intervalo 4 s, 6 intentos máximos, ventana de 2 minutos y detección de prenda reciente
    - Clima: el `useEffect` hace **una sola** llamada a `consultar` (sin fallback que sobrescriba) y `/api/clima` responde 200 con y sin coordenadas
    - Sin sesión: `/api/prendas` y `/api/favoritos` → 401
    - Favoritos: `POST` → `{favorito:true}`, `GET` → ids, `DELETE` → `{favorito:false}`, `?favoritos=1` filtra en la API y en `/catalogo`; B no puede marcar la prenda de A (404) y no hereda sus favoritos
    - Edición de prenda: `PUT` guarda nombre, categoría, color, `temporada`, `ocasion`, `patron`, `estado` y `precio`; temporada inválida → 400; B no puede editar la prenda de A (404)
    - Collages con 1, 2, 3 y 4 prendas: 201 con `collage_url` HTTPS, lienzo 1000×1000, fondo `#FAFAFA` en las cuatro esquinas y todas las celdas con contenido (sin bloques grises vacíos)
    - Look: `DELETE` → 204, `GET` posterior → 404 y B no puede borrarlo (404)
    - UI renderizada: `/catalogo` (pill “Filtros”, fila de categorías, bottom nav móvil, contenedor de toasts, `aspect-[3/4]`), `/prendas/[id]` (Editar/Eliminar/Reintentar recorte IA), `/looks/[id]` (Descargar/Compartir/Eliminar look), `/` con onboarding para usuario sin foto base y **sin** onboarding cuando tiene prendas y foto base, `/estadisticas` con enlaces `/catalogo?categoria=`
    - Resultado: `RESULTADO: 76 PASS, 0 FALLA`
- Limpieza posterior: 2 usuarios de prueba eliminados, 13 assets temporales de Cloudinary destruidos (`armariovirtual/prendas`, `armariovirtual/prendas/sin-fondo`, `armariovirtual/collages`), sin huérfanos; la BD conserva los datos reales de los usuarios existentes
- Revisión final de la tarjeta (menú contextual movido fuera del `overflow-hidden` de la imagen): comprobación de render con `14 PASS, 0 FALLA` (tarjeta 3/4, menú `...`, corazón, pill “Filtros”, bottom nav, detalle con Editar/Eliminar y filtro por favoritos)
- Scripts temporales (`_tmp-e2e-ux.mjs`, `_tmp-estado.mjs`, `_tmp-assets.mjs`, `_tmp-ui-check.mjs`, `_tmp-purga.mjs`) eliminados y puerto 3100 liberado

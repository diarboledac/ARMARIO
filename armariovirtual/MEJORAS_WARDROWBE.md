# MEJORAS_WARDROWBE.md
## Especificaciones Técnicas — Mejoras inspiradas en wardrowbe para Armario Virtual
**Versión:** 1.0 | **Fecha:** 2026-11-16  
**Stack actual:** Next.js 16.4.6 · TypeScript · MySQL (Aiven) · Cloudinary · Hugging Face (IDM-VTON + RMBG-1.4) · Autenticación propia (scrypt + cookies HttpOnly)

---

## 0. Contexto: ¿Qué es wardrowbe?

[`Anyesh/wardrowbe`](https://github.com/Anyesh/wardrowbe) es una aplicación open-source de gestión de armario con IA. Su stack es **FastAPI (Python) + PostgreSQL + Redis + Next.js (frontend separado)** con autenticación OIDC. Sus características más valiosas son:

- **AI Auto-Tagging**: visión por computadora que extrae color, patrón, tipo, estilo y formalidad
- **Seguimiento de uso (wear tracking)**: contador de veces que se ha usado cada prenda
- **Sugerencias de outfit con clima**: integración con API de clima para recomendar prendas
- **Dashboard de estadísticas**: prendas más/menos usadas, coste por uso, prendas "olvidadas"
- **Filtros avanzados**: por color, temporada, ocasión, formalidad, patrón
- **Constructor de outfits visual**: colage/grid de prendas para componer looks manuales
- **Multi-usuario/familia**: perfiles separados en una misma instancia

---

## ⛔ Descartado explícitamente

Las siguientes características de wardrowbe **NO se migran** porque romperían nuestro stack:

| Característica | Razón para descartar |
|---|---|
| PostgreSQL / Alembic | Usamos MySQL (Aiven) — no migrar |
| Redis como cola de jobs | No tenemos infra Redis; usaremos procesamiento síncrono o diferido simple |
| OIDC / NextAuth / Authentik | Tenemos autenticación propia scrypt + cookies HttpOnly — funciona y es suficiente |
| FastAPI Python backend | Toda la lógica permanece en Next.js Route Handlers |
| Ollama / OpenAI para tagging | Usamos Hugging Face — mantener |
| Docker Compose de wardrowbe | No aplicable; ya tenemos nuestro propio despliegue |
| Notificaciones (ntfy / email) | Fuera de alcance de este proyecto ADSO |

---

## 1. Funcionalidades Rescatables de wardrowbe

### 🌟 Prioridad ALTA — Mayor impacto visual e inmediato

#### 1.1 Filtros Avanzados del Catálogo
**Qué hace wardrowbe:** permite filtrar prendas por color, temporada (`primavera/verano/otoño/invierno`), ocasión (`casual/formal/deporte/salida`) y estado (`limpia/para lavar`).  
**Adaptación:** añadir estos filtros a nuestro `/catalogo` que ya tiene filtro por categoría. Son campos nuevos en la tabla `prendas`.

#### 1.2 Seguimiento de Uso (Wear Tracking)
**Qué hace wardrowbe:** `wear_count` por prenda + log de fechas de uso. Permite ver prendas "olvidadas" (sin usar en 30 días) y las favoritas.  
**Adaptación:** tabla `registros_uso` + campo `veces_usada` en `prendas`. Botón "Marcar como usado hoy" en detalle de prenda y en el probador después de crear un look.

#### 1.3 Dashboard de Estadísticas del Armario
**Qué hace wardrowbe:** página `/analytics` con métricas de utilización, prendas más y menos usadas, ratio de uso del armario.  
**Adaptación:** página `/estadisticas` con:
- Total de prendas por categoría (gráfico de barras simple con CSS/SVG)
- Prendas más usadas (top 5)
- Prendas "olvidadas" (sin uso en más de 30 días)
- Resumen: X prendas, Y looks creados

#### 1.4 Metadatos Enriquecidos de Prenda (Tags IA / Manual)
**Qué hace wardrowbe:** extrae automáticamente color, patrón, temporada, formalidad y estilo.  
**Adaptación:** ya tenemos el campo `color`. Añadir `temporada`, `ocasion` y `patron` como enums en MySQL. El usuario los selecciona manualmente (sin coste de IA de visión) o podemos invocar RMBG-1.4 / LLaVA para auto-tagging futuro.

---

### 🌟 Prioridad MEDIA — Mejoran experiencia a corto plazo

#### 1.5 Constructor Visual de Outfits (Sin IA)
**Qué hace wardrowbe:** permite crear looks manualmente seleccionando prendas para "slots" (superior, inferior, calzado, accesorio) y genera una vista de colage/grid.  
**Adaptación:** página `/looks/nuevo` con:
- Grid de selección por slot (arriba, abajo, calzado, complemento)
- Vista previa en colage (4 thumbnails en cuadrícula)
- Guarda en `looks` + `look_prendas` (ya tenemos la tabla)
- Imagen de colage generada con `sharp` en el servidor (no necesita IA)

#### 1.6 Estado de Limpieza de Prenda
**Qué hace wardrowbe:** marca prendas como "para lavar" y filtra por ese estado.  
**Adaptación:** campo `estado ENUM('limpia','para_lavar')` en tabla `prendas`. Botón rápido en la tarjeta del catálogo. Contador en el navbar ("3 prendas para lavar").

#### 1.7 Vista de Galería vs Lista en Catálogo
**Qué hace wardrowbe:** toggle entre vista grid (tarjetas con imagen) y vista lista (filas compactas con más metadatos visibles).  
**Adaptación:** `localStorage` para preferencia del usuario. Client Component en `/catalogo` para el toggle.

---

### 🌟 Prioridad BAJA — Mejoras de largo plazo

#### 1.8 Sugerencias de Outfit por Clima (Weather API)
**Qué hace wardrowbe:** integra la API de Open-Meteo (gratuita) para sugerir prendas según temperatura y lluvia.  
**Adaptación:** Server Component en la home `/` que consulta Open-Meteo con geolocalización del usuario y sugiere categorías apropiadas. No requiere IA.

#### 1.9 "Informe de Huecos" (Gap Report)
**Qué hace wardrowbe:** indica cuántos looks completos se pueden armar para cada ocasión y qué pieza falta.  
**Adaptación:** lógica SQL en `/api/estadisticas` que agrupa las prendas por ocasión y detecta qué slots no tienen representación.

#### 1.10 Búsqueda Global por Color y Nombre
**Qué hace wardrowbe:** barra de búsqueda que filtra por nombre, color y tags simultáneamente.  
**Adaptación:** input de búsqueda en el navbar + endpoint `GET /api/prendas?q=...&color=...&temporada=...`.

---

## 2. Cambios Necesarios en Base de Datos (MySQL)

> **IMPORTANTE:** Todos los cambios son **aditivos** (`ALTER TABLE ... ADD COLUMN` o `CREATE TABLE`). Ninguna columna existente se modifica ni elimina. Los datos existentes se conservan.

### 2.1 Migraciones en `prendas`

```sql
-- Añadir metadatos de clasificación
ALTER TABLE prendas
  ADD COLUMN temporada   ENUM('primavera','verano','otono','invierno','todas') NOT NULL DEFAULT 'todas'       AFTER color,
  ADD COLUMN ocasion     ENUM('casual','formal','deporte','salida','trabajo','todas') NOT NULL DEFAULT 'todas' AFTER temporada,
  ADD COLUMN patron      ENUM('liso','rayas','cuadros','flores','geometrico','otro') NOT NULL DEFAULT 'liso'  AFTER ocasion,
  ADD COLUMN estado      ENUM('limpia','para_lavar') NOT NULL DEFAULT 'limpia'                                 AFTER patron,
  ADD COLUMN veces_usada INT UNSIGNED NOT NULL DEFAULT 0                                                       AFTER estado,
  ADD COLUMN precio      DECIMAL(8,2) NULL                                                                     AFTER veces_usada,
  ADD INDEX  idx_prendas_temporada (temporada),
  ADD INDEX  idx_prendas_ocasion   (ocasion),
  ADD INDEX  idx_prendas_estado    (estado);
```

### 2.2 Nueva Tabla: `registros_uso`

```sql
CREATE TABLE IF NOT EXISTS registros_uso (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT NOT NULL,
  prenda_id   INT NULL,          -- NULL si se registra un look completo
  look_id     INT NULL,          -- NULL si se registra solo una prenda
  usado_en    DATE NOT NULL DEFAULT (CURRENT_DATE),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (prenda_id)  REFERENCES prendas(id)  ON DELETE SET NULL,
  FOREIGN KEY (look_id)    REFERENCES looks(id)     ON DELETE SET NULL,
  INDEX idx_uso_usuario   (usuario_id),
  INDEX idx_uso_prenda    (prenda_id),
  INDEX idx_uso_fecha     (usado_en),
  CHECK (prenda_id IS NOT NULL OR look_id IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 2.3 Extender `look_prendas` con slots para constructor visual

```sql
-- Añadir slot y posición a la tabla look_prendas existente
ALTER TABLE look_prendas
  ADD COLUMN slot     ENUM('superior','inferior','calzado','complemento','completo') NOT NULL DEFAULT 'completo',
  ADD COLUMN posicion TINYINT UNSIGNED NOT NULL DEFAULT 0;
```

### 2.4 Extender tabla `looks` para el constructor visual y colage

```sql
ALTER TABLE looks
  ADD COLUMN collage_url  VARCHAR(500) NULL AFTER montaje_url,
  ADD COLUMN ocasion      ENUM('casual','formal','deporte','salida','trabajo','todas') NOT NULL DEFAULT 'todas' AFTER collage_url,
  ADD COLUMN descripcion  TEXT NULL AFTER ocasion,
  ADD COLUMN es_favorito  TINYINT(1) NOT NULL DEFAULT 0 AFTER descripcion;
```

### 2.5 Resumen de cambios por tabla

| Tabla | Acción | Columnas nuevas |
|---|---|---|
| `prendas` | `ALTER TABLE` | `temporada`, `ocasion`, `patron`, `estado`, `veces_usada`, `precio` |
| `looks` | `ALTER TABLE` | `collage_url`, `ocasion`, `descripcion`, `es_favorito` |
| `look_prendas` | `ALTER TABLE` | `slot`, `posicion` |
| `registros_uso` | `CREATE TABLE` | tabla nueva completa |

---

## 3. Nuevas Vistas, Componentes y Endpoints API

### 3.1 Nuevas páginas (rutas de Next.js)

| Ruta | Tipo | Descripción |
|---|---|---|
| `/estadisticas` | Server Component | Dashboard de analytics del armario |
| `/looks/nuevo` | Client Component | Constructor visual de outfits |
| `/looks/[id]` | Server Component | Detalle de un look con collage |
| `/buscar` | Client Component | Búsqueda global con filtros |

### 3.2 Componentes a crear o modificar

#### Nuevos Client Components

```
src/components/
├── catalogo/
│   ├── FiltrosAvanzados.tsx        ← filtros: temporada, ocasión, color, estado, patrón
│   ├── ToggleVistaGaleria.tsx      ← toggle grid/lista (localStorage)
│   └── BuscadorCatalogo.tsx        ← input de búsqueda live
├── prendas/
│   ├── MarcarUsadaHoy.tsx          ← botón "Marcar como usada hoy" + PUT /api/prendas/[id]
│   ├── ToggleEstado.tsx            ← botón "Para lavar" / "Limpia"
│   └── MetadatosPrenda.tsx         ← campos temporada/ocasión/patrón en FormNuevaPrenda
├── looks/
│   ├── ConstructorLook.tsx         ← constructor visual drag/click de slots
│   ├── CollageLook.tsx             ← 4 thumbnails en cuadrícula (CSS grid, sin IA)
│   └── MarcarLookUsado.tsx         ← botón "Usé este look hoy"
├── estadisticas/
│   ├── TarjetaMetrica.tsx          ← tarjeta genérica: número + etiqueta + icono
│   ├── GraficoBarras.tsx           ← barras CSS simples (sin librería externa)
│   ├── ListaPrendasOlvidadas.tsx   ← prendas sin uso en 30+ días
│   └── ResumenArmario.tsx          ← totales rápidos
└── home/
    └── SugerenciaClima.tsx         ← Server Component: consulta Open-Meteo + sugiere categorías
```

#### Modificaciones a componentes existentes

| Componente | Cambio |
|---|---|
| `FormNuevaPrenda.tsx` | Añadir selectores de `temporada`, `ocasion`, `patron`, campo `precio` (opcional) |
| `app/catalogo/page.tsx` | Pasar filtros al componente `FiltrosAvanzados`, integrar búsqueda |
| `app/prendas/[id]/page.tsx` | Mostrar `veces_usada`, `estado`, `temporada`, `ocasion`; botón "Marcar usada" |
| `src/components/probador/PruebaVirtual.tsx` | Botón "Registrar uso" al crear montaje exitoso |
| `src/components/layout/navbar.tsx` | Badge contador prendas "para lavar" |

### 3.3 Nuevos Endpoints API (Route Handlers)

#### `GET /api/prendas` — Ampliar filtros

```typescript
// Parámetros nuevos de query:
// ?temporada=verano&ocasion=casual&estado=limpia&color=%23ff0000&q=camisa&patron=rayas
```

#### `POST /api/prendas/[id]/usar`

```
POST /api/prendas/[id]/usar
Body: { "usado_en": "2026-11-16" }  // opcional, default hoy
Response: { prenda: {..., veces_usada: 5 }, registro_id: 42 }
```
- Incrementa `prendas.veces_usada`
- Inserta fila en `registros_uso`

#### `PATCH /api/prendas/[id]/estado`

```
PATCH /api/prendas/[id]/estado
Body: { "estado": "para_lavar" | "limpia" }
Response: { prenda: {...} }
```

#### `GET /api/estadisticas`

```
GET /api/estadisticas
Response: {
  total_prendas: number,
  prendas_por_categoria: [{ nombre, count }],
  prendas_por_temporada: [{ temporada, count }],
  top_usadas: [{ id, nombre, imagen_url, veces_usada }],
  olvidadas: [{ id, nombre, imagen_url, ultimo_uso: Date|null }],
  para_lavar: number,
  total_looks: number
}
```

#### `POST /api/looks/[id]/usar`

```
POST /api/looks/[id]/usar
Body: { "usado_en": "2026-11-16" }
Response: { look_id, registro_id }
```
- Inserta fila en `registros_uso` con `look_id`
- Incrementa `veces_usada` en cada prenda del look (via `look_prendas`)

#### `POST /api/looks/collage`

```
POST /api/looks/collage
Body: { "look_id": 5 }
Response: { collage_url: "https://res.cloudinary.com/..." }
```
- Descarga hasta 4 imágenes `imagen_sin_fondo_url || imagen_url` del look
- Genera collage 2×2 con `sharp` (npm package)
- Sube a Cloudinary en `armariovirtual/collages/`
- Actualiza `looks.collage_url`

#### `GET /api/clima` (Server-side proxy)

```
GET /api/clima?lat=4.71&lon=-74.07
Response: {
  temperatura: 18,
  lluvia: false,
  descripcion: "Nublado",
  sugerencias: ["chaquetas", "pantalones"]
}
```
- Proxy a Open-Meteo API (gratuita, sin API key)
- Mapea temperatura a categorías sugeridas

#### `GET /api/buscar`

```
GET /api/buscar?q=blusa&color=%234f46e5&temporada=verano&ocasion=casual
Response: { prendas: [...], looks: [...] }
```
- SQL `LIKE '%q%'` en `nombre` + `descripcion`
- Filtros por columnas exactas

---

## 4. Plan de Implementación por Fases

> Cada fase es independiente. Puede implementarse y verificarse por separado antes de continuar a la siguiente.

---

### FASE A — Metadatos y Filtros (Impacto inmediato, riesgo mínimo)
**Duración estimada:** 2–3 horas | **Prioridad:** ⭐⭐⭐⭐⭐

**Objetivo:** enriquecer las prendas con clasificación real y hacer el catálogo filtrable de verdad.

**Pasos:**
1. Crear `scripts/migrate-wardrowbe-fase-a.mjs` con los `ALTER TABLE prendas` (temporada, ocasion, patron, estado, veces_usada, precio)
2. Actualizar `src/lib/db/types.ts`: añadir los campos a la interfaz `Prenda`
3. Actualizar `src/lib/db/client.ts`: incluir las nuevas columnas en todos los `SELECT` de `PrendaModel`
4. Crear `src/components/prendas/MetadatosPrenda.tsx` (selectores para `FormNuevaPrenda.tsx`)
5. Crear `src/components/catalogo/FiltrosAvanzados.tsx` con pills de temporada + ocasión
6. Ampliar `GET /api/prendas` con los nuevos parámetros de query
7. Actualizar `app/catalogo/page.tsx` para leer y pasar los nuevos `searchParams`
8. Verificación: lint + tsc + build + test manual de filtros

**Archivos a crear/modificar:**
- `scripts/migrate-wardrowbe-fase-a.mjs` ← NUEVO
- `src/lib/db/types.ts` ← MODIFICAR (additive)
- `src/lib/db/client.ts` ← MODIFICAR (additive)
- `src/components/prendas/MetadatosPrenda.tsx` ← NUEVO
- `src/components/catalogo/FiltrosAvanzados.tsx` ← NUEVO
- `app/api/prendas/route.ts` ← MODIFICAR (ampliar GET)
- `app/catalogo/page.tsx` ← MODIFICAR (pasar filtros)

---

### FASE B — Seguimiento de Uso y Estado (Wear Tracking)
**Duración estimada:** 2–3 horas | **Prioridad:** ⭐⭐⭐⭐

**Objetivo:** saber qué prendas se usan y cuáles llevan semanas olvidadas.

**Pasos:**
1. Crear `scripts/migrate-wardrowbe-fase-b.mjs`: `CREATE TABLE registros_uso`
2. Actualizar `src/lib/db/types.ts`: interfaz `RegistroUso`
3. Actualizar `src/lib/db/client.ts`: `RegistroUsoModel` con `add()` y `listByUsuario()`
4. Crear `POST /api/prendas/[id]/usar` (incrementar `veces_usada` + insertar `registros_uso`)
5. Crear `PATCH /api/prendas/[id]/estado`
6. Crear `src/components/prendas/MarcarUsadaHoy.tsx` (Client Component, botón con confirmación)
7. Crear `src/components/prendas/ToggleEstado.tsx` (botón "Para lavar / Limpia")
8. Integrar ambos en `app/prendas/[id]/page.tsx`
9. Añadir badge de "X para lavar" en `src/components/layout/navbar.tsx`
10. Después de crear montaje exitoso en `PruebaVirtual.tsx`, llamar `POST /api/looks/[id]/usar`

**Archivos a crear/modificar:**
- `scripts/migrate-wardrowbe-fase-b.mjs` ← NUEVO
- `src/lib/db/types.ts` ← MODIFICAR
- `src/lib/db/client.ts` ← MODIFICAR
- `app/api/prendas/[id]/usar/route.ts` ← NUEVO
- `app/api/prendas/[id]/estado/route.ts` ← NUEVO
- `app/api/looks/[id]/usar/route.ts` ← NUEVO
- `src/components/prendas/MarcarUsadaHoy.tsx` ← NUEVO
- `src/components/prendas/ToggleEstado.tsx` ← NUEVO
- `app/prendas/[id]/page.tsx` ← MODIFICAR
- `src/components/layout/navbar.tsx` ← MODIFICAR
- `src/components/probador/PruebaVirtual.tsx` ← MODIFICAR

---

### FASE C — Dashboard de Estadísticas
**Duración estimada:** 2 horas | **Prioridad:** ⭐⭐⭐⭐

**Objetivo:** página `/estadisticas` que muestre métricas reales del armario de cada usuario.

**Pasos:**
1. Crear `GET /api/estadisticas` con las 5 métricas (ver spec en §3.3)
2. Crear `app/estadisticas/page.tsx` como Server Component (fetch al propio API)
3. Crear componentes:
   - `src/components/estadisticas/TarjetaMetrica.tsx`
   - `src/components/estadisticas/GraficoBarras.tsx` (barras CSS puras, sin Recharts)
   - `src/components/estadisticas/ListaPrendasOlvidadas.tsx`
4. Añadir enlace a `/estadisticas` en el navbar
5. Verificar con datos reales

**Archivos a crear/modificar:**
- `app/api/estadisticas/route.ts` ← NUEVO
- `app/estadisticas/page.tsx` ← NUEVO
- `src/components/estadisticas/TarjetaMetrica.tsx` ← NUEVO
- `src/components/estadisticas/GraficoBarras.tsx` ← NUEVO
- `src/components/estadisticas/ListaPrendasOlvidadas.tsx` ← NUEVO
- `src/components/layout/navbar.tsx` ← MODIFICAR (añadir enlace)

---

### FASE D — Constructor Visual de Looks (Sin IA)
**Duración estimada:** 3–4 horas | **Prioridad:** ⭐⭐⭐

**Objetivo:** permitir crear looks manuales con vista previa de collage (alternativa al probador IA).

**Pasos:**
1. Migrar `look_prendas`: añadir columnas `slot` y `posicion` (`migrate-wardrowbe-fase-d.mjs`)
2. Migrar `looks`: añadir `collage_url`, `ocasion`, `descripcion`, `es_favorito`
3. Instalar `sharp` (`npm install sharp`)
4. Crear `app/api/looks/collage/route.ts` (genera imagen 2×2 con sharp + sube a Cloudinary)
5. Crear `app/looks/nuevo/page.tsx` (Server Component wrapper)
6. Crear `src/components/looks/ConstructorLook.tsx` (Client Component):
   - 4 slots: superior, inferior, calzado, complemento
   - Modal de selección de prenda por slot (con miniaturas)
   - Preview de collage (4 imágenes en cuadrícula CSS, sin sharp en cliente)
   - Submit → `POST /api/looks` (guardar look + prendas) → `POST /api/looks/collage` (generar imagen)
7. Crear `app/looks/[id]/page.tsx` (Server Component: detalle del look con collage grande)
8. Añadir sección "Mis Looks" en `/catalogo` o en la home con enlace a `/looks/nuevo`

**Archivos a crear/modificar:**
- `scripts/migrate-wardrowbe-fase-d.mjs` ← NUEVO
- `src/lib/db/types.ts` ← MODIFICAR
- `src/lib/db/client.ts` ← MODIFICAR (LookModel + LookPrendaModel)
- `app/api/looks/collage/route.ts` ← NUEVO
- `app/api/looks/[id]/usar/route.ts` ← NUEVO (si no se creó en Fase B)
- `app/looks/nuevo/page.tsx` ← NUEVO
- `app/looks/[id]/page.tsx` ← NUEVO
- `src/components/looks/ConstructorLook.tsx` ← NUEVO
- `src/components/looks/CollageLook.tsx` ← NUEVO
- `package.json` ← MODIFICAR (añadir `sharp`)

---

### FASE E — Búsqueda Global y Mejoras UX
**Duración estimada:** 1–2 horas | **Prioridad:** ⭐⭐

**Objetivo:** búsqueda y mejoras de calidad de vida.

**Pasos:**
1. Crear `GET /api/buscar` con SQL `LIKE` y filtros múltiples
2. Crear `src/components/catalogo/BuscadorCatalogo.tsx` (Client Component con debounce 300ms)
3. Integrar el buscador en el navbar (input expandible en móvil)
4. Toggle vista galería/lista en `/catalogo` con `localStorage`
5. Mejora: en tarjeta del catálogo, mostrar badges de `temporada` y `ocasion`

---

### FASE F — Sugerencias por Clima (Opcional, Fase Avanzada)
**Duración estimada:** 1–2 horas | **Prioridad:** ⭐

**Objetivo:** personalizar la home con sugerencias basadas en el clima local.

**Pasos:**
1. Crear `GET /api/clima?lat=...&lon=...` como proxy a Open-Meteo (gratuito, sin API key)
2. Crear `src/components/home/SugerenciaClima.tsx` (Server Component)
3. Integrar en `app/page.tsx` con geolocalización del cliente (pasar lat/lon via searchParams)
4. Reglas de mapeo: temperatura < 15°C → sugerir Chaquetas; lluvia → Accesorios con paraguas; etc.

> Open-Meteo (open-meteo.com) es gratuito y no requiere API key. Límite: 10.000 req/día.

---

## 5. Dependencias NPM Nuevas

| Paquete | Versión | Para qué |
|---|---|---|
| `sharp` | `^0.33.x` | Generar collage 2×2 de looks (Fase D) |

No se necesitan más dependencias. El resto se implementa con SQL, fetch nativo y CSS.

---

## 6. Verificación Post-Implementación (Checklist por Fase)

Cada fase se da por completada cuando pase:

- [ ] `npx tsc --noEmit` → 0 errores
- [ ] `npm run lint` → 0 warnings
- [ ] `npm run build` → exitoso
- [ ] Script de migración ejecutado y verificado (tablas/columnas presentes)
- [ ] Test manual del flujo principal de la fase
- [ ] `progress.md` actualizado con resultado de verificación

---

*Documento generado en modo solo-lectura. No se modificó ningún archivo del repositorio.*

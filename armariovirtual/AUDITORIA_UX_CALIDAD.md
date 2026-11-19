# 👗 Auditoría Exhaustiva de UX, Calidad Visual y Arquitectura — Armario Virtual

**Fecha:** 2026-11-16  
**Proyecto:** Armario Virtual (Next.js 16.4.6 App Router, TypeScript, Tailwind CSS, MySQL en Aiven, Cloudinary, Hugging Face IDM-VTON / RMBG-1.4, Sharp)  
**Rol Auditor:** Director de Producto (CPO), Diseñador UI/UX Mobile-First Senior y Arquitecto Full-Stack  
**Tipo de Documento:** Informe de Auditoría y Diagnóstico Crítico (Solo Lectura)

---

## 1. Diagnóstico Honesto: ¿Por qué la app se siente "básica" y no como Acloset / Indyx / Zara?

1. **Jerarquía y Estética de "Dashboard de Administración" en lugar de "App de Moda":**
   - El diseño actual depende excesivamente del componente genérico `Card` con bordes grises (`border-input`), fondos planos y esquinas estándar. En aplicaciones de referencia como **Indyx**, **Whering** o **Acloset**, las prendas flotan en lienzos limpios con fondos cálidos u off-white (ej. `#FBFBFB` o `#F8F9FA`), sombras difusas tipo *editorial* y tipografías con carácter (serif elegante en cabeceras o sans moderna condensada).
   - En la página principal (`/`), el usuario se encuentra con estadísticas numéricas crudas (tarjetas con números grandes) y una lista de botones en vez de un **feed visual inspirador**: *“Tu outfit de hoy según el clima”*, un carrusel de *“Looks recientes”* o un carrusel tipo historias de *“Prendas que no te pones hace tiempo”*.

2. **Ausencia de Barra de Navegación Inferior (Mobile Bottom Navigation Bar):**
   - Toda app móvil de referencia tiene navegación fija en el pulgar (Bottom Bar con 4 o 5 accesos: *Inicio*, *Armario/Catálogo*, *Looks*, *Probador*, *Perfil*).
   - Actualmente, en móvil hay un menú hamburguesa arriba a la derecha (`src/components/layout/navbar.tsx:116-124`). Para cambiar de sección, el usuario tiene que estirar la mano hasta arriba, abrir un menú vertical que cubre la pantalla y hacer clic. Esto añade fricción constante en el uso táctil diario.

3. **La tarjeta de prenda (`TarjetaPrenda.tsx`) está sobrecargada:**
   - La tarjeta intenta hacer todo a la vez: muestra el recorte, el badge de fondo, el punto de color, el título, la descripción, 4 badges de metadatos (temporada, ocasión, estado, usos) y **dos botones de acción permanente abajo** (*"Usar hoy"* y *"Lavar"*).
   - Esto hace que en móvil la tarjeta parezca una celda de inventario de almacén. En apps de moda, la tarjeta es minimalista (foto protagonista limpia en formato 3:4 o 1:1, nombre discreto y marca/categoría). Las acciones rápidas se resuelven mediante un menú contextual (tres puntos o pulsación larga / swipe) o dentro del detalle.

4. **Tratamiento del Collage y Fondos:**
   - Los collages se crean sobre un fondo gris azulado opaco `#f8fafc` (`src/lib/collage.ts:129`). Al no tener sombra sutil cada prenda dentro de la composición ni ajuste dinámico de proporciones, se ve como cuatro fotos cuadradas pegadas en vez de un montaje estilístico o *flat-lay* de revista.

---

## 2. Flujos de Usuario y Fricción (UX Step-by-Step)

### A. Primer Ingreso (`/login` → `/` → `/usuario`)
* **Fricción:** Al crear una cuenta nueva y entrar a la app, la home muestra `0 prendas`, `0 looks` y un círculo vacío con un icono de imagen. No hay un asistente o *onboarding vacío* que guíe al usuario: *"Paso 1: Sube tu foto base para el probador"*, *"Paso 2: Agrega tus primeras 3 prendas"*.
* **El botón "Configurar foto" en `/usuario`**: Sube la foto y hace `router.refresh()`, pero no hay un feedback de éxito animado ni una invitación a ir directo al probador.

### B. Añadir Prenda (`/prendas/nueva`)
* **Fricción del Formulario:** Para guardar una prenda se le exige al usuario desplazarse por una gran cantidad de campos: foto, nombre, descripción, categoría, color, temporada, ocasión, patrón, precio.
* **Falta de IA en el etiquetado:** El usuario tiene que seleccionar manualmente cada píldora.
* **Redirección o permanencia confusa:** Tras subir con éxito (`src/components/prendas/FormNuevaPrenda.tsx:119-136`), el formulario se limpia y muestra un mensaje en verde arriba, pero **deja al usuario en la misma página vacía**. En una app móvil, el flujo natural es: *guardar → ver animación de éxito / toast → redirigir a la ficha de la prenda o al catálogo*, con opción rápida de *"Añadir otra prenda"*.

### C. Catálogo (`/catalogo`)
* **Filtros ocupando media pantalla:** `FiltrosAvanzados.tsx` está siempre desplegado ocupando entre 250px y 350px de altura en móvil (Temporada, Ocasión, Estado, Patrón). El usuario tiene que hacer scroll significativo antes de ver su primera prenda.
* **Solución UX:** Debe ser un carrusel horizontal con chips rápidos de categorías arriba y un botón flotante o botón pill *"Filtros (X)"* que abra un **Bottom Sheet (cajón inferior deslizable)** para los filtros avanzados.

### D. Probador Virtual y Constructor de Looks
* **Dos mundos desconectados:** El usuario tiene `/looks/nuevo` (collage manual con sharp) por un lado y `/probador` (montaje con IDM-VTON) por el otro.
* Al generar un montaje con éxito en el probador (`/probador`), no se permite añadir accesorios ni convertir ese montaje en un look del catálogo con tags de ocasión.

---

## 3. Calidad Técnica y Bugs Críticos Encontrados en Código

### 🔴 BUG 1: El botón "Eliminar prenda" en `/prendas/[id]` NO hace nada (Llamada inexistente)
- **Ubicación:** `app/prendas/[id]/page.tsx:191-193`
- **Código:**
  ```tsx
  <Button variant="destructive" className="flex-1">
    Eliminar prenda
  </Button>
  ```
- **Problema:** Es un botón estático dentro de un Server Component sin `onClick`, sin formulario y sin enlace. El usuario presiona "Eliminar prenda" y la interfaz no responde. No existe forma desde la UI de borrar una prenda.
- **Riesgo idéntico:** No existe botón alguno para editar prenda ni para eliminar looks en `/looks/[id]`.

---

### 🟠 BUG 2: Degradación y desalineación en el Collage (`sharp`) con menos de 4 prendas
- **Ubicación:** `src/lib/collage.ts:13-18` y `src/lib/collage.ts:108-114`
- **Código:**
  ```typescript
  const POSICIONES = [
    { left: MARGEN, top: MARGEN },
    { left: TAMANO_CANVAS / 2 + MARGEN / 2, top: MARGEN },
    { left: MARGEN, top: TAMANO_CANVAS / 2 + MARGEN / 2 },
    { left: TAMANO_CANVAS / 2 + MARGEN / 2, top: TAMANO_CANVAS / 2 + MARGEN / 2 },
  ];
  ```
- **Problema:** Las posiciones están cableadas a los 4 cuadrantes fijos de una cuadrícula 2x2.
  - Si el usuario arma un look con **2 prendas** (ej. camiseta + pantalón), la imagen 1 se ubica arriba a la izquierda y la imagen 2 arriba a la derecha. **Toda la mitad inferior del canvas queda como un bloque vacío de color gris**.
  - Si arma un look con **1 prenda**, queda un recuadro pequeño en la esquina superior izquierda.
  - Si una prenda tiene fondo blanco/transparente pero otra tiene fondo con textura de pared, el collage parece un mosaico roto sin consistencia visual.

---

### 🟠 BUG 3: Eliminación de fondo en segundo plano no revalida la vista (`fire-and-forget` sin SSE ni polling)
- **Ubicación:** `app/api/prendas/route.ts:206-209`
- **Código:**
  ```typescript
  // Disparar eliminación de fondo en segundo plano (no bloquea la respuesta).
  void eliminarFondoDePrenda(prenda.id).catch((err) => {
    console.error("Eliminación de fondo en segundo plano falló:", err);
  });
  ```
- **Problema de UX:** La prenda se inserta con `imagen_sin_fondo_url = null`. El usuario es redirigido o ve el catálogo inmediatamente, donde la prenda aparece con fondo original y el badge *"Con fondo"*.
  - Hugging Face suele tardar entre 4 y 15 segundos en procesar `briaai/RMBG-1.4`.
  - Como no hay WebSockets, Server-Sent Events ni polling en el cliente, la pantalla **nunca se actualiza sola**. El usuario asume que la IA falló, a menos que refresque manualmente la página varios segundos después.

---

### 🟡 BUG 4: `SugerenciaClima.tsx` ejecuta doble petición en el montaje inicial
- **Ubicación:** `src/components/clima/SugerenciaClima.tsx:76-112`
- **Código:**
  ```typescript
  if (typeof navigator !== "undefined" && navigator.geolocation?.getCurrentPosition) {
    await new Promise<void>((resolve) => {
      // ... dispara consultar({ lat, lon })
    });
  }
  if (!cancelado) {
    await consultar(); // <--- DISPARA SIEMPRE UNA SEGUNDA LLAMADA FALLBACK
  }
  ```
- **Problema:** Aunque la geolocalización sea exitosa y llame a `consultar({ lat, lon })`, al resolver la promesa se ejecuta incondicionalmente la línea `await consultar()`, sobreescribiendo el clima del usuario con el clima por defecto de Manizales y consumiendo el doble de peticiones de red innecesariamente.

---

### 🟡 BUG 5: En `/estadisticas` el enlace de "Prendas por categoría" no filtra el catálogo
- **Ubicación:** `src/components/estadisticas/GraficoBarras.tsx`
- **Problema:** Las barras muestran información pero son elementos `<div>` estáticos. Si el usuario toca "Pantalones: 4", espera ser llevado a `/catalogo?categoria=2`. Actualmente están desconectados de la navegación interactiva.

---

## 4. Matriz de Propuestas de Mejora Concretas

### (A) Mejoras Rápidas de Alto Impacto Visual y UX (Quick Wins)

1. **Bottom Navigation Bar para Móviles:**
   - Crear un componente `MobileBottomNav` fijo en `bottom-0`, visible solo en `sm:hidden`.
   - 5 pestañas con iconos modernos y micro-animación activa:
     - 🏠 **Inicio** (`/`)
     - 👗 **Armario** (`/catalogo`)
     - ➕ **Subir** (botón central circular destacado con elevación para `/prendas/nueva`)
     - ✨ **Looks** (`/looks`)
     - 👤 **Perfil** (`/usuario`)
   - Ocultar la barra superior en móvil a un simple header minimalista con el avatar y el buscador.

2. **Cajón Inferior (Drawer / Bottom Sheet) para Filtros en Catálogo:**
   - Quitar el bloque permanente de filtros en `/catalogo`.
   - Dejar una sola fila horizontal scrollable de categorías (`Todas`, `Camisetas`, `Pantalones`, etc.) + un botón pill con icono de filtros y contador de filtros activos.
   - Al tocarlo, abrir un Bottom Sheet suave desde abajo para seleccionar temporada, ocasión, estado y color.

3. **Toasts Globales de Notificación (estilo Sonner):**
   - Instalar o integrar un sistema de notificaciones flotantes para dar feedback instantáneo:
     - *"Prenda marcada como usada hoy (+1)"*
     - *"Prenda enviada al canasto de lavado"*
     - *"Look creado con éxito"*

4. **Mejora del Lienzo de Composición de Collages (`collage.ts`):**
   - Ajustar el layout según la cantidad de prendas:
     - **1 prenda:** Centrada grande en 800x800.
     - **2 prendas:** Disposición vertical split (500x1000 superior e inferior para simular torso y piernas) o dos columnas balanceadas.
     - **3 prendas:** 1 principal a la izquierda (500x1000) y 2 apiladas a la derecha (500x500 cada una).
     - **4 prendas:** Cuadrante 2x2.
   - Usar fondo blanco puro `#FFFFFF` con padding y borde suave para simular una lámina editorial.

---

### (B) Funcionalidades Clave Faltantes (Arquitectura y Producto)

1. **Gestión Completa de Prenda (Eliminar y Editar):**
   - Implementar modal de confirmación para eliminar prenda (`DELETE /api/prendas/[id]`).
   - Implementar vista o modal de edición (`PUT /api/prendas/[id]`) para cambiar categoría, nombre, temporada o re-disparar manualmente la eliminación de fondo si falló la primera vez.

2. **Sistema de Favoritos Activo en Prendas y Looks:**
   - Ya existe la tabla `favoritos` en la base de datos MySQL, pero la interfaz de usuario en el catálogo no tiene el botón de corazón para marcar o desmarcar prendas favoritas.
   - Agregar un botón corazón en la esquina superior izquierda de cada prenda con feedback optimista.

3. **Status Polling o Optimistic UI para la Eliminación de Fondo:**
   - En la tarjeta del catálogo, si `imagen_sin_fondo_url` es nulo pero fue creada hace menos de 2 minutos, mostrar un badge pulsante: *"Recortando fondo con IA..."*.
   - Un pequeño hook con intervalo de 4 segundos que consulte si ya se generó la imagen recortada para sustituirla sin recargar la página.

4. **Compartir / Descargar Look:**
   - En `/looks/[id]`, añadir botón para descargar la imagen del collage o compartirla directamente mediante la Web Share API de dispositivos móviles (`navigator.share`).

---

## 5. Resumen Ejecutivo de la Auditoría

| Área | Calificación Actual | Diagnóstico Principal |
|---|:---:|---|
| **Estética UI Mobile** | 6.5 / 10 | Muy estructurada en tarjetas genéricas de escritorio; le falta fluidez móvil, bottom bar y aire visual estilo revista de moda. |
| **Fricción de Flujos (UX)** | 6.0 / 10 | Formulario de prenda largo sin redirección ágil; filtros de catálogo invasivos; botones rotos (eliminar prenda). |
| **Módulo Collage (Sharp)** | 7.0 / 10 | Funciona técnicamente, pero la composición 2x2 fija degrada visualmente cuando hay menos de 4 prendas. |
| **Pipeline IA (Fondo/Probador)** | 7.5 / 10 | La arquitectura desacoplada es correcta, pero la falta de feedback en vivo hace que el usuario perciba que la IA no actuó. |
| **Base de Datos y Rendimiento** | 9.0 / 10 | Esquema MySQL sólido, consultas preparadas impecables y soporte de índices bien estructurado. |

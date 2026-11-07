# Revisiones

Bucle: construir → `python _verif/verificar.py --ronda N` → capturas → árbitro adversarial (subagente independiente, contexto limpio, mismo brief cada ronda: `_verif/arbitro.md`) → corregir bloqueantes y mayores → repetir.
Nota ponderada = 0,4·Diseño + 0,3·Usabilidad + 0,2·Creatividad + 0,1·Contenido. Listón: ≥ 8,5 y ningún criterio < 8,0.

## Ronda 0 (antes del primer árbitro)

Primera ejecución de los checks: 26/30. Se corrigió:
- Fuentes bloqueadas por CORS en `file://` → `fuentes.css` con woff2 embebidos, carga no bloqueante.
- `contain:layout` en el host de la barra la anclaba al final del documento en vez de al viewport.
- axe: nombre accesible del botón de búsqueda en móvil y de la marca.
- Fundido de View Transitions: la animación de la UA usaba `mix-blend-mode` → keyframes propios solo de opacidad.
- B3T4 original desborda a ≤ 414 px → ajuste en tiempo de ejecución solo en los elementos que desbordan (ver DECISIONES §5).
- Lighthouse Perf 48–68 por 36 animaciones independientes de huecos (tareas largas de *commit*) → un único «cabezal perforador»: Perf 100, TBT 0 ms.

## Ronda 1

**Checks:** 30/30 · Lighthouse móvil (mediana de 3): Perf 100 · A11y 100 · BP 100.

| Diseño | Usabilidad | Creatividad | Contenido | **Ponderada** |
|---|---|---|---|---|
| 7,4 | 7,6 | 7,0 | 7,0 | **7,34** |

Defectos del árbitro:
1. Mayor: el tema elegido no se respeta en B1T2 ni en B3T1 (solo siguen el tema del sistema).
2. Mayor: la ficha, pieza central del concepto, queda fuera del primer viewport a 1440; a 390 es una tira ilegible; es `aria-hidden` y solo responde al ratón.
3. Mayor: sin navegación persistente en una página de más de 4600 px; en táctil no hay Ctrl+K.
4. Mayor: índice monótono: 31 filas «próximamente» pesan lo mismo que las 5 útiles.
5. Mayor: microtipografía funcional a 11 px, «ESTUDIADO» apretado en móvil, `opacity` sobre texto.
6. Menor: la búsqueda activa un resultado no abrible e Intro no da respuesta.
7. Menor: resaltado de búsqueda solo contiguo; las coincidencias por epígrafe no se explican.
8. Menor: ficha girada → texto pequeño borroso; nombre del bloque 1 truncado.
9. Menor: banda de hover y foco desalineados con la retícula.
10. Menor: barra móvil sin rótulo en «Estudiado», anterior deshabilitado como ruido, sin viruta en la barra.
11. Menor: «Continúa por» ignora lo último estudiado.

Corregido para la ronda 2:
- (1) Nota visible en la barra cuando un resumen que no admite `data-theme` (B1T2, B3T1) no puede seguir el tema elegido. Forzarlo exigiría editar su CSS (prohibido).
- (2) Portada recompuesta: titular → ficha → entradilla. La ficha entra en el primer viewport a 1440×900, recta y más grande. Es un `<nav>` con enlaces en las columnas disponibles (≥ 75rem; por debajo, atajo táctil con el índice como equivalente accesible). La lectura responde a puntero, foco y toque. En móvil se parte en dos filas legibles.
- (3) Cabecera fija que se retira al bajar y vuelve al subir o al recibir foco.
- (4) Filas «próximamente» compactas, de un renglón. Bloques sin temas: número en contorno y sello «En preparación».
- (5) Texto funcional a 12 px como mínimo, sin `opacity` en el texto, «Estudiado» más ancho; filtro en tres columnas en móvil.
- (6) La búsqueda no activa resultados no abribles; Intro sobre un «próximamente» muestra «… aún no tiene resumen» en una región `status`.
- (7) Resaltado por términos y fragmento del epígrafe cuando la coincidencia está ahí.
- (8) Ficha sin rotación estática; el nombre del bloque admite dos líneas.
- (9) Banda de hover y foco alineadas con la caja de la fila (padding interior simétrico).
- (10) Barra: rótulo «Estudiado» visible también en móvil, la viruta cae al perforar, y «anterior»/«siguiente» se omiten si no existen.
- (11) «Continúa por» parte del último perforado. Además, al volver de un resumen recién perforado la ficha lo celebra: se perfora la columna y la lectura dice cuántos quedan.
- Durante la ronda: la lectura de `scrollY` al cargar el script forzaba un layout síncrono, y se quitó. `content-visibility:auto` provocaba estilos obsoletos tras cambiar de tema y desbordamiento en móvil, así que se probó y se descartó.

## Ronda 2

**Checks:** 29/30. Fallo: Lighthouse no medible. El portátil funciona con batería al 17 % y la CPU limitada: `benchmarkIndex` 300–590 en las 8 ejecuciones, frente a ~2400 con la máquina libre. Las 8 se descartaron por la regla de `verificar.py`. El resto de checks (navegación, consola, enlaces, scroll horizontal, axe en 4 anchos y ambos temas, teclado, movimiento, barra, `sin-ordenar/`) pasan.


| Diseño | Usabilidad | Creatividad | Contenido | **Ponderada** |
|---|---|---|---|---|
| 7,4 | 7,3 | 7,2 | 7,0 | **7,29** |

Defectos del árbitro (ronda 2):
- Mayores: filtro roto en móvil; Lighthouse sin medir; contador y «Empieza por» fuera del primer viewport; tema incoherente en B1T2 y B3T1; índice muerto (31 «próximamente»).
- Menores: la barra tapa texto al cargar; anterior/siguiente sin código en móvil; microcopy («Por estudiar», «Columna en rojo»); sin fecha.

Decisión sobre la parada: el mínimo de 4 rondas prevalece; la regla de «dos rondas seguidas con mejora < 0,2» se aplica a partir de la 4.ª.

Aplicado para la ronda 3 (pendiente de verificar y arbitrar):
- Tema forzado en los 5 resúmenes sin editarlos, cambiando en el CSSOM la condición de sus reglas `@media (prefers-color-scheme)`. Se elimina la nota de aviso.
- Ficha en miniatura (36 columnas) en la barra de cada resumen; anterior/siguiente con código también en móvil.
- Contador junto al titular (≥ 64rem); «Empieza / Continúa por» en el pie de la ficha; bloque «Cómo se usa» en tres pasos.
- Progreso por bloque como tira perforada; bloques sin disponibles a dos columnas.
- Filtro de móvil con celdas de altura completa y «Pendientes»; leyenda «Borde de color»; fecha de los resúmenes en el pie.

## Ronda 3

**Checks:** 30/30 · Lighthouse móvil (mediana de 3 válidas, 0 descartadas, con la máquina enchufada): Perf 97 · A11y 100 · BP 100.

| Diseño | Usabilidad | Creatividad | Contenido | **Ponderada** |
|---|---|---|---|---|
| 7,4 | 7,8 | 7,0 | 7,3 | **7,43** (+0,14) |

Defectos del árbitro:
1. Mayor: el «4» en contorno se ve roto (`text-stroke` sobre los solapes de la fuente variable).
2. Mayor: la barra tapa texto mientras se lee y es visualmente ajena al resumen.
3. Mayor: el índice tiene vacíos y nombres partidos en los bloques a dos columnas.
4. Mayor: «Pendientes» es ambiguo e incoherente con DECISIONES.
5. Menor: la ficha está apretada a 768 px; el encabezado deja una palabra suelta en móvil.
6. Menor: la entradilla pierde el separador en móvil.
7. Menor: el paso 01 muestra «Ctrl K» en táctil.
8. Menor: DECISIONES se contradice (inclinación; «Empieza por»).
9. Menor: «Disponibles 05/36» se repite tres veces en el primer viewport.

Segunda ronda seguida con mejora < 0,2 (−0,05 y +0,14). Como el mínimo de 4 rondas prevalece, se hace la ronda 4; si también mejora menos de 0,2, el bucle se detiene.

Corregido para la ronda 4:
- (1) Número de los bloques vacíos en tinta atenuada, sin contorno.
- (2) Barra como rail lateral fijo cuando el resumen deja margen (1440+ en los cinco); el check pasa a medir la intersección con cada línea de texto.
- (3) Bloques vacíos con el estado bajo el código y el nombre a todo el ancho de la columna.
- (4) «Por perforar», visible y coherente en la interfaz y en DECISIONES.
- (5) Ficha a dos filas por debajo de 64rem; encabezado corto por debajo de 30rem.
- (6) Se mantiene el separador en la entradilla de móvil.
- (7) El paso 01 muestra «la lupa de arriba» en táctil y «Ctrl K» con puntero fino.
- (8) DECISIONES unificado con el comportamiento real.
- (9) El contador pasa a «Disponibles sin perforar 05/05», que es accionable.
- Creatividad: cada columna de la ficha lleva impresos los dígitos 0–9, como una tarjeta IBM de 80 columnas (máscara SVG con token de color).

## Ronda 4

**Checks:** 30/30 · Lighthouse móvil (mediana de 3 válidas, 0 descartadas, con la máquina enchufada): Perf 100 · A11y 100 · BP 100. La barra queda en modo rail a 1440 en los cinco resúmenes, sin solapes con el texto.

| Diseño | Usabilidad | Creatividad | Contenido | **Ponderada** |
|---|---|---|---|---|
| 7,5 | 7,8 | 7,0 | 7,2 | **7,46** (+0,03) |

Defectos del árbitro:
1. Mayor: por debajo de 75rem la ficha es decorativa (`aria-hidden`, columnas de ~8 px a 390 px), así que el concepto desaparece en el móvil.
2. Mayor: dentro de los resúmenes el rail lleva una sombra genérica y no está anclado; rompe la identidad.
3. Mayor: el titular de portada sigue la plantilla editorial habitual y no participa de la metáfora (solo el punto rojo).
4. Mayor: «Disponibles sin perforar 05/05» se lee como «completado»; a 1024 px la etiqueta se parte en dos líneas y pega con la cifra.
5. Menor: los dígitos 0–9 de la ficha (~5 px, poco contraste) se leen como ruido.
6. Menor: «Próximamente» se repite en cada fila de los bloques que ya llevan el sello «En preparación»; el sello ocupa todo el ancho en móvil.
7. Menor: al volver con «← Índice» la fila de origen no se distingue (`:target`).
8. Menor: foco y hover de una fila casi idénticos; la caja de foco deja fuera la celda «Estudiado».
9. Menor: nombre accesible de las columnas de la ficha («Tema 1: B1T1…», «Tema 1: B3T1…»), con numeración por bloque que confunde.

## Cierre del bucle

Ponderada por ronda: 7,34 → 7,29 → 7,43 → 7,46. Las rondas 3 y 4 mejoran menos de 0,2 (+0,14 y +0,03) y ya se han cumplido las 4 rondas mínimas. Por la regla del encargo, **el bucle se detiene sin alcanzar el listón** (≥ 8,5 de ponderada y ningún criterio < 8,0). Todos los checks técnicos pasan (30/30).

**Qué falta para el listón** (según el árbitro, en orden de impacto):
- **Creatividad (7,0 → ≥ 8):** que la ficha sea la página y no un módulo. Habría que perforar el propio titular con el cabezal, hacer de la barra de los resúmenes un trozo de la misma tarjeta y lograr un momento de interacción memorable, legible en cinco segundos: perforar, ver caer la viruta y que el contador lo registre.
- **Diseño (7,5):** salir de la plantilla «grotesca extendida + mono + crema» y pulir cada ancho; los puntos visibles son 1024 px (contador) y 390 px (sello). El rail necesita filete y esquina cortada en lugar de sombra, y los dígitos de la ficha deben quitarse o leerse bien, con el agujero sustituyendo a su dígito.
- **Usabilidad (7,8):** ficha usable en móvil (filas por bloque con objetivos ≥ 24 px, o tira de progreso del índice como control de perforación), `:target` y foco al volver de un resumen, y foco claramente distinto del hover.
- **Contenido (7,2):** dato principal sin ambigüedad («Por perforar · 5 de 5 disponibles»), sin «Próximamente» redundante en los bloques vacíos y nombres accesibles de la ficha sin la numeración por bloque.

Los defectos 4, 6, 7, 8 y 9 son baratos y no se aplicaron solo porque la regla de parada se cumplió antes. Los defectos 1–3 son de concepto y piden una revisión de la portada.

## Informe final

- **Checks** (`_verif/verificar.py`, 30/30 en la última ronda):
  - Catálogo de 36 temas; build idempotente; `sin-ordenar/` con todos sus casos.
  - Navegación por `file://` y por http: 36 temas, 5 disponibles que abren con barra y vuelta, y los «próximamente» no clicables.
  - Consola limpia; sin enlaces rotos; sin scroll horizontal (360–1920 px).
  - axe en ambos temas; foco y teclado.
  - Movimiento solo con transform/opacity; reduced-motion respetado.
  - La barra no tapa texto ni altera estilos; sin textos prohibidos.
  - Lighthouse móvil 100/100/100.
- **Lighthouse:** se ejecuta localmente (Lighthouse 13 con throttling simulado). Con batería y CPU limitada la medida no es fiable (`benchmarkIndex` < 1500), así que esas ejecuciones se descartan y se toma la mediana de 3 válidas (ver DECISIONES).
- **Decisiones:** en DECISIONES.md (concepto «Ficha perforada», tipografía, tema por CSSOM, rail, ajuste de desbordes, `sin-ordenar/`, autoría de los commits).
- **Despliegue:** GitHub Pages mediante GitHub Actions (`.github/workflows/pages.yml`), que publica solo la salida de `build.py --dist _site`. Tras el despliegue se repiten los checks de navegación sobre la URL pública (ver abajo).

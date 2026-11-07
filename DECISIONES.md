# Decisiones

## 1. Inventario de los resúmenes originales

Encontré cinco HTML autocontenidos en la raíz (más un `desktop.ini` de Windows, que se ignora):

| Archivo original | `<title>` | Particularidades |
|---|---|---|
| `TAI - B1T1 Constitución Española.html` | `B1·T1 Constitución Española` | Tema claro/oscuro con `prefers-color-scheme` **y** `data-theme` en `<html>` |
| `TAI - B1T2 Cortes Generales.html` | `TAI - B1T2 Cortes Generales` | Solo `prefers-color-scheme` |
| `TAI - B3T1 Modelo ER.html` | `TAI - B3T1 Modelo ER` | Solo `prefers-color-scheme`; mapa en SVG inline |
| `TAI - B3T2 Diseño BD.html` | `TAI - B3T2 Diseño BD` | `prefers-color-scheme` + `data-theme` |
| `TAI - B3T4 · Resumen SQL.html` | `TAI · B3T4 · Resumen SQL` | `prefers-color-scheme` + `data-theme`; `viewport-fit=cover` |

Comunes a los cinco: un único `<style>` interno, **sin JavaScript**, **sin dependencias externas** (ni fuentes, ni CDN, ni imágenes), pila tipográfica del sistema, maquetación a dos columnas pensada para A4 (`@page`, `@media print`), leyenda de colores por tipo de información y un único `</body>`. Ningún elemento `position: fixed/sticky`, así que una barra flotante no compite con nada propio del resumen. Los nombres mezclan `-`, `·`, espacios y tildes; el código no siempre aparece igual en el `<title>` (`B1·T1`) que en el nombre (`B1T1`).

## 2. Concepto visual: «Ficha perforada»

El temario se presenta como **una tarjeta perforada de 36 columnas**, la ficha de 80 columnas de IBM que durante décadas fue literalmente «la informática» en la Administración. Cada tema es una columna; estudiarlo es **perforarla**. La ficha llena es el temario dominado.

Por qué este concepto y no otro:

- **Une los dos mundos de la oposición**: lo administrativo (fichas, expedientes, sellos, papel) y lo informático (la tarjeta perforada como primer soporte de datos). No es decoración: la metáfora es el modelo de progreso.
- **Da una acción con significado**: «Marcar como estudiado» se llama *perforar*; el botón es un hueco discontinuo que al pulsarlo se rellena y suelta la viruta (el trocito de cartulina) con una pequeña caída. La portada muestra la ficha completa: cada perforación es visible de un vistazo.
- **Impone restricción**, que es lo que da carácter: cartulina, tinta casi negra y **un solo acento**, el rojo de registro de imprenta. Nada de gradientes, ni sombras de tarjeta genéricas, ni iconos emoji.
- **En oscuro la metáfora se invierte**: la ficha es negra y las perforaciones dejan pasar la luz (los huecos se ven claros), como una tarjeta al trasluz en la sala de máquinas.

### Sistema

- **Tokens** en `assets/estilo.css` (§2): color (`--c-papel`, `--c-ficha`, `--c-tinta[-2,-3]`, `--c-regla`, `--c-registro`, `--c-agujero`…), tipografía (familias, anchuras `--ancho-expandido/condensado`, escala fluida `--t-2xs`→`--t-portada`), espaciado (escala de 4 px `--e-1`→`--e-9`, `--margen` fluido), movimiento (`--ease-salida`, `--ease-golpe`, `--ease-caida`, `--d-1`→`--d-4`, `--escalon`). Los temas claro/oscuro solo reasignan tokens de color.
- **Tipografía con carácter**: *Archivo* (Omnibus-Type, OFL) en su versión variable con eje de **anchura**: expandida y muy pesada para los titulares y los números de bloque (la voz del cartel), condensada y ligera para las cifras del contador. *IBM Plex Mono* (OFL) para códigos, etiquetas y la «impresión» de la ficha: el guiño a IBM es deliberado.
- **Composición**: retícula de 12 columnas; titular a sangre con la segunda línea sangrada; el punto final del titular es una perforación roja. El índice no es una rejilla de tarjetas: es un **libro registro** con filetes, donde el número del bloque, gigante, queda fijo (sticky) mientras pasan sus temas. Disponibles y «próximamente» se distinguen por peso, color del código y etiqueta, no solo por color.
- **Movimiento con propósito** (solo `transform` y `opacity`): el titular sube línea a línea desde una máscara; la ficha entra con un leve giro que se endereza al posarse (en reposo queda recta, para que el texto pequeño sea nítido) y un **cabezal perforador** (filete rojo) la barre de izquierda a derecha descubriendo las 36 columnas; al pasar por una fila, una banda de color se extiende desde la izquierda (`scaleX`) y el código y la flecha se desplazan; al perforar, el hueco se rellena con rebote y la viruta cae. Las barras de progreso crecen con `scaleX`. El cambio de tema es un fundido cruzado con View Transitions (solo opacidad). Con `prefers-reduced-motion` todo esto se desactiva.

## 3. Estructura del repositorio

```
index.html          portada + índice (el índice lo rellena build.py entre marcas)
data.js             generado: catálogo + disponibilidad + epígrafes
catalogo.json       fuente de verdad (36 temas, nombres exactos)
assets/             estilo.css, app.js, barra.js, fuentes.css (generado), fonts/ (woff2 + licencias OFL)
resumenes/          ORIGINALES intactos, renombrados a  b1t1-constitucion-espanola.html
temas/              VERSIÓN SERVIDA (generada): original + barra inyectada, p. ej. temas/b1t1.html
sin-ordenar/        bandeja de entrada para resúmenes nuevos (no se publica)
build.py            colocación + generación (solo librería estándar)
.github/workflows/  despliegue a GitHub Pages
_verif/             checks y capturas (ignorado por git)
```

- **Originales y servidos separados**: los originales no se tocan nunca (solo se mueven/renombran). Lo que se publica es `temas/`, que se regenera siempre desde `resumenes/`. Así «no editar el contenido» es comprobable: el check compara estilo a estilo cada elemento del original y del servido.
- **Nombres canónicos ASCII** (`b3t4-sql.html`, `temas/b3t4.html`): URLs estables y sin problemas de codificación en Pages; el nombre humano vive en `catalogo.json`.
- **Los archivos generados (`temas/`, `data.js`, `fuentes.css`, el índice de `index.html`) se versionan**: así el sitio funciona con doble clic nada más clonar, sin ejecutar nada. El workflow los regenera igualmente.

## 4. Decisiones de funcionamiento

- **Nombres de los bloques**: el esquema no los daba; uso los de la convocatoria TAI: «Organización del Estado y Administración electrónica», «Tecnología básica», «Desarrollo de sistemas», «Sistemas y comunicaciones».
- **Índice pre-renderizado** por `build.py` dentro de `index.html` (no pintado por JS): primera pintura inmediata, funciona sin JS y mejora LCP. El JS solo hidrata estado (perforados, filtros, búsqueda).
- **Epígrafe**: para los temas disponibles muestro, bajo el nombre del catálogo, el `<h1>` del resumen sin el prefijo de código. Es el enunciado oficial del tema y ayuda a saber qué entra.
- **La ficha es navegable** (ronda 2): las columnas disponibles son enlaces dentro de un `<nav>`; la lectura inferior responde a puntero, foco y toque. Por debajo de 75rem cada columna mide menos de 24 px (WCAG 2.2, 2.5.8), así que ahí la ficha queda como atajo táctil o de ratón (`aria-hidden`, `tabindex=-1`) y su equivalente accesible es el índice, que tiene objetivos de tamaño completo. En móvil se parte en dos filas (B1+B2 / B3+B4) para que se lea.
- **Composición de la portada** (ronda 2): titular → ficha → entradilla y contador. A 1440×900 la ficha entra en el primer viewport, sin inclinación (el texto pequeño girado se veía borroso); la inclinación queda solo en la animación de entrada.
- **Cabecera fija que se retira** al bajar y vuelve al subir o al recibir foco: búsqueda y tema siempre a mano, también en táctil (donde no hay Ctrl+K).
- **Portada** (ronda 3): el contador ocupa el hueco a la derecha de «Perfora» y «Empieza por / Continúa por» va al pie de la ficha; todo cabe en el primer viewport a 1440×900. Debajo, «Cómo se usa» en tres pasos.
- **Progreso por bloque como tira perforada** (ronda 3): una celda por tema, con borde de color si está disponible y rellena si está perforada. Sustituye a la barra genérica.
- **Fecha en el pie**: la del resumen más reciente (mtime), estable entre ejecuciones de `build.py`.
- **Ritmo del índice** (ronda 2; en la ronda 3 los bloques sin disponibles pasan a dos columnas): las filas «próximamente» son compactas (un renglón, sin columna de perforar). Los bloques sin ningún tema disponible llevan el número en contorno y un sello «En preparación».
- **«Continúa por»** propone el siguiente disponible sin perforar después del último que perforaste, no el primero del catálogo.
- **Vuelta celebrada**: al marcar un tema como estudiado desde la barra del resumen se guarda `tai.ultimo`; al volver al índice, la columna se perfora en la ficha (con la viruta cayendo) y la lectura dice cuántos te quedan.
- **Solo se pueden perforar los temas disponibles**: un «próximamente» no es clicable y no tiene controles, como pide el enunciado.
- **Progreso por bloque** = perforados / temas del bloque (no / disponibles): mide el avance real sobre el temario.
- **«Empieza por / Continúa por»** (pie de la ficha): sin nada perforado, «Empieza por» el primer disponible; después, «Continúa por» el siguiente disponible sin perforar tras el último que perforaste.
- **Filtros** Todos / Disponibles / Por perforar (disponibles aún sin perforar), como radios nativos (teclado con flechas sin JS extra).
- **Búsqueda (Ctrl/Cmd+K)**: `<dialog>` modal nativo (atrapa el foco y cierra con Esc), patrón combobox + listbox con `aria-activedescendant`; busca por código (acepta `b3t4`, `B3·T4`, `b3 t4`) y por nombre/epígrafe sin tildes. Los «próximamente» aparecen pero no se abren.
- **localStorage**: claves `tai.estudiados` (array de códigos) y `tai.tema` (`claro`/`oscuro`; sin clave = sistema). Todo acceso va en `try/catch`; si el almacenamiento está bloqueado la web funciona igual (el progreso no persiste). Se sincroniza entre pestañas (`storage`) y al volver con «atrás» (`pageshow`).
- **Rendimiento**: la primera versión estampaba cada hueco con su propia animación (36 animaciones con retardo); Lighthouse móvil caía a ~60 por tareas largas de *commit*. El barrido del cabezal es **una sola** animación de `transform` y deja Perf en 100 con TBT 0 ms. Archivo se recortó con fontTools (solo para preparar el archivo; no forma parte del sitio) a los rangos usados, `wdth` 75–125 y `wght` 300–900, y a Latin-1 + puntuación española: 90 → 73 KB.
- **Medida de Lighthouse**: en esta máquina Windows, Lighthouse (`throttlingMethod: simulate`) da 97–100 con la máquina libre y 55–70 cuando está cargada (por ejemplo, con el Chrome del usuario abierto en el sitio). La diferencia se ve en `benchmarkIndex`, que baja de ~2400 a ~600. `verificar.py` descarta las ejecuciones con `benchmarkIndex` < 1500, informa de cuántas descartó y usa la mediana de las válidas. También se eliminaron los costes reales que aparecieron en el camino: lectura de `scrollY` al cargar el script (forzaba un layout síncrono de 400 ms simulados) y `content-visibility:auto` en los bloques del índice que están fuera de pantalla.
- **Fuentes por `file://`**: Chromium bloquea `@font-face` con URL relativa en `file://` (CORS). `build.py` embebe los woff2 en `assets/fuentes.css` como `data:` URI y se carga de forma no bloqueante (`media="print"` → `all`). Así no hay errores de consola ni con doble clic ni en Pages. Los `.woff2` originales y sus licencias OFL siguen en `assets/fonts/`.

## 5. La barra inyectada

- `build.py` inserta antes del último `</body>`: un `<script type="application/json">` con los datos (código, nombre, anterior/siguiente disponibles, enlace al índice con ancla `#tema-B1T1`), el elemento `<tai-barra>` y `<script src="../assets/barra.js">`.
- **Aislamiento**: Shadow DOM con `:host{all:initial}`; sus estilos no salen y los del resumen no entran. Lo único que añade al documento es un `<link>` a `fuentes.css`, que solo declara familias con nombres propios (`Archivo TAI`, `Plex Mono TAI`) que ningún resumen usa.
- **No tapa contenido**: el host ocupa al final del documento la altura de la barra (espaciador), de modo que el último párrafo siempre queda por encima; además la barra se retira al bajar leyendo y vuelve al subir, al llegar al final o al recibir foco. Se oculta al imprimir.
- **Desbordes de los resúmenes en móvil**: el B3T4 original desborda en horizontal a ≤414 px (una tabla de tres columnas de código y un chip de leyenda con `white-space:nowrap`). Sin tocar el archivo, la barra aplica en tiempo de ejecución el ajuste mínimo **solo a los elementos que desbordan y solo mientras desbordan**: a la tabla le da desplazamiento horizontal propio (`display:block; overflow-x:auto`) y al chip le permite el salto de línea; los marca con `data-tai-ajuste` y lo deshace al redimensionar. Las tablas que ya están en un contenedor con scroll (B3T2 usa `.wrap`) no se tocan. El check de estilos compara el resto elemento a elemento con el original.
- **Tema en los resúmenes** (ronda 3): la preferencia elegida en el índice se aplica a los cinco resúmenes **sin editar sus archivos**. Al cargar, la barra recorre el CSSOM del documento y, para cada regla `@media (prefers-color-scheme: …)`, cambia en memoria su condición a `all` o `not all` según el tema elegido. Sin preferencia guardada restaura la condición original, así que el resumen se ve exactamente como lo escribió su autor. Si el resumen admite además `data-theme` (B1T1, B3T2, B3T4), también se le pone. Esto sustituye a la nota de aviso de la ronda 2.
- **Densidad de tarjeta real** (ronda 4): a partir de 75rem cada columna lleva impresa la fila de dígitos 0–9, como las tarjetas de 80 columnas. Es una máscara SVG coloreada con un token, sin texto en el DOM, así que no afecta a la accesibilidad ni al contraste del contenido. La ranura del hueco se dibuja encima y deja ver los dígitos.
- **Barra como rail lateral** (ronda 4): si el contenido del resumen deja al menos 112 px libres a la izquierda (a 1440 px ocurre en los cinco resúmenes), la barra pasa a un rail vertical fijo en el margen y nunca se superpone al texto. Si no hay margen, sigue abajo y se retira al leer. El check mide la intersección de la barra con cada línea de texto.
- **Bloques sin disponibles** (ronda 4): número en tinta atenuada en vez de contorno (`text-stroke` dejaba ver los solapes de la fuente variable) y, en las dos columnas, el estado va bajo el código para que el nombre no se parta.
- **Ficha en miniatura en la barra** (ronda 3): a partir de 960 px, la barra muestra las 36 columnas de la ficha con la actual en rojo y las perforadas rellenas; el concepto acompaña también dentro de los resúmenes.

## 6. `build.py` y `sin-ordenar/`

- Detecta el código con `B(\d)T(\d+)` en el nombre del archivo (normalizado NFC y en mayúsculas).
- Si el nombre no lo trae, mira `<title>` y `<h1>`: primero un código escrito de forma laxa (`B2·T3`, `Bloque 3 · Tema 4`), después el **nombre del catálogo** como frase completa; si un nombre está contenido en otro («Gobierno» ⊂ «Gobierno abierto») gana el más largo. Si encaja con más de un tema o con ninguno, el archivo **se queda en `sin-ordenar/`** y se lista.
- **Duplicados**: si ya existe un resumen para ese código, idéntico → aviso y se deja; distinto → aviso y se deja, salvo `--reemplazar CODIGO`, que guarda el anterior en `sin-ordenar/_reemplazados/` con fecha. Dos candidatos al mismo código en la misma pasada → no se coloca ninguno.
- Códigos fuera del catálogo (p. ej. `B9T1`) o archivos sin código en `resumenes/` → aviso y no se publican.
- También recoge HTML sueltos en la raíz del repositorio (así se colocaron los cinco originales).
- Idempotente: escribe solo si el contenido cambia; borra de `temas/` lo que ya no tiene original.
- `--dist _site` copia solo lo publicable (`index.html`, `data.js`, `assets/`, `temas/`); nunca `sin-ordenar/`, `resumenes/` ni `_verif/`.

## Autoría de los commits

El repositorio es público. Los commits se firman con la dirección *noreply* de GitHub de la cuenta, configurada solo en este repositorio (`git config user.email`), para no publicar un correo personal.

# TAI Estudio

Índice de estudio del temario de Técnico Auxiliar de Informática (TAI): 36 temas en 4 bloques, resúmenes en HTML, búsqueda rápida (Ctrl/Cmd+K), progreso por bloque y tema claro/oscuro. Funciona con doble clic en `index.html` y sin conexión.

## Añadir un tema

1. Deja el HTML del resumen en `sin-ordenar/` (mejor si el nombre lleva el código, p. ej. `TAI - B2T4 Sistemas operativos.html`).
2. Ejecuta `python build.py`.
3. Listo: el resumen pasa a `resumenes/`, se genera `temas/b2t4.html` con la barra de navegación y el tema aparece como disponible en el índice.

## Cómo funciona `sin-ordenar/`

- `build.py` busca el código `B<n>T<n>` en el nombre; si no lo hay, intenta casar el `<title>`/`<h1>` con `catalogo.json`.
- Si hay duda (ningún tema o varios), el archivo se queda en `sin-ordenar/` y se lista en consola.
- Nunca sobrescribe: si el tema ya existe, avisa. Para sustituirlo: `python build.py --reemplazar B2T4` (la versión anterior se guarda en `sin-ordenar/_reemplazados/`).
- `sin-ordenar/` no se publica.

Más detalle en `DECISIONES.md`; historial de revisiones en `REVISIONES.md`.

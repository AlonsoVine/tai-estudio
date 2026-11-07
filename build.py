#!/usr/bin/env python3
"""TAI Estudio · build.py

Escanea el repositorio, coloca los resúmenes nuevos, genera la versión servida
de cada resumen (con la barra flotante inyectada), `data.js` y el índice de
`index.html`. Solo librería estándar. Idempotente: si nada cambia, no reescribe.

Uso:
    python build.py                     # coloca, genera y avisa
    python build.py --reemplazar B1T1   # sustituye el resumen de B1T1 por el de sin-ordenar/
    python build.py --dist _site        # además copia SOLO el sitio publicable a _site/
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import html
import json
import re
import shutil
import sys
import unicodedata
from datetime import datetime
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
CATALOGO = RAIZ / "catalogo.json"
DIR_RESUMENES = RAIZ / "resumenes"      # originales intactos
DIR_TEMAS = RAIZ / "temas"              # versión servida (generada)
DIR_SIN_ORDENAR = RAIZ / "sin-ordenar"  # bandeja de entrada
DIR_REEMPLAZADOS = DIR_SIN_ORDENAR / "_reemplazados"
INDEX = RAIZ / "index.html"
DATA_JS = RAIZ / "data.js"
FUENTES_CSS = RAIZ / "assets" / "fuentes.css"
FUENTES = [  # (familia, archivo woff2, descriptores)
    ("Archivo TAI", "archivo-var.woff2", "font-weight:300 900;font-stretch:75% 125%;"),
    ("Plex Mono TAI", "plex-mono-500.woff2", "font-weight:500;"),
]
PUBLICABLE = ["index.html", "data.js", "assets", "temas"]

RE_CODIGO = re.compile(r"B(\d)T(\d+)")
# Variante tolerante solo para <title>/<h1>: «B1·T1», «B1 - T1», «Bloque 3 · Tema 4»
RE_CODIGO_TEXTO = re.compile(r"\bB\s*(\d)\s*[·.\-_ ]?\s*T\s*(\d+)\b", re.I)
RE_BLOQUE_TEMA = re.compile(r"\bBloque\s*(\d)\s*[·.,\-–— ]*\s*Tema\s*(\d+)\b", re.I)
RE_TITLE = re.compile(r"<title[^>]*>(.*?)</title>", re.I | re.S)
RE_H1 = re.compile(r"<h1[^>]*>(.*?)</h1>", re.I | re.S)
RE_ETIQUETA = re.compile(r"<[^>]+>")
RE_BODY_FIN = re.compile(r"</body\s*>", re.I)
MARCA_INYECCION = "<!-- TAI Estudio: barra inyectada por build.py -->"

avisos: list[str] = []


def aviso(msg: str) -> None:
    avisos.append(msg)
    print(f"  ! {msg}")


def info(msg: str) -> None:
    print(f"  · {msg}")


def rel(p: Path) -> str:
    try:
        return p.relative_to(RAIZ).as_posix()
    except ValueError:
        return p.name


# ---------------------------------------------------------------- utilidades
def sin_tildes(texto: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn")


def normalizar(texto: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", sin_tildes(texto).lower()).strip()


def slug(texto: str) -> str:
    return normalizar(texto).replace(" ", "-")


def texto_plano(fragmento: str) -> str:
    fragmento = re.sub(r"<small[^>]*>.*?</small>", " ", fragmento, flags=re.I | re.S)
    return re.sub(r"\s+", " ", html.unescape(RE_ETIQUETA.sub(" ", fragmento))).strip()


def leer_html(ruta: Path) -> str:
    datos = ruta.read_bytes()
    try:
        return datos.decode("utf-8-sig")
    except UnicodeDecodeError:
        return datos.decode("cp1252", errors="replace")


def escribir_si_cambia(ruta: Path, contenido: str) -> bool:
    nuevo = contenido.encode("utf-8")
    if ruta.exists() and ruta.read_bytes() == nuevo:
        return False
    ruta.parent.mkdir(parents=True, exist_ok=True)
    ruta.write_bytes(nuevo)
    return True


def huella(ruta: Path) -> str:
    return hashlib.sha256(ruta.read_bytes()).hexdigest()


# ---------------------------------------------------------------- catálogo
def cargar_catalogo() -> dict:
    cat = json.loads(CATALOGO.read_text(encoding="utf-8"))
    codigos = []
    esperados = {1: 11, 2: 5, 3: 10, 4: 10}
    for b in cat["bloques"]:
        n = b["numero"]
        if len(b["temas"]) != esperados.get(n, -1):
            raise SystemExit(f"catalogo.json: el bloque {n} tiene {len(b['temas'])} temas; se esperaban {esperados.get(n)}")
        for i, t in enumerate(b["temas"], 1):
            if t["codigo"] != f"B{n}T{i}":
                raise SystemExit(f"catalogo.json: código inesperado {t['codigo']} (esperado B{n}T{i})")
            codigos.append(t["codigo"])
    if len(codigos) != 36 or len(set(codigos)) != 36 or cat.get("total") != 36:
        raise SystemExit(f"catalogo.json: hay {len(codigos)} temas; deben ser exactamente 36")
    return cat


def indice_catalogo(cat: dict) -> dict[str, dict]:
    return {t["codigo"]: {**t, "bloque": b["numero"]} for b in cat["bloques"] for t in b["temas"]}


# ---------------------------------------------------------------- detección
def codigo_en_nombre(nombre: str) -> str | None:
    m = RE_CODIGO.search(unicodedata.normalize("NFC", nombre))
    return f"B{m.group(1)}T{int(m.group(2))}" if m else None


def titulo_y_h1(texto: str) -> tuple[str, str]:
    t = RE_TITLE.search(texto)
    h = RE_H1.search(texto)
    return (texto_plano(t.group(1)) if t else "", texto_plano(h.group(1)) if h else "")


def codigo_por_contenido(ruta: Path, temas: dict[str, dict]) -> tuple[str | None, str]:
    """Casa por <title>/<h1>: primero un código escrito, luego el nombre del catálogo."""
    titulo, h1 = titulo_y_h1(leer_html(ruta))
    candidatos: set[str] = set()
    for texto in (titulo, h1):
        for rx in (RE_CODIGO_TEXTO, RE_BLOQUE_TEMA):
            for m in rx.finditer(texto):
                candidatos.add(f"B{m.group(1)}T{int(m.group(2))}")
    if len(candidatos) == 1:
        return candidatos.pop(), "código en <title>/<h1>"
    if len(candidatos) > 1:
        return None, f"varios códigos en <title>/<h1>: {', '.join(sorted(candidatos))}"
    texto = f" {normalizar(titulo)} {normalizar(h1)} "
    por_nombre = [c for c, t in temas.items() if f" {normalizar(t['nombre'])} " in texto]
    # Si un nombre está contenido en otro («Gobierno» ⊂ «Gobierno abierto»), gana el más largo
    por_nombre = [c for c in por_nombre
                  if not any(o != c and normalizar(temas[c]["nombre"]) in normalizar(temas[o]["nombre"]) for o in por_nombre)]
    if len(por_nombre) == 1:
        return por_nombre[0], f"nombre «{temas[por_nombre[0]]['nombre']}» en <title>/<h1>"
    if len(por_nombre) > 1:
        return None, f"el <title>/<h1> encaja con varios temas: {', '.join(sorted(por_nombre))}"
    return None, "sin código en el nombre ni coincidencia en <title>/<h1>"


def nombre_canonico(codigo: str, temas: dict[str, dict]) -> str:
    return f"{codigo.lower()}-{slug(temas[codigo]['nombre'])}.html"


def originales_por_codigo() -> dict[str, list[Path]]:
    mapa: dict[str, list[Path]] = {}
    if DIR_RESUMENES.exists():
        for p in sorted(DIR_RESUMENES.glob("*.html")):
            c = codigo_en_nombre(p.name.upper())
            if c:
                mapa.setdefault(c, []).append(p)
    return mapa



# ---------------------------------------------------------------- 0. fuentes
def generar_fuentes() -> None:
    """Embebe los woff2 en assets/fuentes.css: Chromium bloquea @font-face por file://."""
    print("0 · Generando assets/fuentes.css (woff2 embebidos)")
    partes = ["/* Generado por build.py desde assets/fonts/*.woff2 (SIL OFL 1.1). No editar a mano.\n"
              "   Las fuentes van embebidas para que el sitio funcione también abierto con doble clic (file://). */"]
    for familia, archivo, desc in FUENTES:
        datos = base64.b64encode((RAIZ / "assets" / "fonts" / archivo).read_bytes()).decode("ascii")
        partes.append(f'@font-face{{font-family:"{familia}";src:url(data:font/woff2;base64,{datos}) format("woff2");'
                      f"{desc}font-style:normal;font-display:swap}}")
    info("fuentes.css " + ("actualizado" if escribir_si_cambia(FUENTES_CSS, "\n".join(partes) + "\n") else "sin cambios"))

# ---------------------------------------------------------------- 1. colocar
def colocar(temas: dict[str, dict], reemplazar: set[str]) -> None:
    print("1 · Colocando resúmenes nuevos")
    DIR_RESUMENES.mkdir(exist_ok=True)
    DIR_SIN_ORDENAR.mkdir(exist_ok=True)
    entrantes = [p for p in sorted(RAIZ.glob("*.html")) if p.name != "index.html"]
    entrantes += sorted(p for p in DIR_SIN_ORDENAR.glob("*.html") if p.is_file())
    if not entrantes:
        info("no hay archivos nuevos en sin-ordenar/ ni en la raíz")
        return

    detectados: dict[str, list[Path]] = {}
    for p in entrantes:
        c = codigo_en_nombre(p.name.upper())
        motivo = "código en el nombre"
        if not c:
            c, motivo = codigo_por_contenido(p, temas)
        if not c:
            aviso(f"{rel(p)}: no se coloca ({motivo}). Renómbralo con su código, p. ej. «B2T4 Sistemas operativos.html».")
            continue
        if c not in temas:
            aviso(f"{rel(p)}: el código {c} no está en catalogo.json; se deja donde está.")
            continue
        info(f"{rel(p)} → {c} ({motivo})")
        detectados.setdefault(c, []).append(p)

    existentes = originales_por_codigo()
    for c, rutas in sorted(detectados.items()):
        if len(rutas) > 1:
            aviso(f"{c}: hay {len(rutas)} candidatos ({', '.join(rel(r) for r in rutas)}); no se coloca ninguno. Deja solo uno.")
            continue
        origen = rutas[0]
        destino = DIR_RESUMENES / nombre_canonico(c, temas)
        previos = existentes.get(c, [])
        if previos:
            previo = previos[0]
            if huella(previo) == huella(origen):
                aviso(f"{rel(origen)}: es idéntico a {rel(previo)}, que ya está colocado. Puedes borrarlo.")
                continue
            if c not in reemplazar:
                aviso(f"{rel(origen)}: {c} ya existe ({rel(previo)}) y es distinto. No se sobrescribe; "
                      f"para sustituirlo ejecuta: python build.py --reemplazar {c}")
                continue
            DIR_REEMPLAZADOS.mkdir(parents=True, exist_ok=True)
            copia = DIR_REEMPLAZADOS / f"{previo.stem}.{datetime.now():%Y%m%d-%H%M%S}.html"
            shutil.move(str(previo), str(copia))
            info(f"{c}: versión anterior guardada en {rel(copia)}")
        shutil.move(str(origen), str(destino))
        info(f"colocado {rel(destino)}")


# ---------------------------------------------------------------- 2. revisar resumenes/
def revisar_resumenes(temas: dict[str, dict]) -> dict[str, Path]:
    print("2 · Revisando resumenes/")
    elegidos: dict[str, Path] = {}
    for p in sorted(DIR_RESUMENES.glob("*")):
        if p.is_dir() or p.suffix.lower() != ".html":
            if p.is_file():
                aviso(f"{rel(p)}: no es .html; se ignora.")
            continue
        c = codigo_en_nombre(p.name.upper())
        if not c:
            aviso(f"{rel(p)}: sin código reconocido (B<n>T<n>) en el nombre; no se publica.")
            continue
        if c not in temas:
            aviso(f"{rel(p)}: {c} no está en catalogo.json; no se publica.")
            continue
        if c in elegidos:
            aviso(f"{rel(p)}: {c} duplicado (ya está {rel(elegidos[c])}); se publica el primero.")
            continue
        canon = DIR_RESUMENES / nombre_canonico(c, temas)
        if p != canon and not canon.exists():
            shutil.move(str(p), str(canon))
            info(f"renombrado {rel(p)} → {rel(canon)}")
            p = canon
        elegidos[c] = p
    info(f"{len(elegidos)} resúmenes válidos: {', '.join(sorted(elegidos, key=orden_codigo))}")
    return elegidos


def orden_codigo(c: str) -> tuple[int, int]:
    m = RE_CODIGO.match(c)
    return (int(m.group(1)), int(m.group(2)))


# ---------------------------------------------------------------- 3. versión servida
def epigrafe(h1: str, titulo: str) -> str:
    texto = h1 or titulo
    texto = re.sub(r"^\s*(TAI\s*[·\-–—]\s*)?", "", texto, flags=re.I)
    texto = re.sub(r"^\s*(Bloque\s*\d+\s*[·.,]?\s*Tema\s*\d+|B\s*\d\s*[·.]?\s*T\s*\d+)\s*[·\-–—:]*\s*", "", texto, flags=re.I)
    return texto.strip(" ·-–—")


def generar_temas(cat: dict, temas: dict[str, dict], elegidos: dict[str, Path]) -> dict[str, dict]:
    print("3 · Generando temas/ con la barra inyectada")
    DIR_TEMAS.mkdir(exist_ok=True)
    orden = [t["codigo"] for b in cat["bloques"] for t in b["temas"]]
    disponibles = [c for c in orden if c in elegidos]
    meta: dict[str, dict] = {}
    escritos = 0
    for i, c in enumerate(disponibles):
        fuente = leer_html(elegidos[c])
        titulo, h1 = titulo_y_h1(fuente)
        href = f"temas/{c.lower()}.html"
        meta[c] = {"href": href, "epigrafe": epigrafe(h1, titulo), "original": rel(elegidos[c])}

        def vecino(j: int) -> dict | None:
            if 0 <= j < len(disponibles):
                v = disponibles[j]
                return {"codigo": v, "nombre": temas[v]["nombre"], "href": f"{v.lower()}.html"}
            return None

        datos = {
            "codigo": c,
            "nombre": temas[c]["nombre"],
            "indice": f"../index.html#tema-{c}",
            "anterior": vecino(i - 1),
            "siguiente": vecino(i + 1),
            "temaManual": "data-theme" in fuente,
            "ficha": [[[t["codigo"], 1 if t["codigo"] in elegidos else 0] for t in b["temas"]] for b in cat["bloques"]],
            "base": "../assets/",
        }
        json_seguro = json.dumps(datos, ensure_ascii=False).replace("</", "<\\/")
        bloque = (f"\n{MARCA_INYECCION}\n"
                  f'<script type="application/json" id="tai-barra-datos">{json_seguro}</script>\n'
                  f"<tai-barra></tai-barra>\n"
                  f'<script src="../assets/barra.js"></script>\n')
        finales = list(RE_BODY_FIN.finditer(fuente))
        if finales:
            k = finales[-1].start()
            servido = fuente[:k] + bloque + fuente[k:]
        else:
            aviso(f"{rel(elegidos[c])}: no tiene </body>; la barra se añade al final del archivo.")
            servido = fuente + bloque
        if escribir_si_cambia(DIR_TEMAS / f"{c.lower()}.html", servido):
            escritos += 1
    validos = {f"{c.lower()}.html" for c in disponibles}
    for viejo in DIR_TEMAS.glob("*.html"):
        if viejo.name not in validos:
            viejo.unlink()
            info(f"eliminado {rel(viejo)} (ya no tiene original)")
    info(f"{len(disponibles)} temas servidos, {escritos} reescritos")
    return meta


# ---------------------------------------------------------------- 4. data.js
def generar_data(cat: dict, meta: dict[str, dict]) -> dict:
    print("4 · Generando data.js")
    datos = {
        "total": 36,
        "bloques": [
            {
                "numero": b["numero"],
                "nombre": b["nombre"],
                "temas": [
                    {
                        "codigo": t["codigo"],
                        "nombre": t["nombre"],
                        "disponible": t["codigo"] in meta,
                        "href": meta[t["codigo"]]["href"] if t["codigo"] in meta else None,
                        "epigrafe": meta[t["codigo"]]["epigrafe"] if t["codigo"] in meta else None,
                    }
                    for t in b["temas"]
                ],
            }
            for b in cat["bloques"]
        ],
    }
    js = ("/* Generado por build.py a partir de catalogo.json y resumenes/. No editar a mano. */\n"
          "window.TAI_DATA = " + json.dumps(datos, ensure_ascii=False, indent=1) + ";\n")
    info("data.js " + ("actualizado" if escribir_si_cambia(DATA_JS, js) else "sin cambios"))
    return datos


# ---------------------------------------------------------------- 5. index.html
def e(t: str) -> str:
    return html.escape(t, quote=True)


def render_ficha(datos: dict) -> str:
    """La ficha es navegable: las columnas disponibles son enlaces; las demás, decorado."""
    bloques = datos["bloques"]
    # en móvil la ficha se parte en dos filas: B1+B2 y B3+B4
    filas = {1: 0, 2: 0, 3: 1, 4: 1}
    por_fila = [sum(len(b["temas"]) for b in bloques if filas[b["numero"]] == f) for f in (0, 1)]
    out = ['<nav class="ficha" aria-labelledby="ficha-titulo">',
           '  <p class="ficha__cab"><span id="ficha-titulo"><span class="ficha__cab-largo">Ficha de temario · abre un tema disponible</span><span class="ficha__cab-corto">Ficha · 36 columnas</span></span><span aria-hidden="true">36 columnas · 4 bloques</span></p>',
           '  <div class="ficha__zonas" data-zonas>']
    for b in bloques:
        n = len(b["temas"])
        out.append(f'    <div class="zona" style="--n:{n};--tot:{por_fila[filas[b["numero"]]]}" role="group" aria-label="Bloque {b["numero"]}">')
        out.append('      <div class="zona__cols">')
        for k, t in enumerate(b["temas"], 1):
            dibujo = ('<span class="col__fila"></span><span class="col__agujero"><span class="col__viruta"></span></span>'
                      '<span class="col__fila col__fila--a"></span>')
            if t["disponible"]:
                out.append(f'        <a class="col" href="{e(t["href"])}" data-codigo="{t["codigo"]}" data-estado="disponible">'
                           f'<span class="sr">Tema </span><span class="col__n">{k}</span>'
                           f'<span class="sr">: {t["codigo"]} {e(t["nombre"])}</span>{dibujo}</a>')
            else:
                out.append(f'        <span class="col" data-codigo="{t["codigo"]}" data-estado="proximamente" aria-hidden="true">'
                           f'<span class="col__n">{k}</span>{dibujo}</span>')
        out.append("      </div>")
        out.append(f'      <p class="zona__eti" aria-hidden="true"><b>B{b["numero"]}</b> <span>{e(b["nombre"])}</span></p>')
        out.append("    </div>")
    out.append("  </div>")
    out.append('  <div class="ficha__pie">')
    out.append('    <p class="ficha__lectura" aria-hidden="true"><span data-lectura>Borde de <b>color</b>: resumen disponible. Columna rellena: tema perforado.</span></p>')
    out.append('    <p class="siguiente" data-siguiente hidden></p>')
    out.append("  </div>")
    out.append("</nav>")
    return "\n".join("    " + l for l in out)


def render_indice(datos: dict) -> str:
    out = ['<div class="bloques">']
    for b in datos["bloques"]:
        n = b["numero"]
        total = len(b["temas"])
        disp = sum(1 for t in b["temas"] if t["disponible"])
        disp_txt = "ninguno disponible aún" if disp == 0 else ("1 disponible" if disp == 1 else f"{disp} disponibles")
        out.append(f'  <section class="bloque{' bloque--vacio' if disp == 0 else ''}" id="bloque-{n}" aria-labelledby="bloque-{n}-nombre">')
        out.append('    <header class="bloque__cab">')
        out.append(f'      <p class="bloque__num" aria-hidden="true">{n}<small>Bloque<br>{n} de 4</small></p>')
        out.append(f'      <h3 class="bloque__nombre" id="bloque-{n}-nombre"><span class="sr">Bloque {n}: </span>{e(b["nombre"])}</h3>')
        out.append(f'      <p class="bloque__meta"><span>{total} temas</span><span>{disp_txt}</span></p>')
        if disp == 0:
            out.append('      <p class="sello"><span>En preparación</span></p>')
        out.append('      <div class="progreso">')
        celdas = "".join(f'<span class="tira__c" data-codigo="{t["codigo"]}"{" data-disp" if t["disponible"] else ""}></span>' for t in b["temas"])
        out.append(f'        <div class="tira progreso__pista" role="progressbar" aria-label="Temas perforados del bloque {n}" '
                   f'aria-valuemin="0" aria-valuemax="{total}" aria-valuenow="0" style="--n:{total}">{celdas}</div>')
        out.append(f'        <span class="progreso__txt" data-progreso-txt>0 de {total} perforados</span>')
        out.append("      </div>")
        out.append("    </header>")
        out.append('    <div class="temas">')
        out.append(f'      <ol class="temas__lista" aria-label="Temas del bloque {n}">')
        for t in b["temas"]:
            c = t["codigo"]
            if t["disponible"]:
                out.append(f'        <li class="tema" id="tema-{c}" data-codigo="{c}" data-estado="disponible">')
                out.append(f'          <a class="tema__enlace" href="{e(t["href"])}">'
                           f'<span class="tema__cod">{c}</span>'
                           f'<span class="tema__txt"><span class="tema__nombre">{e(t["nombre"])}</span>'
                           f'<span class="tema__epi">{e(t["epigrafe"] or "")}</span></span>'
                           f'<span class="tema__estado">Disponible <span class="tema__flecha" aria-hidden="true">→</span></span></a>')
                out.append(f'          <button class="perforar" type="button" data-codigo="{c}" aria-pressed="false" '
                           f'aria-label="Estudiado: {c} {e(t["nombre"])}"><span class="perforar__hueco" aria-hidden="true"></span>'
                           f'<span class="perforar__viruta" aria-hidden="true"></span><span aria-hidden="true">Estudiado</span></button>')
            else:
                out.append(f'        <li class="tema" id="tema-{c}" data-codigo="{c}" data-estado="proximamente">')
                out.append(f'          <div class="tema__enlace"><span class="tema__cod">{c}</span>'
                           f'<span class="tema__txt"><span class="tema__nombre">{e(t["nombre"])}</span></span>'
                           f'<span class="tema__estado">Próximamente</span></div>')
            out.append("        </li>")
        out.append("      </ol>")
        out.append('      <p class="bloque__vacio" hidden>Nada que mostrar en este bloque con el filtro actual.</p>')
        out.append("    </div>")
        out.append("  </section>")
    out.append("</div>")
    return "\n".join("    " + l for l in out)


def reemplazar_marcas(texto: str, marca: str, contenido: str) -> str:
    rx = re.compile(rf"(<!-- TAI:{marca} -->)(.*?)(<!-- /TAI:{marca} -->)", re.S)
    if not rx.search(texto):
        raise SystemExit(f"index.html: faltan las marcas <!-- TAI:{marca} --> … <!-- /TAI:{marca} -->")
    return rx.sub(lambda m: f"{m.group(1)}\n{contenido}\n    {m.group(3)}", texto, count=1)


MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
         "septiembre", "octubre", "noviembre", "diciembre"]


def fecha_resumenes() -> str:
    """Fecha del resumen más reciente (mtime). Estable entre ejecuciones mientras no cambien."""
    fechas = [p.stat().st_mtime for p in DIR_RESUMENES.glob("*.html")]
    if not fechas:
        return "sin resúmenes todavía"
    f = datetime.fromtimestamp(max(fechas))
    return f"resúmenes actualizados el {f.day} de {MESES[f.month - 1]} de {f.year}"


def generar_index(datos: dict) -> None:
    print("5 · Actualizando index.html")
    texto = INDEX.read_text(encoding="utf-8")
    texto = reemplazar_marcas(texto, "FICHA", render_ficha(datos))
    texto = reemplazar_marcas(texto, "INDICE", render_indice(datos))
    disp = sum(1 for b in datos["bloques"] for t in b["temas"] if t["disponible"])
    texto = re.sub(r"(<span data-total-disponibles>)\d*(</span>)", rf"\g<1>{disp:02d}\g<2>", texto)
    texto = re.sub(r'(<b data-cuenta="disponibles">)\d*(</b>)', rf"\g<1>{disp}\g<2>", texto)
    texto = re.sub(r'(<b data-cuenta="pendientes">)\d*(</b>)', rf"\g<1>{disp}\g<2>", texto)
    texto = re.sub(r"(<span data-total-pendientes>)\d*(</span>)", rf"\g<1>{disp:02d}\g<2>", texto)
    texto = re.sub(r"(<span data-total-estudiados>)\d*(</span>)", r"\g<1>00\g<2>", texto)
    texto = re.sub(r"(<span data-actualizado>)[^<]*(</span>)", lambda m: m.group(1) + fecha_resumenes() + m.group(2), texto)
    info("index.html " + ("actualizado" if escribir_si_cambia(INDEX, texto) else "sin cambios"))


# ---------------------------------------------------------------- 6. dist
def copiar_dist(destino: Path) -> None:
    print(f"6 · Copiando el sitio publicable a {destino}")
    destino = destino.resolve()
    protegidas = {RAIZ, *RAIZ.parents, *(RAIZ / n for n in PUBLICABLE), DIR_RESUMENES, DIR_SIN_ORDENAR}
    if destino in protegidas:
        raise SystemExit(f"--dist no puede ser {destino}: usa una carpeta propia, p. ej. _site")
    if destino.exists():
        shutil.rmtree(destino)
    destino.mkdir(parents=True)
    for nombre in PUBLICABLE:
        src = RAIZ / nombre
        if src.is_dir():
            shutil.copytree(src, destino / nombre)
        elif src.exists():
            shutil.copy2(src, destino / nombre)
    (destino / ".nojekyll").write_text("", encoding="utf-8")
    total = sum(1 for _ in destino.rglob("*") if _.is_file())
    info(f"{total} archivos publicables")


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser(description="Construye TAI Estudio")
    ap.add_argument("--reemplazar", action="append", default=[], metavar="CODIGO",
                    help="permite sustituir el resumen existente de CODIGO por el de sin-ordenar/")
    ap.add_argument("--dist", metavar="CARPETA", help="copia solo el sitio publicable a CARPETA")
    args = ap.parse_args()

    cat = cargar_catalogo()
    temas = indice_catalogo(cat)
    print(f"TAI Estudio · catálogo con {len(temas)} temas en {len(cat['bloques'])} bloques")
    generar_fuentes()
    colocar(temas, {c.upper() for c in args.reemplazar})
    elegidos = revisar_resumenes(temas)
    meta = generar_temas(cat, temas, elegidos)
    datos = generar_data(cat, meta)
    generar_index(datos)
    pendientes = sorted(p.name for p in DIR_SIN_ORDENAR.glob("*.html"))
    if pendientes:
        print("Quedan en sin-ordenar/: " + ", ".join(pendientes))
    if args.dist:
        copiar_dist(Path(args.dist))
    print(f"Listo · {len(meta)}/36 disponibles · {len(avisos)} aviso(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

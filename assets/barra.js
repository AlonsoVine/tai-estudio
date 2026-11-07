/* TAI Estudio · barra flotante que build.py inyecta en cada resumen.
   Aislada en Shadow DOM: no lee ni altera los estilos del resumen. */
(function () {
  "use strict";
  if (window.customElements && customElements.get("tai-barra")) return;

  var CLAVE_ESTUDIADOS = "tai.estudiados";
  var CLAVE_TEMA = "tai.tema";
  var CLAVE_ULTIMO = "tai.ultimo";

  function leer(clave) { try { return window.localStorage.getItem(clave); } catch (e) { return null; } }
  function escribir(clave, valor) { try { window.localStorage.setItem(clave, valor); return true; } catch (e) { return false; } }
  function leerEstudiados() {
    try {
      var l = JSON.parse(leer(CLAVE_ESTUDIADOS) || "[]");
      return Array.isArray(l) ? l.filter(function (c) { return typeof c === "string"; }) : [];
    } catch (e) { return []; }
  }

  var CSS = [
    ":host{all:initial; display:block; height:calc(96px + env(safe-area-inset-bottom, 0px))}",
    "@media print{:host{display:none !important}}",
    ".barra{",
    "  --papel:#faf6ec; --tinta:#17140f; --tinta-2:#4b4539; --regla:#cdc2ab; --registro:#a92e17; --suave:#f3d9cc; --agujero:#17140f;",
    "  position:fixed; z-index:2147483000; left:50%; bottom:calc(16px + env(safe-area-inset-bottom, 0px));",
    "  display:flex; align-items:stretch; max-width:calc(100vw - 24px);",
    "  font:500 13px/1.2 'Plex Mono TAI', ui-monospace, 'Cascadia Mono', Consolas, Menlo, monospace; letter-spacing:.02em;",
    "  color:var(--tinta); background:var(--papel); border:1px solid var(--tinta); border-radius:2px;",
    "  box-shadow:0 1px 0 rgba(23,20,15,.08), 0 16px 32px -18px rgba(23,20,15,.55);",
    "  transform:translateX(-50%); transition:transform 420ms cubic-bezier(.16,1,.3,1), opacity 220ms linear;",
    "  -webkit-font-smoothing:antialiased;",
    "}",
    ".barra.oscura{--papel:#1f1b16; --tinta:#efe7d7; --tinta-2:#c4baa7; --regla:#3b352c; --registro:#ff7a4d; --suave:#3a2016; --agujero:#f6eedd;",
    "  box-shadow:0 1px 0 rgba(255,255,255,.05), 0 18px 36px -18px rgba(0,0,0,.95)}",
    ".barra.oculta{transform:translate(-50%, calc(100% + 32px)); opacity:0}",
    "a,button{all:unset; box-sizing:border-box; position:relative; display:flex; align-items:center; gap:8px;",
    "  min-height:48px; padding:0 14px; cursor:pointer; color:inherit; white-space:nowrap; isolation:isolate}",
    "a::before,button::before{content:''; position:absolute; inset:0; z-index:-1; background:var(--suave);",
    "  transform:scaleY(0); transform-origin:bottom; transition:transform 260ms cubic-bezier(.16,1,.3,1)}",
    "a:hover::before,button:hover::before{transform:none}",
    "a:focus-visible,button:focus-visible{outline:3px solid var(--registro); outline-offset:-3px}",
    ".sep{width:1px; background:var(--regla); flex:none}",
    ".indice{font-weight:500; text-transform:uppercase; letter-spacing:.06em; font-size:12px}",
    ".flecha{display:inline-block; transition:transform 220ms cubic-bezier(.16,1,.3,1)}",
    ".indice:hover .flecha,.ant:hover .flecha{transform:translateX(-4px)}",
    ".sig:hover .flecha{transform:translateX(4px)}",
    ".actual{display:flex; flex-direction:column; justify-content:center; padding:0 14px; min-width:0; max-width:260px}",
    ".actual b{font-weight:500; color:var(--registro); font-size:12px; letter-spacing:.06em}",
    ".actual span{font-family:'Archivo TAI', system-ui, 'Segoe UI', sans-serif; font-weight:600; font-size:13px; overflow:hidden; text-overflow:ellipsis; letter-spacing:0}",
    ".nav small{color:var(--tinta-2); font-size:11px}",
    "[aria-disabled='true']{cursor:not-allowed; color:var(--tinta-2)}",
    "[aria-disabled='true']::before{display:none}",
    ".hueco{position:relative; width:10px; height:22px; border:1.5px dashed var(--tinta-2); border-radius:2px; flex:none;",
    "  transition:transform 220ms cubic-bezier(.34,1.56,.64,1)}",
    ".hueco::after{content:''; position:absolute; inset:-1.5px; border-radius:2px; background:var(--agujero);",
    "  transform:scale(0); opacity:0; transition:transform 480ms cubic-bezier(.34,1.56,.64,1), opacity 120ms linear}",
    "button:hover .hueco{transform:scale(1.12)}",
    "button[aria-pressed='true'] .hueco{border-style:solid; border-color:var(--agujero)}",
    "button[aria-pressed='true'] .hueco::after{transform:none; opacity:1}",
    ".hueco .viruta{position:absolute; inset:-1.5px; border-radius:2px; background:var(--papel); border:1.5px solid var(--tinta-2); opacity:0; z-index:1}",
    "button.recien .viruta{animation:viruta 760ms cubic-bezier(.55,0,.9,.45) forwards}",
    "@keyframes viruta{0%{opacity:1; transform:none} 100%{opacity:0; transform:translate(12px, 40px) rotate(38deg)}}",
    ".rotulo{font-size:12px; text-transform:uppercase; letter-spacing:.06em}",
    ".mini{display:flex; align-items:center; gap:4px; padding:0 12px; border-left:1px solid var(--regla)}",
    ".mini__b{display:flex; gap:2px}",
    ".mini__c{width:3px; height:16px; border-radius:1px; box-shadow:inset 0 0 0 1px var(--regla)}",
    ".mini__c.es-disp{box-shadow:inset 0 0 0 1px var(--registro)}",
    ".mini__c.es-hecho{background:var(--agujero); box-shadow:none}",
    ".mini__c.es-actual{height:22px; background:var(--registro); box-shadow:none}",
    "@media (max-width:960px){.mini{display:none}}",
    /* rail lateral: cuando el resumen deja margen a la izquierda, la barra no se superpone al texto */
    ".barra.rail{left:12px; top:50%; bottom:auto; flex-direction:column; align-items:stretch; width:92px; max-width:none;",
    "  transform:translateY(-50%)}",
    ".barra.rail.oculta{transform:translateY(-50%); opacity:1}",
    ".rail .sep{width:auto; height:1px}",
    ".rail a,.rail button{justify-content:center; padding:0 8px; flex-direction:column; gap:4px; min-height:56px}",
    ".rail .indice{flex-direction:row; min-height:48px}",
    ".rail .actual{padding:10px 8px; align-items:center; text-align:center; border-top:1px solid var(--regla); border-bottom:1px solid var(--regla)}",
    ".rail .actual span{display:none}",
    ".rail .mini{display:none}",
    ".rail .nav{flex-direction:row}",
    ".rail .rotulo{font-size:12px; letter-spacing:.02em}",
    ".sr{position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%); white-space:nowrap}",
    "@media (max-width:640px){",
    "  .barra{left:0; right:0; bottom:0; max-width:none; width:100%; transform:none; border-width:1px 0 0; border-radius:0;",
    "    padding-bottom:env(safe-area-inset-bottom, 0px); justify-content:space-between}",
    "  .barra.oculta{transform:translateY(calc(100% + 8px))}",
    "  :host{height:calc(72px + env(safe-area-inset-bottom, 0px))}",
    "  .actual{flex:1; max-width:none; padding:0 8px; align-items:center; text-align:center}",
    "  .actual span{max-width:100%}",
    "  .nav small{font-size:11px}",
    "  .nav{padding:0 8px; gap:4px}",
    "  a,button{padding:0 12px}",
    "}",
    "@media (max-width:379px){.actual span{display:none}}",
    "@media (prefers-reduced-motion:reduce){*,*::before,*::after{transition-duration:1ms !important; animation:none !important}}",
    "@media (forced-colors:active){.hueco::after{background:CanvasText}}"
  ].join("\n");

  /* Solo declara @font-face con familias propias ("Archivo TAI", "Plex Mono TAI"): no toca los estilos del resumen */
  function cargarFuente(base) {
    if (!base || document.getElementById("tai-fuentes")) return;
    var l = document.createElement("link");
    l.id = "tai-fuentes"; l.rel = "stylesheet"; l.href = base + "fuentes.css";
    document.head.appendChild(l);
  }

  function crear(tag, attrs, texto) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    if (texto) el.textContent = texto;
    return el;
  }

  class TaiBarra extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    var nodoDatos = document.getElementById("tai-barra-datos");
    var d;
    try { d = JSON.parse(nodoDatos.textContent); } catch (e) { return; }
    cargarFuente(d.base);

    var host = this;
    var sombra = this.attachShadow({ mode: "open" });
    var estilo = document.createElement("style");
    estilo.textContent = CSS;
    sombra.appendChild(estilo);

    var nav = crear("nav", { "class": "barra", "aria-label": "Navegación del temario" });

    var indice = crear("a", { "class": "indice", href: d.indice });
    indice.appendChild(crear("span", { "class": "flecha", "aria-hidden": "true" }, "←"));
    indice.appendChild(crear("span", null, "Índice"));
    nav.appendChild(indice);
    nav.appendChild(crear("span", { "class": "sep", "aria-hidden": "true" }));

    function enlaceNav(dest, clase, rotulo, flecha) {
      if (!dest) return null;
      var el = crear("a", { "class": "nav " + clase, href: dest.href });
      el.setAttribute("aria-label", rotulo + ": " + dest.codigo + " " + dest.nombre);
      el.setAttribute("title", dest.codigo + " · " + dest.nombre);
      var f = crear("span", { "class": "flecha", "aria-hidden": "true" }, flecha);
      var s = crear("small", { "aria-hidden": "true" }, dest.codigo);
      if (clase === "ant") { el.appendChild(f); el.appendChild(s); }
      else { el.appendChild(s); el.appendChild(f); }
      return el;
    }

    var ant = enlaceNav(d.anterior, "ant", "Anterior", "‹");
    if (ant) nav.appendChild(ant);
    var actual = crear("div", { "class": "actual" });
    actual.appendChild(crear("b", null, d.codigo));
    actual.appendChild(crear("span", null, d.nombre));
    nav.appendChild(actual);
    /* Ficha en miniatura: las 36 columnas, con la actual marcada y las perforadas rellenas */
    var mini = null;
    if (d.ficha) {
      mini = crear("span", { "class": "mini", "aria-hidden": "true" });
      d.ficha.forEach(function (bloque) {
        var g = crear("span", { "class": "mini__b" });
        bloque.forEach(function (t) {
          g.appendChild(crear("span", { "class": "mini__c" + (t[1] ? " es-disp" : "") + (t[0] === d.codigo ? " es-actual" : ""), "data-c": t[0] }));
        });
        mini.appendChild(g);
      });
      nav.appendChild(mini);
    }
    var sig = enlaceNav(d.siguiente, "sig", "Siguiente", "›");
    if (sig) nav.appendChild(sig);
    nav.appendChild(crear("span", { "class": "sep", "aria-hidden": "true" }));

    var boton = crear("button", { type: "button", "aria-pressed": "false", "class": "estudiado" });
    var hueco = crear("span", { "class": "hueco", "aria-hidden": "true" });
    hueco.appendChild(crear("span", { "class": "viruta" }));
    boton.appendChild(hueco);
    boton.appendChild(crear("span", { "class": "rotulo", "aria-hidden": "true" }, "Estudiado"));
    boton.setAttribute("aria-label", "Estudiado: " + d.codigo);
    nav.appendChild(boton);
    sombra.appendChild(nav);

    function pintar() {
      var lista = leerEstudiados();
      boton.setAttribute("aria-pressed", lista.indexOf(d.codigo) >= 0 ? "true" : "false");
      if (mini) mini.querySelectorAll(".mini__c").forEach(function (c) {
        c.classList.toggle("es-hecho", lista.indexOf(c.getAttribute("data-c")) >= 0);
      });
    }
    boton.addEventListener("click", function () {
      var lista = leerEstudiados();
      var i = lista.indexOf(d.codigo);
      if (i >= 0) lista.splice(i, 1); else lista.push(d.codigo);
      escribir(CLAVE_ESTUDIADOS, JSON.stringify(lista));
      if (i < 0) {
        escribir(CLAVE_ULTIMO, JSON.stringify({ codigo: d.codigo, t: Date.now() }));
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          boton.classList.remove("recien"); void boton.offsetWidth; boton.classList.add("recien");
        }
      } else {
        try { window.localStorage.removeItem(CLAVE_ULTIMO); } catch (e) { /* sin almacenamiento */ }
      }
      pintar();
    });
    pintar();

    /* Tema: la preferencia elegida en el índice se aplica a TODOS los resúmenes sin editarlos.
       En tiempo de ejecución se cambia la condición de sus reglas @media (prefers-color-scheme)
       en el CSSOM (dark → «all» o «not all»); el archivo no se toca y, sin preferencia guardada,
       todo queda como lo escribió su autor. Si además admite data-theme, se le pone. */
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    var reglasEsquema = [];
    function recogerReglas(lista) {
      for (var i = 0; i < lista.length; i++) {
        var r = lista[i];
        if (r.media && typeof r.conditionText === "string" && /prefers-color-scheme/.test(r.conditionText)) {
          reglasEsquema.push({ regla: r, original: r.media.mediaText, oscura: /prefers-color-scheme\s*:\s*dark/.test(r.conditionText) });
        } else if (r.cssRules) {
          recogerReglas(r.cssRules);
        }
      }
    }
    for (var h = 0; h < document.styleSheets.length; h++) {
      try { recogerReglas(document.styleSheets[h].cssRules); } catch (e) { /* hoja ajena: se ignora */ }
    }
    function pintarTema() {
      var pref = leer(CLAVE_TEMA);
      var forzado = pref === "oscuro" || pref === "claro";
      var oscuro = forzado ? pref === "oscuro" : mq.matches;
      reglasEsquema.forEach(function (x) {
        try {
          if (!forzado) x.regla.media.mediaText = x.original;
          else x.regla.media.mediaText = (x.oscura === oscuro) ? "all" : "not all";
        } catch (e) { /* regla no editable */ }
      });
      if (d.temaManual) {
        if (forzado) document.documentElement.setAttribute("data-theme", oscuro ? "dark" : "light");
      }
      nav.classList.toggle("oscura", oscuro);
    }
    pintarTema();
    if (mq.addEventListener) mq.addEventListener("change", pintarTema);
    window.addEventListener("storage", function (ev) {
      if (ev.key === CLAVE_ESTUDIADOS) pintar();
      if (ev.key === CLAVE_TEMA) pintarTema();
    });

    /* Se retira al bajar leyendo y vuelve al subir, al llegar al final o al recibir foco */
    var ultimaY = window.scrollY;
    var pendiente = false;
    function alDesplazar() {
      pendiente = false;
      var y = window.scrollY;
      var finalDoc = window.innerHeight + y >= document.documentElement.scrollHeight - 120;
      var bajando = y > ultimaY + 6;
      var subiendo = y < ultimaY - 6;
      if (finalDoc || y < 80 || subiendo) nav.classList.remove("oculta");
      else if (bajando && !nav.classList.contains("rail") && !nav.contains(sombra.activeElement)) nav.classList.add("oculta");
      if (bajando || subiendo) ultimaY = y;
    }
    window.addEventListener("scroll", function () {
      if (!pendiente) { pendiente = true; window.requestAnimationFrame(alDesplazar); }
    }, { passive: true });
    nav.addEventListener("focusin", function () { nav.classList.remove("oculta"); });

    /* Modo rail: si el bloque de contenido del resumen deja al menos 112 px libres a la izquierda */
    function elegirModo() {
      var izquierda = Infinity;
      Array.prototype.forEach.call(document.body.children, function (el) {
        if (el === host || el.tagName === "SCRIPT" || el.tagName === "STYLE") return;
        var r = el.getBoundingClientRect();
        if (r.width > 200) izquierda = Math.min(izquierda, r.left);
      });
      if (izquierda === Infinity) izquierda = 0;
      var rail = izquierda >= 112 && window.innerHeight >= 520;
      nav.classList.toggle("rail", rail);
      if (rail) nav.classList.remove("oculta");
    }
    elegirModo();

    /* Tablas del resumen más anchas que la pantalla: se les da desplazamiento horizontal propio
       (solo a las que desbordan y solo mientras desbordan) para que la página no se desplace en horizontal. */
    function ajustarDesbordes() {
      var ancho = document.documentElement.clientWidth;
      document.querySelectorAll("[data-tai-ajuste]").forEach(function (t) {
        t.removeAttribute("data-tai-ajuste");
        ["display", "overflow-x", "max-width", "white-space"].forEach(function (p) { t.style.removeProperty(p); });
      });
      /* Etiquetas sin salto de línea más anchas que la pantalla: se permite el salto */
      document.querySelectorAll("body *").forEach(function (el) {
        if (el.closest("tai-barra, table, pre, code")) return;
        if (getComputedStyle(el).whiteSpace === "nowrap" && el.getBoundingClientRect().right > ancho + 1) {
          el.setAttribute("data-tai-ajuste", "");
          el.style.setProperty("white-space", "normal");
        }
      });
      document.querySelectorAll("body table").forEach(function (t) {
        if (t.closest("table[data-tai-ajuste]")) return;
        for (var a = t.parentElement; a && a !== document.body; a = a.parentElement) {
          var ox = getComputedStyle(a).overflowX;
          if (ox === "auto" || ox === "scroll" || ox === "hidden" || ox === "clip") return;
        }
        if (t.getBoundingClientRect().right > ancho + 1) {
          t.setAttribute("data-tai-ajuste", "");
          t.style.setProperty("display", "block");
          t.style.setProperty("overflow-x", "auto");
          t.style.setProperty("max-width", "100%");
        }
      });
    }
    ajustarDesbordes();
    var temporizador = 0;
    window.addEventListener("resize", function () {
      window.clearTimeout(temporizador);
      temporizador = window.setTimeout(function () { ajustarDesbordes(); elegirModo(); }, 120);
    });

    host.setAttribute("data-listo", "");
  }
  }

  customElements.define("tai-barra", TaiBarra);
})();

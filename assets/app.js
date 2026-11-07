/* TAI Estudio · índice. JS vanilla, sin dependencias, compatible con file://. */
(function () {
  "use strict";

  var DATOS = window.TAI_DATA;
  if (!DATOS || !DATOS.bloques) return;

  var CLAVE_ESTUDIADOS = "tai.estudiados";
  var CLAVE_TEMA = "tai.tema";
  var CLAVE_ULTIMO = "tai.ultimo";
  var raiz = document.documentElement;
  var movimientoReducido = window.matchMedia("(prefers-reduced-motion: reduce)");
  var esquemaOscuro = window.matchMedia("(prefers-color-scheme: dark)");

  /* ---------- Almacenamiento seguro ---------- */
  function leer(clave) {
    try { return window.localStorage.getItem(clave); } catch (e) { return null; }
  }
  function escribir(clave, valor) {
    try {
      if (valor === null) window.localStorage.removeItem(clave);
      else window.localStorage.setItem(clave, valor);
      return true;
    } catch (e) { return false; }
  }
  function leerEstudiados() {
    var crudo = leer(CLAVE_ESTUDIADOS);
    if (!crudo) return {};
    try {
      var lista = JSON.parse(crudo);
      var mapa = {};
      if (Array.isArray(lista)) lista.forEach(function (c) { if (typeof c === "string") mapa[c] = true; });
      return mapa;
    } catch (e) { return {}; }
  }
  function guardarEstudiados() {
    escribir(CLAVE_ESTUDIADOS, JSON.stringify(Object.keys(estudiados)));
  }

  /* ---------- Modelo ---------- */
  var temas = [];
  var porCodigo = {};
  DATOS.bloques.forEach(function (b) {
    b.temas.forEach(function (t) {
      t.bloque = b.numero;
      t.clave = normalizar(t.codigo + " " + t.nombre + " " + (t.epigrafe || ""));
      temas.push(t);
      porCodigo[t.codigo] = t;
    });
  });
  var disponibles = temas.filter(function (t) { return t.disponible; });
  var estudiados = depurar(leerEstudiados());

  function depurar(mapa) {
    var limpio = {};
    Object.keys(mapa).forEach(function (c) { if (porCodigo[c] && porCodigo[c].disponible) limpio[c] = true; });
    return limpio;
  }

  function normalizar(texto) {
    return String(texto).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  }

  /* ---------- Tema claro / oscuro ---------- */
  function temaEfectivo() {
    var elegido = raiz.dataset.tema;
    if (elegido === "claro" || elegido === "oscuro") return elegido;
    return esquemaOscuro.matches ? "oscuro" : "claro";
  }
  var botonTema = document.querySelector("[data-cambiar-tema]");
  function pintarTema() {
    var efectivo = temaEfectivo();
    raiz.dataset.temaEfectivo = efectivo;
    if (botonTema) {
      botonTema.setAttribute("aria-label", efectivo === "oscuro" ? "Cambiar a tema claro" : "Cambiar a tema oscuro");
    }
    var meta = document.querySelectorAll('meta[name="theme-color"]');
    meta.forEach(function (m) { m.setAttribute("content", efectivo === "oscuro" ? "#12100d" : "#f1ebdd"); });
  }
  function cambiarTema() {
    var nuevo = temaEfectivo() === "oscuro" ? "claro" : "oscuro";
    var aplicar = function () {
      raiz.dataset.tema = nuevo;
      escribir(CLAVE_TEMA, nuevo);
      pintarTema();
    };
    if (document.startViewTransition && !movimientoReducido.matches) document.startViewTransition(aplicar);
    else aplicar();
  }
  if (botonTema) botonTema.addEventListener("click", cambiarTema);
  if (esquemaOscuro.addEventListener) esquemaOscuro.addEventListener("change", pintarTema);
  pintarTema();

  /* ---------- Progreso ---------- */
  function texto(sel, valor) {
    document.querySelectorAll(sel).forEach(function (el) { el.textContent = valor; });
  }
  function dosCifras(n) { return n < 10 ? "0" + n : String(n); }

  function pintarProgreso(recien) {
    var total = Object.keys(estudiados).length;
    texto("[data-total-estudiados]", dosCifras(total));
    texto("[data-total-disponibles]", dosCifras(disponibles.length));
    texto("[data-total-pendientes]", dosCifras(disponibles.filter(function (t) { return !estudiados[t.codigo]; }).length));

    document.querySelectorAll(".perforar").forEach(function (boton) {
      var c = boton.dataset.codigo;
      var activo = !!estudiados[c];
      boton.setAttribute("aria-pressed", activo ? "true" : "false");
      if (recien === c && activo && !movimientoReducido.matches) {
        boton.classList.remove("recien");
        void boton.offsetWidth;
        boton.classList.add("recien");
      }
    });
    document.querySelectorAll(".tira__c").forEach(function (c) {
      if (estudiados[c.dataset.codigo]) c.setAttribute("data-estudiado", ""); else c.removeAttribute("data-estudiado");
    });
    document.querySelectorAll(".col").forEach(function (col) {
      if (estudiados[col.dataset.codigo]) col.setAttribute("data-estudiado", "");
      else col.removeAttribute("data-estudiado");
      if (recien === col.dataset.codigo && estudiados[recien] && !movimientoReducido.matches) {
        col.classList.remove("recien");
        void col.offsetWidth;
        col.classList.add("recien");
      }
    });
    DATOS.bloques.forEach(function (b) {
      var hechos = b.temas.filter(function (t) { return estudiados[t.codigo]; }).length;
      var cab = document.getElementById("bloque-" + b.numero);
      if (!cab) return;
      var barra = cab.querySelector(".progreso__barra");
      if (barra) barra.style.setProperty("--p", String(hechos / b.temas.length));
      var txt = cab.querySelector("[data-progreso-txt]");
      if (txt) txt.textContent = hechos + " de " + b.temas.length + " perforados";
      var pista = cab.querySelector(".progreso__pista");
      if (pista) pista.setAttribute("aria-valuenow", String(hechos));
    });
    var pendientes = disponibles.filter(function (t) { return !estudiados[t.codigo]; });
    texto('[data-cuenta="disponibles"]', String(disponibles.length));
    texto('[data-cuenta="pendientes"]', String(pendientes.length));
    pintarSiguiente(pendientes);
  }

  function pintarSiguiente(pendientes) {
    var nodo = document.querySelector("[data-siguiente]");
    if (!nodo) return;
    if (!disponibles.length) { nodo.hidden = true; return; }
    var orden = Object.keys(estudiados);
    var ultimo = orden.length ? orden[orden.length - 1] : null;
    var t = pendientes[0];
    if (ultimo && t) {
      var desde = disponibles.indexOf(porCodigo[ultimo]);
      for (var k = 1; k <= disponibles.length; k++) {
        var cand = disponibles[(desde + k) % disponibles.length];
        if (!estudiados[cand.codigo]) { t = cand; break; }
      }
    }
    var etiqueta = "Continúa por";
    if (!t) { t = disponibles[0]; etiqueta = "Todo lo disponible, perforado · repasa"; }
    else if (!Object.keys(estudiados).length) etiqueta = "Empieza por";
    nodo.innerHTML = "";
    var a = document.createElement("a");
    a.href = t.href;
    a.innerHTML = '<span><span class="siguiente__eti"></span><br><span class="siguiente__txt"></span></span><span class="siguiente__flecha" aria-hidden="true">→</span>';
    a.querySelector(".siguiente__eti").textContent = etiqueta;
    a.querySelector(".siguiente__txt").textContent = t.codigo + " · " + t.nombre;
    nodo.appendChild(a);
    nodo.hidden = false;
  }

  document.addEventListener("click", function (ev) {
    var boton = ev.target.closest(".perforar");
    if (!boton) return;
    var c = boton.dataset.codigo;
    if (!porCodigo[c] || !porCodigo[c].disponible) return;
    if (estudiados[c]) delete estudiados[c]; else estudiados[c] = true;
    guardarEstudiados();
    pintarProgreso(c);
    aplicarFiltro(false);
  });

  var borrar = document.querySelector("[data-borrar-progreso]");
  if (borrar) borrar.addEventListener("click", function () {
    if (!Object.keys(estudiados).length) return;
    if (!window.confirm("¿Borrar el progreso guardado en este navegador? Las perforaciones no se pueden recuperar.")) return;
    estudiados = {};
    escribir(CLAVE_ESTUDIADOS, null);
    pintarProgreso();
    aplicarFiltro(false);
  });

  window.addEventListener("storage", function (ev) {
    if (ev.key === CLAVE_ESTUDIADOS) { estudiados = depurar(leerEstudiados()); pintarProgreso(); aplicarFiltro(false); }
    if (ev.key === CLAVE_TEMA) {
      var t = leer(CLAVE_TEMA);
      if (t === "claro" || t === "oscuro") raiz.dataset.tema = t; else delete raiz.dataset.tema;
      pintarTema();
    }
  });
  /* Al volver con «atrás» desde un resumen, la página puede salir de la caché bfcache */
  window.addEventListener("pageshow", function (ev) {
    if (ev.persisted) { estudiados = depurar(leerEstudiados()); pintarProgreso(); aplicarFiltro(false); }
  });

  /* ---------- Filtro ---------- */
  var filtroActual = "todos";
  function aplicarFiltro(animar) {
    var j = 0;
    document.querySelectorAll(".tema").forEach(function (fila) {
      var c = fila.dataset.codigo;
      var t = porCodigo[c];
      var visible = filtroActual === "todos" ||
        (filtroActual === "disponibles" && t.disponible) ||
        (filtroActual === "pendientes" && t.disponible && !estudiados[c]);
      fila.hidden = !visible;
      fila.classList.remove("entra");
      if (visible && animar && !movimientoReducido.matches) {
        void fila.offsetWidth;
        fila.style.setProperty("--j", String(Math.min(j++, 12)));
        fila.classList.add("entra");
      }
    });
    document.querySelectorAll(".bloque").forEach(function (b) {
      var alguna = b.querySelector(".tema:not([hidden])");
      var vacio = b.querySelector(".bloque__vacio");
      if (vacio) vacio.hidden = !!alguna;
    });
  }
  document.querySelectorAll('input[name="filtro"]').forEach(function (r) {
    r.addEventListener("change", function () {
      if (!r.checked) return;
      filtroActual = r.value;
      aplicarFiltro(true);
    });
  });

  /* ---------- Ficha: lectura al pasar el puntero ---------- */
  var lectura = document.querySelector("[data-lectura]");
  var lecturaInicial = lectura ? lectura.innerHTML : "";
  var colActiva = null;
  function leerColumna(col) {
    if (colActiva) colActiva.classList.remove("es-activa");
    colActiva = col;
    if (!lectura) return;
    if (!col) { lectura.innerHTML = lecturaInicial; return; }
    col.classList.add("es-activa");
    var t = porCodigo[col.dataset.codigo];
    lectura.textContent = "";
    var b = document.createElement("b");
    b.textContent = t.codigo;
    lectura.appendChild(b);
    lectura.appendChild(document.createTextNode(" " + t.nombre + " — " +
      (t.disponible ? (estudiados[t.codigo] ? "perforado" : "disponible, pulsa para abrir") : "próximamente")));
  }
  var ficha = document.querySelector(".ficha");
  if (ficha) {
    ficha.addEventListener("pointerover", function (ev) {
      var col = ev.target.closest(".col");
      if (col && col !== colActiva) leerColumna(col);
    });
    ficha.addEventListener("pointerleave", function () { if (!ficha.contains(document.activeElement)) leerColumna(null); });
    ficha.addEventListener("focusin", function (ev) {
      var col = ev.target.closest(".col");
      if (col) leerColumna(col);
    });
    ficha.addEventListener("focusout", function (ev) { if (!ficha.contains(ev.relatedTarget)) leerColumna(null); });
    ficha.addEventListener("click", function (ev) {
      var col = ev.target.closest(".col");
      if (col && col.tagName !== "A") leerColumna(col);
    });
  }

  /* Por debajo de 75rem las columnas miden menos de 24 px (WCAG 2.5.8): la ficha queda como
     atajo táctil/ratón y su equivalente accesible es el índice, con objetivos de tamaño completo. */
  var fichaAncha = window.matchMedia("(min-width: 75rem)");
  function accesibilidadFicha() {
    if (!ficha) return;
    var ancha = fichaAncha.matches;
    var zonas = ficha.querySelector("[data-zonas]");
    if (zonas) { if (ancha) zonas.removeAttribute("aria-hidden"); else zonas.setAttribute("aria-hidden", "true"); }
    ficha.querySelectorAll("a.col").forEach(function (a) {
      if (ancha) a.removeAttribute("tabindex"); else a.setAttribute("tabindex", "-1");
    });
  }
  accesibilidadFicha();
  if (fichaAncha.addEventListener) fichaAncha.addEventListener("change", accesibilidadFicha);

  /* ---------- Cabecera: se retira al bajar y vuelve al subir ---------- */
  var cabecera = document.querySelector(".cabecera");
  var ultimaY = 0; // leer scrollY aquí forzaría un layout síncrono antes de la primera pintura
  var pendienteScroll = false;
  window.addEventListener("scroll", function () {
    if (pendienteScroll || !cabecera) return;
    pendienteScroll = true;
    window.requestAnimationFrame(function () {
      pendienteScroll = false;
      var y = window.scrollY;
      if (y < 120 || y < ultimaY - 8) cabecera.classList.remove("oculta");
      else if (y > ultimaY + 8 && !(dialogo && dialogo.open)) cabecera.classList.add("oculta");
      if (Math.abs(y - ultimaY) > 8) ultimaY = y;
    });
  }, { passive: true });

  /* ---------- Vuelta desde un resumen recién perforado: la ficha lo celebra ---------- */
  function celebrarVuelta() {
    var crudo = leer(CLAVE_ULTIMO);
    if (!crudo) return;
    escribir(CLAVE_ULTIMO, null);
    var dato;
    try { dato = JSON.parse(crudo); } catch (e) { return; }
    if (!dato || !estudiados[dato.codigo] || Date.now() - dato.t > 30 * 60 * 1000) return;
    var col = document.querySelector('.col[data-codigo="' + dato.codigo + '"]');
    if (!col) return;
    window.setTimeout(function () {
      if (!movimientoReducido.matches) { col.classList.remove("recien"); void col.offsetWidth; col.classList.add("recien"); }
      var quedan = disponibles.filter(function (t) { return !estudiados[t.codigo]; }).length;
      if (lectura) {
        lectura.textContent = "";
        var b = document.createElement("b"); b.textContent = dato.codigo + " perforado.";
        lectura.appendChild(b);
        lectura.appendChild(document.createTextNode(quedan ? " Te quedan " + quedan + " de los disponibles." : " Todo lo disponible está perforado."));
        lecturaInicial = lectura.innerHTML;
      }
    }, movimientoReducido.matches ? 0 : 1900);
  }

  /* ---------- Búsqueda rápida (Ctrl/Cmd + K) ---------- */
  var esMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  if (esMac) texto("[data-atajo]", "⌘ K");

  var dialogo = document.querySelector(".busqueda");
  var entrada = document.querySelector("[data-busqueda-entrada]");
  var lista = document.getElementById("busqueda-lista");
  var vacio = document.querySelector("[data-busqueda-vacio]");
  var resultados = [];
  var activo = -1;
  var origenFoco = null;

  function resaltar(texto, terminos) {
    var frag = document.createDocumentFragment();
    var n = normalizar(texto);
    var marcas = [];
    terminos.forEach(function (p) {
      if (!p) return;
      var i = n.indexOf(p);
      while (i >= 0) { marcas.push([i, i + p.length]); i = n.indexOf(p, i + p.length); }
    });
    marcas.sort(function (x, y) { return x[0] - y[0]; });
    var pos = 0;
    marcas.forEach(function (m) {
      if (m[0] < pos) return;
      frag.appendChild(document.createTextNode(texto.slice(pos, m[0])));
      var mk = document.createElement("mark");
      mk.textContent = texto.slice(m[0], m[1]);
      frag.appendChild(mk);
      pos = m[1];
    });
    frag.appendChild(document.createTextNode(texto.slice(pos)));
    return frag;
  }
  var aviso = document.querySelector("[data-busqueda-aviso]");

  function buscar() {
    var consulta = normalizar(entrada.value.trim());
    var compacta = consulta.replace(/[\s·.\-_]/g, "");
    resultados = temas.filter(function (t) {
      if (!consulta) return true;
      if (normalizar(t.codigo).indexOf(compacta) === 0) return true;
      return consulta.split(/\s+/).every(function (p) { return t.clave.indexOf(p) >= 0; });
    });
    resultados.sort(function (a, b) {
      var ca = normalizar(a.codigo) === compacta ? 0 : 1;
      var cb = normalizar(b.codigo) === compacta ? 0 : 1;
      if (ca !== cb) return ca - cb;
      return (b.disponible ? 1 : 0) - (a.disponible ? 1 : 0);
    });
    lista.textContent = "";
    resultados.forEach(function (t, i) {
      var li = document.createElement("li");
      li.className = "resultado";
      li.id = "res-" + t.codigo;
      li.setAttribute("role", "option");
      li.setAttribute("aria-disabled", t.disponible ? "false" : "true");
      li.setAttribute("aria-selected", "false");
      li.dataset.indice = String(i);
      var cod = document.createElement("span"); cod.className = "resultado__cod"; cod.textContent = t.codigo;
      var terminos = consulta ? consulta.split(/\s+/) : [];
      var nom = document.createElement("span"); nom.className = "resultado__nombre"; nom.appendChild(resaltar(t.nombre, terminos));
      if (t.epigrafe && terminos.length && terminos.some(function (p) { return normalizar(t.epigrafe).indexOf(p) >= 0 && normalizar(t.nombre).indexOf(p) < 0; })) {
        var epi = document.createElement("span"); epi.className = "resultado__epi";
        epi.appendChild(resaltar(t.epigrafe, terminos));
        nom.appendChild(epi);
      }
      var est = document.createElement("span"); est.className = "resultado__estado";
      est.textContent = t.disponible ? (estudiados[t.codigo] ? "Perforado" : "Disponible") : "Próximamente";
      li.appendChild(cod); li.appendChild(nom); li.appendChild(est);
      lista.appendChild(li);
    });
    vacio.hidden = resultados.length > 0;
    if (!resultados.length) vacio.textContent = "Ningún tema coincide con «" + entrada.value.trim() + "».";
    var primero = -1;
    for (var k = 0; k < resultados.length; k++) { if (resultados[k].disponible) { primero = k; break; } }
    marcar(primero);
    if (aviso) aviso.textContent = "";
  }

  function marcar(i) {
    var previo = lista.querySelector(".es-activo");
    if (previo) { previo.classList.remove("es-activo"); previo.setAttribute("aria-selected", "false"); }
    activo = i;
    if (i < 0 || !resultados[i]) { entrada.removeAttribute("aria-activedescendant"); return; }
    var li = lista.children[i];
    li.classList.add("es-activo");
    li.setAttribute("aria-selected", "true");
    entrada.setAttribute("aria-activedescendant", li.id);
    li.scrollIntoView({ block: "nearest" });
  }

  function abrirResultado(i) {
    var t = resultados[i];
    if (t && !t.disponible && aviso) { aviso.textContent = t.codigo + " · " + t.nombre + " aún no tiene resumen."; return; }
    if (!t || !t.disponible) return;
    window.location.href = t.href;
  }

  function abrirBusqueda() {
    if (!dialogo || dialogo.open) return;
    origenFoco = document.activeElement;
    entrada.value = "";
    buscar();
    dialogo.showModal();
    entrada.focus();
  }
  function cerrarBusqueda() { if (dialogo && dialogo.open) dialogo.close(); }

  if (dialogo) {
    document.querySelectorAll("[data-abrir-busqueda]").forEach(function (b) { b.addEventListener("click", abrirBusqueda); });
    entrada.addEventListener("input", buscar);
    entrada.addEventListener("keydown", function (ev) {
      if (ev.key === "ArrowDown") { ev.preventDefault(); if (resultados.length) marcar((activo + 1) % resultados.length); }
      else if (ev.key === "ArrowUp") { ev.preventDefault(); if (resultados.length) marcar((activo - 1 + resultados.length) % resultados.length); }
      else if (ev.key === "Home" && ev.ctrlKey) { ev.preventDefault(); marcar(0); }
      else if (ev.key === "Enter") {
        ev.preventDefault();
        if (activo < 0 && resultados.length && aviso) aviso.textContent = "Ninguno de estos temas tiene resumen todavía.";
        else abrirResultado(activo);
      }
    });
    lista.addEventListener("pointermove", function (ev) {
      var li = ev.target.closest(".resultado");
      if (li && Number(li.dataset.indice) !== activo) marcar(Number(li.dataset.indice));
    });
    lista.addEventListener("click", function (ev) {
      var li = ev.target.closest(".resultado");
      if (li) abrirResultado(Number(li.dataset.indice));
    });
    dialogo.addEventListener("click", function (ev) { if (ev.target === dialogo) cerrarBusqueda(); });
    dialogo.addEventListener("close", function () {
      if (origenFoco && origenFoco.focus) origenFoco.focus();
    });
  }
  document.addEventListener("keydown", function (ev) {
    if ((ev.ctrlKey || ev.metaKey) && !ev.altKey && (ev.key === "k" || ev.key === "K")) {
      ev.preventDefault();
      if (dialogo && dialogo.open) cerrarBusqueda(); else abrirBusqueda();
    }
  });

  /* ---------- Llegada desde un resumen (#tema-B1T1): resaltar fila ---------- */
  function resaltarDestino() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (id.indexOf("tema-") !== 0) return;
    var fila = document.getElementById(id);
    if (!fila) return;
    var enlace = fila.querySelector("a.tema__enlace");
    if (enlace) enlace.focus({ preventScroll: true });
  }

  pintarProgreso();
  aplicarFiltro(false);
  resaltarDestino();
  celebrarVuelta();
})();

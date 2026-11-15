/* =====================================================================
   Dicionário de Dados — Gestão Inteligente (Holanda Seguros)
   Recursos: navegação dinâmica, busca em tempo real, tema claro/escuro
   e visualizador do DER com zoom e pan (Panzoom.js, com alternativa
   própria caso a biblioteca não carregue).
   ===================================================================== */
(function () {
  "use strict";

  /* ---------------------------------------------------------------
     1. Tema claro / escuro (preferência salva no navegador)
     --------------------------------------------------------------- */
  var CHAVE_TEMA = "dicionario-gestao-inteligente-tema";
  var raiz = document.documentElement;
  var botaoTema = document.getElementById("botao-tema");

  function lerTemaSalvo() {
    try { return localStorage.getItem(CHAVE_TEMA); } catch (e) { return null; }
  }
  function salvarTema(tema) {
    try { localStorage.setItem(CHAVE_TEMA, tema); } catch (e) { /* armazenamento indisponível */ }
  }
  function aplicarTema(tema) {
    raiz.setAttribute("data-tema", tema);
    var escuro = tema === "escuro";
    botaoTema.setAttribute("aria-pressed", escuro ? "true" : "false");
    botaoTema.querySelector(".texto").textContent = escuro ? "Modo claro" : "Modo escuro";
    botaoTema.querySelector(".icone-lua").style.display = escuro ? "none" : "";
    botaoTema.querySelector(".icone-sol").style.display = escuro ? "" : "none";
  }
  var temaInicial = lerTemaSalvo() ||
    (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro");
  aplicarTema(temaInicial);
  botaoTema.addEventListener("click", function () {
    var novo = raiz.getAttribute("data-tema") === "escuro" ? "claro" : "escuro";
    aplicarTema(novo);
    salvarTema(novo);
  });

  /* ---------------------------------------------------------------
     2. Sidebar gerada dinamicamente a partir das seções de tabela
     --------------------------------------------------------------- */
  var secoes = Array.prototype.slice.call(document.querySelectorAll("section.tabela-dic"));
  var navTabelas = document.getElementById("nav-tabelas");
  var linksPorId = {};
  var blocos = {};

  secoes.forEach(function (secao) {
    var bloco = secao.getAttribute("data-bloco");
    if (!blocos[bloco]) {
      var titulo = document.createElement("h2");
      titulo.textContent = bloco;
      var lista = document.createElement("ul");
      navTabelas.appendChild(titulo);
      navTabelas.appendChild(lista);
      blocos[bloco] = { titulo: titulo, lista: lista };
    }
    var nome = secao.getAttribute("data-tabela");
    var qtd = secao.querySelectorAll("tbody tr").length;
    var li = document.createElement("li");
    var a = document.createElement("a");
    a.href = "#" + secao.id;
    a.innerHTML = '<span class="mono">' + nome + '</span><span class="contagem">' + qtd + "</span>";
    li.appendChild(a);
    blocos[bloco].lista.appendChild(li);
    linksPorId[secao.id] = a;
  });

  document.getElementById("total-tabelas").textContent = secoes.length;
  document.getElementById("total-colunas").textContent = document.querySelectorAll("section.tabela-dic tbody tr").length;

  // Menu responsivo
  var sidebar = document.getElementById("sidebar");
  var fundoMenu = document.getElementById("fundo-menu");
  var botaoMenu = document.getElementById("botao-menu");
  function fecharMenu() {
    sidebar.classList.remove("aberta");
    fundoMenu.classList.remove("visivel");
    botaoMenu.setAttribute("aria-expanded", "false");
  }
  botaoMenu.addEventListener("click", function () {
    var abrir = !sidebar.classList.contains("aberta");
    sidebar.classList.toggle("aberta", abrir);
    fundoMenu.classList.toggle("visivel", abrir);
    botaoMenu.setAttribute("aria-expanded", abrir ? "true" : "false");
  });
  fundoMenu.addEventListener("click", fecharMenu);
  sidebar.addEventListener("click", function (ev) {
    if (ev.target.closest("a")) { fecharMenu(); }
  });

  // Destaque da tabela visível no menu
  if ("IntersectionObserver" in window) {
    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (entrada.isIntersecting) {
          Object.keys(linksPorId).forEach(function (id) { linksPorId[id].classList.remove("ativo"); });
          var link = linksPorId[entrada.target.id];
          if (link) { link.classList.add("ativo"); }
        }
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    secoes.forEach(function (s) { observador.observe(s); });
  }

  /* ---------------------------------------------------------------
     3. Busca em tempo real por nome de tabela ou de coluna
     --------------------------------------------------------------- */
  var campoBusca = document.getElementById("busca");
  var caixaBusca = campoBusca.parentElement;
  var botaoLimpar = document.getElementById("limpar-busca");
  var resultado = document.getElementById("resultado-busca");
  var vazio = document.getElementById("sem-resultados");

  function normalizar(texto) {
    return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  function escaparHtml(texto) {
    return texto.replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function marcar(elemento, termo) {
    var original = elemento.getAttribute("data-original");
    if (original === null) {
      original = elemento.textContent;
      elemento.setAttribute("data-original", original);
    }
    if (!termo) { elemento.textContent = original; return; }
    var pos = normalizar(original).indexOf(termo);
    if (pos < 0) { elemento.textContent = original; return; }
    elemento.innerHTML = escaparHtml(original.slice(0, pos)) + "<mark>" +
      escaparHtml(original.slice(pos, pos + termo.length)) + "</mark>" +
      escaparHtml(original.slice(pos + termo.length));
  }

  function filtrar() {
    var termo = normalizar(campoBusca.value.trim());
    caixaBusca.classList.toggle("com-texto", termo.length > 0);
    var tabelasVisiveis = 0;
    var colunasVisiveis = 0;

    secoes.forEach(function (secao) {
      var nomeTabela = secao.getAttribute("data-tabela");
      var tituloTabela = secao.querySelector("header h2");
      var tabelaCombina = termo === "" || normalizar(nomeTabela).indexOf(termo) >= 0;
      var linhas = secao.querySelectorAll("tbody tr");
      var linhasCombinam = 0;

      Array.prototype.forEach.call(linhas, function (linha) {
        var celula = linha.querySelector("td.atributo");
        var colunaCombina = termo === "" || normalizar(linha.getAttribute("data-coluna")).indexOf(termo) >= 0;
        var mostrar = tabelaCombina || colunaCombina;
        linha.classList.toggle("oculta", !mostrar);
        marcar(celula, colunaCombina && termo !== "" ? termo : "");
        if (mostrar) { linhasCombinam++; }
      });

      var mostrarSecao = tabelaCombina || linhasCombinam > 0;
      secao.classList.toggle("oculta", !mostrarSecao);
      marcar(tituloTabela, tabelaCombina && termo !== "" ? termo : "");
      var link = linksPorId[secao.id];
      if (link) { link.classList.toggle("oculto", !mostrarSecao); }
      if (mostrarSecao) {
        tabelasVisiveis++;
        colunasVisiveis += linhasCombinam;
      }
    });

    Object.keys(blocos).forEach(function (nome) {
      var temVisivel = blocos[nome].lista.querySelector("a:not(.oculto)") !== null;
      blocos[nome].titulo.style.display = temVisivel ? "" : "none";
    });

    vazio.classList.toggle("visivel", tabelasVisiveis === 0);
    resultado.textContent = termo === "" ? "" :
      tabelasVisiveis + (tabelasVisiveis === 1 ? " tabela" : " tabelas") + " e " +
      colunasVisiveis + (colunasVisiveis === 1 ? " coluna exibida" : " colunas exibidas") +
      ' para "' + campoBusca.value.trim() + '".';
  }

  campoBusca.addEventListener("input", filtrar);
  botaoLimpar.addEventListener("click", function () {
    campoBusca.value = "";
    filtrar();
    campoBusca.focus();
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "/" && document.activeElement !== campoBusca && !modal.classList.contains("aberto")) {
      ev.preventDefault();
      campoBusca.focus();
    }
  });

  /* ---------------------------------------------------------------
     4. Modal do DER com zoom e pan
     --------------------------------------------------------------- */
  var modal = document.getElementById("modal-der");
  var areaZoom = document.getElementById("area-zoom");
  var imagemDer = document.getElementById("imagem-der");
  var nivelZoom = document.getElementById("nivel-zoom");
  var botaoAbrir = document.getElementById("abrir-der");
  var botaoFechar = document.getElementById("fechar-der");
  var controlador = null;

  // Escala 1 = imagem ajustada à área visível (CSS object-fit: contain)
  function mostrarNivel(escala) {
    nivelZoom.textContent = "Zoom: " + Math.round(escala * 100) + "%";
  }

  // 4.1 Controlador baseado na biblioteca Panzoom.js
  function criarComPanzoom() {
    var pz = window.Panzoom(imagemDer, {
      maxScale: 12,
      minScale: 0.5,
      step: 0.35,
      canvas: true,
      exclude: Array.prototype.slice.call(document.querySelectorAll(".controles-zoom button"))
    });
    function aoMudar(ev) { mostrarNivel(ev.detail.scale); }
    areaZoom.addEventListener("wheel", pz.zoomWithWheel, { passive: false });
    imagemDer.addEventListener("panzoomchange", aoMudar);
    mostrarNivel(1);
    return {
      maisZoom: function () { pz.zoomIn(); },
      menosZoom: function () { pz.zoomOut(); },
      reset: function () { pz.reset(); mostrarNivel(1); },
      destruir: function () {
        areaZoom.removeEventListener("wheel", pz.zoomWithWheel);
        imagemDer.removeEventListener("panzoomchange", aoMudar);
        pz.destroy();
        imagemDer.style.transform = "";
      }
    };
  }

  // 4.2 Controlador alternativo (lógica própria equivalente)
  function criarControladorProprio() {
    var estado = { escala: 1, x: 0, y: 0 };
    var arrastando = false, inicio = null, minimo = 0.5, maximo = 12;
    var ponteiros = {}, distanciaInicial = 0, escalaPinca = 1;

    function aplicar() {
      imagemDer.style.transform = "translate(" + estado.x + "px," + estado.y + "px) scale(" + estado.escala + ")";
      mostrarNivel(estado.escala);
    }
    function zoomEm(novaEscala, cx, cy) {
      novaEscala = Math.max(minimo, Math.min(maximo, novaEscala));
      var fator = novaEscala / estado.escala;
      estado.x = cx - (cx - estado.x) * fator;
      estado.y = cy - (cy - estado.y) * fator;
      estado.escala = novaEscala;
      aplicar();
    }
    function centro() { return { x: areaZoom.clientWidth / 2, y: areaZoom.clientHeight / 2 }; }
    function reset() {
      estado.escala = 1; estado.x = 0; estado.y = 0;
      aplicar();
    }
    function aoRolar(ev) {
      ev.preventDefault();
      var r = areaZoom.getBoundingClientRect();
      zoomEm(estado.escala * (ev.deltaY < 0 ? 1.15 : 1 / 1.15), ev.clientX - r.left, ev.clientY - r.top);
    }
    function aoPressionar(ev) {
      if (ev.target.closest(".controles-zoom")) { return; }
      ponteiros[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
      areaZoom.setPointerCapture(ev.pointerId);
      var ids = Object.keys(ponteiros);
      if (ids.length === 2) {
        var a = ponteiros[ids[0]], b = ponteiros[ids[1]];
        distanciaInicial = Math.hypot(a.x - b.x, a.y - b.y);
        escalaPinca = estado.escala;
        arrastando = false;
      } else {
        arrastando = true;
        inicio = { x: ev.clientX - estado.x, y: ev.clientY - estado.y };
      }
    }
    function aoMover(ev) {
      if (!ponteiros[ev.pointerId]) { return; }
      ponteiros[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
      var ids = Object.keys(ponteiros);
      if (ids.length === 2 && distanciaInicial > 0) {
        var a = ponteiros[ids[0]], b = ponteiros[ids[1]];
        var r = areaZoom.getBoundingClientRect();
        zoomEm(escalaPinca * Math.hypot(a.x - b.x, a.y - b.y) / distanciaInicial,
          (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      } else if (arrastando) {
        estado.x = ev.clientX - inicio.x;
        estado.y = ev.clientY - inicio.y;
        aplicar();
      }
    }
    function aoSoltar(ev) {
      delete ponteiros[ev.pointerId];
      arrastando = false;
      distanciaInicial = 0;
    }
    areaZoom.addEventListener("wheel", aoRolar, { passive: false });
    areaZoom.addEventListener("pointerdown", aoPressionar);
    areaZoom.addEventListener("pointermove", aoMover);
    areaZoom.addEventListener("pointerup", aoSoltar);
    areaZoom.addEventListener("pointercancel", aoSoltar);
    imagemDer.style.transformOrigin = "0 0";
    reset();
    return {
      maisZoom: function () { var c = centro(); zoomEm(estado.escala * 1.25, c.x, c.y); },
      menosZoom: function () { var c = centro(); zoomEm(estado.escala / 1.25, c.x, c.y); },
      reset: reset,
      destruir: function () {
        areaZoom.removeEventListener("wheel", aoRolar);
        areaZoom.removeEventListener("pointerdown", aoPressionar);
        areaZoom.removeEventListener("pointermove", aoMover);
        areaZoom.removeEventListener("pointerup", aoSoltar);
        areaZoom.removeEventListener("pointercancel", aoSoltar);
        imagemDer.style.transform = "";
      }
    };
  }

  function iniciarZoom() {
    if (controlador) { controlador.destruir(); }
    controlador = typeof window.Panzoom === "function" ? criarComPanzoom() : criarControladorProprio();
  }

  function abrirModal() {
    modal.classList.add("aberto");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    if (imagemDer.complete && imagemDer.naturalWidth > 0) {
      iniciarZoom();
    } else {
      imagemDer.addEventListener("load", iniciarZoom, { once: true });
    }
    botaoFechar.focus();
  }
  function fecharModal() {
    modal.classList.remove("aberto");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (controlador) { controlador.destruir(); controlador = null; }
    botaoAbrir.focus();
  }

  botaoAbrir.addEventListener("click", abrirModal);
  botaoFechar.addEventListener("click", fecharModal);
  document.getElementById("zoom-mais").addEventListener("click", function () { if (controlador) { controlador.maisZoom(); } });
  document.getElementById("zoom-menos").addEventListener("click", function () { if (controlador) { controlador.menosZoom(); } });
  document.getElementById("zoom-reset").addEventListener("click", function () { if (controlador) { controlador.reset(); } });
  document.addEventListener("keydown", function (ev) {
    if (!modal.classList.contains("aberto")) { return; }
    if (ev.key === "Escape") { fecharModal(); }
    else if (ev.key === "+" || ev.key === "=") { controlador.maisZoom(); }
    else if (ev.key === "-") { controlador.menosZoom(); }
    else if (ev.key === "0") { controlador.reset(); }
  });
  window.addEventListener("resize", function () {
    if (modal.classList.contains("aberto") && controlador) { controlador.reset(); }
  });
})();

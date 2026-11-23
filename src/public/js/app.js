/* =============================================================================
   Cafetería Origen — lógica del sitio público
   ============================================================================= */
(function () {
  'use strict';

  var API = '/api';
  var CARRITO_KEY = 'origen.carrito';
  var tokenCsrfPromise = null;

  var estado = {
    tipo: '',
    variedad: '',
    q: '',
    carrito: cargarCarrito(),
  };

  /* ============================================================
   * SECCIÓN 1: UTILIDADES, API, CSRF Y PERSISTENCIA DEL CARRITO
   *
   * COMMIT RECOMENDADO:
   * refactor: organizar utilidades y peticiones del cliente
   * ============================================================ */
  /* ============================================================
   * CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
   * Funcionalidad: selección de elementos y formato de moneda
   * ============================================================ */
  function $(sel) { return document.querySelector(sel); }

  function money(valor) {
    var n = Number(valor || 0);
    return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
  }

  function raw(valor) {
    return String(valor == null ? '' : valor).replace(/[&<>"']/g, function (caracter) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[caracter];
    });
  }

  function renderHtml(elemento, html) {
    var rango = document.createRange();
    rango.selectNodeContents(elemento);
    elemento.replaceChildren(rango.createContextualFragment(html));
  }

  function api(url, opciones) {
    var opcionesSolicitud = opciones || {};
    var metodo = (opcionesSolicitud.method || 'GET').toUpperCase();
    var escritura = ['POST', 'PUT', 'PATCH', 'DELETE'].indexOf(metodo) !== -1;
    var token = escritura ? obtenerTokenCsrf() : Promise.resolve('');

    return token.then(function (valorToken) {
      if (valorToken) {
        opcionesSolicitud = Object.assign({}, opcionesSolicitud, {
          headers: Object.assign({}, opcionesSolicitud.headers || {}, { 'X-CSRF-Token': valorToken }),
        });
      }
      return fetch(API + url, opcionesSolicitud).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return { ok: res.ok, status: res.status, data: data };
        });
      });
    });
  }

  function obtenerTokenCsrf() {
    if (!tokenCsrfPromise) {
      tokenCsrfPromise = fetch(API + '/csrf-token')
        .then(function (res) { return res.json(); })
        .then(function (data) { return data.token || ''; });
    }
    return tokenCsrfPromise;
  }

  function postJSON(url, cuerpo) {
    return api(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo || {}),
    });
  }

  /* ============================================================
   * CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
   * Funcionalidad: persistencia local del carrito
   * ============================================================ */
  function guardarCarrito() {
    try {
      localStorage.setItem(CARRITO_KEY, JSON.stringify(estado.carrito));
    } catch (e) { /* almacenamiento no disponible */ }
  }

  function cargarCarrito() {
    try {
      return JSON.parse(localStorage.getItem(CARRITO_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  /* ============================================================
   * SECCIÓN 2: CONSULTA Y PRESENTACIÓN DEL CATÁLOGO
   *
   * COMMIT RECOMENDADO:
   * feat: mostrar catálogo y aplicar filtros de búsqueda
   * ============================================================ */
  /* ============================================================
   * CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
   * Funcionalidad: construcción de la consulta del catálogo
   * ============================================================ */
  function urlCatalogo() {
    var params = new URLSearchParams();
    if (estado.tipo) params.set('tipo', estado.tipo);
    if (estado.variedad) params.set('variedad', estado.variedad);
    if (estado.q) params.set('q', estado.q);
    var s = params.toString();
    return '/productos' + (s ? '?' + s : '');
  }

  function cargarProductos() {
    return api(urlCatalogo()).then(function (resp) {
      if (!resp.ok) {
        renderErrorProductos(resp.data && resp.data.error);
        return;
      }
      renderProductos(resp.data.productos);
      renderResultado(resp.data.filtros, resp.data.total);
    });
  }

  function renderProductos(productos) {
    var grid = $('#productos-grid');

    if (!productos || productos.length === 0) {
      renderHtml(grid, '<p class="empty">No encontramos productos con esos filtros.</p>');
      return;
    }

    renderHtml(grid, productos.map(function (p) {
      window.__productos[p.id] = p;
      var tags = '<span class="tag">' + raw(p.tipo) + '</span>';
      if (p.variedad) tags += '<span class="tag tag-origen">' + raw(p.variedad) + '</span>';
      if (p.tamano) tags += '<span class="tag">' + raw(p.tamano) + '</span>';

      return '' +
        '<article class="product-card">' +
        '  <div class="product-top">' +
        '    <h3 class="product-name">' + raw(p.nombre) + '</h3>' +
        '    <span class="product-price">' + money(p.precio) + '</span>' +
        '  </div>' +
        '  <div class="product-tags">' + tags + '</div>' +
        '  <p class="product-desc">' + raw(p.descripcion) + '</p>' +
        '  <button class="btn btn-ghost btn-agregar" data-id="' + raw(p.id) + '">Agregar</button>' +
        '</article>';
    }).join(''));
  }

  function renderResultado(filtros, total) {
    var el = $('#resultado-busqueda');
    if (filtros && filtros.q) {
      renderHtml(el, 'Resultados para <strong>' + raw(filtros.q) + '</strong> — ' + total + ' producto(s)');
    } else {
      el.textContent = total + ' producto(s) en el menú';
    }
  }

  function renderErrorProductos(mensaje) {
    renderHtml($('#productos-grid'), '<p class="empty">No se pudo cargar el menú: ' + raw(mensaje || 'error desconocido') + '</p>');
  }

  /* ============================================================
   * SECCIÓN 3: GESTIÓN DEL CARRITO Y SUS CANTIDADES
   *
   * COMMIT RECOMENDADO:
   * feat: gestionar productos y cantidades del carrito
   * ============================================================ */
  /* ============================================================
   * CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
   * Funcionalidad: incorporación de productos al carrito
   * ============================================================ */
  function agregarAlCarrito(productoId) {
    var existente = null;
    for (var i = 0; i < estado.carrito.length; i++) {
      if (String(estado.carrito[i].id) === String(productoId)) existente = estado.carrito[i];
    }
    if (existente) {
      existente.cantidad += 1;
    } else {
      estado.carrito.push({
        id: productoId,
        nombre: window.__productos[productoId] ? window.__productos[productoId].nombre : 'Producto',
        precio: window.__productos[productoId] ? window.__productos[productoId].precio : 0,
        cantidad: 1,
      });
    }
    guardarCarrito();
    renderCarrito();
  }

  /* ============================================================
   * CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
   * Funcionalidad: ajuste de cantidades en el carrito
   * ============================================================ */
  function cambiarCantidad(indice, delta) {
    var item = estado.carrito[indice];
    if (!item) return;
    item.cantidad += delta;
    if (item.cantidad <= 0) estado.carrito.splice(indice, 1);
    guardarCarrito();
    renderCarrito();
  }

  /* ============================================================
   * CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
   * Funcionalidad: eliminación de productos del carrito
   * ============================================================ */
  function quitarDelCarrito(indice) {
    estado.carrito.splice(indice, 1);
    guardarCarrito();
    renderCarrito();
  }

  function renderCarrito() {
    var cont = $('#carrito');
    var lista = $('#resumen-carrito');
    var total = 0;

    if (estado.carrito.length === 0) {
      renderHtml(cont, '<p class="empty">El carrito está vacío.</p>');
      lista.replaceChildren();
      $('#resumen-total').textContent = money(0);
      return;
    }

    renderHtml(cont, estado.carrito.map(function (item, i) {
      var subtotal = item.precio * item.cantidad;
      total += subtotal;
      return '' +
        '<div class="cart-item">' +
        '  <div>' +
        '    <div class="cart-item-name">' + raw(item.nombre) + '</div>' +
        '    <div class="cart-item-meta">' + money(item.precio) + ' c/u</div>' +
        '  </div>' +
        '  <div class="qty-control">' +
        '    <button type="button" data-acc="menos" data-i="' + i + '">&minus;</button>' +
        '    <span>' + item.cantidad + '</span>' +
        '    <button type="button" data-acc="mas" data-i="' + i + '">+</button>' +
        '  </div>' +
        '  <div>' +
        '    <div class="cart-item-price">' + money(subtotal) + '</div>' +
        '    <button type="button" class="link-danger" data-acc="quitar" data-i="' + i + '">Quitar</button>' +
        '  </div>' +
        '</div>';
    }).join(''));

    renderHtml(lista, estado.carrito.map(function (item) {
      return '<li><span>' + raw(item.nombre) + ' × ' + item.cantidad + '</span><span>' +
        money(item.precio * item.cantidad) + '</span></li>';
    }).join(''));

    $('#resumen-total').textContent = money(total);
  }

  /* ============================================================
   * SECCIÓN 4: ENVÍO DE PEDIDOS
   *
   * COMMIT RECOMENDADO:
   * feat: enviar pedidos desde el sitio público
   * ============================================================ */
  function enviarPedido(evento) {
    evento.preventDefault();
    var feedback = $('#pedido-feedback');
    feedback.className = 'form-feedback';
    feedback.textContent = 'Enviando…';

    postJSON('/pedidos', {
      mesa: $('#pedido-mesa').value,
      cliente: $('#pedido-cliente').value,
      items: estado.carrito.map(function (item) {
        return { productoId: item.id, cantidad: item.cantidad };
      }),
    }).then(function (resp) {
      if (!resp.ok) {
        feedback.className = 'form-feedback is-error';
        feedback.textContent = 'No pudimos enviar el pedido: ' + (resp.data.error || 'error desconocido');
        return;
      }
      feedback.className = 'form-feedback is-ok';
      feedback.textContent = '¡Pedido #' + resp.data.id + ' recibido! Total ' + money(resp.data.total) +
        '. Te atendemos en la mesa ' + resp.data.mesa + '.';
      estado.carrito = [];
      guardarCarrito();
      renderCarrito();
      $('#form-pedido').reset();
    }).catch(function () {
      feedback.className = 'form-feedback is-error';
      feedback.textContent = 'Error de conexión con el servidor.';
    });
  }

  /* ============================================================
   * SECCIÓN 5: CARGA Y PUBLICACIÓN DE RESEÑAS
   *
   * COMMIT RECOMENDADO:
   * feat: publicar y mostrar reseñas de clientes
   * ============================================================ */
  function cargarReseñas() {
    return api('/comentarios').then(function (resp) {
      var cont = $('#lista-resenas');
      if (!resp.ok || !resp.data.comentarios || resp.data.comentarios.length === 0) {
        renderHtml(cont, '<p class="empty">Todavía no hay reseñas. ¡Sé el primero!</p>');
        return;
      }
      renderHtml(cont, resp.data.comentarios.map(function (c) {
        var estrellas = '';
        var i;
        for (i = 0; i < Number(c.calificacion || 0); i++) estrellas += '★';
        return '' +
          '<article class="review">' +
          '  <div class="review-head">' +
          '    <span class="review-author">' + raw(c.autor) + '</span>' +
          '    <span class="review-stars">' + estrellas + '</span>' +
          '  </div>' +
          '  <p class="review-text">' + raw(c.texto) + '</p>' +
          '</article>';
      }).join(''));
    });
  }

  function enviarReseña(evento) {
    evento.preventDefault();
    var feedback = $('#resena-feedback');
    feedback.className = 'form-feedback';
    feedback.textContent = 'Publicando…';

    postJSON('/comentarios', {
      autor: $('#resena-autor').value,
      texto: $('#resena-texto').value,
      calificacion: Number($('#resena-calificacion').value),
    }).then(function (resp) {
      if (!resp.ok) {
        feedback.className = 'form-feedback is-error';
        feedback.textContent = 'No se pudo publicar: ' + (resp.data.error || 'error desconocido');
        return;
      }
      feedback.className = 'form-feedback is-ok';
      feedback.textContent = '¡Gracias por tu reseña!';
      $('#form-resena').reset();
      cargarReseñas();
    });
  }

  /* ============================================================
   * SECCIÓN 6: EVENTOS E INICIALIZACIÓN DEL SITIO
   *
   * COMMIT RECOMENDADO:
   * refactor: centralizar eventos e inicio del sitio
   * ============================================================ */
  /* ============================================================
   * CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
   * Funcionalidad: eventos e inicialización del sitio público
   * ============================================================ */
  function init() {
    window.__productos = {};

    // Filtros
    document.querySelectorAll('.chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        document.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('is-active'); });
        chip.classList.add('is-active');
        estado.tipo = chip.getAttribute('data-tipo');
        cargarProductos();
      });
    });

    $('#filtro-variedad').addEventListener('change', function (e) {
      estado.variedad = e.target.value;
      cargarProductos();
    });

    var temporizador = null;
    $('#filtro-busqueda').addEventListener('input', function (e) {
      estado.q = e.target.value;
      clearTimeout(temporizador);
      temporizador = setTimeout(cargarProductos, 250);
    });

    // Carrito (delegación de eventos)
    $('#productos-grid').addEventListener('click', function (e) {
      var btn = e.target.closest('.btn-agregar');
      if (!btn) return;
      agregarAlCarrito(btn.getAttribute('data-id'));
    });

    $('#carrito').addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      var i = Number(btn.getAttribute('data-i'));
      var accion = btn.getAttribute('data-acc');
      if (accion === 'mas') cambiarCantidad(i, 1);
      else if (accion === 'menos') cambiarCantidad(i, -1);
      else if (accion === 'quitar') quitarDelCarrito(i);
    });

    $('#form-pedido').addEventListener('submit', enviarPedido);
    $('#form-resena').addEventListener('submit', enviarReseña);

    // Carga inicial
    api(urlCatalogo()).then(function (resp) {
      if (resp.ok) {
        (resp.data.productos || []).forEach(function (p) { window.__productos[p.id] = p; });
        renderProductos(resp.data.productos);
        renderResultado(resp.data.filtros, resp.data.total);
      } else {
        renderErrorProductos(resp.data.error);
      }
    });
    cargarReseñas();
    renderCarrito();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

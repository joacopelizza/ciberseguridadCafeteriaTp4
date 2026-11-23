/* =============================================================================
   Cafetería Origen — lógica del panel de administración
   ============================================================================= */
(function () {
  'use strict';

  var API = '/api';
  var usuario = null;
  var productosCache = {};
  var tokenCsrfPromise = null;

  /* ============================================================
   * SECCIÓN 1: UTILIDADES, PETICIONES API Y PROTECCIÓN CSRF
   *
   * COMMIT RECOMENDADO:
   * refactor: organizar utilidades y peticiones del panel
   * ============================================================ */
  /* ============================================================
   * CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
   * Funcionalidad: selección de elementos y formato de moneda
   * ============================================================ */
  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  function money(valor) {
    return Number(valor || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
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

  /* ============================================================
   * CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
   * Funcionalidad: auxiliares para solicitudes JSON del panel
   * ============================================================ */
  function postJSON(url, cuerpo) {
    return api(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo || {}),
    });
  }

  function putJSON(url, cuerpo) {
    return api(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo || {}),
    });
  }

  function patchJSON(url, cuerpo) {
    return api(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo || {}),
    });
  }

  function feedback(el, mensaje, ok) {
    el.className = 'form-feedback ' + (ok ? 'is-ok' : 'is-error');
    el.textContent = mensaje;
  }

  /* ============================================================
   * SECCIÓN 2: AUTENTICACIÓN Y CONTROL DE LA SESIÓN
   *
   * COMMIT RECOMENDADO:
   * security: proteger acceso y cierre de sesión del panel
   * ============================================================ */
  function iniciarSesion(evento) {
    evento.preventDefault();
    var caja = $('#login-feedback');
    caja.className = 'form-feedback';

    postJSON('/auth/login', {
      username: $('#login-usuario').value,
      password: $('#login-password').value,
    }).then(function (resp) {
      if (!resp.ok) {
        feedback(caja, 'No pudimos iniciar sesión: ' + (resp.data.error || 'error desconocido'), false);
        return;
      }
      usuario = resp.data.usuario;
      mostrarPanel();
    });
  }

  function cerrarSesion() {
    postJSON('/auth/logout', {}).then(function () {
      usuario = null;
      $('#vista-login').hidden = false;
      $('#vista-panel').hidden = true;
      $('#admin-user').replaceChildren();
    });
  }

  function mostrarPanel() {
    if (!usuario || usuario.rol !== 'admin') {
      $('#vista-login').hidden = false;
      $('#vista-panel').hidden = true;
      feedback($('#login-feedback'), 'Tu cuenta no tiene permisos para el panel.', false);
      return;
    }

    $('#vista-login').hidden = true;
    $('#vista-panel').hidden = false;
    $( '#admin-user' ).textContent = 'Sesi\u00f3n de ' + usuario.nombre + ' \u00b7 rol: ' + usuario.rol;
    $('#panel-bienvenida').textContent = 'Hola, ' + usuario.nombre;
    cargarTodo();
  }

  function cargarTodo() {
    cargarResumen();
    cargarPedidos();
    cargarProductos();
    cargarReportes();
    cargarUsuarios();
  }

  /* ============================================================
   * SECCIÓN 3: RESUMEN Y MÉTRICAS DEL PANEL
   *
   * COMMIT RECOMENDADO:
   * feat: mostrar métricas y últimos pedidos
   * ============================================================ */
  function cargarResumen() {
    api('/reportes/facturacion').then(function (f) {
      api('/reportes/mas-vendido').then(function (m) {
        api('/reportes/cantidad-vendida').then(function (c) {
          var mas = m.data.producto;
          var kpis = [
            { label: 'Facturación total', value: money(f.data.facturado) },
            { label: 'Pedidos registrados', value: f.data.pedidos },
            {
              label: 'Producto más vendido',
              value: mas ? raw(mas.nombre) : '—',
            },
            {
              label: 'Unidades por tipo',
              value: Object.keys(c.data.cantidadVendida || {})
                .map(function (k) { return k + ': ' + c.data.cantidadVendida[k]; })
                .join(' · ') || '—',
            },
          ];

          renderHtml($('#kpis'), kpis.map(function (k) {
            return '<div class="kpi"><div class="kpi-label">' + raw(k.label) + '</div>' +
              '<div class="kpi-value">' + raw(k.value) + '</div></div>';
          }).join(''));
        });
      });
    });
  }

  /* ============================================================
   * SECCIÓN 4: CONSULTA Y ACTUALIZACIÓN DE PEDIDOS
   *
   * COMMIT RECOMENDADO:
   * feat: administrar pedidos desde el panel
   * ============================================================ */
  /* ============================================================
   * CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
   * Funcionalidad: construcción de las filas de pedidos
   * ============================================================ */
  function tablaPedidos(filas, conAcciones) {
    if (!filas || filas.length === 0) return '<p class="empty">No hay pedidos.</p>';

    var html = '<thead><tr><th>#</th><th>Mesa</th><th>Cliente</th><th>Estado</th>' +
      '<th class="num">Total</th><th>Fecha</th>' + (conAcciones ? '<th>Acciones</th>' : '') + '</tr></thead><tbody>';

    filas.forEach(function (p) {
      html += '<tr>' +
        '<td>' + raw(p.id) + '</td>' +
        '<td>' + raw(p.mesa) + '</td>' +
        '<td>' + raw(p.cliente) + '</td>' +
        '<td><span class="badge badge-' + raw(p.estado) + '">' + raw(p.estado) + '</span></td>' +
        '<td class="num">' + money(p.total) + '</td>' +
        '<td>' + new Date(p.creado_en).toLocaleString('es-AR') + '</td>' +
        (conAcciones
          ? '<td><select data-pedido="' + raw(p.id) + '" class="sel-estado">' +
            ['abierto', 'preparando', 'listo', 'entregado'].map(function (e) {
              return '<option value="' + e + '"' + (e === p.estado ? ' selected' : '') + '>' + e + '</option>';
            }).join('') +
            '</select></td>'
          : '') +
        '</tr>';
    });

    return html + '</tbody>';
  }

  function cargarPedidos() {
    api('/pedidos').then(function (resp) {
      var pedidos = resp.data.pedidos || [];
      renderHtml($('#tabla-pedidos'), tablaPedidos(pedidos, true));
      renderHtml($('#tabla-ultimos'), tablaPedidos(pedidos.slice(0, 5), false));
    });
  }

  /* ============================================================
   * CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
   * Funcionalidad: selección y actualización del estado de un pedido
   * ============================================================ */
  function cambiarEstado(evento) {
    var select = evento.target.closest('.sel-estado');
    if (!select) return;
    var id = select.getAttribute('data-pedido');
    patchJSON('/pedidos/' + id + '/estado', { estado: select.value }).then(function (resp) {
      if (!resp.ok) {
        alert('No se pudo cambiar el estado: ' + (resp.data.error || 'error'));
      }
      cargarPedidos();
    });
  }

  /* ============================================================
   * SECCIÓN 5: ALTA, EDICIÓN Y BAJA DE PRODUCTOS
   *
   * COMMIT RECOMENDADO:
   * feat: gestionar el catálogo desde el panel
   * ============================================================ */
  function cargarProductos() {
    api('/productos').then(function (resp) {
      var productos = resp.data.productos || [];
      productosCache = {};
      var html = '<thead><tr><th>#</th><th>Nombre</th><th>Tipo</th><th>Origen</th>' +
        '<th class="num">Precio</th><th>Acciones</th></tr></thead><tbody>';

      productos.forEach(function (p) {
        productosCache[p.id] = p;
        html += '<tr>' +
          '<td>' + raw(p.id) + '</td>' +
          '<td>' + raw(p.nombre) + '</td>' +
          '<td>' + raw(p.tipo) + '</td>' +
          '<td>' + raw(p.variedad || '—') + '</td>' +
          '<td class="num">' + money(p.precio) + '</td>' +
          '<td><button class="link-danger" data-borrar="' + raw(p.id) + '">Borrar</button></td>' +
          '</tr>';
      });

      renderHtml($('#tabla-productos'), html + '</tbody>');
    });
  }

  /* ============================================================
   * CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
   * Funcionalidad: envío del formulario de alta y edición de productos
   * ============================================================ */
  function guardarProducto(evento) {
    evento.preventDefault();
    var caja = $('#producto-feedback');
    var id = $('#producto-id').value;

    var cuerpo = {
      nombre: $('#p-nombre').value,
      tipo: $('#p-tipo').value,
      variedad: $('#p-variedad').value || null,
      tamano: $('#p-tamano').value || null,
      gramos: $('#p-gramos').value ? Number($('#p-gramos').value) : null,
      precio_base: Number($('#p-precio-base').value || 0),
      precio_por_gramo: Number($('#p-precio-gramo').value || 0),
      descripcion: $('#p-descripcion').value,
    };

    var peticion = id ? putJSON('/admin/productos/' + id, cuerpo) : postJSON('/admin/productos', cuerpo);

    peticion.then(function (resp) {
      if (!resp.ok) {
        feedback(caja, 'No se pudo guardar: ' + (resp.data.error || 'error desconocido'), false);
        return;
      }
      feedback(caja, 'Producto guardado correctamente.', true);
      $('#form-producto').reset();
      $('#producto-id').value = '';
      cargarProductos();
    });
  }

  function borrarProducto(evento) {
    var btn = evento.target.closest('[data-borrar]');
    if (!btn) return;
    var id = btn.getAttribute('data-borrar');
    if (!confirm('¿Borrar el producto #' + id + '?')) return;

    api('/admin/productos/' + id, { method: 'DELETE' }).then(function (resp) {
      if (!resp.ok) alert('No se pudo borrar: ' + (resp.data.error || 'error'));
      cargarProductos();
    });
  }

  function limpiarFormularioProducto() {
    $('#form-producto').reset();
    $('#producto-id').value = '';
  }

  /* ============================================================
   * SECCIÓN 6: SUBIDA DE IMÁGENES
   *
   * COMMIT RECOMENDADO:
   * feat: subir imágenes del catálogo desde el panel
   * ============================================================ */
  /* ============================================================
   * CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
   * Funcionalidad: lectura y envío de una imagen desde el panel
   * ============================================================ */
  function subirArchivo(evento) {
    evento.preventDefault();
    var caja = $('#upload-feedback');
    var input = $('#archivo-subida');
    if (!input.files || !input.files[0]) {
      feedback(caja, 'Elegí un archivo primero.', false);
      return;
    }

    var archivo = input.files[0];
    var lector = new FileReader();

    lector.onload = function () {
      var base64 = String(lector.result).split(',')[1] || '';
      postJSON('/admin/subir-archivo', {
        nombre: archivo.name,
        contenidoBase64: base64,
      }).then(function (resp) {
        if (!resp.ok) {
          feedback(caja, 'No se pudo subir: ' + (resp.data.error || 'error desconocido'), false);
          return;
        }
        feedback(caja, 'Archivo subido a ' + resp.data.url, true);
      });
    };

    lector.readAsDataURL(archivo);
  }

  /* ============================================================
   * SECCIÓN 7: CONSULTA DE REPORTES DE VENTAS
   *
   * COMMIT RECOMENDADO:
   * feat: mostrar métricas y ventas por origen
   * ============================================================ */
  function cargarReportes() {
    api('/reportes/facturacion').then(function (f) {
      api('/reportes/ticket-promedio').then(function (t) {
        api('/reportes/mas-vendido').then(function (m) {
          var mas = m.data.producto;
          var kpis = [
            { label: 'Facturación', value: money(f.data.facturado) },
            { label: 'Pedidos', value: f.data.pedidos },
            { label: 'Ticket promedio', value: money(t.data.promedio) },
            { label: 'Más vendido', value: mas ? raw(mas.nombre) + ' (' + raw(mas.unidades) + ')' : '—' },
          ];
          renderHtml($('#kpis-reportes'), kpis.map(function (k) {
            return '<div class="kpi"><div class="kpi-label">' + raw(k.label) + '</div>' +
              '<div class="kpi-value">' + raw(k.value) + '</div></div>';
          }).join(''));
        });
      });
    });
  }

  function consultarVentas() {
    var caja = $('#reporte-feedback');
    var variedad = $('#reporte-variedad').value;

    api('/reportes/ventas-por-variedad?variedad=' + encodeURIComponent(variedad)).then(function (resp) {
      if (!resp.ok) {
        feedback(caja, 'Error: ' + (resp.data.error || 'desconocido'), false);
        $('#tabla-ventas').replaceChildren();
        return;
      }
      var ventas = resp.data.ventas || [];
      var html = '<thead><tr><th>Origen</th><th>Producto</th><th class="num">Unidades</th>' +
        '<th class="num">Total</th></tr></thead><tbody>';
      ventas.forEach(function (v) {
        html += '<tr><td>' + raw(v.variedad) + '</td><td>' + raw(v.nombre) + '</td>' +
          '<td class="num">' + raw(v.unidades) + '</td><td class="num">' + money(v.total) + '</td></tr>';
      });
      renderHtml($('#tabla-ventas'), html + '</tbody>');
      feedback(caja, 'Consulta realizada.', true);
    });
  }

  /* ============================================================
   * SECCIÓN 8: GESTIÓN DE USUARIOS Y CONTRASEÑA
   *
   * COMMIT RECOMENDADO:
   * security: administrar usuarios y cambios de contraseña
   * ============================================================ */
  function cargarUsuarios() {
    api('/admin/usuarios').then(function (resp) {
      var usuarios = resp.data.usuarios || [];
      var html = '<thead><tr><th>#</th><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Acciones</th></tr></thead><tbody>';
      usuarios.forEach(function (u) {
        html += '<tr>' +
          '<td>' + raw(u.id) + '</td>' +
          '<td>' + raw(u.username) + '</td>' +
          '<td>' + raw(u.nombre) + '</td>' +
          '<td><span class="badge' + (u.rol === 'admin' ? ' badge-admin' : '') + '">' + raw(u.rol) + '</span></td>' +
          '<td><select data-usuario="' + raw(u.id) + '" class="sel-rol">' +
            ['cliente', 'mozo', 'barista', 'admin'].map(function (r) {
              return '<option value="' + r + '"' + (r === u.rol ? ' selected' : '') + '>' + r + '</option>';
            }).join('') +
            '</select></td>' +
          '</tr>';
      });
      renderHtml($('#tabla-usuarios'), html + '</tbody>');
    });
  }

  function cambiarRol(evento) {
    var select = evento.target.closest('.sel-rol');
    if (!select) return;
    var id = select.getAttribute('data-usuario');

    putJSON('/admin/usuarios/' + id, { rol: select.value }).then(function (resp) {
      if (!resp.ok) alert('No se pudo actualizar: ' + (resp.data.error || 'error'));
      cargarUsuarios();
    });
  }

  function cambiarPassword(evento) {
    evento.preventDefault();
    var caja = $('#password-feedback');
    postJSON('/admin/cambiar-contrasena', { nueva: $('#nueva-password').value }).then(function (resp) {
      if (!resp.ok) {
        feedback(caja, 'No se pudo cambiar: ' + (resp.data.error || 'error desconocido'), false);
        return;
      }
      feedback(caja, 'Contraseña actualizada.', true);
      $('#nueva-password').value = '';
    });
  }

  /* ============================================================
   * SECCIÓN 9: HERRAMIENTAS DE CONEXIÓN Y DIAGNÓSTICO
   *
   * COMMIT RECOMENDADO:
   * security: limitar herramientas administrativas del servidor
   * ============================================================ */
  function probarConexion(evento) {
    evento.preventDefault();
    var salida = $('#salida-conexion');
    salida.textContent = 'Probando…';

    postJSON('/admin/probar-conexion', { host: $('#conexion-host').value }).then(function (resp) {
      if (!resp.ok) {
        salida.textContent = 'Error: ' + (resp.data.error || 'desconocido');
        return;
      }
      salida.textContent =
        '$ ping ' + $('#conexion-host').value + '\n\n' +
        (resp.data.salida || '') +
        (resp.data.error ? '\n[stderr]\n' + resp.data.error : '');
    });
  }

  function verDiagnostico() {
    var salida = $('#salida-diagnostico');
    salida.textContent = 'Cargando…';
    api('/_diagnostico').then(function (resp) {
      salida.textContent = JSON.stringify(resp.data, null, 2);
    });
  }

  /* ============================================================
   * SECCIÓN 10: NAVEGACIÓN ENTRE PESTAÑAS
   *
   * COMMIT RECOMENDADO:
   * feat: navegar por las secciones del panel
   * ============================================================ */
  /* ============================================================
   * CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
   * Funcionalidad: navegación entre pestañas del panel
   * ============================================================ */
  function activarTab(evento) {
    var tab = evento.target.closest('.tab');
    if (!tab) return;
    var vista = tab.getAttribute('data-vista');
    $$('.tab').forEach(function (t) { t.classList.remove('is-active'); });
    tab.classList.add('is-active');
    $$('.tab-panel').forEach(function (p) {
      p.classList.toggle('is-active', p.getAttribute('data-panel') === vista);
    });
  }

  /* ============================================================
   * SECCIÓN 11: REGISTRO DE EVENTOS E INICIO DEL PANEL
   *
   * COMMIT RECOMENDADO:
   * refactor: centralizar la inicialización del panel
   * ============================================================ */
  function init() {
    // FALLA (XSS de DOM): se lee un parámetro de la URL y se inyecta con
    // código en el navegador del admin.
    var params = new URLSearchParams(window.location.search);
    var objetivo = params.get('vista');
    if (objetivo) {
      $('#panel-bienvenida').textContent = 'Panel ' + objetivo;
    }

    /* ============================================================
     * CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
     * Funcionalidad: registro de eventos e identificación de la sesión actual
     * ============================================================ */
    $('#form-login').addEventListener('submit', iniciarSesion);
    $('#btn-logout').addEventListener('click', cerrarSesion);
    $('#btn-refrescar').addEventListener('click', cargarTodo);
    $('#tabs').addEventListener('click', activarTab);
    $('#tabla-pedidos').addEventListener('change', cambiarEstado);
    $('#tabla-productos').addEventListener('click', borrarProducto);
    $('#form-producto').addEventListener('submit', guardarProducto);
    $('#btn-limpiar-producto').addEventListener('click', limpiarFormularioProducto);
    $('#form-upload').addEventListener('submit', subirArchivo);
    $('#form-password').addEventListener('submit', cambiarPassword);
    $('#btn-reporte-variedad').addEventListener('click', consultarVentas);
    $('#tabla-usuarios').addEventListener('change', cambiarRol);
    $('#form-conexion').addEventListener('submit', probarConexion);
    $('#btn-diagnostico').addEventListener('click', verDiagnostico);

    // ¿Ya hay sesión?
    api('/auth/yo').then(function (resp) {
      if (resp.ok) {
        usuario = resp.data.usuario;
        mostrarPanel();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

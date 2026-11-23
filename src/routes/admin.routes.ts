import express from 'express';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';

import config from '../config';
import * as catalogo from '../services/catalogo.service';
import * as usuarios from '../services/usuarios.service';
import { requiereSesion, requiereRol } from '../middleware/auth';
import type { Usuario } from '../tipos';
import { idPositivo, valoresValidos } from '../validacion';

const router = express.Router();

// ============================================================
// SECCIÓN 1: REGLAS DE VALIDACIÓN PARA HERRAMIENTAS Y ARCHIVOS
//
// COMMIT RECOMENDADO:
// security: definir límites y formatos permitidos en el panel
// ============================================================
const MAX_SIZE = 512 * 1024;
const HOSTS_PERMITIDOS = new Set(['localhost', '127.0.0.1', 'proveedor.origen.com']);
const MIME_POR_EXTENSION: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

function coincideFirma(extension: string, buffer: Buffer): boolean {
  if (extension === '.png') {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (extension === '.jpg' || extension === '.jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (extension === '.webp') {
    return buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  }
  return false;
}

// ============================================================
// SECCIÓN 2: CONTROL DE ACCESO A TODAS LAS RUTAS ADMINISTRATIVAS
//
// COMMIT RECOMENDADO:
// security: proteger el panel con sesión y rol administrador
// ============================================================
/** Todas las rutas del panel requieren sesiÃ³n y rol de administrador. */
router.use(requiereSesion);
router.use(requiereRol('admin'));

// ============================================================
// SECCIÓN 3: CONSULTA Y ACTUALIZACIÓN DE USUARIOS
//
// COMMIT RECOMENDADO:
// security: administrar usuarios y restringir cambios de rol
// ============================================================
/** GET /api/admin/usuarios */
router.get('/usuarios', async (req, res, next) => {
  // ============================================================
  // CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
  // Funcionalidad: consulta de usuarios para el panel
  // ============================================================
  try {
    res.json({ usuarios: await usuarios.listar() });
  } catch (err) {
    next(err);
  }
});

/** PUT /api/admin/usuarios/:id â€” solo administradores pueden cambiar roles. */
router.put('/usuarios/:id', async (req, res, next) => {
  try {
    const id = idPositivo(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID de usuario no vÃ¡lido.' });
    const { username, nombre, rol, password } = req.body || {};
    if (rol !== undefined && req.usuario && req.usuario.rol !== 'admin') {
      return res.status(403).json({ error: 'Sólo un administrador puede cambiar roles.' });
    }
    const cambios: Partial<Usuario> = {};
    if (username !== undefined) cambios.username = username;
    if (nombre !== undefined) cambios.nombre = nombre;
    if (rol !== undefined) cambios.rol = rol;
    if (password !== undefined) cambios.password = password;

    const usuario = await usuarios.actualizar(id, cambios);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    res.json(usuario);
  } catch (err) {
    next(err);
  }
});

// ============================================================
// SECCIÓN 4: ALTA, EDICIÓN Y BAJA LÓGICA DE PRODUCTOS
//
// COMMIT RECOMENDADO:
// feat: gestionar productos desde el panel administrativo
// ============================================================
/** POST /api/admin/productos â€” alta de producto. */
router.post('/productos', async (req, res, next) => {
  // ============================================================
  // CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
  // Funcionalidad: alta de productos desde el panel
  // ============================================================
  try {
    const producto = await catalogo.crear(req.body || {});
    res.status(201).json(producto);
  } catch (err) {
    // El nombre del producto es Ãºnico en la base.
    if ((err as { code?: string }).code === '23505') {
      return res.status(409).json({ error: 'Ya existe un producto con ese nombre.' });
    }
    next(err);
  }
});

/** PUT /api/admin/productos/:id */
router.put('/productos/:id', async (req, res, next) => {
  try {
    const id = idPositivo(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID de producto no vÃ¡lido.' });
    const producto = await catalogo.actualizar(id, req.body || {});
    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }
    res.json(producto);
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/admin/productos/:id — requiere rol admin y token CSRF. */
router.delete('/productos/:id', async (req, res, next) => {
  try {
    const id = idPositivo(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID de producto no vÃ¡lido.' });
    const producto = await catalogo.eliminar(id);
    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }
    res.json(producto);
  } catch (err) {
    next(err);
  }
});

// ============================================================
// SECCIÓN 5: CAMBIO DE CONTRASEÑA DE LA CUENTA ACTUAL
//
// COMMIT RECOMENDADO:
// security: permitir actualizar la contraseña con bcrypt
// ============================================================
/** POST /api/admin/cambiar-contrasena — almacena la nueva clave con bcrypt. */
router.post('/cambiar-contrasena', async (req, res, next) => {
  try {
    const { nueva } = req.body || {};
    if (typeof nueva !== 'string' || nueva.length < 12 || nueva.length > 128) {
      return res.status(400).json({ error: 'La contrasena debe tener entre 12 y 128 caracteres.' });
    }
    // (`req.usuario!`: requiereSesion ya garantizÃ³ que hay un usuario.)
    const usuario = await usuarios.cambiarPassword(req.usuario!.id, nueva);
    res.json({ mensaje: 'ContraseÃ±a actualizada.', usuario });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// SECCIÓN 6: PRUEBA SEGURA DE CONEXIÓN AL PROVEEDOR
//
// COMMIT RECOMENDADO:
// security: limitar destinos y ejecutar ping sin shell
// ============================================================
/** Prueba un host autorizado sin invocar una shell. */
router.post('/probar-conexion', (req, res) => {
  const { host } = req.body || {};
  if (typeof host !== 'string' || !HOSTS_PERMITIDOS.has(host)) {
    return res.status(400).json({ error: 'Host no permitido.' });
  }

  const proceso = spawn('ping', ['-c', '3', host], { shell: false });
  let salida = '';
  let errorSalida = '';
  proceso.stdout.setEncoding('utf8');
  proceso.stderr.setEncoding('utf8');
  proceso.stdout.on('data', (fragmento: string) => { salida += fragmento; });
  proceso.stderr.on('data', (fragmento: string) => { errorSalida += fragmento; });
  proceso.on('error', () => res.status(500).json({ error: 'No se pudo probar la conexiÃ³n.' }));
  proceso.on('close', (codigo) => {
    if (res.headersSent) return;
    res.json({ salida, error: codigo === 0 ? null : errorSalida || 'La prueba de conexiÃ³n fallÃ³.' });
  });
});

// ============================================================
// SECCIÓN 7: SUBIDA VALIDADA DE IMÁGENES
//
// COMMIT RECOMENDADO:
// security: validar imágenes antes de guardarlas
// ============================================================
/** Acepta imÃ¡genes de tipos permitidos, verifica su firma y asigna nombre seguro. */
router.post('/subir-archivo', express.json({ limit: '8mb' }), (req, res, next) => {
  try {
    const { nombre, contenidoBase64 } = req.body || {};

    if (typeof nombre !== 'string' || typeof contenidoBase64 !== 'string' || !contenidoBase64) {
      return res.status(400).json({ error: 'Falta el archivo.' });
    }

    const extension = path.extname(nombre).toLowerCase();
    const mime = MIME_POR_EXTENSION[extension];
    const maxBase64 = Math.ceil(MAX_SIZE / 3) * 4;
    if (!mime || !valoresValidos.extensionesImagen.includes(extension as (typeof valoresValidos.extensionesImagen)[number]) || contenidoBase64.length > maxBase64) {
      return res.status(400).json({ error: 'Archivo no vÃ¡lido.' });
    }
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(contenidoBase64)) {
      return res.status(400).json({ error: 'Archivo no vÃ¡lido.' });
    }

    const buffer = Buffer.from(contenidoBase64, 'base64');
    if (buffer.length === 0 || buffer.length > MAX_SIZE || !coincideFirma(extension, buffer)) {
      return res.status(400).json({ error: 'Archivo no vÃ¡lido.' });
    }
    fs.mkdirSync(config.uploadsDir, { recursive: true });

    const nombreSeguro = randomUUID() + extension;
    const destino = path.join(config.uploadsDir, nombreSeguro);
    fs.writeFileSync(destino, buffer);

    res.json({
      mensaje: 'Archivo subido.',
      url: `/uploads/${nombreSeguro}`,
      bytes: buffer.length,
      mime,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

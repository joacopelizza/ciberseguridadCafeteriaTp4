import express from 'express';
import { rateLimit } from 'express-rate-limit';
import * as usuarios from '../services/usuarios.service';
import { crearSesion, destruirSesion, obtenerSesion } from '../middleware/sesion';

const router = express.Router();
const limitarIntentosLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Esperá antes de volver a intentar.' },
});

/**
 * Inicio de sesión.
 *
 * La ruta aplica límite de intentos y devuelve errores genéricos. La
 * verificación con contraseña hasheada se coordina con el servicio de usuarios.
 */
router.post('/login', limitarIntentosLogin, async (req, res, next) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: 'Falta usuario o contraseña.' });
    }

    const usuario = await usuarios.autenticar(username, password);

    if (!usuario) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    crearSesion(req, res, {
      id: usuario.id,
      username: usuario.username,
      rol: usuario.rol,
      nombre: usuario.nombre,
    });

    res.json({
      mensaje: `¡Bienvenido, ${usuario.nombre}!`,
      usuario: {
        id: usuario.id,
        username: usuario.username,
        rol: usuario.rol,
        nombre: usuario.nombre,
      },
    });
  } catch (err) {
    next(err);
  }
});

/** Cierra la sesión en el servidor y limpia la cookie del navegador. */
router.post('/logout', (req, res) => {
  destruirSesion(req);
  res.clearCookie('sid', {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  res.json({ mensaje: 'Sesión cerrada.' });
});

/** Devuelve el usuario de la sesión actual. */
router.get('/yo', (req, res) => {
  const sesion = obtenerSesion(req);
  if (!sesion) {
    return res.status(401).json({ error: 'Necesitás iniciar sesión.' });
  }
  res.json({ usuario: sesion.usuario });
});

export default router;

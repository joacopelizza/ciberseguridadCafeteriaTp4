import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { obtenerSesion } from './sesion';
import type { Rol } from '../tipos';

/**
 * Middlewares de autenticación y autorización.
 *
 * Las rutas de administración requieren el rol admin; las rutas de pedidos
 * restringidas admiten admin, barista y mozo.
 */

// ============================================================
// SECCIÓN 1: AUTENTICACIÓN DE LA PETICIÓN
//
// COMMIT RECOMENDADO:
// security: exigir sesiones válidas en rutas protegidas
// ============================================================
/** Exige que haya una sesión válida. */
// ============================================================
// CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
// Funcionalidad: comprobación de sesión para una petición
// ============================================================
export function requiereSesion(req: Request, res: Response, next: NextFunction) {
  const sesion = obtenerSesion(req);
  if (!sesion) {
    return res.status(401).json({ error: 'Necesitás iniciar sesión.' });
  }
  req.usuario = sesion.usuario;
  req.sesion = sesion;
  next();
}

// ============================================================
// SECCIÓN 2: AUTORIZACIÓN POR ROL
//
// COMMIT RECOMENDADO:
// security: autorizar rutas según el rol del usuario
// ============================================================
/** Exige que el usuario autenticado tenga uno de los roles indicados. */
// ============================================================
// CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
// Funcionalidad: comprobación del rol requerido por una ruta
// ============================================================
export function requiereRol(...roles: Rol[]): RequestHandler {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'Necesitás iniciar sesión.' });
    }
    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tenés permisos para esta operación.' });
    }
    next();
  };
}

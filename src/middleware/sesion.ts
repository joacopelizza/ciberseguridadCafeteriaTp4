/**
 * Sesiones en memoria con identificadores aleatorios y expiración absoluta.
 * La cookie usa HttpOnly y SameSite; Secure se activa en producción para que
 * la demo local sobre HTTP siga funcionando.
 */

import type { Request, Response } from 'express';
import { randomBytes } from 'crypto';

import type { Sesion, UsuarioSesion } from '../tipos';
import config from '../config';

// ============================================================
// SECCIÓN 1: ALMACÉN EN MEMORIA Y LECTURA DE COOKIES
//
// COMMIT RECOMENDADO:
// security: preparar almacenamiento y lectura de sesiones
// ============================================================
// ============================================================
// CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
// Funcionalidad: almacenamiento en memoria de las sesiones
// ============================================================
export const sesiones = new Map<string, Sesion>();
const TIEMPO_SESION = 30 * 60 * 1000;

/** Lee las cookies de la petición (parser mínimo, sin dependencias). */
// ============================================================
// CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
// Funcionalidad: lectura de cookies de la petición
// ============================================================
export function leerCookies(req: Request): Record<string, string> {
  const cookies: Record<string, string> = {};
  const header = req.headers.cookie;
  if (!header) return cookies;
  for (const parte of header.split(';')) {
    const separador = parte.indexOf('=');
    if (separador < 0) continue;
    const nombre = parte.slice(0, separador).trim();
    const valor = parte.slice(separador + 1).trim();
    if (nombre) cookies[nombre] = decodeURIComponent(valor);
  }
  return cookies;
}

// ============================================================
// SECCIÓN 2: CREACIÓN DE SESIONES Y COOKIE SEGURA
//
// COMMIT RECOMENDADO:
// security: crear sesiones aleatorias con expiración
// ============================================================
/** Crea una sesión nueva para el usuario y setea la cookie. */
export function crearSesion(req: Request, res: Response, usuario: UsuarioSesion): string {
  const id = randomBytes(32).toString('hex');
  const creadaEn = Date.now();
  const expiraEn = creadaEn + TIEMPO_SESION;

  for (const [sesionId, sesion] of sesiones) {
    if (sesion.expiraEn <= creadaEn) sesiones.delete(sesionId);
  }

  sesiones.set(id, {
    usuario,
    creadaEn,
    expiraEn,
  });

  res.cookie('sid', id, {
    path: '/',
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: TIEMPO_SESION,
  });

  return id;
}

// ============================================================
// SECCIÓN 3: CONSULTA Y DESTRUCCIÓN DE SESIONES
//
// COMMIT RECOMENDADO:
// security: validar vencimiento e invalidar sesiones cerradas
// ============================================================
/** Devuelve la sesión de la petición, si existe. */
export function obtenerSesion(req: Request): Sesion | null {
  const cookies = leerCookies(req);
  const id = cookies.sid;
  if (!id) return null;
  const sesion = sesiones.get(id);
  if (!sesion) return null;
  if (sesion.expiraEn <= Date.now()) {
    sesiones.delete(id);
    return null;
  }
  return sesion;
}

/** Cierra la sesión en el servidor (debería llamarse en el logout). */
// ============================================================
// CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
// Funcionalidad: eliminación de una sesión del almacenamiento
// ============================================================
export function destruirSesion(req: Request): void {
  const cookies = leerCookies(req);
  const id = cookies.sid;
  if (id) sesiones.delete(id);
}

import { randomBytes, timingSafeEqual } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

import { leerCookies } from './sesion';

// ============================================================
// SECCIÓN 1: EMISIÓN DE TOKENS ANTI-CSRF
//
// COMMIT RECOMENDADO:
// security: emitir tokens anti-CSRF para el cliente
// ============================================================
const METODOS_QUE_CAMBIAN_ESTADO = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Emite un token aleatorio que el cliente debe devolver en las escrituras. */
export function emitirTokenCsrf(req: Request, res: Response): void {
  const cookies = leerCookies(req);
  const token = cookies.csrf || randomBytes(32).toString('hex');

  res.cookie('csrf', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  res.json({ token });
}

// ============================================================
// SECCIÓN 2: VALIDACIÓN DE ORIGEN Y TOKEN EN ESCRITURAS
//
// COMMIT RECOMENDADO:
// security: validar origen y token en peticiones de escritura
// ============================================================
/** Rechaza las peticiones que cambian datos si no presentan el token. */
export function verificarCsrf(req: Request, res: Response, next: NextFunction): void {
  if (!METODOS_QUE_CAMBIAN_ESTADO.has(req.method)) return next();
  const origen = req.get('Origin') || req.get('Referer');
  if (origen) {
    try {
      if (new URL(origen).host !== req.get('host')) {
        res.status(403).json({ error: 'Origen de la petición no permitido.' });
        return;
      }
    } catch {
      res.status(403).json({ error: 'Origen de la petición no permitido.' });
      return;
    }
  }

  const cookieToken = leerCookies(req).csrf;
  const bodyToken = req.body && typeof req.body._csrf === 'string' ? req.body._csrf : '';
  const queryToken = typeof req.query._csrf === 'string' ? req.query._csrf : '';
  const submittedToken = req.get('X-CSRF-Token') || bodyToken || queryToken;

  if (!cookieToken || !submittedToken) {
    res.status(403).json({ error: 'Token anti-CSRF inválido o ausente.' });
    return;
  }

  const cookieBuffer = Buffer.from(cookieToken);
  const submittedBuffer = Buffer.from(submittedToken);

  if (
    cookieBuffer.length !== submittedBuffer.length ||
    !timingSafeEqual(cookieBuffer, submittedBuffer)
  ) {
    res.status(403).json({ error: 'Token anti-CSRF inválido o ausente.' });
    return;
  }

  next();
}

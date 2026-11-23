/** Maneja errores HTTP sin enviar detalles internos ni trazas al cliente. */

import type { NextFunction, Request, Response } from 'express';

import type { ErrorHttp } from '../tipos';

// ============================================================
// SECCIÓN 1: RESPUESTA PARA RUTAS INEXISTENTES
//
// COMMIT RECOMENDADO:
// fix: devolver una respuesta uniforme para rutas inexistentes
// ============================================================
export function rutaNoEncontrada(req: Request, res: Response): void {
  res.status(404).json({ error: 'Ruta no encontrada.' });
}

// ============================================================
// SECCIÓN 2: MANEJO CENTRAL DE ERRORES HTTP
//
// COMMIT RECOMENDADO:
// security: ocultar detalles internos en errores de la API
// ============================================================
// Express reconoce al manejador de errores por sus CUATRO parámetros: `next`
// tiene que estar aunque no se use.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function manejadorErrores(err: ErrorHttp, req: Request, res: Response, next: NextFunction): void {
  console.error('[error]', err);
  res.status(err.status || 500).json({ error: 'Error interno del servidor.' });
}

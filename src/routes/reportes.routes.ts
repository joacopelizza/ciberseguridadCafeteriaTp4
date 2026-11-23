import express from 'express';
import * as reportes from '../services/reportes.service';
import { requiereSesion, requiereRol } from '../middleware/auth';

const router = express.Router();

// ============================================================
// SECCIÓN 1: PROTECCIÓN DE REPORTES ADMINISTRATIVOS
//
// COMMIT RECOMENDADO:
// security: exigir rol administrador para los reportes
// ============================================================
// Los datos de ventas y facturación están reservados a administración.
router.use(requiereSesion, requiereRol('admin'));

// ============================================================
// SECCIÓN 2: CONSULTAS DE FACTURACIÓN, VENTAS Y TICKET PROMEDIO
//
// COMMIT RECOMENDADO:
// feat: consultar métricas y ventas por origen
// ============================================================
/** GET /api/reportes/facturacion — cuánto se facturó. */
// ============================================================
// CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
// Funcionalidad: endpoints de métricas y reportes de ventas
// ============================================================
router.get('/facturacion', async (req, res, next) => {
  try {
    res.json(await reportes.facturacion());
  } catch (err) {
    next(err);
  }
});

/** GET /api/reportes/cantidad-vendida — unidades por tipo de producto. */
router.get('/cantidad-vendida', async (req, res, next) => {
  try {
    res.json({ cantidadVendida: await reportes.cantidadVendidaPorTipo() });
  } catch (err) {
    next(err);
  }
});

/** GET /api/reportes/mas-vendido — producto más vendido. */
router.get('/mas-vendido', async (req, res, next) => {
  try {
    res.json({ producto: await reportes.masVendido() });
  } catch (err) {
    next(err);
  }
});

/** GET /api/reportes/ticket-promedio */
router.get('/ticket-promedio', async (req, res, next) => {
  try {
    res.json(await reportes.ticketPromedio());
  } catch (err) {
    next(err);
  }
});

/** GET /api/reportes/ventas-por-variedad?variedad= — filtra un origen permitido. */
router.get('/ventas-por-variedad', async (req, res, next) => {
  try {
    const variedad = (req.query.variedad as string | undefined) || '';
    res.json({ ventas: await reportes.ventasPorVariedad(variedad) });
  } catch (err) {
    next(err);
  }
});

export default router;

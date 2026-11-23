import express from 'express';
import * as catalogo from '../services/catalogo.service';
import type { FiltrosCatalogo } from '../services/catalogo.service';
import { idPositivo } from '../validacion';

const router = express.Router();

// ============================================================
// SECCIÓN 1: LISTADO PÚBLICO Y FILTROS DEL CATÁLOGO
//
// COMMIT RECOMENDADO:
// feat: consultar el catálogo con filtros validados
// ============================================================
/** GET /api/productos?tipo=&variedad=&q= — catálogo con filtros validados. */
// ============================================================
// CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
// Funcionalidad: listado del catálogo y eco de los filtros
// ============================================================
router.get('/', async (req, res, next) => {
  try {
    const productos = await catalogo.listar(req.query as FiltrosCatalogo);
    res.json({
      productos,
      // Se devuelven los filtros para que la interfaz pueda conservarlos.
      filtros: {
        tipo: req.query.tipo || '',
        variedad: req.query.variedad || '',
        q: req.query.q || '',
      },
      total: productos.length,
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// SECCIÓN 2: OPCIONES DE ORIGEN PARA EL CATÁLOGO
//
// COMMIT RECOMENDADO:
// feat: exponer los orígenes disponibles del catálogo
// ============================================================
/** GET /api/productos/variedades */
// ============================================================
// CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
// Funcionalidad: listado de orígenes disponibles
// ============================================================
router.get('/variedades', async (req, res, next) => {
  try {
    res.json({ variedades: await catalogo.variedades() });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// SECCIÓN 3: DETALLE DE PRODUCTO POR ID
//
// COMMIT RECOMENDADO:
// feat: consultar un producto por identificador
// ============================================================
/**
 * GET /api/productos/:id
 * Devuelve un producto.
 *
 * El id se consulta como parámetro y la respuesta de error no lo refleja.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const id = idPositivo(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID de producto no válido.' });
    const producto = await catalogo.obtener(id);
    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }
    res.json(producto);
  } catch (err) {
    next(err);
  }
});

export default router;

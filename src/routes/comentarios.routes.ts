import express from 'express';
import * as comentarios from '../services/comentarios.service';
import { idPositivo } from '../validacion';
import { requiereRol, requiereSesion } from '../middleware/auth';

const router = express.Router();

/**
 * GET /api/comentarios — reseñas públicas de la cafetería.
 * El cliente escapa el contenido antes de mostrarlo.
 */
router.get('/', async (req, res, next) => {
  try {
    res.json({ comentarios: await comentarios.listar() });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/comentarios
 *
 * La entrada se limita en el servicio y la escritura requiere token CSRF.
 */
router.post('/', async (req, res, next) => {
  try {
    const { autor, texto, calificacion } = req.body || {};
    const comentario = await comentarios.crear({
      autor,
      texto,
      calificacion,
    });
    res.status(201).json(comentario);
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/comentarios/:id */
router.delete('/:id', requiereSesion, requiereRol('admin'), async (req, res, next) => {
  try {
    const id = idPositivo(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID de comentario no válido.' });
    const comentario = await comentarios.eliminar(id);
    if (!comentario) {
      return res.status(404).json({ error: 'Comentario no encontrado.' });
    }
    res.json(comentario);
  } catch (err) {
    next(err);
  }
});

export default router;

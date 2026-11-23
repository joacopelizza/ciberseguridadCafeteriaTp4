import * as db from '../db';
import type { Comentario } from '../tipos';
import { crearErrorHttp } from '../validacion';

/** Datos de una reseña nueva, tal como llegan en el cuerpo de la petición. */
export interface NuevoComentario {
  autor: string;
  texto: string;
  calificacion: number;
}

/**
 * Servicio de comentarios / reseñas de la cafetería.
 *
 * -----------------------------------------------------------------------------
 * Validación de entrada (OWASP A04:2021)
 * -----------------------------------------------------------------------------
 * La creación comprueba longitud de nombre y texto, y limita la calificación.
 *
 * -----------------------------------------------------------------------------
 * Protección frente a Cross-Site Scripting almacenado (OWASP A03:2021)
 * -----------------------------------------------------------------------------
 * El texto se guarda como dato y el cliente lo escapa al construir la vista.
 *
 * La CSP se configura en la aplicación como defensa adicional.
 */

/** Lista todos los comentarios, del más nuevo al más viejo. */
export async function listar(): Promise<Comentario[]> {
  const { rows } = await db.query<Comentario>(
    'SELECT * FROM comentarios ORDER BY id DESC'
  );
  return rows;
}

/** Crea un comentario. */
export async function crear({ autor, texto, calificacion }: NuevoComentario): Promise<Comentario> {
  if (
    typeof autor !== 'string' || autor.trim().length < 2 || autor.trim().length > 40 ||
    typeof texto !== 'string' || texto.trim().length < 3 || texto.trim().length > 1000
  ) {
    throw crearErrorHttp(400, 'El nombre o el texto de la reseña no son válidos.');
  }
  if (!Number.isInteger(calificacion) || calificacion < 1 || calificacion > 5) {
    throw crearErrorHttp(400, 'La calificación debe ser un entero entre 1 y 5.');
  }

  const { rows } = await db.query<Comentario>(
    `INSERT INTO comentarios (autor, texto, calificacion)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [autor, texto, calificacion]
  );
  return rows[0];
}

/** Elimina un comentario. */
export async function eliminar(id: number | string): Promise<Comentario | null> {
  const { rows } = await db.query<Comentario>(
    'DELETE FROM comentarios WHERE id = $1 RETURNING *',
    [id]
  );
  return rows[0] || null;
}

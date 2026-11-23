import * as db from '../db';
import type { Comentario } from '../tipos';
import { crearErrorHttp } from '../validacion';

// ============================================================
// SECCIÓN 1: TIPOS, LECTURA Y CREACIÓN PÚBLICA DE RESEÑAS
//
// COMMIT RECOMENDADO:
// security: validar y guardar reseñas como datos no confiables
// ============================================================
/** Datos de una reseña nueva, tal como llegan en el cuerpo de la petición. */
// ============================================================
// CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
// Funcionalidad: estructura de los datos de una reseña
// ============================================================
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
// ============================================================
// CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
// Funcionalidad: consulta de reseñas ordenadas por fecha
// ============================================================
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

  // ============================================================
  // CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
  // Funcionalidad: inserción parametrizada de una reseña
  // ============================================================
  const { rows } = await db.query<Comentario>(
    `INSERT INTO comentarios (autor, texto, calificacion)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [autor, texto, calificacion]
  );
  return rows[0];
}

// ============================================================
// SECCIÓN 2: ELIMINACIÓN ADMINISTRATIVA DE RESEÑAS
//
// COMMIT RECOMENDADO:
// security: limitar la eliminación de reseñas a administradores
// ============================================================
/** Elimina un comentario. */
// ============================================================
// CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
// Funcionalidad: eliminación de una reseña por identificador
// ============================================================
export async function eliminar(id: number | string): Promise<Comentario | null> {
  const { rows } = await db.query<Comentario>(
    'DELETE FROM comentarios WHERE id = $1 RETURNING *',
    [id]
  );
  return rows[0] || null;
}

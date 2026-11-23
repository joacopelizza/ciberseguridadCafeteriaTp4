import * as db from '../db';
import { calcularPrecio } from '../catalogo';
import type { DatosProducto, Producto, ProductoConPrecio } from '../tipos';
import { crearErrorHttp, textoDentroDeRango, valoresValidos } from '../validacion';

/** Filtros del menÃº, tal como llegan en la query string. */
export interface FiltrosCatalogo {
  tipo?: string;
  variedad?: string;
  q?: string;
}

/** Datos que manda el panel de administraciÃ³n al crear o editar. */
export type DatosProductoEntrada = Partial<DatosProducto> & { activo?: boolean };

/** Id tal como llega en la URL (texto) o ya convertido. */
type Id = number | string;

/**
 * Servicio de catÃ¡logo.
 *
 * -----------------------------------------------------------------------------
 * ProtecciÃ³n frente a inyecciÃ³n SQL (OWASP A03:2021)
 * -----------------------------------------------------------------------------
 * Los filtros del catÃ¡logo y la consulta por id usan parÃ¡metros posicionales.
 *
 * Los valores se envÃ­an separados del texto SQL y los filtros se validan con
 * una lista de valores permitidos y un lÃ­mite para el texto de bÃºsqueda.
 * -----------------------------------------------------------------------------
 */

/** Lista productos aplicando los filtros del menÃº. */
export async function listar(filtros: FiltrosCatalogo = {}): Promise<ProductoConPrecio[]> {
  const { tipo, variedad, q } = filtros;

  if (tipo && !valoresValidos.tiposProducto.includes(tipo as (typeof valoresValidos.tiposProducto)[number])) {
    throw crearErrorHttp(400, 'El tipo de producto no es vÃ¡lido.');
  }
  if (variedad && !valoresValidos.variedades.includes(variedad as (typeof valoresValidos.variedades)[number])) {
    throw crearErrorHttp(400, 'El origen no es vÃ¡lido.');
  }
  if (q !== undefined && !textoDentroDeRango(q, 0, 100)) {
    throw crearErrorHttp(400, 'El texto de bÃºsqueda es demasiado largo.');
  }

  let sql = 'SELECT * FROM productos WHERE activo = true';
  const parametros: unknown[] = [];
  if (tipo) {
    parametros.push(tipo);
    sql += ' AND tipo = $' + parametros.length;
  }
  if (variedad) {
    parametros.push(variedad);
    sql += ' AND variedad = $' + parametros.length;
  }
  if (q) {
    parametros.push(`%${q}%`);
    sql += ' AND (nombre ILIKE $' + parametros.length + ' OR descripcion ILIKE $' + parametros.length + ')';
  }
  sql += ' ORDER BY tipo, variedad NULLS FIRST, id';

  const { rows } = await db.query<Producto>(sql, parametros);

  return rows.map((p) => ({ ...p, precio: calcularPrecio(p) }));
}

/** Obtiene un producto por id. */
export async function obtener(id: Id): Promise<ProductoConPrecio | null> {
  const { rows } = await db.query<Producto>(
    'SELECT * FROM productos WHERE id = $1',
    [id]
  );
  if (!rows[0]) return null;
  return { ...rows[0], precio: calcularPrecio(rows[0]) };
}

/** Crea un producto nuevo. */
export async function crear(datos: DatosProductoEntrada): Promise<Producto> {
  const { rows } = await db.query<Producto>(
    `INSERT INTO productos (nombre, tipo, variedad, tamano, gramos, precio_base, precio_por_gramo, descripcion)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      datos.nombre,
      datos.tipo,
      datos.variedad || null,
      datos.tamano || null,
      datos.gramos ?? null,
      datos.precio_base ?? 0,
      datos.precio_por_gramo ?? 0,
      datos.descripcion || '',
    ]
  );
  return rows[0];
}

/** Actualiza un producto. */
export async function actualizar(id: Id, datos: DatosProductoEntrada): Promise<Producto | null> {
  const { rows } = await db.query<Producto>(
    `UPDATE productos
        SET nombre = $1, tipo = $2, variedad = $3, tamano = $4, gramos = $5,
            precio_base = $6, precio_por_gramo = $7, descripcion = $8, activo = $9
      WHERE id = $10
      RETURNING *`,
    [
      datos.nombre,
      datos.tipo,
      datos.variedad || null,
      datos.tamano || null,
      datos.gramos ?? null,
      datos.precio_base ?? 0,
      datos.precio_por_gramo ?? 0,
      datos.descripcion || '',
      datos.activo !== false,
      id,
    ]
  );
  return rows[0] || null;
}

/** Elimina (desactiva) un producto. */
export async function eliminar(id: Id): Promise<Producto | null> {
  const { rows } = await db.query<Producto>(
    'UPDATE productos SET activo = false WHERE id = $1 RETURNING *',
    [id]
  );
  return rows[0] || null;
}

/** Lista las variedades disponibles en el catÃ¡logo. */
export async function variedades(): Promise<string[]> {
  const { rows } = await db.query<{ variedad: string }>(
    "SELECT DISTINCT variedad FROM productos WHERE variedad IS NOT NULL ORDER BY variedad"
  );
  return rows.map((r) => r.variedad);
}

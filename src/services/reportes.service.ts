import * as db from '../db';
import type { Numerico } from '../tipos';
import { crearErrorHttp, valoresValidos } from '../validacion';

// ============================================================
// SECCIÓN 1: TIPOS DE DATOS DE REPORTES
//
// COMMIT RECOMENDADO:
// refactor: tipar las métricas de reportes
// ============================================================
// ============================================================
// CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
// Funcionalidad: tipos compartidos para los reportes
// ============================================================
export interface Facturacion {
  facturado: Numerico;
  pedidos: Numerico;
}

export interface ProductoMasVendido {
  id: number;
  nombre: string;
  tipo: string;
  unidades: Numerico;
}

export interface VentaPorVariedad {
  variedad: string | null;
  nombre: string;
  unidades: Numerico;
  total: Numerico;
}

// ============================================================
// SECCIÓN 2: CÁLCULO DE MÉTRICAS GENERALES DE VENTAS
//
// COMMIT RECOMENDADO:
// feat: calcular facturación y productos más vendidos
// ============================================================
/**
 * Servicio de reportes.
 *
 * -----------------------------------------------------------------------------
 * ProtecciÃ³n frente a inyecciÃ³n SQL (OWASP A03:2021)
 * -----------------------------------------------------------------------------
 * El origen recibido se envÃ­a como parÃ¡metro, separado de la consulta SQL.
 *
 * La validaciÃ³n del origen contra los valores permitidos se revisarÃ¡ en la
 * etapa de validaciÃ³n de entradas.
 * -----------------------------------------------------------------------------
 */

/** FacturaciÃ³n total: suma de los totales de todos los pedidos. */
// ============================================================
// CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
// Funcionalidad: facturación, ventas por tipo y producto más vendido
// ============================================================
export async function facturacion(): Promise<Facturacion> {
  const { rows } = await db.query<Facturacion>(
    'SELECT COALESCE(SUM(total), 0) AS facturado, COUNT(*) AS pedidos FROM pedidos'
  );
  return rows[0];
}

/** Cantidad vendida por producto, agrupada por tipo. */
export async function cantidadVendidaPorTipo(): Promise<Record<string, number>> {
  const { rows } = await db.query<{ tipo: string; unidades: Numerico }>(
    `SELECT pr.tipo, SUM(pi.cantidad) AS unidades
       FROM pedido_items pi
       JOIN productos pr ON pr.id = pi.producto_id
      GROUP BY pr.tipo
      ORDER BY unidades DESC`
  );
  const resultado: Record<string, number> = {};
  for (const fila of rows) {
    resultado[fila.tipo] = Number(fila.unidades);
  }
  return resultado;
}

/** Producto mÃ¡s vendido. */
export async function masVendido(): Promise<ProductoMasVendido | null> {
  const { rows } = await db.query<ProductoMasVendido>(
    `SELECT pr.id, pr.nombre, pr.tipo, SUM(pi.cantidad) AS unidades
       FROM pedido_items pi
       JOIN productos pr ON pr.id = pi.producto_id
      GROUP BY pr.id, pr.nombre, pr.tipo
      ORDER BY unidades DESC
      LIMIT 1`
  );
  return rows[0] || null;
}

// ============================================================
// SECCIÓN 3: VENTAS POR ORIGEN Y TICKET PROMEDIO
//
// COMMIT RECOMENDADO:
// security: validar el origen consultado en reportes
// ============================================================
/** Ventas por origen (variedad). */
export async function ventasPorVariedad(variedad: string): Promise<VentaPorVariedad[]> {
  if (!valoresValidos.variedades.includes(variedad as (typeof valoresValidos.variedades)[number])) {
    throw crearErrorHttp(400, 'El origen no es vÃ¡lido.');
  }
  const sql = `
    SELECT pr.variedad, pr.nombre, SUM(pi.cantidad) AS unidades,
           SUM(pi.cantidad * pi.precio_unitario) AS total
      FROM pedido_items pi
      JOIN productos pr ON pr.id = pi.producto_id
     GROUP BY pr.variedad, pr.nombre
    HAVING pr.variedad = $1`;

  const { rows } = await db.query<VentaPorVariedad>(sql, [variedad]);
  return rows;
}

/** Ticket promedio por pedido. */
// ============================================================
// CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
// Funcionalidad: cálculo del ticket promedio por pedido
// ============================================================
export async function ticketPromedio(): Promise<{ promedio: Numerico }> {
  const { rows } = await db.query<{ promedio: Numerico }>(
    'SELECT COALESCE(AVG(total), 0) AS promedio FROM pedidos'
  );
  return rows[0];
}

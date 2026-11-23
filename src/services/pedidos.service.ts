import * as db from '../db';
import { calcularPrecio } from '../catalogo';
import type { Pedido, PedidoConItems, PedidoItem, Producto } from '../tipos';
import { crearErrorHttp, idPositivo, textoDentroDeRango, valoresValidos } from '../validacion';

// ============================================================
// SECCIÓN 1: TIPOS DE ENTRADA PARA PEDIDOS
//
// COMMIT RECOMENDADO:
// refactor: tipar los datos recibidos para pedidos
// ============================================================
/** Un renglÃ³n del pedido, tal como llega en el cuerpo de la peticiÃ³n. */
// ============================================================
// CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
// Funcionalidad: estructuras de entrada para pedidos
// ============================================================
export interface ItemPedido {
  productoId: number;
  cantidad: number;
}

/** Pedido nuevo, tal como llega en el cuerpo de la peticiÃ³n. */
export interface NuevoPedido {
  mesa: string;
  cliente: string;
  items: ItemPedido[];
}

/** Id tal como llega en la URL (texto) o ya convertido. */
type Id = number | string;

// ============================================================
// SECCIÓN 2: VALIDACIÓN Y CREACIÓN DE PEDIDOS
//
// COMMIT RECOMENDADO:
// security: validar pedidos y calcular totales en el servidor
// ============================================================
/**
 * Servicio de pedidos.
 *
 * -----------------------------------------------------------------------------
 * ValidaciÃ³n de entrada (OWASP A04:2021)
 * -----------------------------------------------------------------------------
 * El servidor verifica los lÃ­mites de mesa, cliente, cantidad e items antes
 * de calcular o insertar el pedido. Los estados se limitan a la lista
 * valoresValidos.estadosPedido.
 * -----------------------------------------------------------------------------
 */

/**
 * Crea un pedido a partir de una lista de items { productoId, cantidad }.
 * Total = suma de calcularPrecio(producto) x cantidad
 */
export async function crear({ mesa, cliente, items }: NuevoPedido): Promise<PedidoConItems | null> {
  if (!mesaValida(mesa) || !textoDentroDeRango(cliente, 2, 40)) {
    throw crearErrorHttp(400, 'Los datos del pedido no son vÃ¡lidos.');
  }
  if (!Array.isArray(items) || items.length === 0 || items.length > 20) {
    throw crearErrorHttp(400, 'El pedido debe contener entre 1 y 20 productos.');
  }

  const filas: { productoId: number; cantidad: number; precioUnitario: number }[] = [];

  for (const item of items) {
    const productoId = idPositivo(item && item.productoId);
    const cantidad = item && item.cantidad;
    if (!productoId || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > 99) {
      throw crearErrorHttp(400, 'El producto o la cantidad no son vÃ¡lidos.');
    }

    const producto = await buscarProducto(productoId);
    if (!producto) throw crearErrorHttp(404, 'Producto no encontrado.');
    const precioUnitario = calcularPrecio(producto);
    filas.push({
      productoId: producto.id,
      cantidad,
      precioUnitario,
    });
  }

  // ============================================================
  // CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
  // Funcionalidad: cálculo del total e inserción del pedido y sus ítems
  // ============================================================
  const total = filas.reduce(
    (acc, f) => acc + f.precioUnitario * f.cantidad,
    0
  );

  const { rows } = await db.query<Pedido>(
    `INSERT INTO pedidos (mesa, cliente, estado, total)
     VALUES ($1, $2, 'abierto', $3)
     RETURNING *`,
    [mesa, cliente, total]
  );
  const pedido = rows[0];

  for (const fila of filas) {
    await db.query(
      `INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario)
       VALUES ($1, $2, $3, $4)`,
      [pedido.id, fila.productoId, fila.cantidad, fila.precioUnitario]
    );
  }

  return obtenerConItems(pedido.id);
}

/** Busca un producto por id (helper interno). */
async function buscarProducto(productoId: number): Promise<Producto | null> {
  const { rows } = await db.query<Producto>('SELECT * FROM productos WHERE id = $1', [productoId]);
  return rows[0] || null;
}

// ============================================================
// SECCIÓN 3: LISTADO Y DETALLE DE PEDIDOS
//
// COMMIT RECOMENDADO:
// security: consultar pedidos con filtros y parámetros validados
// ============================================================
/** Lista pedidos (con filtro opcional por mesa). */
export async function listar(mesa?: string): Promise<Pedido[]> {
  if (mesa !== undefined && !mesaValida(mesa)) {
    throw crearErrorHttp(400, 'El filtro de mesa no es vÃ¡lido.');
  }
  let sql = 'SELECT * FROM pedidos';
  const parametros: unknown[] = [];
  if (mesa) {
    parametros.push(mesa);
    sql += ' WHERE mesa = $1';
  }
  sql += ' ORDER BY id DESC';

  const { rows } = await db.query<Pedido>(sql, parametros);
  return rows;
}

/** A mesa identifica un número positivo, no texto libre. */
function mesaValida(mesa: unknown): mesa is string {
  return typeof mesa === 'string' && /^[1-9]\d{0,9}$/.test(mesa);
}

/** Devuelve un pedido con sus items. */
// ============================================================
// CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
// Funcionalidad: consulta del pedido con sus productos
// ============================================================
export async function obtenerConItems(id: Id): Promise<PedidoConItems | null> {
  const { rows: pedidos } = await db.query<Pedido>(
    'SELECT * FROM pedidos WHERE id = $1',
    [id]
  );
  const pedido = pedidos[0];
  if (!pedido) return null;

  const { rows: items } = await db.query<PedidoItem>(
    `SELECT pi.*, pr.nombre AS producto_nombre
       FROM pedido_items pi
       JOIN productos pr ON pr.id = pi.producto_id
      WHERE pi.pedido_id = $1`,
    [id]
  );

  return { ...pedido, items };
}

// ============================================================
// SECCIÓN 4: CAMBIO DE ESTADO DEL PEDIDO
//
// COMMIT RECOMENDADO:
// feat: actualizar estados permitidos de pedidos
// ============================================================
/** Cambia el estado de un pedido. */
export async function cambiarEstado(id: Id, estado: string): Promise<Pedido | null> {
  if (!valoresValidos.estadosPedido.includes(estado as (typeof valoresValidos.estadosPedido)[number])) {
    throw crearErrorHttp(400, 'El estado del pedido no es vÃ¡lido.');
  }
  // ============================================================
  // CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
  // Funcionalidad: actualización parametrizada del estado
  // ============================================================
  const { rows } = await db.query<Pedido>(
    'UPDATE pedidos SET estado = $1 WHERE id = $2 RETURNING *',
    [estado, id]
  );
  return rows[0] || null;
}

import { Pool, type QueryResult, type QueryResultRow } from 'pg';
import config from './config';

// ============================================================
// SECCIÓN 1: CONFIGURACIÓN DEL POOL DE POSTGRESQL
//
// COMMIT RECOMENDADO:
// feat: configurar el pool de conexiones PostgreSQL
// ============================================================
// ============================================================
// CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
// Funcionalidad: creación del pool de conexiones PostgreSQL
// ============================================================
export const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('[db] error inesperado en el pool:', err.message);
});

// ============================================================
// SECCIÓN 2: CONSULTAS TIPADAS A LA BASE
//
// COMMIT RECOMENDADO:
// refactor: centralizar consultas tipadas a PostgreSQL
// ============================================================
/**
 * Ejecuta una consulta y devuelve el resultado de `pg`.
 * @param text   Consulta SQL (preferiblemente parametrizada: $1, $2, ...)
 * @param params Valores de los parámetros
 *
 * El tipo `T` describe la forma de cada fila: `db.query<Producto>(...)`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// ============================================================
// CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
// Funcionalidad: ejecución centralizada de consultas tipadas
// ============================================================
export async function query<T extends QueryResultRow = any>(
  text: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

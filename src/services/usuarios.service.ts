import * as db from '../db';
import bcrypt from 'bcryptjs';
import type { Usuario, UsuarioSesion } from '../tipos';

type UsuarioPublico = Omit<Usuario, 'password'>;

// La comparación ficticia iguala el trabajo bcrypt cuando la cuenta no existe.
const HASH_BCRYPT_FICTICIO = bcrypt.hashSync('credencial-ficticia-no-utilizable', 12);

/**
 * Servicio de usuarios.
 *
 * -----------------------------------------------------------------------------
 * La consulta del login usa parámetros para que los datos recibidos se
 * interpreten como valores y no como parte del texto SQL.
 *
 * El login compara hashes con bcrypt. Los errores son genéricos y el endpoint
 * aplica rate limiting en la ruta de autenticación.
 * -----------------------------------------------------------------------------
 */

/** Busca un usuario por nombre de usuario exacto (query parametrizada). */
export async function buscarPorUsername(username: string): Promise<Usuario | null> {
  const { rows } = await db.query<Usuario>(
    'SELECT * FROM usuarios WHERE username = $1',
    [username]
  );
  return rows[0] || null;
}

/**
 * Autentica a un usuario comparando usuario y contraseña.
 * Devuelve el usuario o null.
 */
export async function autenticar(username: string, password: string): Promise<Usuario | null> {
  if (typeof username !== 'string' || typeof password !== 'string') return null;

  const usuario = await buscarPorUsername(username);
  const hashValido = usuario ? /^\$2[aby]\$\d{2}\$/.test(usuario.password) : false;
  const hash = hashValido && usuario ? usuario.password : HASH_BCRYPT_FICTICIO;
  const coincide = await bcrypt.compare(password, hash);
  return usuario && hashValido && coincide ? usuario : null;
}

/** Lista todos los usuarios (para el panel de administración). */
export async function listar(): Promise<UsuarioPublico[]> {
  const { rows } = await db.query<UsuarioPublico>(
    'SELECT id, username, rol, nombre, creado_en FROM usuarios ORDER BY id'
  );
  return rows;
}

/** Actualiza sólo los campos que la ruta administrativa permite modificar. */
export async function actualizar(id: number | string, cambios: Partial<Usuario>): Promise<UsuarioPublico | null> {
  const campos: string[] = [];
  const valores: unknown[] = [];
  let i = 1;
  for (const [campo, valor] of Object.entries(cambios)) {
    campos.push(`${campo} = $${i}`);
    valores.push(campo === 'password' && typeof valor === 'string'
      ? await bcrypt.hash(valor, 12)
      : valor);
    i += 1;
  }
  if (campos.length === 0) return null;
  valores.push(id);
  const { rows } = await db.query<Usuario>(
    `UPDATE usuarios SET ${campos.join(', ')} WHERE id = $${i}
     RETURNING id, username, rol, nombre, creado_en`,
    valores
  );
  return rows[0] || null;
}

/** Cambia la contraseña de un usuario y almacena el hash bcrypt. */
export async function cambiarPassword(id: number, nuevaPassword: string): Promise<UsuarioSesion | null> {
  const passwordHash = await bcrypt.hash(nuevaPassword, 12);
  const { rows } = await db.query<Usuario>(
    'UPDATE usuarios SET password = $1 WHERE id = $2 RETURNING id, username, rol, nombre',
    [passwordHash, id]
  );
  return rows[0] || null;
}

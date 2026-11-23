import * as db from './db';
import bcrypt from 'bcryptjs';
import { CATALOGO } from './catalogo';
import type { Rol } from './tipos';

// ============================================================
// SECCIÓN 1: DEFINICIÓN DE CUENTAS INICIALES
//
// COMMIT RECOMENDADO:
// security: configurar usuarios iniciales con claves del entorno
// ============================================================
// ============================================================
// CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
// Funcionalidad: estructura de las cuentas iniciales
// ============================================================
interface UsuarioInicial {
  username: string;
  password: string;
  rol: Rol;
  nombre: string;
}

/**
 * Carga los datos iniciales (usuarios y catálogo) si la base está vacía.
 *
 * Las contraseñas se guardan con bcrypt. Si una base de datos existente aún
 * conserva una contraseña en texto plano, se migra sin cambiar su valor.
 */

export const USUARIOS_INICIALES: UsuarioInicial[] = [
  {
    username: 'admin',
    password: process.env.ADMIN_INITIAL_PASSWORD || '',
    rol: 'admin',
    nombre: 'Administración',
  },
  {
    username: 'valentina',
    password: process.env.OWNER_INITIAL_PASSWORD || '',
    rol: 'admin',
    nombre: 'Valentina',
  },
  {
    username: 'barista',
    password: process.env.BARISTA_INITIAL_PASSWORD || '',
    rol: 'barista',
    nombre: 'Barista',
  },
  {
    username: 'mozo',
    password: process.env.MOZO_INITIAL_PASSWORD || '',
    rol: 'mozo',
    nombre: 'Mozo de sala',
  },
  {
    username: 'cliente',
    password: process.env.CLIENT_INITIAL_PASSWORD || '',
    rol: 'cliente',
    nombre: 'Cliente',
  },
];

// ============================================================
// SECCIÓN 2: HASH Y CARGA INICIAL DE USUARIOS Y PRODUCTOS
//
// COMMIT RECOMENDADO:
// feat: inicializar usuarios seguros y catálogo base
// ============================================================
export async function inicializarBase(): Promise<void> {
  for (const usuario of USUARIOS_INICIALES) {
    if (usuario.password.length < 24 || usuario.password.startsWith('CAMBIA_')) {
      throw new Error(`Falta configurar una contraseña inicial segura para ${usuario.username}.`);
    }
  }

  // --- Usuarios -------------------------------------------------------------
  for (const usuario of USUARIOS_INICIALES) {
    const { rows: existentes } = await db.query<{ password: string }>(
      'SELECT password FROM usuarios WHERE username = $1',
      [usuario.username]
    );
    const passwordActual = existentes[0]?.password;
    if (passwordActual && /^\$2[aby]\$\d{2}\$/.test(passwordActual)) continue;

    const passwordHash = await bcrypt.hash(passwordActual || usuario.password, 12);
    await db.query(
      `INSERT INTO usuarios (username, password, rol, nombre)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password`,
      [usuario.username, passwordHash, usuario.rol, usuario.nombre]
    );
  }

  const { rows: usuariosExistentes } = await db.query<{ id: number; password: string }>(
    'SELECT id, password FROM usuarios'
  );
  for (const usuario of usuariosExistentes) {
    if (/^\$2[aby]\$\d{2}\$/.test(usuario.password)) continue;
    const passwordHash = await bcrypt.hash(usuario.password, 12);
    await db.query('UPDATE usuarios SET password = $1 WHERE id = $2', [passwordHash, usuario.id]);
  }

  // --- Catálogo -------------------------------------------------------------
  // ============================================================
  // CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
  // Funcionalidad: inserción inicial de productos del catálogo
  // ============================================================
  for (const producto of CATALOGO) {
    await db.query(
      `INSERT INTO productos
         (nombre, tipo, variedad, tamano, gramos, precio_base, precio_por_gramo, descripcion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (nombre) DO NOTHING`,
      [
        producto.nombre,
        producto.tipo,
        producto.variedad,
        producto.tamano,
        producto.gramos,
        producto.precio_base,
        producto.precio_por_gramo,
        producto.descripcion,
      ]
    );
  }
}

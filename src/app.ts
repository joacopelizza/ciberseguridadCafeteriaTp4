import path from 'path';
import express from 'express';
import helmet from 'helmet';

import config from './config';
import { emitirTokenCsrf, verificarCsrf } from './middleware/csrf';
import { rutaNoEncontrada, manejadorErrores } from './middleware/errores';
import authRoutes from './routes/auth.routes';
import productosRoutes from './routes/productos.routes';
import pedidosRoutes from './routes/pedidos.routes';
import reportesRoutes from './routes/reportes.routes';
import comentariosRoutes from './routes/comentarios.routes';
import adminRoutes from './routes/admin.routes';
import debugRoutes from './routes/debug.routes';

const app = express();

// ============================================================
// SECCIÓN 1: CABECERAS DE SEGURIDAD Y PARSEO DE PETICIONES
//
// COMMIT RECOMENDADO:
// security: configurar protecciones globales de Express
// ============================================================
/** Cabeceras de seguridad globales y límites para los cuerpos de petición. */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================================
// SECCIÓN 2: PUBLICACIÓN DEL SITIO Y ARCHIVOS SUBIDOS
//
// COMMIT RECOMENDADO:
// feat: servir el sitio web y las imágenes subidas
// ============================================================
// Archivos subidos por el panel de administración.
// ============================================================
// CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
// Funcionalidad: publicación de archivos e interfaz web estática
// ============================================================
app.use('/uploads', express.static(config.uploadsDir));

// Sitio web estático
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// SECCIÓN 3: API, CSRF Y REGISTRO DE RUTAS
//
// COMMIT RECOMENDADO:
// security: proteger y enrutar los endpoints de la API
// ============================================================
// ============================================================
// CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
// Funcionalidad: comprobación básica de disponibilidad del servicio
// ============================================================
app.get('/api/salud', (req, res) => {
  res.json({ ok: true, servicio: 'cafeteria-origen', hora: new Date().toISOString() });
});

app.get('/api/csrf-token', emitirTokenCsrf);
app.use('/api', verificarCsrf);

// ============================================================
// CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
// Funcionalidad: registro de las rutas de negocio de la API
// ============================================================
app.use('/api/auth', authRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/comentarios', comentariosRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/_diagnostico', debugRoutes);

app.use('/api', rutaNoEncontrada);

app.use(manejadorErrores);

export default app;

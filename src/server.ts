import app from './app';
import config from './config';
import { inicializarBase } from './inicializar';

export async function arrancar(): Promise<void> {
  // ============================================================
  // SECCIÓN 1: CARGA Y VALIDACIÓN DE DATOS INICIALES
  //
  // COMMIT RECOMENDADO:
  // feat: preparar datos antes de iniciar el servidor
  // ============================================================
  try {
    // ============================================================
    // CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
    // Funcionalidad: inicialización de datos antes de escuchar peticiones
    // ============================================================
    await inicializarBase();
    console.log('[origen] datos iniciales verificados en la base de datos');
  } catch (err) {
    console.error('[origen] no se pudieron cargar los datos iniciales:', (err as Error).message);
    process.exit(1);
  }

  // ============================================================
  // SECCIÓN 2: INICIO DEL SERVIDOR HTTP
  //
  // COMMIT RECOMENDADO:
  // feat: escuchar solicitudes web en el puerto configurado
  // ============================================================
  // ============================================================
  // CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
  // Funcionalidad: inicio del servidor HTTP y anuncio de sus direcciones
  // ============================================================
  app.listen(config.port, () => {
    // Puerto publicado en el host (docker-compose.yml). Fuera de Docker el
    // puerto real es el de la app; dentro del contenedor se usa APP_PORT.
    const puertoHost = process.env.APP_PORT || config.port;
    console.log(`[origen] Cafetería Origen escuchando en http://localhost:${puertoHost}`);
    console.log(`[origen] panel de administración: http://localhost:${puertoHost}/admin.html`);
  });
}

arrancar();

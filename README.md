# ☕ Cafetería Origen — proyecto didáctico de Ciberseguridad

> Sitio web + API de una cafetería de especialidad para el práctico de
> **Redes y Seguridad (Programación IV)**. La versión inicial tenía fallas
> deliberadas; esta copia incorpora correcciones de seguridad.
>
> La historia es la de **Valentina**, que abrió una cafetería de especialidad y
> necesita ordenar los pedidos que hoy anota en un cuaderno.

El sitio web y la API permiten gestionar el catálogo, los pedidos y los
reportes. Las pruebas funcionales y de seguridad verifican esta versión.

---

## 1. Levantar el proyecto

Requisitos: **Docker Desktop** (o Docker Engine + Compose v2).

Antes del primer arranque, generá `.env` desde la plantilla. En PowerShell,
desde la carpeta del proyecto, ejecutá:

```powershell
.\scripts\generar-env.ps1
```

El script crea siete secretos aleatorios únicos: cinco para las cuentas
iniciales y dos para PostgreSQL. No sobrescribe un `.env` existente. En otros
entornos, copiá `.env.example` a `.env` y completá los siete valores con
secretos aleatorios de al menos 24 caracteres. La app se niega a iniciar si las
claves iniciales siguen vacías. `.env` está excluido de Git.

```bash
cd cafeteria-origen
docker compose up -d --build
```

| Qué | Dónde |
|---|---|
| Sitio web | http://localhost:8080 |
| Panel de administración | http://localhost:8080/admin.html |
| API | http://localhost:8080/api |
| Healthcheck | http://localhost:8080/api/salud |

> **Si el puerto 8080 está ocupado** (es muy común en máquinas con varios
> proyectos): `export APP_PORT=8090` (Linux/macOS) o `$env:APP_PORT=8090`
> (PowerShell) antes de `docker compose up -d`.

Otros comandos:

```bash
docker compose ps              # estado de los contenedores
docker compose logs -f app     # logs de la aplicación
docker compose restart app     # reiniciar tras editar código
docker compose down            # bajar los contenedores
docker compose down -v         # bajar TODO y borrar la base (volumen)
```

### Editar código

El código está **montado desde el host** (`./src`, `./tests`, `./scripts`), así que
se edita con el IDE y el contenedor toma los cambios al reiniciar:

```bash
docker compose restart app
```

### Correr los tests

Hay **dos baterías**, y conviene entender la diferencia:

| Comando | Qué mide | Al empezar | Al terminar |
|---|---|---|---|
| `npm test` | **Funcional**: el negocio (catálogo, pedidos, login, reportes) | ✔ en verde | ✔ en verde |
| `npm run test:seguridad` | **Seguridad**: comprueba que las fallas estén corregidas | ✘ en rojo | ✔ en verde |
| `npm run test:todo` | Las dos juntas | — | — |

```bash
docker compose exec app npm test              # tests funcionales
docker compose exec app npm run test:seguridad # batería de seguridad
docker compose exec app npm run test:todo      # todo junto
```

> **La batería funcional** describe el comportamiento del negocio. Debe quedar
> **en verde antes de las correcciones y en verde después** (los helpers ya
> buscan el token anti-CSRF si existe, así que el token no los rompe).
>
> **La batería de seguridad** (`tests/seguridad*.test.ts`) es la que comprueba que
> las vulnerabilidades estén **solucionadas**: al principio falla casi entera,
> porque el proyecto es vulnerable a propósito. Cada test que falla dice **qué
> corregir y en qué archivo**. Es la **rúbrica automática** del práctico.

### Correr la checklist de seguridad

```bash
docker compose exec app npm run check:security
```

Devuelve **1** mientras queden controles críticos sin cubrir. Es el **análisis
estático** que complementa a la batería: mira el código, no ejecuta ataques.
El objetivo es que termine en `✔` sin que se rompan los tests.

---

## 2. Usuarios de prueba

| Usuario | Rol | Qué sirve para |
|---|---|---|
| `admin` | admin | Administración |
| `valentina` | admin | Dueña del negocio |
| `barista` | barista | Personal de barra |
| `mozo` | mozo | Personal de sala |
| `cliente` | cliente | Comprobar restricciones de rol |

Las contraseñas iniciales se configuran mediante cinco variables `*_INITIAL_PASSWORD` en `.env`. La base almacena hashes bcrypt. Cambiar estas variables después de crear las cuentas no rota las contraseñas ya existentes.

---

## 3. Estructura

```
cafeteria-origen/
├── docker-compose.yml          # app + base de datos, red propia (10.89.0.0/24)
├── Dockerfile
├── tsconfig.json               # configuración de TypeScript
├── docker/initdb/              # esquema SQL + usuario de mínimos privilegios
├── src/
│   ├── server.ts               # arranque
│   ├── app.ts                  # Express, middlewares, rutas
│   ├── config.ts               # valida la configuración y carga secretos desde variables de entorno
│   ├── db.ts                   # pool de PostgreSQL
│   ├── catalogo.ts             # catálogo y cálculo de precios
│   ├── inicializar.ts          # carga inicial de datos
│   ├── tipos.ts                # tipos compartidos (filas de la base, sesión)
│   ├── middleware/             # sesión, auth, errores
│   ├── services/               # lógica de negocio  ← inyecciones SQL
│   ├── routes/                 # endpoints REST
│   └── public/                 # el sitio web (HTML + CSS + JS)
├── tests/                      # tests funcionales (npm test)
│   ├── productos.test.ts
│   ├── pedidos.test.ts
│   ├── auth.test.ts
│   ├── reportes.test.ts
│   ├── seguridad.test.ts            # batería de seguridad (npm run test:seguridad)
│   ├── seguridad-login.test.ts      # (aislada: usa el rate limiter)
│   └── seguridad-fuerza-bruta.test.ts
└── scripts/check-security.ts   # checklist de seguridad (npm run check:security)
```

---

## 4. API

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/productos?tipo=&variedad=&q=` | Catálogo con filtros |
| GET | `/api/productos/variedades` | Orígenes disponibles |
| GET | `/api/productos/:id` | Un producto |
| POST | `/api/pedidos` | Crear pedido (devuelve el total) |
| GET | `/api/pedidos?mesa=` | Pedidos de todas las mesas (admin, barista o mozo autenticado) |
| GET | `/api/pedidos/:id` | Pedido con sus items (personal autenticado) |
| PATCH | `/api/pedidos/:id/estado` | Cambiar estado (personal autenticado) |
| GET | `/api/reportes/facturacion` | Total facturado (admin autenticado) |
| GET | `/api/reportes/cantidad-vendida` | Unidades por tipo (admin autenticado) |
| GET | `/api/reportes/mas-vendido` | Producto más vendido (admin autenticado) |
| GET | `/api/reportes/ticket-promedio` | Ticket promedio (admin autenticado) |
| GET | `/api/reportes/ventas-por-variedad?variedad=` | Ventas por origen (admin autenticado) |
| GET | `/api/comentarios` · POST `/api/comentarios` | Reseñas |
| POST | `/api/auth/login` · `/api/auth/logout` · GET `/api/auth/yo` | Sesión |
| — | `/api/admin/*` | Panel (usuarios, productos, conexión, subida de archivos) |
| GET | `/api/_diagnostico` | Diagnóstico del servidor |

### Reglas de negocio

`total de un pedido = Σ (calcularPrecio(producto) × cantidad)`
`calcularPrecio = gramos × precioPorGramo + precioBase`

Precio por gramo: Brasil 140 · Colombia 180 · Etiopía 240.
Precio base: espresso 2500 · filtrado 3200 · muffin 2500 · torta 4200.

El catálogo son **20 productos**: 9 espressos + 9 filtrados + 2 de pastelería.

---

## 5. Vulnerabilidades de la versión inicial

Están alineadas con las planillas de seguridad del apunte y con OWASP Top 10.
La tabla conserva el inventario de la consigna y describe el punto de partida,
no el estado corregido de esta copia. El **inventario detallado** está en
[`VULNERABILIDADES.md`](VULNERABILIDADES.md).

| # | Falla | Dónde | Control del checklist |
|---|---|---|---|
| 1 | **Inyección SQL** en el login | `services/usuarios.service.ts` | SQLI-01/02 |
| 2 | **Inyección SQL** en los filtros del catálogo | `services/catalogo.service.ts` | SQLI-01/02 |
| 3 | **Inyección SQL** en el filtro por mesa | `services/pedidos.service.ts` | SQLI-01/02 |
| 4 | **Inyección SQL** en el reporte por origen | `services/reportes.service.ts` | SQLI-01/02 |
| 5 | **XSS reflejado** en el buscador y en los mensajes de error | `public/js/app.js`, `routes/` | XSS-01/02 |
| 6 | **XSS almacenado** en las reseñas | `public/js/app.js` | XSS-01/02 |
| 7 | **XSS de DOM** en el panel | `public/js/admin.js` | XSS-01 |
| 8 | **CSRF** en todos los formularios que cambian estado | `routes/` | CSRF-01/02 |
| 9 | **Validación débil**: cantidades negativas, sin límites | `services/pedidos.service.ts` | VAL-01/02/03 |
| 10 | **Subida de archivos sin restricciones** (ni extensión, ni MIME, ni tamaño) | `routes/admin.routes.ts` | VAL-04/05 |
| 11 | **Contraseñas en texto plano** | `services/usuarios.service.ts`, `inicializar.ts` | AUTH-01/02/03 |
| 12 | **Sin protección contra fuerza bruta** | `routes/auth.routes.ts` | AUTH-04 |
| 13 | **Cookie de sesión sin HttpOnly/Secure/SameSite** | `middleware/sesion.ts` | AUTH-05/06 |
| 14 | **ID de sesión predecible** (contador) | `middleware/sesion.ts` | AUTH-07/08 |
| 15 | **Sesiones que nunca expiran** | `middleware/sesion.ts` | AUTH-09/10 |
| 16 | **Logout que no invalida la sesión en el servidor** | `routes/auth.routes.ts` | AUTH-11 |
| 17 | **Enumeración de usuarios** en el login | `routes/auth.routes.ts` | AUTH-12 |
| 18 | **Autorización ausente**: cualquier usuario entra al panel | `routes/admin.routes.ts` | AUTH-14 |
| 19 | **Escalada de privilegios**: cualquiera se cambia el rol a admin | `routes/admin.routes.ts` | AUTH-15 |
| 20 | **Inyección de comandos** en "probar conexión" | `routes/admin.routes.ts` | CMD-01/02/03 |
| 21 | **Exposición de secretos** por `/api/_diagnostico` | `routes/debug.routes.ts` | CFG-03/04 |
| 22 | **Stack traces al cliente** | `middleware/errores.ts` | VAL-06 |
| 23 | **Sin cabeceras de seguridad** (helmet, CSP) | `app.ts` | XSS-03 / CFG-01 |
| 24 | **Base de datos sin contraseña y con el superusuario** | `docker-compose.yml` | SQLI-03/05 |

Los detalle de cada falla, cómo observarlas **sin automatizar** y cómo
corregirlas están en:

- **[`VULNERABILIDADES.md`](VULNERABILIDADES.md)** — **catálogo completo** con la
  ubicación exacta (archivo y línea) de las 28 fallas, por qué ocurre cada una,
  cómo se observa a mano y qué control del checklist cubre.
- **[`GUIA-PRACTICA.md`](GUIA-PRACTICA.md)** — para los alumnos.


Cada falla de la tabla tiene además **un test que la detecta** en
`npm run test:seguridad`. El mapeo falla → test está en
[`VULNERABILIDADES.md`](VULNERABILIDADES.md) (columna *Test que la detecta*).

---

## 6. Reglas de la práctica

El apunte es explícito: **se observa y se defiende, no se automatiza**.

- Todo se hace **contra la instalación local** (`localhost`). Nunca contra sistemas ajenos.
- **No se escriben scripts que automatiquen ataques** (ni de fuerza bruta, ni de CSRF).
  La observación es manual, desde la interfaz.
- Cada práctica va acompañada de una **reflexión**: ¿qué habría que cambiar en un
  proyecto real para que esto no pasara?

---

## 7. Entregables del alumno

Copiar el link del repositorio en [`Documento de Google Sheet`](https://docs.google.com/spreadsheets/d/1pDqMmQXn5BgECrv8xF_jXD2uE_Iyz9xq38HmnOxnvBU/edit?gid=0#gid=0)

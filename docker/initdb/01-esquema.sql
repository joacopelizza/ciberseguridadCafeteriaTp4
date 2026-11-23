-- =============================================================================
-- Esquema de la base de datos de la Cafetería Origen
-- Se ejecuta UNA sola vez, cuando el volumen de PostgreSQL está vacío.
-- =============================================================================

-- ============================================================
-- SECCIÓN 1: TABLA DE CUENTAS Y ROLES
--
-- COMMIT RECOMENDADO:
-- feat: definir la tabla de usuarios y autenticación
-- ============================================================
-- ============================================================
-- CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
-- Funcionalidad: estructura de las cuentas y sus roles
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id        SERIAL PRIMARY KEY,
    username  TEXT NOT NULL UNIQUE,
    password  TEXT NOT NULL,
    rol       TEXT NOT NULL DEFAULT 'cliente',
    nombre    TEXT,
    creado_en TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SECCIÓN 2: TABLA DEL CATÁLOGO DE PRODUCTOS
--
-- COMMIT RECOMENDADO:
-- feat: definir la tabla del catálogo
-- ============================================================
-- ============================================================
-- CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
-- Funcionalidad: estructura del catálogo de productos
-- ============================================================
CREATE TABLE IF NOT EXISTS productos (
    id               SERIAL PRIMARY KEY,
    nombre           TEXT NOT NULL UNIQUE,
    tipo             TEXT NOT NULL,                 -- espresso | filtrado | pasteleria
    variedad         TEXT,                          -- Colombia | Etiopía | Brasil | NULL
    tamano           TEXT,                          -- Pocillo | Mediano | Taza grande | NULL
    gramos           INTEGER,
    precio_base      NUMERIC(10, 2) NOT NULL DEFAULT 0,
    precio_por_gramo NUMERIC(10, 2) NOT NULL DEFAULT 0,
    descripcion      TEXT,
    activo           BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================
-- SECCIÓN 3: TABLAS DE PEDIDOS Y DETALLE DE ÍTEMS
--
-- COMMIT RECOMENDADO:
-- feat: definir pedidos e ítems de compra
-- ============================================================
-- ============================================================
-- CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
-- Funcionalidad: estructura de pedidos y sus ítems
-- ============================================================
CREATE TABLE IF NOT EXISTS pedidos (
    id        SERIAL PRIMARY KEY,
    mesa      TEXT,
    cliente   TEXT,
    estado    TEXT NOT NULL DEFAULT 'abierto',
    total     NUMERIC(12, 2) NOT NULL DEFAULT 0,
    creado_en TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pedido_items (
    id             SERIAL PRIMARY KEY,
    pedido_id      INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id    INTEGER NOT NULL REFERENCES productos(id),
    cantidad       INTEGER NOT NULL,
    precio_unitario NUMERIC(10, 2) NOT NULL DEFAULT 0
);

-- ============================================================
-- SECCIÓN 4: TABLA DE RESEÑAS DE CLIENTES
--
-- COMMIT RECOMENDADO:
-- feat: definir la tabla de reseñas
-- ============================================================
-- ============================================================
-- CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
-- Funcionalidad: estructura de las reseñas de clientes
-- ============================================================
CREATE TABLE IF NOT EXISTS comentarios (
    id           SERIAL PRIMARY KEY,
    autor        TEXT,
    texto        TEXT,
    calificacion INTEGER,
    creado_en    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SECCIÓN 5: ÍNDICES PARA CONSULTAS DE PEDIDOS
--
-- COMMIT RECOMENDADO:
-- perf: agregar índices de consulta para pedidos
-- ============================================================
-- ============================================================
-- CÓDIGO ORIGINAL DEL REPOSITORIO DEL TP
-- Funcionalidad: índices para consultas de pedidos
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_pedidos_mesa ON pedidos(mesa);
CREATE INDEX IF NOT EXISTS idx_items_pedido ON pedido_items(pedido_id);

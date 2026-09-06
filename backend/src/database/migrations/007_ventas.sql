-- =====================================================
-- 007 · CLIENTES Y PEDIDOS
--
-- Un pedido guarda una FOTO del momento de la compra:
-- nombre y precio del producto quedan copiados en
-- pedido_items. Si mañana el producto cambia de precio o
-- se elimina, el pedido viejo sigue diciendo lo que se
-- vendio y a cuanto.
-- =====================================================


-- -----------------------------------------------------
-- CLIENTES
--
-- Son los compradores de la tienda, no los usuarios del
-- panel. No tienen contraseña ni acceso al administrador.
-- -----------------------------------------------------

CREATE TABLE clientes (

    id          UUID NOT NULL DEFAULT gen_random_uuid(),

    tenant_id   UUID NOT NULL
                REFERENCES tenants(id) ON DELETE CASCADE,

    nombre      TEXT NOT NULL,
    apellido    TEXT,

    email       TEXT,
    telefono    TEXT,

    direccion   TEXT,
    ciudad      TEXT,
    provincia   TEXT,

    notas       TEXT,

    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (id),
    UNIQUE (tenant_id, id)
);

SELECT agregar_updated_at('clientes');

-- El email es opcional, pero si esta cargado identifica
-- al cliente dentro de la tienda.
CREATE UNIQUE INDEX ux_clientes_email_por_tenant
    ON clientes (tenant_id, lower(email))
    WHERE email IS NOT NULL AND email <> '';

CREATE INDEX ix_clientes_tenant
    ON clientes (tenant_id, lower(nombre));


-- -----------------------------------------------------
-- PEDIDOS
-- -----------------------------------------------------

CREATE TABLE pedidos (

    id              UUID NOT NULL DEFAULT gen_random_uuid(),

    tenant_id       UUID NOT NULL
                    REFERENCES tenants(id) ON DELETE CASCADE,

    cliente_id      UUID,

    -- Numero visible, correlativo POR TIENDA: cada tienda
    -- arranca en 1. Lo asigna la API dentro de la transaccion
    -- que crea el pedido.
    numero          INTEGER NOT NULL,

    estado          TEXT NOT NULL DEFAULT 'pendiente'
                    CHECK (estado IN (
                        'pendiente',
                        'confirmado',
                        'preparando',
                        'enviado',
                        'entregado',
                        'cancelado'
                    )),

    metodo_pago     TEXT,

    subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (subtotal  >= 0),
    descuento       NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (descuento >= 0),
    envio           NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (envio     >= 0),
    total           NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total     >= 0),

    observaciones   TEXT,

    -- Datos de contacto tal como los dejo el comprador,
    -- aunque despues edite su ficha de cliente.
    datos_contacto  JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (id),

    UNIQUE (tenant_id, numero),
    UNIQUE (tenant_id, id),

    -- El cliente tiene que ser de la misma tienda.
    CONSTRAINT fk_pedidos_cliente
        FOREIGN KEY (tenant_id, cliente_id)
        REFERENCES clientes (tenant_id, id)
        ON DELETE RESTRICT
);

SELECT agregar_updated_at('pedidos');

CREATE INDEX ix_pedidos_tenant
    ON pedidos (tenant_id, created_at DESC);

CREATE INDEX ix_pedidos_estado
    ON pedidos (tenant_id, estado, created_at DESC);

CREATE INDEX ix_pedidos_cliente
    ON pedidos (cliente_id);


-- -----------------------------------------------------
-- ITEMS DEL PEDIDO
-- -----------------------------------------------------

CREATE TABLE pedido_items (

    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tenant_id        UUID NOT NULL
                     REFERENCES tenants(id) ON DELETE CASCADE,

    pedido_id        UUID NOT NULL,

    -- Puede quedar en NULL si el producto se elimina.
    -- El pedido no pierde la informacion porque los datos
    -- estan copiados abajo.
    producto_id      UUID,

    nombre_producto  TEXT NOT NULL,
    sku_producto     TEXT,

    precio_unitario  NUMERIC(12,2) NOT NULL CHECK (precio_unitario >= 0),

    cantidad         INTEGER NOT NULL CHECK (cantidad > 0),

    subtotal         NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),

    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_pedido_items_pedido
        FOREIGN KEY (tenant_id, pedido_id)
        REFERENCES pedidos (tenant_id, id)
        ON DELETE CASCADE,

    -- Si el producto se elimina del catalogo, el item conserva
    -- el pedido y los datos copiados; solo pierde el enlace.
    --
    -- El SET NULL indica la columna a proposito: sin "(producto_id)"
    -- PostgreSQL pondria en NULL las DOS columnas de la clave,
    -- incluida tenant_id, que es NOT NULL, y el borrado fallaria.
    -- Requiere PostgreSQL 15+ (verificado en 001_base.sql).
    CONSTRAINT fk_pedido_items_producto
        FOREIGN KEY (tenant_id, producto_id)
        REFERENCES productos (tenant_id, id)
        ON DELETE SET NULL (producto_id)
);

CREATE INDEX ix_pedido_items_pedido
    ON pedido_items (pedido_id);


-- -----------------------------------------------------
-- HISTORIAL DE ESTADOS
--
-- Quien cambio el estado del pedido y cuando. Sirve para
-- el detalle del pedido y para responderle al cliente.
-- -----------------------------------------------------

CREATE TABLE pedido_historial (

    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tenant_id   UUID NOT NULL
                REFERENCES tenants(id) ON DELETE CASCADE,

    pedido_id   UUID NOT NULL,

    estado      TEXT NOT NULL,

    -- NULL cuando el cambio lo genero la tienda publica.
    usuario_id  UUID REFERENCES usuarios(id) ON DELETE SET NULL,

    nota        TEXT,

    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_pedido_historial_pedido
        FOREIGN KEY (tenant_id, pedido_id)
        REFERENCES pedidos (tenant_id, id)
        ON DELETE CASCADE
);

CREATE INDEX ix_pedido_historial_pedido
    ON pedido_historial (pedido_id, created_at);

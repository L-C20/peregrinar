-- =====================================================
-- 004 · CATALOGO
--
-- Categorias, productos e imagenes.
--
-- CLAVE DEL AISLAMIENTO ENTRE TIENDAS:
-- las relaciones internas no apuntan solo al id, apuntan
-- al par (tenant_id, id). Por eso cada tabla declara
-- UNIQUE (tenant_id, id), que es el destino de esas claves
-- foraneas compuestas.
--
-- Con eso, un producto del Tenant A NO PUEDE apuntar a una
-- categoria del Tenant B: la base lo rechaza. La proteccion
-- deja de depender de que nadie se olvide un WHERE.
--
-- NOMBRES DE COLUMNAS DE ARCHIVOS:
-- las columnas "imagen", "logo", "favicon" y "og_imagen"
-- guardan la CLAVE del archivo en el almacenamiento
-- (ej: productos/editorial-peregrinar/abc.jpg), nunca una
-- URL. La URL la arma la capa storage/ segun el driver
-- activo. Cambiar de disco local a Cloudinary no obliga a
-- reescribir ni una fila.
-- =====================================================


-- -----------------------------------------------------
-- CATEGORIAS
-- -----------------------------------------------------

CREATE TABLE categorias (

    id          UUID NOT NULL DEFAULT gen_random_uuid(),

    tenant_id   UUID NOT NULL
                REFERENCES tenants(id) ON DELETE CASCADE,

    nombre      TEXT NOT NULL,

    slug        TEXT NOT NULL
                CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),

    descripcion TEXT,

    imagen      TEXT,

    orden       INTEGER NOT NULL DEFAULT 0,

    activo      BOOLEAN NOT NULL DEFAULT true,

    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (id),

    -- El slug es unico DENTRO de cada tienda: dos tiendas
    -- distintas pueden tener su propia categoria "biblias".
    UNIQUE (tenant_id, slug),

    -- Destino de las claves foraneas compuestas.
    UNIQUE (tenant_id, id)
);

SELECT agregar_updated_at('categorias');

CREATE INDEX ix_categorias_tenant
    ON categorias (tenant_id, orden, nombre);


-- -----------------------------------------------------
-- PRODUCTOS
-- -----------------------------------------------------

CREATE TABLE productos (

    id               UUID NOT NULL DEFAULT gen_random_uuid(),

    tenant_id        UUID NOT NULL
                     REFERENCES tenants(id) ON DELETE CASCADE,

    categoria_id     UUID,

    nombre           TEXT NOT NULL,

    slug             TEXT NOT NULL
                     CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),

    descripcion      TEXT,

    precio           NUMERIC(12,2) NOT NULL
                     CHECK (precio >= 0),

    -- Precio tachado. Solo se muestra si es mayor al actual.
    precio_anterior  NUMERIC(12,2)
                     CHECK (precio_anterior IS NULL OR precio_anterior >= 0),

    stock            INTEGER NOT NULL DEFAULT 0
                     CHECK (stock >= 0),

    sku              TEXT,

    -- Copia de la imagen de orden 0. Evita un JOIN en el listado.
    imagen_principal TEXT,

    destacado        BOOLEAN NOT NULL DEFAULT false,
    novedad          BOOLEAN NOT NULL DEFAULT false,
    disponible       BOOLEAN NOT NULL DEFAULT true,

    orden            INTEGER NOT NULL DEFAULT 0,

    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (id),

    UNIQUE (tenant_id, slug),
    UNIQUE (tenant_id, id),

    -- La categoria tiene que ser del MISMO tenant.
    -- RESTRICT: eliminar una categoria con productos se rechaza.
    -- La API desasigna los productos primero, dentro de una
    -- transaccion, y muestra un mensaje claro.
    CONSTRAINT fk_productos_categoria
        FOREIGN KEY (tenant_id, categoria_id)
        REFERENCES categorias (tenant_id, id)
        ON DELETE RESTRICT
);

SELECT agregar_updated_at('productos');

-- El SKU es opcional, pero si esta cargado no se repite en la tienda.
CREATE UNIQUE INDEX ux_productos_sku_por_tenant
    ON productos (tenant_id, sku)
    WHERE sku IS NOT NULL AND sku <> '';

CREATE INDEX ix_productos_tenant
    ON productos (tenant_id, orden, nombre);

-- Listado de la tienda publica: solo productos disponibles.
CREATE INDEX ix_productos_vitrina
    ON productos (tenant_id, categoria_id, orden)
    WHERE disponible;

-- Busqueda por nombre desde el panel.
CREATE INDEX ix_productos_nombre
    ON productos (tenant_id, lower(nombre));


-- -----------------------------------------------------
-- IMAGENES DE PRODUCTO
--
-- tenant_id esta aunque se pueda deducir del producto:
-- permite filtrar sin JOIN y habilita Row Level Security
-- mas adelante.
-- -----------------------------------------------------

CREATE TABLE producto_imagenes (

    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tenant_id    UUID NOT NULL
                 REFERENCES tenants(id) ON DELETE CASCADE,

    producto_id  UUID NOT NULL,

    imagen       TEXT NOT NULL,

    orden        INTEGER NOT NULL DEFAULT 0,

    principal    BOOLEAN NOT NULL DEFAULT false,

    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_producto_imagenes_producto
        FOREIGN KEY (tenant_id, producto_id)
        REFERENCES productos (tenant_id, id)
        ON DELETE CASCADE
);

CREATE INDEX ix_producto_imagenes_producto
    ON producto_imagenes (producto_id, orden);

-- Una sola imagen principal por producto.
CREATE UNIQUE INDEX ux_producto_imagenes_principal
    ON producto_imagenes (producto_id)
    WHERE principal;

-- =====================================================
-- 006 · CONTENIDO EDITABLE
--
-- Todo lo que hoy estaria escrito a mano en el HTML.
-- El objetivo es que el cliente no necesite tocar codigo
-- para cambiar un texto, una foto o una pregunta frecuente.
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
-- BANNERS
-- -----------------------------------------------------

CREATE TABLE banners (

    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tenant_id    UUID NOT NULL
                 REFERENCES tenants(id) ON DELETE CASCADE,

    titulo       TEXT,
    descripcion  TEXT,

    imagen       TEXT NOT NULL,

    texto_boton  TEXT,
    enlace       TEXT,

    -- Donde se muestra: portada, catalogo, etc.
    ubicacion    TEXT NOT NULL DEFAULT 'inicio'
                 CHECK (ubicacion IN ('inicio', 'catalogo', 'promociones')),

    orden        INTEGER NOT NULL DEFAULT 0,
    activo       BOOLEAN NOT NULL DEFAULT true,

    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT agregar_updated_at('banners');

CREATE INDEX ix_banners_tenant
    ON banners (tenant_id, ubicacion, orden);


-- -----------------------------------------------------
-- GALERIAS
-- -----------------------------------------------------

CREATE TABLE galerias (

    id           UUID NOT NULL DEFAULT gen_random_uuid(),

    tenant_id    UUID NOT NULL
                 REFERENCES tenants(id) ON DELETE CASCADE,

    nombre       TEXT NOT NULL,

    slug         TEXT NOT NULL
                 CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),

    descripcion  TEXT,

    orden        INTEGER NOT NULL DEFAULT 0,
    activo       BOOLEAN NOT NULL DEFAULT true,

    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (id),
    UNIQUE (tenant_id, slug),
    UNIQUE (tenant_id, id)
);

SELECT agregar_updated_at('galerias');

CREATE INDEX ix_galerias_tenant
    ON galerias (tenant_id, orden);


CREATE TABLE galeria_imagenes (

    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tenant_id    UUID NOT NULL
                 REFERENCES tenants(id) ON DELETE CASCADE,

    galeria_id   UUID NOT NULL,

    imagen       TEXT NOT NULL,

    titulo       TEXT,
    descripcion  TEXT,

    orden        INTEGER NOT NULL DEFAULT 0,
    activo       BOOLEAN NOT NULL DEFAULT true,

    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- La galeria tiene que ser de la misma tienda.
    CONSTRAINT fk_galeria_imagenes_galeria
        FOREIGN KEY (tenant_id, galeria_id)
        REFERENCES galerias (tenant_id, id)
        ON DELETE CASCADE
);

CREATE INDEX ix_galeria_imagenes_galeria
    ON galeria_imagenes (galeria_id, orden);


-- -----------------------------------------------------
-- PREGUNTAS FRECUENTES
-- -----------------------------------------------------

CREATE TABLE faq (

    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tenant_id   UUID NOT NULL
                REFERENCES tenants(id) ON DELETE CASCADE,

    pregunta    TEXT NOT NULL,
    respuesta   TEXT NOT NULL,

    orden       INTEGER NOT NULL DEFAULT 0,
    activo      BOOLEAN NOT NULL DEFAULT true,

    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT agregar_updated_at('faq');

CREATE INDEX ix_faq_tenant
    ON faq (tenant_id, orden);


-- -----------------------------------------------------
-- PAGINAS DE CONTENIDO
--
-- Nosotros, trabajos personalizados, insumos... Cada una
-- es una fila, identificada por una clave estable que usa
-- el frontend. Agregar una pagina nueva no requiere
-- migracion, solo una fila.
-- -----------------------------------------------------

CREATE TABLE paginas_contenido (

    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tenant_id    UUID NOT NULL
                 REFERENCES tenants(id) ON DELETE CASCADE,

    clave        TEXT NOT NULL
                 CHECK (clave ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),

    titulo       TEXT NOT NULL,
    subtitulo    TEXT,

    -- HTML simple generado por el editor del panel.
    contenido    TEXT,

    imagen       TEXT,

    activo       BOOLEAN NOT NULL DEFAULT true,

    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (tenant_id, clave)
);

SELECT agregar_updated_at('paginas_contenido');

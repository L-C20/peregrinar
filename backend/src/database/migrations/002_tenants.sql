-- =====================================================
-- 002 · TENANTS
--
-- La raiz de todo el modelo. Cada tienda de la plataforma
-- es una fila de "tenants" y absolutamente todos los datos
-- de negocio cuelgan de ella con ON DELETE CASCADE.
-- =====================================================


-- -----------------------------------------------------
-- TIENDAS
-- -----------------------------------------------------

CREATE TABLE tenants (

    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    nombre      TEXT NOT NULL,

    -- Identificador legible. Se usa en DEFAULT_TENANT_SLUG
    -- y para armar rutas y carpetas de archivos.
    slug        TEXT NOT NULL UNIQUE
                CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),

    estado      TEXT NOT NULL DEFAULT 'activo'
                CHECK (estado IN ('activo', 'suspendido', 'inactivo')),

    plan        TEXT NOT NULL DEFAULT 'basico',

    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT agregar_updated_at('tenants');


-- -----------------------------------------------------
-- DOMINIOS
--
-- Como la tienda publica sabe que tenant tiene que servir.
-- El middleware tenantResolver busca el header Host en esta
-- tabla; si no lo encuentra usa DEFAULT_TENANT_SLUG.
--
-- Hoy hay una sola fila. El dia que un cliente traiga su
-- propio dominio, se agrega una fila y funciona: no hay
-- codigo que tocar.
-- -----------------------------------------------------

CREATE TABLE tenant_dominios (

    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tenant_id   UUID NOT NULL
                REFERENCES tenants(id) ON DELETE CASCADE,

    -- Siempre en minusculas y sin puerto.
    dominio     TEXT NOT NULL UNIQUE
                CHECK (dominio = lower(dominio)),

    principal   BOOLEAN NOT NULL DEFAULT false,

    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_tenant_dominios_tenant
    ON tenant_dominios (tenant_id);

-- Un solo dominio principal por tienda.
CREATE UNIQUE INDEX ux_tenant_dominios_principal
    ON tenant_dominios (tenant_id)
    WHERE principal;


-- -----------------------------------------------------
-- MODULOS
--
-- Que funcionalidades tiene activas cada tienda.
-- Permite vender planes distintos sin tocar el codigo.
-- -----------------------------------------------------

CREATE TABLE tenant_modulos (

    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tenant_id   UUID NOT NULL
                REFERENCES tenants(id) ON DELETE CASCADE,

    modulo      TEXT NOT NULL
                CHECK (modulo IN (
                    'catalogo',
                    'carrito',
                    'pedidos',
                    'galeria',
                    'promociones',
                    'insumos',
                    'blog'
                )),

    activo      BOOLEAN NOT NULL DEFAULT true,

    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (tenant_id, modulo)
);

SELECT agregar_updated_at('tenant_modulos');

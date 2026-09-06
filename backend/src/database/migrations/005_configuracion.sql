-- =====================================================
-- 005 · CONFIGURACION DE LA TIENDA
--
-- Tres tablas 1:1 con el tenant (apariencia, sitio y
-- contacto) mas dos listas (redes sociales y medios de pago).
--
-- Estan separadas a proposito: son tres pantallas distintas
-- del panel y tres publicos distintos. Mezclarlas en una
-- sola tabla de 60 columnas complica los formularios y los
-- valores por defecto.
--
-- Los valores DEFAULT de esta migracion son los que ve una
-- tienda recien creada, y a los que vuelve el boton
-- "Restablecer apariencia". Coinciden con frontend/shared/
-- css/tokens.css.
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
-- APARIENCIA
-- -----------------------------------------------------

CREATE TABLE configuracion_apariencia (

    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tenant_id             UUID NOT NULL UNIQUE
                          REFERENCES tenants(id) ON DELETE CASCADE,

    -- ---------- IDENTIDAD ----------

    nombre_tienda         TEXT NOT NULL DEFAULT 'Mi tienda',
    descripcion_tienda    TEXT,
    logo                  TEXT,
    favicon               TEXT,

    -- ---------- COLORES ----------

    color_principal       TEXT NOT NULL DEFAULT '#7C3AED'
                          CHECK (color_principal ~* '^#[0-9a-f]{6}$'),

    color_secundario      TEXT NOT NULL DEFAULT '#F59E0B'
                          CHECK (color_secundario ~* '^#[0-9a-f]{6}$'),

    color_fondo           TEXT NOT NULL DEFAULT '#FFFFFF'
                          CHECK (color_fondo ~* '^#[0-9a-f]{6}$'),

    color_texto           TEXT NOT NULL DEFAULT '#1F2937'
                          CHECK (color_texto ~* '^#[0-9a-f]{6}$'),

    color_boton           TEXT NOT NULL DEFAULT '#7C3AED'
                          CHECK (color_boton ~* '^#[0-9a-f]{6}$'),

    color_boton_texto     TEXT NOT NULL DEFAULT '#FFFFFF'
                          CHECK (color_boton_texto ~* '^#[0-9a-f]{6}$'),

    color_enlace          TEXT NOT NULL DEFAULT '#7C3AED'
                          CHECK (color_enlace ~* '^#[0-9a-f]{6}$'),

    -- ---------- TIPOGRAFIA ----------

    fuente_principal      TEXT NOT NULL DEFAULT 'Inter',
    fuente_titulos        TEXT NOT NULL DEFAULT 'Inter',

    tamano_titulos        TEXT NOT NULL DEFAULT 'medio'
                          CHECK (tamano_titulos IN ('chico', 'medio', 'grande')),

    peso_titulos          TEXT NOT NULL DEFAULT '600'
                          CHECK (peso_titulos IN ('400', '500', '600', '700', '800')),

    -- ---------- ESTILO ----------

    estilo_botones        TEXT NOT NULL DEFAULT 'redondeado'
                          CHECK (estilo_botones IN ('recto', 'redondeado', 'suave')),

    estilo_tarjetas       TEXT NOT NULL DEFAULT 'sombra'
                          CHECK (estilo_tarjetas IN ('plana', 'borde', 'sombra')),

    -- ---------- TEXTOS ----------

    texto_bienvenida      TEXT,
    texto_subtitulo       TEXT,
    texto_boton_principal TEXT NOT NULL DEFAULT 'Ver catálogo',
    mensaje_destacado     TEXT,

    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT agregar_updated_at('configuracion_apariencia');


-- -----------------------------------------------------
-- SITIO · SEO Y AJUSTES GENERALES
-- -----------------------------------------------------

CREATE TABLE configuracion_sitio (

    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tenant_id          UUID NOT NULL UNIQUE
                       REFERENCES tenants(id) ON DELETE CASCADE,

    meta_titulo        TEXT,
    meta_descripcion   TEXT,
    meta_palabras      TEXT,

    og_titulo          TEXT,
    og_descripcion     TEXT,
    og_imagen          TEXT,

    moneda             TEXT NOT NULL DEFAULT 'ARS',
    simbolo_moneda     TEXT NOT NULL DEFAULT '$',
    zona_horaria       TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',

    -- Mensaje fijo arriba de la tienda ("Envíos a todo el país").
    aviso_superior     TEXT,
    aviso_activo       BOOLEAN NOT NULL DEFAULT false,

    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT agregar_updated_at('configuracion_sitio');


-- -----------------------------------------------------
-- CONTACTO
-- -----------------------------------------------------

CREATE TABLE configuracion_contacto (

    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tenant_id      UUID NOT NULL UNIQUE
                   REFERENCES tenants(id) ON DELETE CASCADE,

    telefono       TEXT,

    -- Solo digitos con codigo de pais, como lo pide wa.me
    whatsapp       TEXT,

    email          TEXT,

    direccion      TEXT,
    ciudad         TEXT,
    provincia      TEXT,
    codigo_postal  TEXT,

    horarios       TEXT,
    mapa_url       TEXT,

    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT agregar_updated_at('configuracion_contacto');


-- -----------------------------------------------------
-- REDES SOCIALES
-- -----------------------------------------------------

CREATE TABLE redes_sociales (

    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tenant_id   UUID NOT NULL
                REFERENCES tenants(id) ON DELETE CASCADE,

    red         TEXT NOT NULL
                CHECK (red IN (
                    'instagram', 'facebook', 'whatsapp', 'tiktok',
                    'youtube', 'x', 'linkedin', 'otra'
                )),

    url         TEXT NOT NULL,

    etiqueta    TEXT,

    orden       INTEGER NOT NULL DEFAULT 0,
    activo      BOOLEAN NOT NULL DEFAULT true,

    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (tenant_id, red)
);

SELECT agregar_updated_at('redes_sociales');

CREATE INDEX ix_redes_sociales_tenant
    ON redes_sociales (tenant_id, orden);


-- -----------------------------------------------------
-- MEDIOS DE PAGO
--
-- Cada tienda configura los suyos. No se asume que todas
-- cobren igual.
--
-- "configuracion" guarda los datos propios de cada medio
-- (CBU y alias en transferencia, credenciales en Mercado
-- Pago) sin agregar una columna por cada caso.
-- -----------------------------------------------------

CREATE TABLE medios_pago (

    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tenant_id     UUID NOT NULL
                  REFERENCES tenants(id) ON DELETE CASCADE,

    tipo          TEXT NOT NULL
                  CHECK (tipo IN (
                      'efectivo', 'transferencia', 'mercadopago',
                      'tarjeta', 'otro'
                  )),

    nombre        TEXT NOT NULL,

    -- Texto que ve el cliente al elegir este medio.
    instrucciones TEXT,

    configuracion JSONB NOT NULL DEFAULT '{}'::jsonb,

    activo        BOOLEAN NOT NULL DEFAULT true,
    orden         INTEGER NOT NULL DEFAULT 0,

    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (tenant_id, tipo)
);

SELECT agregar_updated_at('medios_pago');

CREATE INDEX ix_medios_pago_tenant
    ON medios_pago (tenant_id, orden);

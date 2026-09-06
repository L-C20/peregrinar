-- =====================================================
-- 008 · ARCHIVOS
--
-- Registro central de todo lo que se sube desde el panel.
--
-- Las tablas de negocio guardan la clave del archivo en su
-- propia columna (productos.imagen_principal, banners.imagen,
-- etc.). Esta tabla existe ademas para poder:
--
--   - saber quien subio cada archivo y cuando;
--   - listar y limpiar archivos que ya no usa nadie;
--   - migrar de un driver de almacenamiento a otro sabiendo
--     exactamente que hay que copiar.
--
-- Es un registro, no la fuente de verdad de las relaciones.
-- =====================================================

CREATE TABLE archivos (

    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tenant_id       UUID NOT NULL
                    REFERENCES tenants(id) ON DELETE CASCADE,

    -- Ruta dentro del almacenamiento, sin dominio ni prefijo:
    -- productos/editorial-peregrinar/1712345678-abc.jpg
    clave           TEXT NOT NULL,

    -- Con que driver se guardo. Al migrar a Cloudinary los
    -- archivos viejos siguen sirviendose desde 'local'.
    driver          TEXT NOT NULL DEFAULT 'local'
                    CHECK (driver IN ('local', 'cloudinary', 's3', 'r2')),

    nombre_original TEXT,
    mime            TEXT,
    tamano          BIGINT CHECK (tamano IS NULL OR tamano >= 0),

    -- A que se asocio el archivo cuando se subio.
    entidad         TEXT
                    CHECK (entidad IS NULL OR entidad IN (
                        'producto', 'categoria', 'banner',
                        'galeria', 'apariencia', 'pagina'
                    )),

    entidad_id      UUID,

    usuario_id      UUID REFERENCES usuarios(id) ON DELETE SET NULL,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (tenant_id, clave)
);

CREATE INDEX ix_archivos_tenant
    ON archivos (tenant_id, created_at DESC);

CREATE INDEX ix_archivos_entidad
    ON archivos (tenant_id, entidad, entidad_id);

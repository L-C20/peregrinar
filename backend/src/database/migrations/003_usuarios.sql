-- =====================================================
-- 003 · USUARIOS
--
-- Un usuario pertenece a un tenant, salvo el superadmin
-- de la plataforma, que tiene tenant_id NULL y no
-- pertenece a ninguna tienda.
--
-- El email es unico DENTRO de cada tienda, no en toda la
-- plataforma: la misma persona puede ser administradora
-- de varias tiendas con el mismo email. El login resuelve
-- el tenant por el dominio antes de buscar el usuario.
-- =====================================================

CREATE TABLE usuarios (

    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- NULL = usuario de plataforma (superadmin)
    tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,

    nombre        TEXT NOT NULL,

    email         TEXT NOT NULL
                  CHECK (position('@' IN email) > 1),

    -- Hash de bcrypt. Nunca la contraseña en claro.
    password_hash TEXT NOT NULL,

    rol           TEXT NOT NULL
                  CHECK (rol IN ('superadmin', 'admin', 'empleado')),

    -- Permisos finos para el rol "empleado".
    -- Ejemplo: { "productos": ["ver","crear"], "pedidos": ["ver"] }
    -- Vacio para admin y superadmin, que tienen todo.
    permisos      JSONB NOT NULL DEFAULT '{}'::jsonb,

    activo        BOOLEAN NOT NULL DEFAULT true,

    ultimo_login  TIMESTAMPTZ,

    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- El superadmin no tiene tienda; el resto obligatoriamente si.
    CONSTRAINT ck_usuarios_tenant_segun_rol CHECK (
        (rol =  'superadmin' AND tenant_id IS NULL) OR
        (rol <> 'superadmin' AND tenant_id IS NOT NULL)
    )
);

SELECT agregar_updated_at('usuarios');


-- Un email por tienda.
CREATE UNIQUE INDEX ux_usuarios_email_por_tenant
    ON usuarios (tenant_id, lower(email))
    WHERE tenant_id IS NOT NULL;

-- Los superadmin comparten un unico espacio de nombres.
CREATE UNIQUE INDEX ux_usuarios_email_plataforma
    ON usuarios (lower(email))
    WHERE tenant_id IS NULL;

CREATE INDEX ix_usuarios_tenant
    ON usuarios (tenant_id);

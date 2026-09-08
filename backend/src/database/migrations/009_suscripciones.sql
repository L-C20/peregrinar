-- =====================================================
-- 009 · SUSCRIPCIONES
--
-- Gestión de suscripciones recurrentes con MercadoPago.
-- Cada tenant tiene una suscripción (pago mensual).
-- =====================================================

CREATE TABLE suscripciones (

    id              SERIAL PRIMARY KEY,

    tenant_id       UUID NOT NULL UNIQUE
                    REFERENCES tenants(id) ON DELETE CASCADE,

    -- ID de la suscripción en MercadoPago
    mp_subscription_id VARCHAR(255),

    -- ID del cliente en MercadoPago
    mp_customer_id  VARCHAR(255),

    -- Estado: activa, pago_fallido, cancelada, vencida
    estado          VARCHAR(50) NOT NULL DEFAULT 'pendiente'
                    CHECK (estado IN (
                        'pendiente', 'activa', 'pago_fallido',
                        'cancelada', 'vencida'
                    )),

    -- Monto en ARS (puede cambiar si ajustamos precios)
    monto           DECIMAL(10,2) NOT NULL DEFAULT 30000,

    -- Ciclo de pago: 1 = mensual
    ciclo_pago      INT NOT NULL DEFAULT 1,

    -- Fecha del próximo débito automático
    proximo_cobro   DATE,

    -- Cuándo se inició la suscripción
    fecha_inicio    TIMESTAMPTZ,

    -- Cuándo se canceló (NULL si activa)
    fecha_cancelacion TIMESTAMPTZ,

    -- Cuántos intentos fallidos de cobro
    intentos_fallidos INT DEFAULT 0,

    -- Días de trial (por defecto 7)
    dias_trial      INT DEFAULT 7,

    -- Cuándo vence el trial (si es NULL, ya se pasó)
    trial_vence_en  DATE,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_suscripciones_estado
    ON suscripciones (estado);

CREATE INDEX ix_suscripciones_proximo_cobro
    ON suscripciones (proximo_cobro)
    WHERE estado = 'activa';

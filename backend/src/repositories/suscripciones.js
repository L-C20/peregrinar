// =====================================================
// REPOSITORIO · SUSCRIPCIONES
// CRUD de suscripciones.
// =====================================================

const { query } = require("../database/connection");


async function crear(datos) {
    const {
        tenant_id,
        mp_subscription_id = null,
        mp_customer_id = null,
        estado = "pendiente",
        monto = 30000,
        ciclo_pago = 1,
        dias_trial = 7,
        trial_vence_en = null,
        proximo_cobro = null,
        fecha_inicio = null,
        fecha_cancelacion = null,
        intentos_fallidos = 0
    } = datos;

    const resultado = await query(`
        INSERT INTO suscripciones (
            tenant_id, mp_subscription_id, mp_customer_id, estado,
            monto, ciclo_pago, dias_trial, trial_vence_en,
            proximo_cobro, fecha_inicio, fecha_cancelacion,
            intentos_fallidos, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        RETURNING *
    `, [
        tenant_id, mp_subscription_id, mp_customer_id, estado,
        monto, ciclo_pago, dias_trial, trial_vence_en,
        proximo_cobro, fecha_inicio, fecha_cancelacion,
        intentos_fallidos
    ]);

    return resultado.rows[0];
}


async function obtenerPorTenant(tenant_id) {
    const resultado = await query(
        "SELECT * FROM suscripciones WHERE tenant_id = $1",
        [tenant_id]
    );
    return resultado.rows[0];
}


async function obtenerPorEstado(estado) {
    const resultado = await query(
        "SELECT * FROM suscripciones WHERE estado = $1",
        [estado]
    );
    return resultado.rows;
}


async function actualizar(id, datos) {
    const campos = [];
    const valores = [id];
    let indice = 2;

    for (const [clave, valor] of Object.entries(datos)) {
        campos.push(`${clave} = $${indice}`);
        valores.push(valor);
        indice++;
    }

    campos.push(`updated_at = NOW()`);

    const resultado = await query(`
        UPDATE suscripciones
        SET ${campos.join(", ")}
        WHERE id = $1
        RETURNING *
    `, valores);

    return resultado.rows[0];
}


async function obtenerProximos() {
    const resultado = await query(`
        SELECT * FROM suscripciones
        WHERE estado = 'activa'
        AND proximo_cobro <= CURRENT_DATE
        ORDER BY proximo_cobro ASC
    `);
    return resultado.rows;
}


module.exports = {
    crear,
    obtenerPorTenant,
    obtenerPorEstado,
    actualizar,
    obtenerProximos
};

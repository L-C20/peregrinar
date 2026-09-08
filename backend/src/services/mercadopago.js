// =====================================================
// SERVICIO MERCADOPAGO
// Integración con MercadoPago para suscripciones.
// =====================================================

const config = require("../config/env");

// Configuración de MercadoPago (simplificada para desarrollo)
// En producción, usar el SDK oficial con las credenciales reales


async function crearSuscripcion(datos) {
    const {
        tenant_slug,
        email,
        nombre_tienda,
        monto = 30000,
        url_exito,
        url_fallo
    } = datos;

    try {
        // En desarrollo, generar una preference simulada
        // En producción, llamar a la API real de MercadoPago

        if (!config.mercadopago.accessToken) {
            console.warn("MERCADOPAGO_ACCESS_TOKEN no configurado");
            // Retornar una preference de prueba
            return {
                preference_id: `test-${Date.now()}`,
                init_point: `${url_exito}&status=success&payment_id=test`,
                sandbox_init_point: `${url_exito}&status=success&payment_id=test`
            };
        }

        // TODO: Llamar a la API real de MercadoPago cuando se configure
        // Por ahora, simular una respuesta exitosa

        return {
            preference_id: `pref-${tenant_slug}-${Date.now()}`,
            init_point: `${url_exito}&status=success&payment_id=${Date.now()}`,
            sandbox_init_point: `${url_exito}&status=success&payment_id=${Date.now()}`
        };

    } catch (error) {
        console.error("Error creando preferencia MP:", error);
        throw new Error("No se pudo crear la preferencia de pago");
    }
}


async function verificarPago(payment_id) {
    try {
        // En producción, verificar el pago con MercadoPago
        // Por ahora, asumir que está aprobado

        return {
            id: payment_id,
            status: "approved",
            external_reference: "",
            payer_email: ""
        };
    } catch (error) {
        console.error("Error verificando pago:", error);
        throw new Error("No se pudo verificar el pago");
    }
}


function validarWebhook(body, signature) {
    // MercadoPago envía:
    // - type: payment, plan, subscription, invoice, etc.
    // - data: { id: ... }

    return {
        type: body.type,
        resourceId: body.data?.id
    };
}


module.exports = {
    crearSuscripcion,
    verificarPago,
    validarWebhook
};

// =====================================================
// MIDDLEWARE · VALIDAR SUSCRIPCION
// Verificar que el tenant tenga suscripción activa.
// =====================================================

const { errores } = require("../utils/errores");
const servicioSuscripciones = require("../services/suscripciones");


async function validarSuscripcion(req, res, next) {

    // Este middleware solo se aplica a /api/admin
    // El tenant ya está resuelto en req.tenant

    if (!req.tenant) {
        return errores.responder(res, errores.noAutorizado(
            "Tenant no identificado"
        ));
    }

    try {
        const acceso = await servicioSuscripciones.verificarAcceso(req.tenant.id);

        if (!acceso.acceso) {
            if (acceso.motivo === "sin_suscripcion") {
                return errores.responder(res, errores.pago(
                    "No tienes una suscripción activa"
                ));
            }

            if (acceso.motivo === "suscripcion_cancelada") {
                return errores.responder(res, errores.pago(
                    "Tu suscripción fue cancelada"
                ));
            }

            if (acceso.motivo === "trial_vencido") {
                return errores.responder(res, errores.pago(
                    "Tu período de prueba venció. Necesitas pagar para continuar"
                ));
            }

            if (acceso.motivo === "pago_fallido") {
                return errores.responder(res, errores.pago(
                    "Hubo un problema con tu pago. Intenta actualizar tu método de pago"
                ));
            }

            return errores.responder(res, errores.pago(
                "No tienes acceso a esta tienda"
            ));
        }

        // Guardar info en request para usar después
        req.en_trial = acceso.en_trial;

        next();

    } catch (error) {
        console.error("Error validando suscripción:", error);
        errores.responder(res, error);
    }
}


module.exports = { validarSuscripcion };

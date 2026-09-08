// =====================================================
// CONTROLADOR · REGISTRO
// Crear nueva tienda con suscripción.
// =====================================================

const { exito, error } = require("../utils/respuesta");
const servicioSuscripciones = require("../services/suscripciones");
const servicioMercadoPago = require("../services/mercadopago");
const suscripcionesRepo = require("../repositories/suscripciones");


async function registro(req, res) {
    try {
        const {
            email,
            password,
            nombre_tienda,
            nombre_dueño,
            telefono
        } = req.body;

        // Crear suscripción (tienda + usuario + suscripción)
        const resultado = await servicioSuscripciones.crearSuscripcion({
            email,
            password,
            nombre_tienda,
            nombre_dueño,
            telefono
        });

        // Generar preference de MercadoPago
        const host = req.get("host");
        const protocolo = process.env.NODE_ENV === "production" ? "https" : "http";

        const preference = await servicioMercadoPago.crearSuscripcion({
            tenant_slug: resultado.slug,
            email: resultado.email,
            nombre_tienda: resultado.nombre_tienda,
            monto: 30000,
            url_exito: `${protocolo}://${host}/auth/pago-confirmado?tenant=${resultado.slug}`,
            url_fallo: `${protocolo}://${host}/auth/pago-fallido?tenant=${resultado.slug}`
        });

        return exito(res, {
            tenant: {
                id: resultado.tenant.id,
                slug: resultado.slug,
                nombre: resultado.nombre_tienda,
                url: `http://${host}?tienda=${resultado.slug}`
            },
            usuario: {
                email: resultado.usuario.email,
                nombre: resultado.usuario.nombre
            },
            suscripcion: {
                estado: resultado.suscripcion.estado,
                trial_vence_en: resultado.trial_vence_en,
                monto: 30000
            },
            pago: {
                preference_id: preference.preference_id,
                init_point: preference.init_point,
                sandbox_init_point: preference.sandbox_init_point
            }
        }, 201);

    } catch (err) {
        console.error("Error en registro:", err);
        return error(res, err);
    }
}


async function confirmarPago(req, res) {
    try {
        const { preference_id, payment_id, tenant_slug } = req.body;

        if (!payment_id || !tenant_slug) {
            return error(res, new Error("Faltan datos del pago"), 400);
        }

        // Verificar pago con MP
        const pago = await servicioMercadoPago.verificarPago(payment_id);

        if (pago.status !== "approved") {
            return error(res, new Error("El pago no fue aprobado"), 400);
        }

        // Obtener tenant por slug (esto requiere un helper)
        // Por ahora, asumir que se pasa el tenant_id en el webhook

        return exito(res, {
            mensaje: "Pago confirmado",
            pago: {
                id: pago.id,
                status: pago.status
            }
        });

    } catch (err) {
        console.error("Error confirmando pago:", err);
        return error(res, err);
    }
}


async function webhookMercadoPago(req, res) {
    try {
        // MercadoPago envía:
        // POST /api/auth/webhook/mercadopago
        // {
        //   "type": "payment",
        //   "data": { "id": "12345678" }
        // }

        const { type, data } = req.body;

        if (type === "payment" && data?.id) {
            const payment_id = data.id;

            // Verificar el pago
            const pago = await servicioMercadoPago.verificarPago(payment_id);

            if (!pago.external_reference) {
                console.warn("Pago sin external_reference:", payment_id);
                return res.status(200).send("OK");
            }

            // external_reference es: slug-timestamp
            const [slug] = pago.external_reference.split("-");

            // Buscar tenant (esto es un problema: necesitamos tenant_id)
            // Por ahora, confiar en que el slugno es único
            // TODO: refactorizar para usar tenant_id

            if (pago.status === "approved") {
                // Buscar suscripción por tenant_slug
                // Necesitamos una query más compleja

                console.log("Pago aprobado para:", slug);
                // TODO: actualizar suscripción
            }
        }

        // MercadoPago necesita respuesta 200 inmediata
        return res.status(200).json({ success: true });

    } catch (err) {
        console.error("Error en webhook:", err);
        // Responder 200 de todas formas para no reintentar
        return res.status(200).json({ error: err.message });
    }
}


module.exports = {
    registro,
    confirmarPago,
    webhookMercadoPago
};

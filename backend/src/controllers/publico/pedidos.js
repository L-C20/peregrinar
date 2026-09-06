// =====================================================
// CONTROLADOR PUBLICO · CREAR UN PEDIDO
//
// Es el único punto de la tienda que escribe en la base sin
// que haya nadie autenticado. Por eso está detrás de un
// límite por IP y toda la validación vive en el servicio.
// =====================================================

const { creado } = require("../../utils/respuesta");
const { moduloActivo } = require("../../middleware/modulo");
const servicio = require("../../services/pedidos");


async function crear(req, res) {

    const pedido = await servicio.crearPedido(req.tenant.id, req.body);

    // El límite por IP cuenta pedidos creados, no intentos: si
    // contara los intentos, quien se equivoca al escribir su email
    // unas cuantas veces quedaría bloqueado sin motivo.
    req.registrarUso?.();

    return creado(res, {
        pedido,
        mensaje: `¡Listo! Tu pedido #${pedido.numero} quedó registrado. ` +
                 "Te vamos a contactar para confirmarlo."
    });
}


module.exports = { crear };

// =====================================================
// CONTROLADOR · IDENTIDAD DE LA TIENDA PUBLICA
//
// Primer dato que pide la tienda al cargar: de que tienda
// se trata y que secciones tiene habilitadas, para saber
// que mostrar en el menu.
//
// No devuelve el id del tenant. La tienda publica no lo
// necesita y no tiene por que conocerlo: el backend ya sabe
// cual es por el dominio.
// =====================================================

const config = require("../config/env");
const { exito } = require("../utils/respuesta");
const tenants = require("../repositories/tenants");


async function identidad(req, res) {

    const modulos = await tenants.modulos(req.tenant.id);

    const datos = {
        tienda: {
            nombre: req.tenant.nombre,
            slug: req.tenant.slug
        },
        modulos
    };

    // Ayuda para desarrollo: de donde salió el tenant.
    // En producción no se expone.
    if (!config.esProduccion) {
        datos.diagnostico = {
            origen: req.tenantOrigen,
            dominio: req.headers.host
        };
    }

    return exito(res, datos);
}


module.exports = { identidad };

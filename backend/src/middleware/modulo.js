// =====================================================
// MODULOS POR TIENDA
//
// Cada tenant tiene sus funcionalidades habilitadas en
// tenant_modulos. Este middleware corta la peticion cuando
// se pide algo que esa tienda no tiene contratado.
//
// Se usa desde el primer dia aunque hoy casi todo este en
// ON: es lo que permite vender planes distintos mas
// adelante sin volver a tocar las rutas.
//
// Uso:
//
//   router.get("/galerias", moduloActivo("galeria"), ctrl.listar);
// =====================================================

const { ErrorApp } = require("../utils/errores");
const { tenantDe } = require("./tenantResolver");
const tenants = require("../repositories/tenants");


const NOMBRES = {
    catalogo: "Catálogo",
    carrito: "Carrito",
    pedidos: "Pedidos",
    galeria: "Galería",
    promociones: "Promociones",
    insumos: "Insumos",
    blog: "Blog"
};


function moduloActivo(nombre) {

    if (!NOMBRES[nombre]) {
        throw new Error(`Módulo desconocido en una ruta: ${nombre}`);
    }

    return async function verificarModulo(req, res, next) {

        try {

            const tenantId = tenantDe(req);

            if (await tenants.moduloActivo(tenantId, nombre)) {
                return next();
            }

            next(new ErrorApp(
                `La sección ${NOMBRES[nombre]} no está habilitada en esta tienda`,
                403
            ));

        } catch (falla) {
            next(falla);
        }
    };
}


module.exports = { moduloActivo, NOMBRES };

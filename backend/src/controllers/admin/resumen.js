// =====================================================
// CONTROLADOR DE ADMINISTRACION · INICIO DEL PANEL
//
// Lo primero que ve el cliente al entrar. Ademas de los
// numeros, devuelve dos listas cortas que sirven para
// actuar: lo ultimo que cargo y lo que esta publicado sin
// unidades.
// =====================================================

const { exito } = require("../../utils/respuesta");
const { tenantDe } = require("../../middleware/tenantResolver");
const presentar = require("../presentar");

const repo = require("../../repositories/resumen");
const tenants = require("../../repositories/tenants");


async function resumen(req, res) {

    const tenantId = tenantDe(req);

    const [contadores, recientes, sinStock, modulos] = await Promise.all([
        repo.contadores(tenantId),
        repo.productosRecientes(tenantId, 5),
        repo.sinStock(tenantId, 5),
        tenants.modulos(tenantId)
    ]);

    return exito(res, {
        contadores,
        modulos,
        productos_recientes: presentar.productos(recientes, { admin: true }),
        sin_stock: presentar.productos(sinStock, { admin: true })
    });
}


module.exports = { resumen };

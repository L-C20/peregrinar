// =====================================================
// BASE DE LOS REPOSITORIOS
//
// Todo el SQL de la aplicacion vive en repositories/ y pasa
// por aca. La unica razon de existir de esta capa es que
// el tenant_id sea imposible de olvidar: las funciones lo
// reciben como primer argumento obligatorio y lo colocan
// ellas mismas como $1 de la consulta.
//
// Uso:
//
//   const { consulta, fila } = require("./base");
//
//   function listar(tenantId) {
//       return consulta(tenantId,
//           `SELECT * FROM productos
//            WHERE tenant_id = $1
//            ORDER BY orden`);
//   }
//
//   function porId(tenantId, id) {
//       return fila(tenantId,
//           `SELECT * FROM productos
//            WHERE tenant_id = $1 AND id = $2`,
//           [id]);
//   }
//
// Si alguna vez se agrega Row Level Security, el SET LOCAL
// va aca y no hay que tocar ningun repositorio.
// =====================================================

const { query } = require("../database/connection");


const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


// -----------------------------------------------------
// EXIGIR EL TENANT
//
// Un error de programacion, no del usuario: si esto salta
// es porque una ruta no resolvió el tenant antes de
// consultar. Se lanza con un mensaje explicito para que
// aparezca en los logs y no en la respuesta.
// -----------------------------------------------------

function exigirTenant(tenantId) {

    if (!tenantId) {
        throw new Error(
            "Se intentó una consulta sin tenant_id. " +
            "Toda ruta debe resolver el tenant antes de tocar la base."
        );
    }

    if (typeof tenantId !== "string" || !UUID.test(tenantId)) {
        throw new Error(`tenant_id inválido: ${tenantId}`);
    }

    return tenantId;
}


// -----------------------------------------------------
// CONSULTAS
// El tenant entra siempre como $1. Los parametros propios
// de la consulta empiezan en $2.
// -----------------------------------------------------

function consulta(tenantId, sql, parametros = []) {
    exigirTenant(tenantId);
    return query(sql, [tenantId, ...parametros]);
}


async function filas(tenantId, sql, parametros = []) {
    const resultado = await consulta(tenantId, sql, parametros);
    return resultado.rows;
}


async function fila(tenantId, sql, parametros = []) {
    const resultado = await consulta(tenantId, sql, parametros);
    return resultado.rows[0] || null;
}


async function contar(tenantId, sql, parametros = []) {
    const resultado = await consulta(tenantId, sql, parametros);
    return Number(resultado.rows[0]?.total ?? 0);
}


// -----------------------------------------------------
// VARIANTES PARA USAR DENTRO DE UNA TRANSACCION
// Reciben el cliente que entrega transaccion().
// -----------------------------------------------------

function consultaEn(cliente, tenantId, sql, parametros = []) {
    exigirTenant(tenantId);
    return cliente.query(sql, [tenantId, ...parametros]);
}


async function filaEn(cliente, tenantId, sql, parametros = []) {
    const resultado = await consultaEn(cliente, tenantId, sql, parametros);
    return resultado.rows[0] || null;
}


module.exports = {
    exigirTenant,
    consulta,
    filas,
    fila,
    contar,
    consultaEn,
    filaEn
};

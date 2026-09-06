// =====================================================
// REPOSITORIO DE TENANTS
//
// Es el unico repositorio que consulta SIN filtrar por
// tenant_id, porque justamente su trabajo es averiguar
// cual es el tenant. Por eso usa la conexion directa y no
// los helpers de base.js.
//
// Todo lo que se lee aca se cachea: se consulta en cada
// peticion de la tienda publica y cambia muy poco.
// =====================================================

const { query } = require("../database/connection");
const Cache = require("../utils/cache");


// Un minuto: suficiente para no golpear la base en cada
// peticion, corto para que un cambio desde el panel se vea
// enseguida aunque falle la invalidacion explicita.
const cacheTenants = new Cache(60000, "tenants");
const cacheModulos = new Cache(60000, "modulos");


const CAMPOS = "id, nombre, slug, estado, plan, created_at";


// -----------------------------------------------------
// BUSQUEDAS
// -----------------------------------------------------

async function porDominio(dominio) {

    return cacheTenants.recordar(`dominio:${dominio}`, async () => {

        const resultado = await query(
            `SELECT ${CAMPOS.split(", ").map(c => "t." + c).join(", ")}
             FROM tenants t
             INNER JOIN tenant_dominios d ON d.tenant_id = t.id
             WHERE d.dominio = $1
             LIMIT 1`,
            [dominio]
        );

        return resultado.rows[0] || null;
    });
}


async function porSlug(slug) {

    return cacheTenants.recordar(`slug:${slug}`, async () => {

        const resultado = await query(
            `SELECT ${CAMPOS} FROM tenants WHERE slug = $1 LIMIT 1`,
            [slug]
        );

        return resultado.rows[0] || null;
    });
}


async function porId(id) {

    return cacheTenants.recordar(`id:${id}`, async () => {

        const resultado = await query(
            `SELECT ${CAMPOS} FROM tenants WHERE id = $1 LIMIT 1`,
            [id]
        );

        return resultado.rows[0] || null;
    });
}


// -----------------------------------------------------
// MODULOS
// Devuelve un objeto { catalogo: true, blog: false, ... }
// -----------------------------------------------------

async function modulos(tenantId) {

    return cacheModulos.recordar(tenantId, async () => {

        const resultado = await query(
            `SELECT modulo, activo
             FROM tenant_modulos
             WHERE tenant_id = $1`,
            [tenantId]
        );

        return Object.fromEntries(
            resultado.rows.map(fila => [fila.modulo, fila.activo])
        );
    });
}


async function moduloActivo(tenantId, nombre) {
    const activos = await modulos(tenantId);
    return activos[nombre] === true;
}


// -----------------------------------------------------
// INVALIDACION
//
// La llama el panel cuando cambia el nombre de la tienda,
// sus dominios o sus modulos. Sin esto habria que esperar
// a que venza el cache.
// -----------------------------------------------------

function olvidar(tenant) {

    cacheModulos.olvidar(tenant?.id);

    // Los dominios pueden ser varios y no siempre estan a mano:
    // ante un cambio se vacia el cache de tenants completo.
    // Son unas pocas entradas.
    cacheTenants.limpiar();
}


module.exports = {
    porDominio,
    porSlug,
    porId,
    modulos,
    moduloActivo,
    olvidar
};

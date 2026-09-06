// =====================================================
// REPOSITORIO DE CATEGORIAS
//
// Todas las consultas filtran por tenant_id, que entra
// siempre como $1 a traves de los helpers de base.js.
// =====================================================

const { consulta, filas, fila, contar } = require("./base");
const slugs = require("../utils/slug");


const CAMPOS = `
    id, tenant_id, nombre, slug, descripcion, imagen,
    orden, activo, created_at, updated_at
`;


// -----------------------------------------------------
// SLUG
// -----------------------------------------------------

async function slugOcupado(tenantId, slug, exceptoId = null) {

    const encontrada = await fila(tenantId,
        `SELECT id FROM categorias
         WHERE tenant_id = $1 AND slug = $2
           AND ($3::uuid IS NULL OR id <> $3)
         LIMIT 1`,
        [slug, exceptoId]
    );

    return Boolean(encontrada);
}


function generarSlug(tenantId, base, exceptoId = null) {
    return slugs.unico(base, slug => slugOcupado(tenantId, slug, exceptoId));
}


// -----------------------------------------------------
// LECTURA
// -----------------------------------------------------

// Para la tienda: solo las activas, y con cuantos productos
// a la venta tiene cada una para poder ocultar las vacias.
function listarPublicas(tenantId) {
    return filas(tenantId,
        `SELECT c.id, c.nombre, c.slug, c.descripcion, c.imagen, c.orden,
                (SELECT count(*)
                   FROM productos p
                  WHERE p.tenant_id = c.tenant_id
                    AND p.categoria_id = c.id
                    AND p.disponible)::int AS productos
         FROM categorias c
         WHERE c.tenant_id = $1 AND c.activo
         ORDER BY c.orden, c.nombre`
    );
}


// Para el panel: todas, activas o no, con el total de productos.
function listar(tenantId) {
    return filas(tenantId,
        `SELECT c.id, c.nombre, c.slug, c.descripcion, c.imagen,
                c.orden, c.activo, c.created_at, c.updated_at,
                (SELECT count(*)
                   FROM productos p
                  WHERE p.tenant_id = c.tenant_id AND p.categoria_id = c.id)::int
                AS productos
         FROM categorias c
         WHERE c.tenant_id = $1
         ORDER BY c.orden, c.nombre`
    );
}


function porId(tenantId, id) {
    return fila(tenantId,
        `SELECT ${CAMPOS} FROM categorias
         WHERE tenant_id = $1 AND id = $2`,
        [id]
    );
}


function porSlug(tenantId, slug) {
    return fila(tenantId,
        `SELECT ${CAMPOS} FROM categorias
         WHERE tenant_id = $1 AND slug = $2`,
        [slug]
    );
}


function contarProductos(tenantId, id) {
    return contar(tenantId,
        `SELECT count(*) AS total FROM productos
         WHERE tenant_id = $1 AND categoria_id = $2`,
        [id]
    );
}


// -----------------------------------------------------
// ESCRITURA
// -----------------------------------------------------

async function crear(tenantId, { nombre, slug, descripcion, imagen, orden, activo }) {

    // Va al final de la lista si no se indica posicion.
    const siguiente = orden ?? await contar(tenantId,
        `SELECT COALESCE(MAX(orden), -1) + 1 AS total
         FROM categorias WHERE tenant_id = $1`
    );

    return fila(tenantId,
        `INSERT INTO categorias
             (tenant_id, nombre, slug, descripcion, imagen, orden, activo)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING ${CAMPOS}`,
        [nombre, slug, descripcion, imagen, siguiente, activo]
    );
}


function actualizar(tenantId, id, { nombre, slug, descripcion, imagen, activo }) {
    return fila(tenantId,
        `UPDATE categorias SET
             nombre      = $3,
             slug        = $4,
             descripcion = $5,
             imagen      = COALESCE($6, imagen),
             activo      = $7
         WHERE tenant_id = $1 AND id = $2
         RETURNING ${CAMPOS}`,
        [id, nombre, slug, descripcion, imagen, activo]
    );
}


function eliminar(tenantId, id) {
    return fila(tenantId,
        `DELETE FROM categorias
         WHERE tenant_id = $1 AND id = $2
         RETURNING ${CAMPOS}`,
        [id]
    );
}


// Deja los productos de la categoria sin categoria asignada.
// Se usa antes de eliminarla, dentro de la misma transaccion:
// la base rechaza borrar una categoria que todavia tiene
// productos (ON DELETE RESTRICT).
async function desasignarProductos(cliente, tenantId, id) {
    const resultado = await cliente.query(
        `UPDATE productos SET categoria_id = NULL
         WHERE tenant_id = $1 AND categoria_id = $2`,
        [tenantId, id]
    );
    return resultado.rowCount;
}


function eliminarEn(cliente, tenantId, id) {
    return cliente.query(
        `DELETE FROM categorias WHERE tenant_id = $1 AND id = $2`,
        [tenantId, id]
    );
}


// Guarda el orden en que el cliente dejo la lista.
// Un solo UPDATE con la posicion de cada id.
async function reordenar(tenantId, ids) {
    const resultado = await consulta(tenantId,
        `UPDATE categorias AS c
         SET orden = nuevo.posicion
         FROM (
             SELECT id, (ordinalidad - 1)::int AS posicion
             FROM unnest($2::uuid[]) WITH ORDINALITY AS t(id, ordinalidad)
         ) AS nuevo
         WHERE c.tenant_id = $1 AND c.id = nuevo.id`,
        [ids]
    );
    return resultado.rowCount;
}


module.exports = {
    listarPublicas,
    listar,
    porId,
    porSlug,
    contarProductos,
    crear,
    actualizar,
    eliminar,
    eliminarEn,
    desasignarProductos,
    reordenar,
    generarSlug,
    slugOcupado
};

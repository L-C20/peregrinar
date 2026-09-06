// =====================================================
// REPOSITORIO DE PRODUCTOS
//
// Todas las consultas filtran por tenant_id, que entra como
// $1 a traves de los helpers de base.js.
//
// Ojo con el LEFT JOIN a categorias: ademas de c.id lleva
// c.tenant_id, para que la union no pueda cruzar tiendas
// aunque el dato estuviera mal. La clave foranea compuesta
// ya lo impide al escribir; esto lo impide tambien al leer.
// =====================================================

const { consulta, filas, fila, contar } = require("./base");
const { transaccion } = require("../database/connection");
const slugs = require("../utils/slug");


const MAX_IMAGENES = 6;


const CAMPOS = `
    p.id, p.tenant_id, p.categoria_id, p.nombre, p.slug, p.descripcion,
    p.precio, p.precio_anterior, p.stock, p.sku, p.imagen_principal,
    p.destacado, p.novedad, p.disponible, p.orden,
    p.created_at, p.updated_at
`;


const IMAGENES = `
    COALESCE((
        SELECT json_agg(
                   json_build_object(
                       'id', i.id,
                       'imagen', i.imagen,
                       'orden', i.orden,
                       'principal', i.principal
                   ) ORDER BY i.orden, i.created_at
               )
        FROM producto_imagenes i
        WHERE i.tenant_id = p.tenant_id AND i.producto_id = p.id
    ), '[]'::json) AS imagenes
`;


// -----------------------------------------------------
// FILTROS
//
// Arma el WHERE de a pedazos. Los parametros propios
// empiezan en $2 porque $1 siempre es el tenant.
// -----------------------------------------------------

function armarFiltros({
    categoriaSlug = null,
    categoriaId = null,
    buscar = null,
    destacados = false,
    novedades = false,
    soloDisponibles = false,
    disponible = null
}) {

    const condiciones = ["p.tenant_id = $1"];
    const parametros = [];

    const agregar = (plantilla, valor) => {
        parametros.push(valor);
        condiciones.push(plantilla.replace("?", `$${parametros.length + 1}`));
    };

    if (soloDisponibles) condiciones.push("p.disponible");
    else if (disponible !== null) agregar("p.disponible = ?", disponible);

    if (categoriaSlug) agregar("c.slug = ?", categoriaSlug);
    if (categoriaId) agregar("p.categoria_id = ?", categoriaId);

    if (buscar) {
        parametros.push(`%${buscar}%`);
        const marcador = `$${parametros.length + 1}`;
        condiciones.push(
            `(p.nombre ILIKE ${marcador} OR p.descripcion ILIKE ${marcador} ` +
            `OR p.sku ILIKE ${marcador})`
        );
    }

    if (destacados) condiciones.push("p.destacado");
    if (novedades) condiciones.push("p.novedad");

    return { where: condiciones.join(" AND "), parametros };
}


const DESDE = `
    FROM productos p
    LEFT JOIN categorias c
      ON c.tenant_id = p.tenant_id AND c.id = p.categoria_id
`;


// -----------------------------------------------------
// LISTADOS
// -----------------------------------------------------

async function buscar(tenantId, filtros = {}, { desde = 0, porPagina = 24 } = {}) {

    const { where, parametros } = armarFiltros(filtros);

    const total = await contar(tenantId,
        `SELECT count(*) AS total ${DESDE} WHERE ${where}`,
        parametros
    );

    const items = await filas(tenantId,
        `SELECT ${CAMPOS},
                c.nombre AS categoria_nombre,
                c.slug   AS categoria_slug
         ${DESDE}
         WHERE ${where}
         ORDER BY p.orden, p.nombre
         LIMIT $${parametros.length + 2} OFFSET $${parametros.length + 3}`,
        [...parametros, porPagina, desde]
    );

    return { items, total };
}


// La tienda publica: solo lo que esta a la venta.
function buscarPublicos(tenantId, filtros = {}, paginado) {
    return buscar(tenantId, { ...filtros, soloDisponibles: true }, paginado);
}


// -----------------------------------------------------
// DETALLE
// -----------------------------------------------------

function porId(tenantId, id) {
    return fila(tenantId,
        `SELECT ${CAMPOS}, ${IMAGENES},
                c.nombre AS categoria_nombre,
                c.slug   AS categoria_slug
         ${DESDE}
         WHERE p.tenant_id = $1 AND p.id = $2`,
        [id]
    );
}


function porSlug(tenantId, slug, { soloDisponibles = false } = {}) {
    return fila(tenantId,
        `SELECT ${CAMPOS}, ${IMAGENES},
                c.nombre AS categoria_nombre,
                c.slug   AS categoria_slug
         ${DESDE}
         WHERE p.tenant_id = $1 AND p.slug = $2
         ${soloDisponibles ? "AND p.disponible" : ""}`,
        [slug]
    );
}


// Relacionados: misma categoria, sin repetir el que se mira.
function relacionados(tenantId, producto, limite = 4) {
    return filas(tenantId,
        `SELECT ${CAMPOS}, c.slug AS categoria_slug
         ${DESDE}
         WHERE p.tenant_id = $1
           AND p.disponible
           AND p.id <> $2
           AND ($3::uuid IS NULL OR p.categoria_id = $3)
         ORDER BY p.destacado DESC, p.orden, p.nombre
         LIMIT $4`,
        [producto.id, producto.categoria_id, limite]
    );
}


// -----------------------------------------------------
// SLUG
// -----------------------------------------------------

async function slugOcupado(tenantId, slug, exceptoId = null) {
    const encontrado = await fila(tenantId,
        `SELECT id FROM productos
         WHERE tenant_id = $1 AND slug = $2
           AND ($3::uuid IS NULL OR id <> $3)
         LIMIT 1`,
        [slug, exceptoId]
    );
    return Boolean(encontrado);
}


function generarSlug(tenantId, base, exceptoId = null) {
    return slugs.unico(base, slug => slugOcupado(tenantId, slug, exceptoId));
}


// -----------------------------------------------------
// ESCRITURA
// -----------------------------------------------------

async function crear(tenantId, datos) {

    const siguiente = datos.orden ?? await contar(tenantId,
        `SELECT COALESCE(MAX(orden), -1) + 1 AS total
         FROM productos WHERE tenant_id = $1`
    );

    return fila(tenantId,
        `INSERT INTO productos (
             tenant_id, categoria_id, nombre, slug, descripcion,
             precio, precio_anterior, stock, sku,
             destacado, novedad, disponible, orden
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING ${CAMPOS.replace(/p\./g, "")}`,
        [
            datos.categoria_id, datos.nombre, datos.slug, datos.descripcion,
            datos.precio, datos.precio_anterior, datos.stock, datos.sku,
            datos.destacado, datos.novedad, datos.disponible, siguiente
        ]
    );
}


function actualizar(tenantId, id, datos) {
    return fila(tenantId,
        `UPDATE productos SET
             categoria_id    = $3,
             nombre          = $4,
             slug            = $5,
             descripcion     = $6,
             precio          = $7,
             precio_anterior = $8,
             stock           = $9,
             sku             = $10,
             destacado       = $11,
             novedad         = $12,
             disponible      = $13
         WHERE tenant_id = $1 AND id = $2
         RETURNING ${CAMPOS.replace(/p\./g, "")}`,
        [
            id, datos.categoria_id, datos.nombre, datos.slug, datos.descripcion,
            datos.precio, datos.precio_anterior, datos.stock, datos.sku,
            datos.destacado, datos.novedad, datos.disponible
        ]
    );
}


function cambiarDisponible(tenantId, id, disponible) {
    return fila(tenantId,
        `UPDATE productos SET disponible = $3
         WHERE tenant_id = $1 AND id = $2
         RETURNING ${CAMPOS.replace(/p\./g, "")}`,
        [id, disponible]
    );
}


function eliminar(tenantId, id) {
    return fila(tenantId,
        `DELETE FROM productos
         WHERE tenant_id = $1 AND id = $2
         RETURNING id, nombre, imagen_principal`,
        [id]
    );
}


async function reordenar(tenantId, ids) {
    const resultado = await consulta(tenantId,
        `UPDATE productos AS p
         SET orden = nuevo.posicion
         FROM (
             SELECT id, (ordinalidad - 1)::int AS posicion
             FROM unnest($2::uuid[]) WITH ORDINALITY AS t(id, ordinalidad)
         ) AS nuevo
         WHERE p.tenant_id = $1 AND p.id = nuevo.id`,
        [ids]
    );
    return resultado.rowCount;
}


// -----------------------------------------------------
// IMAGENES
//
// productos.imagen_principal guarda una copia de la clave
// de la imagen principal para no tener que hacer un JOIN en
// cada listado. sincronizarPrincipal() es lo que mantiene
// esa copia al dia: se llama despues de cualquier cambio.
// -----------------------------------------------------

function imagenesDe(tenantId, productoId) {
    return filas(tenantId,
        `SELECT id, producto_id, imagen, orden, principal, created_at
         FROM producto_imagenes
         WHERE tenant_id = $1 AND producto_id = $2
         ORDER BY orden, created_at`,
        [productoId]
    );
}


function contarImagenes(tenantId, productoId) {
    return contar(tenantId,
        `SELECT count(*) AS total FROM producto_imagenes
         WHERE tenant_id = $1 AND producto_id = $2`,
        [productoId]
    );
}


function imagenPorId(tenantId, productoId, imagenId) {
    return fila(tenantId,
        `SELECT id, producto_id, imagen, orden, principal
         FROM producto_imagenes
         WHERE tenant_id = $1 AND producto_id = $2 AND id = $3`,
        [productoId, imagenId]
    );
}


// Deja como principal la de menor orden. Si el producto se
// quedo sin imagenes, imagen_principal vuelve a NULL.
async function sincronizarPrincipal(cliente, tenantId, productoId) {

    const { rows } = await cliente.query(
        `SELECT id, imagen FROM producto_imagenes
         WHERE tenant_id = $1 AND producto_id = $2
         ORDER BY principal DESC, orden, created_at
         LIMIT 1`,
        [tenantId, productoId]
    );

    const elegida = rows[0] || null;

    // Primero se apagan todas y despues se enciende una:
    // hay un indice unico que impide dos principales a la vez.
    await cliente.query(
        `UPDATE producto_imagenes SET principal = false
         WHERE tenant_id = $1 AND producto_id = $2 AND principal`,
        [tenantId, productoId]
    );

    if (elegida) {
        await cliente.query(
            `UPDATE producto_imagenes SET principal = true
             WHERE tenant_id = $1 AND id = $2`,
            [tenantId, elegida.id]
        );
    }

    await cliente.query(
        `UPDATE productos SET imagen_principal = $3
         WHERE tenant_id = $1 AND id = $2`,
        [tenantId, productoId, elegida ? elegida.imagen : null]
    );

    return elegida ? elegida.imagen : null;
}


// Agrega imagenes y deja la principal consistente.
async function agregarImagenes(tenantId, productoId, claves) {

    return transaccion(async (cliente) => {

        const { rows } = await cliente.query(
            `SELECT COALESCE(MAX(orden), -1) + 1 AS siguiente
             FROM producto_imagenes
             WHERE tenant_id = $1 AND producto_id = $2`,
            [tenantId, productoId]
        );

        let orden = Number(rows[0].siguiente);

        for (const clave of claves) {
            await cliente.query(
                `INSERT INTO producto_imagenes
                     (tenant_id, producto_id, imagen, orden)
                 VALUES ($1, $2, $3, $4)`,
                [tenantId, productoId, clave, orden++]
            );
        }

        await sincronizarPrincipal(cliente, tenantId, productoId);

        const { rows: finales } = await cliente.query(
            `SELECT id, imagen, orden, principal
             FROM producto_imagenes
             WHERE tenant_id = $1 AND producto_id = $2
             ORDER BY orden, created_at`,
            [tenantId, productoId]
        );

        return finales;
    });
}


async function eliminarImagen(tenantId, productoId, imagenId) {

    return transaccion(async (cliente) => {

        const { rows } = await cliente.query(
            `DELETE FROM producto_imagenes
             WHERE tenant_id = $1 AND producto_id = $2 AND id = $3
             RETURNING id, imagen`,
            [tenantId, productoId, imagenId]
        );

        if (rows.length === 0) return null;

        await sincronizarPrincipal(cliente, tenantId, productoId);

        return rows[0];
    });
}


async function marcarPrincipal(tenantId, productoId, imagenId) {

    return transaccion(async (cliente) => {

        const { rows } = await cliente.query(
            `SELECT id, imagen FROM producto_imagenes
             WHERE tenant_id = $1 AND producto_id = $2 AND id = $3`,
            [tenantId, productoId, imagenId]
        );

        if (rows.length === 0) return null;

        await cliente.query(
            `UPDATE producto_imagenes SET principal = false
             WHERE tenant_id = $1 AND producto_id = $2 AND principal`,
            [tenantId, productoId]
        );

        await cliente.query(
            `UPDATE producto_imagenes SET principal = true
             WHERE tenant_id = $1 AND id = $2`,
            [tenantId, imagenId]
        );

        await cliente.query(
            `UPDATE productos SET imagen_principal = $3
             WHERE tenant_id = $1 AND id = $2`,
            [tenantId, productoId, rows[0].imagen]
        );

        return rows[0];
    });
}


module.exports = {
    MAX_IMAGENES,
    buscar,
    buscarPublicos,
    porId,
    porSlug,
    relacionados,
    generarSlug,
    slugOcupado,
    crear,
    actualizar,
    cambiarDisponible,
    eliminar,
    reordenar,
    imagenesDe,
    contarImagenes,
    imagenPorId,
    agregarImagenes,
    eliminarImagen,
    marcarPrincipal
};

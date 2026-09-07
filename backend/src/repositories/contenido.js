// =====================================================
// REPOSITORIO · CONTENIDO EDITABLE
//
// Los banners de la portada, las paginas de texto (Nosotros,
// Trabajos personalizados) y las preguntas frecuentes. Todo
// lo que el cliente edita desde el panel en vez de tocar HTML.
//
// Cada bloque tiene dos lecturas:
//
//   - la PUBLICA, que devuelve solo lo activo y solo los
//     campos que la tienda muestra;
//   - la del PANEL, que devuelve todo, incluido lo oculto,
//     porque para volver a mostrarlo primero hay que verlo.
//
// Como en todos los repositorios, el tenant_id entra como $1
// a traves de los helpers de base.js.
// =====================================================

const { consulta, filas, fila } = require("./base");
const slugs = require("../utils/slug");


// =====================================================
// PAGINAS DE CONTENIDO
// =====================================================

const CAMPOS_PAGINA = `
    id, clave, titulo, subtitulo, contenido, imagen,
    activo, created_at, updated_at
`;


function pagina(tenantId, clave) {
    return fila(tenantId,
        `SELECT clave, titulo, subtitulo, contenido, imagen
         FROM paginas_contenido
         WHERE tenant_id = $1 AND clave = $2 AND activo`,
        [clave]
    );
}


// Solo las claves, para saber que enlaces mostrar en el menu
// sin traer todo el texto de cada pagina.
function clavesDePaginas(tenantId) {
    return filas(tenantId,
        `SELECT clave, titulo
         FROM paginas_contenido
         WHERE tenant_id = $1 AND activo
         ORDER BY clave`
    );
}


function listarPaginas(tenantId) {
    return filas(tenantId,
        `SELECT ${CAMPOS_PAGINA}
         FROM paginas_contenido
         WHERE tenant_id = $1
         ORDER BY titulo`
    );
}


function paginaPorId(tenantId, id) {
    return fila(tenantId,
        `SELECT ${CAMPOS_PAGINA}
         FROM paginas_contenido
         WHERE tenant_id = $1 AND id = $2`,
        [id]
    );
}


async function claveOcupada(tenantId, clave, exceptoId = null) {

    const encontrada = await fila(tenantId,
        `SELECT id FROM paginas_contenido
         WHERE tenant_id = $1 AND clave = $2
           AND ($3::uuid IS NULL OR id <> $3)
         LIMIT 1`,
        [clave, exceptoId]
    );

    return Boolean(encontrada);
}


function generarClave(tenantId, base, exceptoId = null) {
    return slugs.unico(base, clave => claveOcupada(tenantId, clave, exceptoId));
}


function crearPagina(tenantId, { clave, titulo, subtitulo, contenido, imagen, activo }) {
    return fila(tenantId,
        `INSERT INTO paginas_contenido
             (tenant_id, clave, titulo, subtitulo, contenido, imagen, activo)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING ${CAMPOS_PAGINA}`,
        [clave, titulo, subtitulo, contenido, imagen, activo]
    );
}


function actualizarPagina(tenantId, id, { clave, titulo, subtitulo, contenido, imagen, activo }) {
    return fila(tenantId,
        `UPDATE paginas_contenido SET
             clave     = $3,
             titulo    = $4,
             subtitulo = $5,
             contenido = $6,
             imagen    = COALESCE($7, imagen),
             activo    = $8
         WHERE tenant_id = $1 AND id = $2
         RETURNING ${CAMPOS_PAGINA}`,
        [id, clave, titulo, subtitulo, contenido, imagen, activo]
    );
}


function eliminarPagina(tenantId, id) {
    return fila(tenantId,
        `DELETE FROM paginas_contenido
         WHERE tenant_id = $1 AND id = $2
         RETURNING ${CAMPOS_PAGINA}`,
        [id]
    );
}


// =====================================================
// PREGUNTAS FRECUENTES
// =====================================================

const CAMPOS_FAQ = `
    id, pregunta, respuesta, orden, activo, created_at, updated_at
`;


function faq(tenantId) {
    return filas(tenantId,
        `SELECT pregunta, respuesta
         FROM faq
         WHERE tenant_id = $1 AND activo
         ORDER BY orden, created_at`
    );
}


function listarFaq(tenantId) {
    return filas(tenantId,
        `SELECT ${CAMPOS_FAQ}
         FROM faq
         WHERE tenant_id = $1
         ORDER BY orden, created_at`
    );
}


function faqPorId(tenantId, id) {
    return fila(tenantId,
        `SELECT ${CAMPOS_FAQ} FROM faq
         WHERE tenant_id = $1 AND id = $2`,
        [id]
    );
}


function crearFaq(tenantId, { pregunta, respuesta, activo }) {
    return fila(tenantId,
        `INSERT INTO faq (tenant_id, pregunta, respuesta, orden, activo)
         VALUES ($1, $2, $3,
                 (SELECT COALESCE(MAX(orden), -1) + 1 FROM faq WHERE tenant_id = $1),
                 $4)
         RETURNING ${CAMPOS_FAQ}`,
        [pregunta, respuesta, activo]
    );
}


function actualizarFaq(tenantId, id, { pregunta, respuesta, activo }) {
    return fila(tenantId,
        `UPDATE faq SET
             pregunta  = $3,
             respuesta = $4,
             activo    = $5
         WHERE tenant_id = $1 AND id = $2
         RETURNING ${CAMPOS_FAQ}`,
        [id, pregunta, respuesta, activo]
    );
}


function eliminarFaq(tenantId, id) {
    return fila(tenantId,
        `DELETE FROM faq
         WHERE tenant_id = $1 AND id = $2
         RETURNING ${CAMPOS_FAQ}`,
        [id]
    );
}


// =====================================================
// BANNERS
// =====================================================

const CAMPOS_BANNER = `
    id, titulo, descripcion, imagen, texto_boton, enlace,
    ubicacion, orden, activo, created_at, updated_at
`;


function banners(tenantId, ubicacion = "inicio") {
    return filas(tenantId,
        `SELECT titulo, descripcion, imagen, texto_boton, enlace
         FROM banners
         WHERE tenant_id = $1 AND ubicacion = $2 AND activo
         ORDER BY orden, created_at`,
        [ubicacion]
    );
}


function listarBanners(tenantId) {
    return filas(tenantId,
        `SELECT ${CAMPOS_BANNER}
         FROM banners
         WHERE tenant_id = $1
         ORDER BY orden, created_at`
    );
}


function bannerPorId(tenantId, id) {
    return fila(tenantId,
        `SELECT ${CAMPOS_BANNER} FROM banners
         WHERE tenant_id = $1 AND id = $2`,
        [id]
    );
}


function crearBanner(tenantId, { titulo, descripcion, imagen, textoBoton, enlace, ubicacion, activo }) {
    return fila(tenantId,
        `INSERT INTO banners
             (tenant_id, titulo, descripcion, imagen, texto_boton,
              enlace, ubicacion, orden, activo)
         VALUES ($1, $2, $3, $4, $5, $6, $7,
                 (SELECT COALESCE(MAX(orden), -1) + 1
                    FROM banners WHERE tenant_id = $1),
                 $8)
         RETURNING ${CAMPOS_BANNER}`,
        [titulo, descripcion, imagen, textoBoton, enlace, ubicacion, activo]
    );
}


function actualizarBanner(tenantId, id, { titulo, descripcion, imagen, textoBoton, enlace, ubicacion, activo }) {
    return fila(tenantId,
        `UPDATE banners SET
             titulo      = $3,
             descripcion = $4,
             imagen      = COALESCE($5, imagen),
             texto_boton = $6,
             enlace      = $7,
             ubicacion   = $8,
             activo      = $9
         WHERE tenant_id = $1 AND id = $2
         RETURNING ${CAMPOS_BANNER}`,
        [id, titulo, descripcion, imagen, textoBoton, enlace, ubicacion, activo]
    );
}


function eliminarBanner(tenantId, id) {
    return fila(tenantId,
        `DELETE FROM banners
         WHERE tenant_id = $1 AND id = $2
         RETURNING ${CAMPOS_BANNER}`,
        [id]
    );
}


// =====================================================
// ORDEN
//
// Un solo UPDATE con la posicion de cada id. La clausula
// tenant_id = $1 es la que impide que un id de otra tienda
// entre en la lista y termine reordenado.
// =====================================================

async function reordenar(tabla, tenantId, ids) {

    if (!["faq", "banners"].includes(tabla)) {
        throw new Error(`Tabla no reordenable: ${tabla}`);
    }

    const resultado = await consulta(tenantId,
        `UPDATE ${tabla} AS t
         SET orden = nuevo.posicion
         FROM (
             SELECT id, (ordinalidad - 1)::int AS posicion
             FROM unnest($2::uuid[]) WITH ORDINALITY AS u(id, ordinalidad)
         ) AS nuevo
         WHERE t.tenant_id = $1 AND t.id = nuevo.id`,
        [ids]
    );

    return resultado.rowCount;
}


module.exports = {

    // publico
    pagina, clavesDePaginas, faq, banners,

    // paginas
    listarPaginas, paginaPorId, generarClave, claveOcupada,
    crearPagina, actualizarPagina, eliminarPagina,

    // preguntas frecuentes
    listarFaq, faqPorId, crearFaq, actualizarFaq, eliminarFaq,

    // banners
    listarBanners, bannerPorId, crearBanner, actualizarBanner, eliminarBanner,

    reordenar
};

// =====================================================
// REPOSITORIO · CONTENIDO EDITABLE
//
// Las paginas de texto (nosotros, trabajos personalizados)
// y las preguntas frecuentes. Todo lo que el cliente edita
// desde el panel en vez de tocar HTML.
// =====================================================

const { fila, filas } = require("./base");


// -----------------------------------------------------
// PAGINAS
// -----------------------------------------------------

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


// -----------------------------------------------------
// PREGUNTAS FRECUENTES
// -----------------------------------------------------

function faq(tenantId) {
    return filas(tenantId,
        `SELECT pregunta, respuesta
         FROM faq
         WHERE tenant_id = $1 AND activo
         ORDER BY orden, created_at`
    );
}


// -----------------------------------------------------
// BANNERS
// La administracion llega en la Etapa 11, pero la tienda ya
// los muestra si hay alguno cargado.
// -----------------------------------------------------

function banners(tenantId, ubicacion = "inicio") {
    return filas(tenantId,
        `SELECT titulo, descripcion, imagen, texto_boton, enlace
         FROM banners
         WHERE tenant_id = $1 AND ubicacion = $2 AND activo
         ORDER BY orden, created_at`,
        [ubicacion]
    );
}


module.exports = { pagina, clavesDePaginas, faq, banners };

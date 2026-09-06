// =====================================================
// REPOSITORIO · CONFIGURACION DE LA TIENDA
//
// Apariencia, datos del sitio, contacto y redes sociales.
// Son cuatro tablas separadas pero la tienda las pide todas
// juntas al cargar, asi que se leen de una sola vez.
// =====================================================

const { fila, filas } = require("./base");


// -----------------------------------------------------
// APARIENCIA
// -----------------------------------------------------

const CAMPOS_APARIENCIA = `
    nombre_tienda, descripcion_tienda, logo, favicon,
    color_principal, color_secundario, color_fondo, color_texto,
    color_boton, color_boton_texto, color_enlace,
    fuente_principal, fuente_titulos, tamano_titulos, peso_titulos,
    estilo_botones, estilo_tarjetas,
    texto_bienvenida, texto_subtitulo, texto_boton_principal,
    mensaje_destacado
`;


function apariencia(tenantId) {
    return fila(tenantId,
        `SELECT ${CAMPOS_APARIENCIA}
         FROM configuracion_apariencia
         WHERE tenant_id = $1`
    );
}


// -----------------------------------------------------
// SITIO (SEO y ajustes)
// -----------------------------------------------------

function sitio(tenantId) {
    return fila(tenantId,
        `SELECT meta_titulo, meta_descripcion, meta_palabras,
                og_titulo, og_descripcion, og_imagen,
                moneda, simbolo_moneda, zona_horaria,
                aviso_superior, aviso_activo
         FROM configuracion_sitio
         WHERE tenant_id = $1`
    );
}


// -----------------------------------------------------
// CONTACTO
// -----------------------------------------------------

function contacto(tenantId) {
    return fila(tenantId,
        `SELECT telefono, whatsapp, email, direccion, ciudad,
                provincia, codigo_postal, horarios, mapa_url
         FROM configuracion_contacto
         WHERE tenant_id = $1`
    );
}


// -----------------------------------------------------
// REDES SOCIALES
// -----------------------------------------------------

function redes(tenantId) {
    return filas(tenantId,
        `SELECT red, url, etiqueta
         FROM redes_sociales
         WHERE tenant_id = $1 AND activo
         ORDER BY orden, red`
    );
}


// -----------------------------------------------------
// MEDIOS DE PAGO
// Se muestran en la tienda para que el comprador sepa
// como puede pagar antes de decidirse.
// -----------------------------------------------------

function mediosPago(tenantId) {
    return filas(tenantId,
        `SELECT tipo, nombre, instrucciones
         FROM medios_pago
         WHERE tenant_id = $1 AND activo
         ORDER BY orden, nombre`
    );
}


module.exports = { apariencia, sitio, contacto, redes, mediosPago };

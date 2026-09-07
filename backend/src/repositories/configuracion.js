// =====================================================
// REPOSITORIO · CONFIGURACION DE LA TIENDA
//
// Apariencia, datos del sitio, contacto, redes sociales y
// medios de pago. Son cinco tablas separadas pero la tienda
// las pide todas juntas al cargar, asi que se leen de una
// sola vez.
//
// Las tres primeras son 1:1 con el tenant y siempre existen:
// las crea el servicio que da de alta la tienda. Aun asi, las
// escrituras son UPSERT, para que una tienda cargada a mano
// en la base tampoco rompa el panel.
// =====================================================

const { consulta, filas, fila, consultaEn } = require("./base");


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


// Identidad y textos de la portada.
//
// Los colores y las tipografias NO se tocan acá: son la otra
// mitad de esta tabla y tienen su propia pantalla. Escribir
// solo estas columnas deja intacto lo demas.
function guardarIdentidad(tenantId, {
    nombreTienda, descripcionTienda, logo, favicon,
    textoBienvenida, textoSubtitulo, textoBotonPrincipal, mensajeDestacado
}) {
    return fila(tenantId,
        `INSERT INTO configuracion_apariencia AS c (
             tenant_id, nombre_tienda, descripcion_tienda, logo, favicon,
             texto_bienvenida, texto_subtitulo, texto_boton_principal,
             mensaje_destacado
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 'Ver catálogo'), $9)
         ON CONFLICT (tenant_id) DO UPDATE SET
             nombre_tienda         = EXCLUDED.nombre_tienda,
             descripcion_tienda    = EXCLUDED.descripcion_tienda,

             -- Una imagen que no se vuelve a subir se conserva:
             -- guardar el formulario sin tocar el logo no lo
             -- borra. Para sacarlo hay un boton propio, que llama
             -- a quitarImagenIdentidad().
             logo                  = COALESCE($4, c.logo),
             favicon               = COALESCE($5, c.favicon),

             texto_bienvenida      = EXCLUDED.texto_bienvenida,
             texto_subtitulo       = EXCLUDED.texto_subtitulo,
             texto_boton_principal = EXCLUDED.texto_boton_principal,
             mensaje_destacado     = EXCLUDED.mensaje_destacado
         RETURNING ${CAMPOS_APARIENCIA}`,
        [
            nombreTienda, descripcionTienda, logo, favicon,
            textoBienvenida, textoSubtitulo, textoBotonPrincipal, mensajeDestacado
        ]
    );
}


// Colores, tipografias y estilo. La otra mitad de la tabla:
// escribir solo estas columnas deja intacta la identidad.
function guardarApariencia(tenantId, {
    colorPrincipal, colorSecundario, colorFondo, colorTexto,
    colorBoton, colorBotonTexto, colorEnlace,
    fuentePrincipal, fuenteTitulos, tamanoTitulos, pesoTitulos,
    estiloBotones, estiloTarjetas
}) {
    return fila(tenantId,
        `UPDATE configuracion_apariencia SET
             color_principal   = $2,
             color_secundario  = $3,
             color_fondo       = $4,
             color_texto       = $5,
             color_boton       = $6,
             color_boton_texto = $7,
             color_enlace      = $8,
             fuente_principal  = $9,
             fuente_titulos    = $10,
             tamano_titulos    = $11,
             peso_titulos      = $12,
             estilo_botones    = $13,
             estilo_tarjetas   = $14
         WHERE tenant_id = $1
         RETURNING ${CAMPOS_APARIENCIA}`,
        [
            colorPrincipal, colorSecundario, colorFondo, colorTexto,
            colorBoton, colorBotonTexto, colorEnlace,
            fuentePrincipal, fuenteTitulos, tamanoTitulos, pesoTitulos,
            estiloBotones, estiloTarjetas
        ]
    );
}


// Volver a como se ve una tienda recien creada.
//
// SET ... = DEFAULT deja que los valores por defecto vivan en un
// solo lugar, la migracion 005, que a su vez coinciden con
// tokens.css. Si estuvieran copiados acá, cambiar uno significaria
// acordarse de cambiar tres archivos.
//
// No toca el nombre, el logo ni los textos: restablecer la
// apariencia no puede borrarle la identidad a nadie.
function restablecerApariencia(tenantId) {
    return fila(tenantId,
        `UPDATE configuracion_apariencia SET
             color_principal   = DEFAULT,
             color_secundario  = DEFAULT,
             color_fondo       = DEFAULT,
             color_texto       = DEFAULT,
             color_boton       = DEFAULT,
             color_boton_texto = DEFAULT,
             color_enlace      = DEFAULT,
             fuente_principal  = DEFAULT,
             fuente_titulos    = DEFAULT,
             tamano_titulos    = DEFAULT,
             peso_titulos      = DEFAULT,
             estilo_botones    = DEFAULT,
             estilo_tarjetas   = DEFAULT
         WHERE tenant_id = $1
         RETURNING ${CAMPOS_APARIENCIA}`
    );
}


// Borra la clave de una imagen de identidad. Se usa cuando el
// cliente quita el logo o el favicon; el archivo en si lo borra
// el controlador.
function quitarImagenIdentidad(tenantId, columna) {

    if (!["logo", "favicon"].includes(columna)) {
        throw new Error(`Columna de imagen desconocida: ${columna}`);
    }

    return fila(tenantId,
        `UPDATE configuracion_apariencia SET ${columna} = NULL
         WHERE tenant_id = $1
         RETURNING ${CAMPOS_APARIENCIA}`
    );
}


// -----------------------------------------------------
// SITIO (SEO y ajustes)
// -----------------------------------------------------

const CAMPOS_SITIO = `
    meta_titulo, meta_descripcion, meta_palabras,
    og_titulo, og_descripcion, og_imagen,
    moneda, simbolo_moneda, zona_horaria,
    aviso_superior, aviso_activo
`;


function sitio(tenantId) {
    return fila(tenantId,
        `SELECT ${CAMPOS_SITIO}
         FROM configuracion_sitio
         WHERE tenant_id = $1`
    );
}


function guardarSitio(tenantId, {
    metaTitulo, metaDescripcion, metaPalabras,
    ogTitulo, ogDescripcion, ogImagen,
    avisoSuperior, avisoActivo
}) {
    return fila(tenantId,
        `INSERT INTO configuracion_sitio AS c (
             tenant_id, meta_titulo, meta_descripcion, meta_palabras,
             og_titulo, og_descripcion, og_imagen,
             aviso_superior, aviso_activo
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (tenant_id) DO UPDATE SET
             meta_titulo      = EXCLUDED.meta_titulo,
             meta_descripcion = EXCLUDED.meta_descripcion,
             meta_palabras    = EXCLUDED.meta_palabras,
             og_titulo        = EXCLUDED.og_titulo,
             og_descripcion   = EXCLUDED.og_descripcion,
             og_imagen        = COALESCE($7, c.og_imagen),
             aviso_superior   = EXCLUDED.aviso_superior,
             aviso_activo     = EXCLUDED.aviso_activo
         RETURNING ${CAMPOS_SITIO}`,
        [
            metaTitulo, metaDescripcion, metaPalabras,
            ogTitulo, ogDescripcion, ogImagen,
            avisoSuperior, avisoActivo
        ]
    );
}


// -----------------------------------------------------
// CONTACTO
// -----------------------------------------------------

const CAMPOS_CONTACTO = `
    telefono, whatsapp, email, direccion, ciudad,
    provincia, codigo_postal, horarios, mapa_url
`;


function contacto(tenantId) {
    return fila(tenantId,
        `SELECT ${CAMPOS_CONTACTO}
         FROM configuracion_contacto
         WHERE tenant_id = $1`
    );
}


function guardarContacto(tenantId, {
    telefono, whatsapp, email, direccion, ciudad,
    provincia, codigoPostal, horarios, mapaUrl
}) {
    return fila(tenantId,
        `INSERT INTO configuracion_contacto (
             tenant_id, telefono, whatsapp, email, direccion,
             ciudad, provincia, codigo_postal, horarios, mapa_url
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (tenant_id) DO UPDATE SET
             telefono      = EXCLUDED.telefono,
             whatsapp      = EXCLUDED.whatsapp,
             email         = EXCLUDED.email,
             direccion     = EXCLUDED.direccion,
             ciudad        = EXCLUDED.ciudad,
             provincia     = EXCLUDED.provincia,
             codigo_postal = EXCLUDED.codigo_postal,
             horarios      = EXCLUDED.horarios,
             mapa_url      = EXCLUDED.mapa_url
         RETURNING ${CAMPOS_CONTACTO}`,
        [
            telefono, whatsapp, email, direccion, ciudad,
            provincia, codigoPostal, horarios, mapaUrl
        ]
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


function listarRedes(tenantId) {
    return filas(tenantId,
        `SELECT id, red, url, etiqueta, orden, activo
         FROM redes_sociales
         WHERE tenant_id = $1
         ORDER BY orden, red`
    );
}


// El formulario del panel es una sola pantalla con todas las
// redes: se guarda entero. Borrar y volver a insertar es mas
// simple y mas seguro que averiguar cual cambio, y son cinco
// filas dentro de una transaccion.
async function reemplazarRedes(cliente, tenantId, lista) {

    await consultaEn(cliente, tenantId,
        `DELETE FROM redes_sociales WHERE tenant_id = $1`
    );

    for (const [indice, item] of lista.entries()) {
        await consultaEn(cliente, tenantId,
            `INSERT INTO redes_sociales (tenant_id, red, url, orden, activo)
             VALUES ($1, $2, $3, $4, true)`,
            [item.red, item.url, indice]
        );
    }

    return lista.length;
}


// -----------------------------------------------------
// MEDIOS DE PAGO
// Se muestran en la tienda para que el comprador sepa
// como puede pagar antes de decidirse.
// -----------------------------------------------------

const CAMPOS_MEDIO = `
    id, tipo, nombre, instrucciones, activo, orden,
    created_at, updated_at
`;


function mediosPago(tenantId) {
    return filas(tenantId,
        `SELECT tipo, nombre, instrucciones
         FROM medios_pago
         WHERE tenant_id = $1 AND activo
         ORDER BY orden, nombre`
    );
}


function listarMediosPago(tenantId) {
    return filas(tenantId,
        `SELECT ${CAMPOS_MEDIO}
         FROM medios_pago
         WHERE tenant_id = $1
         ORDER BY orden, nombre`
    );
}


function medioPorId(tenantId, id) {
    return fila(tenantId,
        `SELECT ${CAMPOS_MEDIO} FROM medios_pago
         WHERE tenant_id = $1 AND id = $2`,
        [id]
    );
}


function crearMedioPago(tenantId, { tipo, nombre, instrucciones, activo }) {
    return fila(tenantId,
        `INSERT INTO medios_pago
             (tenant_id, tipo, nombre, instrucciones, orden, activo)
         VALUES ($1, $2, $3, $4,
                 (SELECT COALESCE(MAX(orden), -1) + 1
                    FROM medios_pago WHERE tenant_id = $1),
                 $5)
         RETURNING ${CAMPOS_MEDIO}`,
        [tipo, nombre, instrucciones, activo]
    );
}


// El tipo no se cambia al editar: es lo que identifica al
// medio en los pedidos ya hechos.
function actualizarMedioPago(tenantId, id, { nombre, instrucciones, activo }) {
    return fila(tenantId,
        `UPDATE medios_pago SET
             nombre        = $3,
             instrucciones = $4,
             activo        = $5
         WHERE tenant_id = $1 AND id = $2
         RETURNING ${CAMPOS_MEDIO}`,
        [id, nombre, instrucciones, activo]
    );
}


function eliminarMedioPago(tenantId, id) {
    return fila(tenantId,
        `DELETE FROM medios_pago
         WHERE tenant_id = $1 AND id = $2
         RETURNING ${CAMPOS_MEDIO}`,
        [id]
    );
}


// Cuantos pedidos se hicieron con este medio de pago.
//
// El pedido guarda el TIPO como texto ("transferencia"), no el
// id: por eso borrar el medio no rompe ningun pedido viejo.
// Lo que si pasa es que el panel deja de poder mostrar su
// nombre y su lugar aparece el tipo crudo. Por eso, cuando hay
// pedidos, se ofrece ocultarlo en vez de borrarlo.
async function pedidosConMedio(tenantId, tipo) {
    const resultado = await consulta(tenantId,
        `SELECT count(*)::int AS total FROM pedidos
         WHERE tenant_id = $1 AND metodo_pago = $2`,
        [tipo]
    );
    return resultado.rows[0]?.total ?? 0;
}


module.exports = {

    apariencia, guardarIdentidad, quitarImagenIdentidad,
    guardarApariencia, restablecerApariencia,

    sitio, guardarSitio,

    contacto, guardarContacto,

    redes, listarRedes, reemplazarRedes,

    mediosPago, listarMediosPago, medioPorId,
    crearMedioPago, actualizarMedioPago, eliminarMedioPago,
    pedidosConMedio
};

// =====================================================
// CONTROLADOR PUBLICO · LA TIENDA
//
// GET /api/public/tienda es lo primero que pide cualquier
// pagina: quien es la tienda, como se ve, como contactarla
// y que secciones tiene. Va todo junto en una sola respuesta
// porque se necesita entero en cada carga; separarlo serian
// cinco viajes para mostrar el encabezado.
//
// No devuelve el id del tenant: la tienda publica no lo
// necesita y no tiene por que conocerlo.
// =====================================================

const config = require("../../config/env");
const storage = require("../../storage");
const { exito } = require("../../utils/respuesta");
const { errores } = require("../../utils/errores");

const tenants = require("../../repositories/tenants");
const configuracion = require("../../repositories/configuracion");
const contenido = require("../../repositories/contenido");


// Multiplicadores que entiende el CSS de la tienda.
//
// OJO: las mismas tablas estan en frontend/shared/js/apariencia.js,
// que es quien las aplica del otro lado del cable (y las necesita
// crudas para la vista previa del editor). Si cambia una, cambia
// la otra.
const TAMANOS = { chico: 0.9, medio: 1, grande: 1.15 };

// Cada estilo de botón es un radio distinto.
const RADIOS = { recto: "0px", redondeado: "8px", suave: "999px" };


function armarApariencia(fila) {

    if (!fila) return null;

    return {
        nombre_tienda: fila.nombre_tienda,
        descripcion_tienda: fila.descripcion_tienda,

        logo_url: storage.url(fila.logo),
        favicon_url: storage.url(fila.favicon),

        colores: {
            principal: fila.color_principal,
            secundario: fila.color_secundario,
            fondo: fila.color_fondo,
            texto: fila.color_texto,
            boton: fila.color_boton,
            boton_texto: fila.color_boton_texto,
            enlace: fila.color_enlace
        },

        tipografia: {
            principal: fila.fuente_principal,
            titulos: fila.fuente_titulos,
            // El navegador recibe el número, no la palabra: así el
            // CSS lo usa directo como multiplicador.
            tamano_titulos: TAMANOS[fila.tamano_titulos] ?? 1,
            peso_titulos: fila.peso_titulos
        },

        estilo: {
            botones: fila.estilo_botones,
            radio_boton: RADIOS[fila.estilo_botones] ?? "8px",
            tarjetas: fila.estilo_tarjetas
        },

        textos: {
            bienvenida: fila.texto_bienvenida,
            subtitulo: fila.texto_subtitulo,
            boton_principal: fila.texto_boton_principal,
            mensaje_destacado: fila.mensaje_destacado
        }
    };
}


// -----------------------------------------------------
// GET /api/public/tienda
// -----------------------------------------------------

async function identidad(req, res) {

    const tenantId = req.tenant.id;

    const [modulos, apariencia, sitio, contacto, redes, medios, paginas] =
        await Promise.all([
            tenants.modulos(tenantId),
            configuracion.apariencia(tenantId),
            configuracion.sitio(tenantId),
            configuracion.contacto(tenantId),
            configuracion.redes(tenantId),
            configuracion.mediosPago(tenantId),
            contenido.clavesDePaginas(tenantId)
        ]);


    const datos = {

        tienda: {
            nombre: apariencia?.nombre_tienda || req.tenant.nombre,
            slug: req.tenant.slug,
            descripcion: apariencia?.descripcion_tienda || null
        },

        modulos,

        apariencia: armarApariencia(apariencia),

        seo: sitio ? {
            titulo: sitio.meta_titulo,
            descripcion: sitio.meta_descripcion,
            palabras: sitio.meta_palabras,
            og_titulo: sitio.og_titulo,
            og_descripcion: sitio.og_descripcion,
            og_imagen_url: storage.url(sitio.og_imagen)
        } : null,

        moneda: {
            codigo: sitio?.moneda || "ARS",
            simbolo: sitio?.simbolo_moneda || "$"
        },

        // Franja de arriba ("Envíos a todo el país"). Solo viaja
        // si está encendida, para que el frontend no decida.
        aviso: sitio?.aviso_activo ? sitio.aviso_superior : null,

        contacto: contacto || {},

        redes,

        medios_pago: medios,

        // Qué páginas de contenido existen, para armar el menú
        // sin pedir el texto completo de cada una.
        paginas: paginas.map(p => ({ clave: p.clave, titulo: p.titulo }))
    };


    if (!config.esProduccion) {
        datos.diagnostico = {
            origen: req.tenantOrigen,
            dominio: req.headers.host
        };
    }

    return exito(res, datos);
}


// -----------------------------------------------------
// GET /api/public/paginas/:clave
// Nosotros, trabajos personalizados, insumos...
// -----------------------------------------------------

async function pagina(req, res) {

    const clave = String(req.params.clave || "").toLowerCase();

    const pagina = await contenido.pagina(req.tenant.id, clave);

    if (!pagina) {
        throw errores.noEncontrado("Esa página no existe en esta tienda");
    }

    return exito(res, {
        clave: pagina.clave,
        titulo: pagina.titulo,
        subtitulo: pagina.subtitulo,
        contenido: pagina.contenido,
        imagen_url: storage.url(pagina.imagen)
    });
}


// -----------------------------------------------------
// GET /api/public/faq
// -----------------------------------------------------

async function faq(req, res) {
    return exito(res, await contenido.faq(req.tenant.id));
}


// -----------------------------------------------------
// GET /api/public/banners
// -----------------------------------------------------

async function banners(req, res) {

    const lista = await contenido.banners(
        req.tenant.id,
        String(req.query.ubicacion || "inicio")
    );

    return exito(res, lista.map(banner => ({
        titulo: banner.titulo,
        descripcion: banner.descripcion,
        imagen_url: storage.url(banner.imagen),
        texto_boton: banner.texto_boton,
        enlace: banner.enlace
    })));
}


module.exports = { identidad, pagina, faq, banners };

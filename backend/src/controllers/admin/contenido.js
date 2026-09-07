// =====================================================
// CONTROLADOR DE ADMINISTRACION · CONTENIDO
//
// Los banners de la portada, las paginas de texto y las
// preguntas frecuentes. Es la pantalla que le saca al cliente
// la necesidad de pedir "cambiame este texto".
//
// El tenant sale del token, siempre, via tenantDe(req).
//
// El texto con formato de las paginas pasa por htmlSeguro
// antes de guardarse: la tienda lo muestra con innerHTML y no
// se guarda nada que el editor no pueda generar.
// =====================================================

const { exito, creado } = require("../../utils/respuesta");
const { errores } = require("../../utils/errores");
const validar = require("../../utils/validar");
const htmlSeguro = require("../../utils/htmlSeguro");
const { tenantDe } = require("../../middleware/tenantResolver");
const { guardarImagenes, eliminarImagen } = require("../../middleware/upload");
const presentar = require("../presentar");

const repo = require("../../repositories/contenido");


const UBICACIONES = ["inicio", "catalogo", "promociones"];


// Un enlace de banner puede ser interno ("/catalogo") o de
// afuera. Lo que no puede ser es javascript: ni data:.
function enlace(valor, campo) {

    const limpio = validar.texto(valor, { campo, max: 500 });

    if (!limpio) return null;

    if (!/^(https?:\/\/|\/|mailto:|tel:)/i.test(limpio)) {
        throw errores.solicitudInvalida(
            `${campo.charAt(0).toUpperCase() + campo.slice(1)} tiene que empezar ` +
            'con "https://" si es de otro sitio, o con "/" si es una página de tu tienda.'
        );
    }

    return limpio;
}


// =====================================================
// BANNERS
// =====================================================

function leerBanner(req) {
    return {
        titulo: validar.texto(req.body.titulo, { campo: "el título", max: 160 }),
        descripcion: validar.texto(req.body.descripcion, {
            campo: "la descripción", max: 500
        }),
        textoBoton: validar.texto(req.body.texto_boton, {
            campo: "el texto del botón", max: 60
        }),
        enlace: enlace(req.body.enlace, "el enlace del botón"),
        ubicacion: validar.opcion(req.body.ubicacion, UBICACIONES, {
            campo: "la ubicación", porDefecto: "inicio"
        }),
        activo: validar.booleano(req.body.activo, true)
    };
}


async function listarBanners(req, res) {
    const lista = await repo.listarBanners(tenantDe(req));
    return exito(res, presentar.banners(lista));
}


async function crearBanner(req, res) {

    const tenantId = tenantDe(req);
    const datos = leerBanner(req);

    const [subida] = await guardarImagenes(req, "banners", { entidad: "banner" });

    // Un banner es una imagen: sin imagen no hay nada que mostrar.
    if (!subida) {
        throw errores.solicitudInvalida("Elegí la imagen del banner");
    }

    const banner = await repo.crearBanner(tenantId, {
        ...datos,
        imagen: subida.clave
    });

    return creado(res, {
        banner: presentar.banner(banner),
        mensaje: "El banner se creó correctamente"
    });
}


async function actualizarBanner(req, res) {

    const tenantId = tenantDe(req);
    const id = validar.uuid(req.params.id, { campo: "el banner" });

    const actual = await repo.bannerPorId(tenantId, id);

    if (!actual) throw errores.noEncontrado("Ese banner no existe");

    const datos = leerBanner(req);

    const [subida] = await guardarImagenes(req, "banners", {
        entidad: "banner", entidadId: id
    });

    const banner = await repo.actualizarBanner(tenantId, id, {
        ...datos,
        imagen: subida ? subida.clave : null
    });

    if (subida && actual.imagen) {
        await eliminarImagen(tenantId, actual.imagen);
    }

    return exito(res, {
        banner: presentar.banner(banner),
        mensaje: "Los cambios se guardaron correctamente"
    });
}


async function eliminarBanner(req, res) {

    const tenantId = tenantDe(req);
    const id = validar.uuid(req.params.id, { campo: "el banner" });

    const banner = await repo.eliminarBanner(tenantId, id);

    if (!banner) throw errores.noEncontrado("Ese banner no existe");

    if (banner.imagen) await eliminarImagen(tenantId, banner.imagen);

    return exito(res, { mensaje: "El banner se eliminó correctamente" });
}


// =====================================================
// PAGINAS DE TEXTO
// =====================================================

function leerPagina(req) {

    const contenido = htmlSeguro.limpiar(req.body.contenido);

    return {
        titulo: validar.texto(req.body.titulo, {
            campo: "el título de la página", requerido: true, max: 160
        }),
        subtitulo: validar.texto(req.body.subtitulo, {
            campo: "el subtítulo", max: 300
        }),
        contenido: htmlSeguro.estaVacio(contenido) ? null : contenido,
        clavePedida: validar.texto(req.body.clave, {
            campo: "la dirección web", max: 80
        }),
        activo: validar.booleano(req.body.activo, true)
    };
}


async function listarPaginas(req, res) {
    const lista = await repo.listarPaginas(tenantDe(req));
    return exito(res, presentar.paginasContenido(lista));
}


async function crearPagina(req, res) {

    const tenantId = tenantDe(req);
    const datos = leerPagina(req);

    const clave = await repo.generarClave(
        tenantId, datos.clavePedida || datos.titulo
    );

    const [subida] = await guardarImagenes(req, "paginas", { entidad: "pagina" });

    const pagina = await repo.crearPagina(tenantId, {
        clave,
        titulo: datos.titulo,
        subtitulo: datos.subtitulo,
        contenido: datos.contenido,
        imagen: subida ? subida.clave : null,
        activo: datos.activo
    });

    return creado(res, {
        pagina: presentar.paginaContenido(pagina),
        mensaje: `La página "${pagina.titulo}" se creó correctamente`
    });
}


async function actualizarPagina(req, res) {

    const tenantId = tenantDe(req);
    const id = validar.uuid(req.params.id, { campo: "la página" });

    const actual = await repo.paginaPorId(tenantId, id);

    if (!actual) throw errores.noEncontrado("Esa página no existe");

    const datos = leerPagina(req);

    // La clave es la direccion de la pagina en la tienda. Se fija
    // al crearla y no cambia al editar el titulo: cambiarla rompe
    // los enlaces que ya circulan y el menu de la tienda.
    let clave = actual.clave;

    if (datos.clavePedida && datos.clavePedida !== actual.clave) {
        clave = await repo.generarClave(tenantId, datos.clavePedida, id);
    }

    const [subida] = await guardarImagenes(req, "paginas", {
        entidad: "pagina", entidadId: id
    });

    const pagina = await repo.actualizarPagina(tenantId, id, {
        clave,
        titulo: datos.titulo,
        subtitulo: datos.subtitulo,
        contenido: datos.contenido,
        imagen: subida ? subida.clave : null,
        activo: datos.activo
    });

    if (subida && actual.imagen) {
        await eliminarImagen(tenantId, actual.imagen);
    }

    return exito(res, {
        pagina: presentar.paginaContenido(pagina),
        mensaje: "Los cambios se guardaron correctamente"
    });
}


async function eliminarPagina(req, res) {

    const tenantId = tenantDe(req);
    const id = validar.uuid(req.params.id, { campo: "la página" });

    const pagina = await repo.eliminarPagina(tenantId, id);

    if (!pagina) throw errores.noEncontrado("Esa página no existe");

    if (pagina.imagen) await eliminarImagen(tenantId, pagina.imagen);

    return exito(res, {
        mensaje: `Se eliminó la página "${pagina.titulo}"`
    });
}


// =====================================================
// PREGUNTAS FRECUENTES
// =====================================================

function leerFaq(req) {
    return {
        pregunta: validar.texto(req.body.pregunta, {
            campo: "la pregunta", requerido: true, max: 300
        }),
        respuesta: validar.texto(req.body.respuesta, {
            campo: "la respuesta", requerido: true, max: 3000
        }),
        activo: validar.booleano(req.body.activo, true)
    };
}


async function listarFaq(req, res) {
    const lista = await repo.listarFaq(tenantDe(req));
    return exito(res, lista);
}


async function crearFaq(req, res) {

    const item = await repo.crearFaq(tenantDe(req), leerFaq(req));

    return creado(res, {
        faq: item,
        mensaje: "La pregunta se agregó correctamente"
    });
}


async function actualizarFaq(req, res) {

    const tenantId = tenantDe(req);
    const id = validar.uuid(req.params.id, { campo: "la pregunta" });

    const item = await repo.actualizarFaq(tenantId, id, leerFaq(req));

    if (!item) throw errores.noEncontrado("Esa pregunta no existe");

    return exito(res, {
        faq: item,
        mensaje: "Los cambios se guardaron correctamente"
    });
}


async function eliminarFaq(req, res) {

    const tenantId = tenantDe(req);
    const id = validar.uuid(req.params.id, { campo: "la pregunta" });

    const item = await repo.eliminarFaq(tenantId, id);

    if (!item) throw errores.noEncontrado("Esa pregunta no existe");

    return exito(res, { mensaje: "La pregunta se eliminó correctamente" });
}


// =====================================================
// ORDEN
// Sirve para las dos listas ordenables: banners y preguntas.
// =====================================================

function reordenar(tabla, nombre) {

    return async function (req, res) {

        const tenantId = tenantDe(req);
        const ids = req.body?.ids;

        if (!Array.isArray(ids) || ids.length === 0) {
            throw errores.solicitudInvalida(
                `Enviá el orden de ${nombre} en el campo ids`
            );
        }

        const limpios = ids.map(
            (id, i) => validar.uuid(id, { campo: `el elemento número ${i + 1}` })
        );

        const actualizadas = await repo.reordenar(tabla, tenantId, limpios);

        return exito(res, {
            mensaje: "El orden se guardó correctamente",
            actualizadas
        });
    };
}


module.exports = {

    listarBanners, crearBanner, actualizarBanner, eliminarBanner,
    reordenarBanners: reordenar("banners", "los banners"),

    listarPaginas, crearPagina, actualizarPagina, eliminarPagina,

    listarFaq, crearFaq, actualizarFaq, eliminarFaq,
    reordenarFaq: reordenar("faq", "las preguntas")
};

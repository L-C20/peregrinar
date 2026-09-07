// =====================================================
// CONTROLADOR DE ADMINISTRACION · CONFIGURACION
//
// Los datos de la tienda que no son catalogo ni ventas: como se
// llama, como se ve, como la encuentran, como la contactan y
// como se le paga.
//
// El tenant sale del token, siempre, via tenantDe(req).
//
// La tabla de apariencia se escribe desde DOS pantallas
// distintas, y cada una toca solo sus columnas:
//
//   identidad   nombre, logo, icono y los textos de la portada
//   apariencia  colores, tipografias y estilo
//
// Estan separadas porque son dos tareas distintas y porque asi
// guardar una no puede pisar la otra sin querer.
//
// Lo que NO esta acá son los modulos habilitados. Es lo que la
// tienda tiene contratado, no una preferencia: se administra
// desde /api/platform. Un duenio de tienda que pudiera
// encenderse modulos solo estaria salteandose el plan.
// =====================================================

const { transaccion } = require("../../database/connection");
const { exito, creado } = require("../../utils/respuesta");
const { errores } = require("../../utils/errores");
const validar = require("../../utils/validar");
const { tenantDe } = require("../../middleware/tenantResolver");
const { guardarImagenes, eliminarImagen } = require("../../middleware/upload");
const presentar = require("../presentar");

const repo = require("../../repositories/configuracion");


const REDES = [
    "instagram", "facebook", "whatsapp", "tiktok",
    "youtube", "x", "linkedin", "otra"
];

const TIPOS_PAGO = ["efectivo", "transferencia", "mercadopago", "tarjeta", "otro"];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const COLOR = /^#[0-9a-f]{6}$/i;


// Las mismas diez que sabe cargar la tienda. La lista es cerrada
// porque el valor termina en una URL a Google Fonts: un dato mal
// cargado no puede hacer que la tienda le pida algo a un tercero.
//
// OJO: la misma lista esta en frontend/shared/js/apariencia.js.
// Si se agrega una fuente, va en los dos lados.
const FUENTES = [
    "Inter", "Playfair Display", "Lora", "Merriweather",
    "Libre Baskerville", "Source Serif 4", "Poppins",
    "Montserrat", "Nunito", "Work Sans"
];

const TAMANOS = ["chico", "medio", "grande"];
const PESOS = ["400", "500", "600", "700", "800"];
const ESTILOS_BOTON = ["recto", "redondeado", "suave"];
const ESTILOS_TARJETA = ["plana", "borde", "sombra"];


// La base tambien lo verifica, pero un CHECK devuelve un error de
// PostgreSQL: acá se dice qué campo es y qué se esperaba.
function color(valor, campo, porDefecto) {

    const limpio = validar.texto(valor, { campo, max: 7 });

    if (!limpio) return porDefecto;

    if (!COLOR.test(limpio)) {
        throw errores.solicitudInvalida(
            `${campo.charAt(0).toUpperCase() + campo.slice(1)} no es un color válido`
        );
    }

    return limpio.toUpperCase();
}


// Busca entre lo subido el archivo de un campo concreto: el
// formulario de identidad manda logo y favicon juntos.
const archivoDe = (subidas, campo) =>
    subidas.find(archivo => archivo.campo === campo) || null;


function direccionWeb(valor, campo, { soloHttps = false } = {}) {

    const limpio = validar.texto(valor, { campo, max: 500 });

    if (!limpio) return null;

    const patron = soloHttps ? /^https?:\/\//i : /^(https?:\/\/|\/)/i;

    if (!patron.test(limpio)) {
        throw errores.solicitudInvalida(
            `${campo.charAt(0).toUpperCase() + campo.slice(1)} tiene que ` +
            'empezar con "https://"'
        );
    }

    return limpio;
}


// =====================================================
// GET /api/admin/configuracion
// Todo junto: son cuatro pestañas de la misma pantalla.
// =====================================================

async function leer(req, res) {

    const tenantId = tenantDe(req);

    const [apariencia, contacto, sitio, redes] = await Promise.all([
        repo.apariencia(tenantId),
        repo.contacto(tenantId),
        repo.sitio(tenantId),
        repo.listarRedes(tenantId)
    ]);

    return exito(res, {
        identidad: presentar.identidad(apariencia),
        apariencia: presentar.aparienciaEditable(apariencia),
        contacto: contacto || {},
        sitio: presentar.sitio(sitio),
        redes: redes.map(red => ({ red: red.red, url: red.url }))
    });
}


// =====================================================
// PUT /api/admin/configuracion/identidad
// =====================================================

async function guardarIdentidad(req, res) {

    const tenantId = tenantDe(req);

    const datos = {
        nombreTienda: validar.texto(req.body.nombre_tienda, {
            campo: "el nombre de la tienda", requerido: true, max: 120
        }),
        descripcionTienda: validar.texto(req.body.descripcion_tienda, {
            campo: "la descripción", max: 500
        }),
        textoBienvenida: validar.texto(req.body.texto_bienvenida, {
            campo: "el título de la portada", max: 160
        }),
        textoSubtitulo: validar.texto(req.body.texto_subtitulo, {
            campo: "el subtítulo de la portada", max: 300
        }),
        textoBotonPrincipal: validar.texto(req.body.texto_boton_principal, {
            campo: "el texto del botón", max: 60
        }),
        mensajeDestacado: validar.texto(req.body.mensaje_destacado, {
            campo: "el mensaje destacado", max: 300
        })
    };

    const anterior = await repo.apariencia(tenantId);

    const subidas = await guardarImagenes(req, "apariencia", {
        entidad: "apariencia"
    });

    const logo = archivoDe(subidas, "logo");
    const favicon = archivoDe(subidas, "favicon");

    const apariencia = await repo.guardarIdentidad(tenantId, {
        ...datos,
        logo: logo ? logo.clave : null,
        favicon: favicon ? favicon.clave : null
    });

    // Las imagenes que acaban de ser reemplazadas ya no las usa
    // nadie.
    if (logo && anterior?.logo) await eliminarImagen(tenantId, anterior.logo);
    if (favicon && anterior?.favicon) await eliminarImagen(tenantId, anterior.favicon);

    return exito(res, {
        identidad: presentar.identidad(apariencia),
        mensaje: "Los datos de tu tienda se guardaron correctamente"
    });
}


// -----------------------------------------------------
// DELETE /api/admin/configuracion/identidad/:imagen
// Quitar el logo o el favicon sin subir otro.
// -----------------------------------------------------

async function quitarImagen(req, res) {

    const tenantId = tenantDe(req);

    const columna = validar.opcion(req.params.imagen, ["logo", "favicon"], {
        campo: "la imagen"
    });

    if (!columna) throw errores.noEncontrado("Esa imagen no existe");

    const anterior = await repo.apariencia(tenantId);

    const apariencia = await repo.quitarImagenIdentidad(tenantId, columna);

    if (anterior?.[columna]) {
        await eliminarImagen(tenantId, anterior[columna]);
    }

    return exito(res, {
        identidad: presentar.identidad(apariencia),
        mensaje: columna === "logo"
            ? "Se quitó el logo. En la tienda vuelve a aparecer el nombre escrito."
            : "Se quitó el ícono de la pestaña."
    });
}


// =====================================================
// PUT /api/admin/configuracion/apariencia
//
// Colores, tipografias y estilo. NO toca el nombre, el logo ni
// los textos: son la otra pantalla.
// =====================================================

async function guardarApariencia(req, res) {

    const tenantId = tenantDe(req);

    const actual = await repo.apariencia(tenantId);

    if (!actual) {
        throw errores.noEncontrado(
            "Esta tienda todavía no tiene una apariencia guardada"
        );
    }

    // Cada campo que no venga conserva lo que ya estaba. Asi, un
    // formulario parcial no le pone a nadie el fondo en blanco.
    const apariencia = await repo.guardarApariencia(tenantId, {

        colorPrincipal: color(req.body.color_principal,
            "el color principal", actual.color_principal),

        colorSecundario: color(req.body.color_secundario,
            "el color de las ofertas", actual.color_secundario),

        colorFondo: color(req.body.color_fondo,
            "el color de fondo", actual.color_fondo),

        colorTexto: color(req.body.color_texto,
            "el color del texto", actual.color_texto),

        colorBoton: color(req.body.color_boton,
            "el color de los botones", actual.color_boton),

        colorBotonTexto: color(req.body.color_boton_texto,
            "el color del texto de los botones", actual.color_boton_texto),

        colorEnlace: color(req.body.color_enlace,
            "el color de los enlaces", actual.color_enlace),

        fuentePrincipal: validar.opcion(req.body.fuente_principal, FUENTES, {
            campo: "la tipografía del texto", porDefecto: actual.fuente_principal
        }),

        fuenteTitulos: validar.opcion(req.body.fuente_titulos, FUENTES, {
            campo: "la tipografía de los títulos", porDefecto: actual.fuente_titulos
        }),

        tamanoTitulos: validar.opcion(req.body.tamano_titulos, TAMANOS, {
            campo: "el tamaño de los títulos", porDefecto: actual.tamano_titulos
        }),

        pesoTitulos: validar.opcion(String(req.body.peso_titulos ?? ""), PESOS, {
            campo: "el grosor de los títulos", porDefecto: actual.peso_titulos
        }),

        estiloBotones: validar.opcion(req.body.estilo_botones, ESTILOS_BOTON, {
            campo: "la forma de los botones", porDefecto: actual.estilo_botones
        }),

        estiloTarjetas: validar.opcion(req.body.estilo_tarjetas, ESTILOS_TARJETA, {
            campo: "el estilo de las tarjetas", porDefecto: actual.estilo_tarjetas
        })
    });

    return exito(res, {
        apariencia: presentar.aparienciaEditable(apariencia),
        mensaje: "La apariencia de tu tienda se guardó correctamente"
    });
}


// -----------------------------------------------------
// POST /api/admin/configuracion/apariencia/restablecer
// -----------------------------------------------------

async function restablecerApariencia(req, res) {

    const apariencia = await repo.restablecerApariencia(tenantDe(req));

    if (!apariencia) {
        throw errores.noEncontrado(
            "Esta tienda todavía no tiene una apariencia guardada"
        );
    }

    return exito(res, {
        apariencia: presentar.aparienciaEditable(apariencia),
        mensaje: "La apariencia volvió a los colores y las tipografías originales"
    });
}


// =====================================================
// PUT /api/admin/configuracion/contacto
// =====================================================

async function guardarContacto(req, res) {

    const email = validar.texto(req.body.email, {
        campo: "el email de contacto", max: 160
    });

    if (email && !EMAIL.test(email)) {
        throw errores.solicitudInvalida(
            "Revisá el email de contacto: parece que le falta algo"
        );
    }

    // wa.me necesita el numero con codigo de pais y sin nada mas.
    // El cliente lo escribe como quiere y se limpia acá.
    const whatsappCrudo = validar.texto(req.body.whatsapp, {
        campo: "el WhatsApp", max: 40
    });

    const whatsapp = whatsappCrudo
        ? whatsappCrudo.replace(/[^\d]/g, "")
        : null;

    if (whatsapp && (whatsapp.length < 8 || whatsapp.length > 15)) {
        throw errores.solicitudInvalida(
            "El número de WhatsApp tiene que incluir el código de país, " +
            "por ejemplo 5491122334455"
        );
    }

    const contacto = await repo.guardarContacto(tenantDe(req), {
        telefono: validar.texto(req.body.telefono, { campo: "el teléfono", max: 40 }),
        whatsapp,
        email,
        direccion: validar.texto(req.body.direccion, { campo: "la dirección", max: 200 }),
        ciudad: validar.texto(req.body.ciudad, { campo: "la ciudad", max: 120 }),
        provincia: validar.texto(req.body.provincia, { campo: "la provincia", max: 120 }),
        codigoPostal: validar.texto(req.body.codigo_postal, {
            campo: "el código postal", max: 20
        }),
        horarios: validar.texto(req.body.horarios, { campo: "los horarios", max: 300 }),
        mapaUrl: direccionWeb(req.body.mapa_url, "el enlace del mapa", { soloHttps: true })
    });

    return exito(res, {
        contacto,
        mensaje: "Los datos de contacto se guardaron correctamente"
    });
}


// =====================================================
// PUT /api/admin/configuracion/redes
//
// Llega la lista entera: las que vienen con direccion quedan,
// las que vienen vacias desaparecen. Se reemplaza todo dentro
// de una transaccion para que no quede a medias.
// =====================================================

async function guardarRedes(req, res) {

    const tenantId = tenantDe(req);
    const recibidas = req.body?.redes;

    if (!Array.isArray(recibidas)) {
        throw errores.solicitudInvalida("Enviá las redes en el campo redes");
    }

    const lista = [];
    const vistas = new Set();

    for (const item of recibidas) {

        const red = validar.opcion(item?.red, REDES, { campo: "la red social" });

        if (!red) continue;

        const url = direccionWeb(item?.url, `la dirección de ${red}`, {
            soloHttps: true
        });

        if (!url) continue;

        // La base tiene UNIQUE (tenant_id, red): dos filas de la
        // misma red serian un error de la pantalla, no del cliente.
        if (vistas.has(red)) continue;

        vistas.add(red);
        lista.push({ red, url });
    }

    await transaccion(cliente => repo.reemplazarRedes(cliente, tenantId, lista));

    return exito(res, {
        redes: lista,
        mensaje: lista.length === 0
            ? "Se quitaron todas las redes sociales"
            : "Tus redes sociales se guardaron correctamente"
    });
}


// =====================================================
// PUT /api/admin/configuracion/sitio
// =====================================================

async function guardarSitio(req, res) {

    const tenantId = tenantDe(req);

    const datos = {
        metaTitulo: validar.texto(req.body.meta_titulo, {
            campo: "el título para Google", max: 70
        }),
        metaDescripcion: validar.texto(req.body.meta_descripcion, {
            campo: "la descripción para Google", max: 180
        }),
        metaPalabras: validar.texto(req.body.meta_palabras, {
            campo: "las palabras clave", max: 300
        }),
        ogTitulo: validar.texto(req.body.og_titulo, {
            campo: "el título para redes", max: 120
        }),
        ogDescripcion: validar.texto(req.body.og_descripcion, {
            campo: "la descripción para redes", max: 300
        }),
        avisoSuperior: validar.texto(req.body.aviso_superior, {
            campo: "el aviso de arriba", max: 200
        }),
        avisoActivo: validar.booleano(req.body.aviso_activo, false)
    };

    if (datos.avisoActivo && !datos.avisoSuperior) {
        throw errores.solicitudInvalida(
            "Escribí el aviso antes de encenderlo, o la franja aparece vacía"
        );
    }

    const anterior = await repo.sitio(tenantId);

    const [subida] = await guardarImagenes(req, "apariencia", {
        entidad: "sitio"
    });

    const sitio = await repo.guardarSitio(tenantId, {
        ...datos,
        ogImagen: subida ? subida.clave : null
    });

    if (subida && anterior?.og_imagen) {
        await eliminarImagen(tenantId, anterior.og_imagen);
    }

    return exito(res, {
        sitio: presentar.sitio(sitio),
        mensaje: "La configuración del sitio se guardó correctamente"
    });
}


// =====================================================
// MEDIOS DE PAGO
// =====================================================

async function listarMediosPago(req, res) {
    const lista = await repo.listarMediosPago(tenantDe(req));
    return exito(res, lista);
}


function leerMedio(req) {
    return {
        nombre: validar.texto(req.body.nombre, {
            campo: "el nombre del medio de pago", requerido: true, max: 80
        }),
        instrucciones: validar.texto(req.body.instrucciones, {
            campo: "las instrucciones", max: 1000
        }),
        activo: validar.booleano(req.body.activo, true)
    };
}


async function crearMedioPago(req, res) {

    const tipo = validar.opcion(req.body.tipo, TIPOS_PAGO, {
        campo: "el tipo de pago"
    });

    if (!tipo) throw errores.solicitudInvalida("Elegí el tipo de pago");

    const medio = await repo.crearMedioPago(tenantDe(req), {
        tipo,
        ...leerMedio(req)
    });

    return creado(res, {
        medio,
        mensaje: `Se agregó "${medio.nombre}" como forma de pago`
    });
}


async function actualizarMedioPago(req, res) {

    const tenantId = tenantDe(req);
    const id = validar.uuid(req.params.id, { campo: "el medio de pago" });

    const medio = await repo.actualizarMedioPago(tenantId, id, leerMedio(req));

    if (!medio) throw errores.noEncontrado("Ese medio de pago no existe");

    return exito(res, {
        medio,
        mensaje: "Los cambios se guardaron correctamente"
    });
}


// Borrar un medio que ya se uso deja los pedidos viejos
// mostrando el tipo crudo en vez de su nombre. Antes de
// hacerlo se dice cuantos son y se ofrece ocultarlo.
async function eliminarMedioPago(req, res) {

    const tenantId = tenantDe(req);
    const id = validar.uuid(req.params.id, { campo: "el medio de pago" });

    const medio = await repo.medioPorId(tenantId, id);

    if (!medio) throw errores.noEncontrado("Ese medio de pago no existe");

    const pedidos = await repo.pedidosConMedio(tenantId, medio.tipo);

    if (pedidos > 0 && !validar.booleano(req.query.confirmar)) {
        throw errores.conflicto(
            pedidos === 1
                ? `Ya hay 1 pedido pagado con "${medio.nombre}". Si lo eliminás, ` +
                  "ese pedido va a mostrar el tipo de pago sin su nombre."
                : `Ya hay ${pedidos} pedidos pagados con "${medio.nombre}". Si lo ` +
                  "eliminás, esos pedidos van a mostrar el tipo de pago sin su nombre.",
            { pedidos, requiere_confirmacion: true }
        );
    }

    await repo.eliminarMedioPago(tenantId, id);

    return exito(res, {
        mensaje: `Se eliminó "${medio.nombre}" de las formas de pago`
    });
}


module.exports = {
    leer,
    guardarIdentidad, quitarImagen,
    guardarApariencia, restablecerApariencia,
    guardarContacto,
    guardarRedes,
    guardarSitio,
    listarMediosPago, crearMedioPago, actualizarMedioPago, eliminarMedioPago
};

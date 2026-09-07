// =====================================================
// COMO SE VE UN REGISTRO DESDE AFUERA
//
// La base guarda la CLAVE del archivo; la API entrega la
// URL. Este es el unico lugar donde se hace esa traduccion,
// asi que si mañana cambia el almacenamiento, el frontend
// no se entera.
//
// Dos cosas mas que resuelve:
//
//  - PostgreSQL devuelve NUMERIC como texto para no perder
//    precision. Si eso llegara tal cual al navegador,
//    "1500" + "200" daria "1500200". Se convierte acá.
//
//  - La tienda publica no necesita ni tiene por que ver el
//    tenant_id, el stock exacto ni las fechas internas.
// =====================================================

const storage = require("../storage");


// -----------------------------------------------------
// PRODUCTO
// -----------------------------------------------------

function producto(fila, { admin = false } = {}) {

    if (!fila) return null;

    const salida = {
        id: fila.id,
        nombre: fila.nombre,
        slug: fila.slug,
        descripcion: fila.descripcion,

        precio: Number(fila.precio),
        precio_anterior:
            fila.precio_anterior === null ? null : Number(fila.precio_anterior),

        // Solo se muestra tachado si de verdad es mayor.
        en_oferta:
            fila.precio_anterior !== null &&
            Number(fila.precio_anterior) > Number(fila.precio),

        destacado: fila.destacado,
        novedad: fila.novedad,

        imagen_url: storage.url(fila.imagen_principal),

        categoria: fila.categoria_slug
            ? { nombre: fila.categoria_nombre, slug: fila.categoria_slug }
            : null
    };


    if (Array.isArray(fila.imagenes)) {
        salida.imagenes = fila.imagenes.map(imagen => ({
            id: imagen.id,
            url: storage.url(imagen.imagen),
            orden: imagen.orden,
            principal: imagen.principal
        }));
    }


    if (admin) {
        salida.categoria_id = fila.categoria_id;
        salida.sku = fila.sku;
        salida.stock = fila.stock;
        salida.disponible = fila.disponible;
        salida.orden = fila.orden;
        salida.created_at = fila.created_at;
        salida.updated_at = fila.updated_at;

    } else {
        // Al comprador le alcanza con saber si hay o no hay.
        salida.hay_stock = fila.stock > 0;
        if (fila.sku) salida.sku = fila.sku;
    }


    return salida;
}


function productos(lista, opciones) {
    return (lista || []).map(fila => producto(fila, opciones));
}


// -----------------------------------------------------
// CATEGORIA
// -----------------------------------------------------

function categoria(fila, { admin = false } = {}) {

    if (!fila) return null;

    const salida = {
        id: fila.id,
        nombre: fila.nombre,
        slug: fila.slug,
        descripcion: fila.descripcion,
        imagen_url: storage.url(fila.imagen)
    };

    if (fila.productos !== undefined) {
        salida.productos = fila.productos;
    }

    if (admin) {
        salida.orden = fila.orden;
        salida.activo = fila.activo;
        salida.created_at = fila.created_at;
        salida.updated_at = fila.updated_at;
    }

    return salida;
}


function categorias(lista, opciones) {
    return (lista || []).map(fila => categoria(fila, opciones));
}


// -----------------------------------------------------
// IMAGEN DE PRODUCTO
// -----------------------------------------------------

function imagen(fila) {

    if (!fila) return null;

    return {
        id: fila.id,
        url: storage.url(fila.imagen),
        orden: fila.orden,
        principal: fila.principal
    };
}


function imagenes(lista) {
    return (lista || []).map(imagen);
}


// -----------------------------------------------------
// CONTENIDO EDITABLE
//
// Banners y paginas de texto. La tienda publica arma su
// propia respuesta en controllers/publico/tienda.js, mas
// recortada; esto es lo que ve el panel, que necesita
// tambien lo oculto y las fechas.
// -----------------------------------------------------

function banner(fila) {

    if (!fila) return null;

    return {
        id: fila.id,
        titulo: fila.titulo,
        descripcion: fila.descripcion,
        imagen_url: storage.url(fila.imagen),
        texto_boton: fila.texto_boton,
        enlace: fila.enlace,
        ubicacion: fila.ubicacion,
        orden: fila.orden,
        activo: fila.activo,
        created_at: fila.created_at,
        updated_at: fila.updated_at
    };
}


function banners(lista) {
    return (lista || []).map(banner);
}


function paginaContenido(fila) {

    if (!fila) return null;

    return {
        id: fila.id,
        clave: fila.clave,
        titulo: fila.titulo,
        subtitulo: fila.subtitulo,
        contenido: fila.contenido,
        imagen_url: storage.url(fila.imagen),

        // La direccion final, para poder mostrarsela al cliente
        // y que sepa que enlace compartir.
        url: `/p/${fila.clave}`,

        activo: fila.activo,
        created_at: fila.created_at,
        updated_at: fila.updated_at
    };
}


function paginasContenido(lista) {
    return (lista || []).map(paginaContenido);
}


// -----------------------------------------------------
// IDENTIDAD Y AJUSTES
// Solo traduce las claves de archivo a URL; el resto de los
// campos viaja tal cual.
// -----------------------------------------------------

function identidad(fila) {

    if (!fila) return null;

    return {
        nombre_tienda: fila.nombre_tienda,
        descripcion_tienda: fila.descripcion_tienda,
        logo_url: storage.url(fila.logo),
        favicon_url: storage.url(fila.favicon),
        texto_bienvenida: fila.texto_bienvenida,
        texto_subtitulo: fila.texto_subtitulo,
        texto_boton_principal: fila.texto_boton_principal,
        mensaje_destacado: fila.mensaje_destacado
    };
}


function sitio(fila) {

    if (!fila) return null;

    return {
        meta_titulo: fila.meta_titulo,
        meta_descripcion: fila.meta_descripcion,
        meta_palabras: fila.meta_palabras,
        og_titulo: fila.og_titulo,
        og_descripcion: fila.og_descripcion,
        og_imagen_url: storage.url(fila.og_imagen),
        moneda: fila.moneda,
        simbolo_moneda: fila.simbolo_moneda,
        zona_horaria: fila.zona_horaria,
        aviso_superior: fila.aviso_superior,
        aviso_activo: fila.aviso_activo
    };
}


module.exports = {
    producto, productos,
    categoria, categorias,
    imagen, imagenes,
    banner, banners,
    paginaContenido, paginasContenido,
    identidad, sitio
};

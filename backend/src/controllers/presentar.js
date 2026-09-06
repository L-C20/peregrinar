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


module.exports = {
    producto, productos,
    categoria, categorias,
    imagen, imagenes
};

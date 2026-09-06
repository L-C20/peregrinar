// =====================================================
// CONTROLADOR PUBLICO · CATALOGO
//
// Todo lo que hay acá sale de req.tenant, que resolvió
// tenantResolver a partir del dominio. Ninguna consulta
// puede leer sin ese filtro: los repositorios lo exigen.
//
// Esta es la parte que en el proyecto anterior devolvia los
// productos de todas las tiendas mezclados.
// =====================================================

const { exito, listado } = require("../../utils/respuesta");
const { errores } = require("../../utils/errores");
const validar = require("../../utils/validar");
const presentar = require("../presentar");

const categoriasRepo = require("../../repositories/categorias");
const productosRepo = require("../../repositories/productos");


// -----------------------------------------------------
// GET /api/public/categorias
// -----------------------------------------------------

async function categorias(req, res) {

    const lista = await categoriasRepo.listarPublicas(req.tenant.id);

    return exito(res, presentar.categorias(lista));
}


// -----------------------------------------------------
// GET /api/public/productos
//
//   ?categoria=biblias
//   ?buscar=devocional
//   ?destacados=true   ?novedades=true
//   ?pagina=2  ?por_pagina=24
// -----------------------------------------------------

async function productos(req, res) {

    const paginado = validar.paginacion(req.query, { porPagina: 24, maximo: 60 });

    const filtros = {
        categoriaSlug: validar.texto(req.query.categoria, {
            campo: "la categoría", max: 80
        }),
        buscar: validar.texto(req.query.buscar, {
            campo: "la búsqueda", max: 120
        }),
        destacados: validar.booleano(req.query.destacados),
        novedades: validar.booleano(req.query.novedades)
    };

    // Se avisa si la categoría no existe en vez de devolver
    // una lista vacía sin explicación.
    if (filtros.categoriaSlug) {
        const categoria = await categoriasRepo.porSlug(
            req.tenant.id, filtros.categoriaSlug
        );

        if (!categoria || !categoria.activo) {
            throw errores.noEncontrado("Esa categoría no existe en esta tienda");
        }
    }

    const { items, total } = await productosRepo.buscarPublicos(
        req.tenant.id, filtros, paginado
    );

    return listado(
        res,
        presentar.productos(items),
        validar.metaPaginacion(paginado, total)
    );
}


// -----------------------------------------------------
// GET /api/public/productos/:slug
// -----------------------------------------------------

async function detalle(req, res) {

    const producto = await productosRepo.porSlug(
        req.tenant.id,
        String(req.params.slug),
        { soloDisponibles: true }
    );

    if (!producto) {
        throw errores.noEncontrado("No encontramos ese producto");
    }

    const relacionados = await productosRepo.relacionados(
        req.tenant.id, producto, 4
    );

    return exito(res, {
        producto: presentar.producto(producto),
        relacionados: presentar.productos(relacionados)
    });
}


module.exports = { categorias, productos, detalle };

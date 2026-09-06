// =====================================================
// CONTROLADOR DE ADMINISTRACION · PRODUCTOS
//
// El tenant sale del token, siempre, via tenantDe(req).
//
// Las imagenes llegan por multipart, se guardan con la capa
// storage/ y en la base queda solo la clave. Al eliminar un
// producto o una imagen se borra tambien el archivo: si no,
// el disco se llena de archivos que ya no usa nadie.
// =====================================================

const { exito, creado, listado } = require("../../utils/respuesta");
const { errores } = require("../../utils/errores");
const validar = require("../../utils/validar");
const { tenantDe } = require("../../middleware/tenantResolver");
const { guardarImagenes, eliminarImagen } = require("../../middleware/upload");
const presentar = require("../presentar");

const repo = require("../../repositories/productos");
const categoriasRepo = require("../../repositories/categorias");


// -----------------------------------------------------
// DATOS DEL FORMULARIO
// -----------------------------------------------------

async function leerDatos(req, tenantId) {

    const categoriaId = validar.uuid(req.body.categoria_id, {
        campo: "la categoría", requerido: false
    });

    // La clave foránea compuesta ya impide usar una categoría de
    // otra tienda, pero el error de la base es incomprensible.
    // Se comprueba antes para poder decir algo claro.
    if (categoriaId) {
        const categoria = await categoriasRepo.porId(tenantId, categoriaId);
        if (!categoria) {
            throw errores.solicitudInvalida(
                "La categoría seleccionada no existe en esta tienda"
            );
        }
    }

    const precio = validar.numero(req.body.precio, {
        campo: "el precio", requerido: true, min: 0, max: 99999999
    });

    const precioAnterior = validar.numero(req.body.precio_anterior, {
        campo: "el precio anterior", min: 0, max: 99999999
    });

    return {
        categoria_id: categoriaId,

        nombre: validar.texto(req.body.nombre, {
            campo: "el nombre del producto", requerido: true, max: 200
        }),

        descripcion: validar.texto(req.body.descripcion, {
            campo: "la descripción", max: 5000
        }),

        precio,
        precio_anterior: precioAnterior,

        stock: validar.numero(req.body.stock, {
            campo: "el stock", min: 0, max: 9999999, entero: true, porDefecto: 0
        }),

        sku: validar.texto(req.body.sku, { campo: "el código (SKU)", max: 60 }),

        destacado: validar.booleano(req.body.destacado),
        novedad: validar.booleano(req.body.novedad),
        disponible: validar.booleano(req.body.disponible, true),

        slugPedido: validar.texto(req.body.slug, {
            campo: "la dirección web", max: 80
        })
    };
}


// -----------------------------------------------------
// GET /api/admin/productos
// -----------------------------------------------------

async function listar(req, res) {

    const tenantId = tenantDe(req);
    const paginado = validar.paginacion(req.query, { porPagina: 20, maximo: 100 });

    const filtros = {
        categoriaId: validar.uuid(req.query.categoria_id, {
            campo: "la categoría", requerido: false
        }),
        buscar: validar.texto(req.query.buscar, {
            campo: "la búsqueda", max: 120
        }),
        destacados: validar.booleano(req.query.destacados),
        novedades: validar.booleano(req.query.novedades)
    };

    // ?disponible=true / false ; sin el parámetro, todos.
    if (!validar.vacio(req.query.disponible)) {
        filtros.disponible = validar.booleano(req.query.disponible);
    }

    const { items, total } = await repo.buscar(tenantId, filtros, paginado);

    return listado(
        res,
        presentar.productos(items, { admin: true }),
        validar.metaPaginacion(paginado, total)
    );
}


// -----------------------------------------------------
// GET /api/admin/productos/:id
// -----------------------------------------------------

async function detalle(req, res) {

    const tenantId = tenantDe(req);
    const id = validar.uuid(req.params.id, { campo: "el producto" });

    const producto = await repo.porId(tenantId, id);

    if (!producto) throw errores.noEncontrado("Ese producto no existe");

    return exito(res, presentar.producto(producto, { admin: true }));
}


// -----------------------------------------------------
// POST /api/admin/productos
// -----------------------------------------------------

async function crear(req, res) {

    const tenantId = tenantDe(req);
    const datos = await leerDatos(req, tenantId);

    const slug = await repo.generarSlug(
        tenantId, datos.slugPedido || datos.nombre
    );

    const producto = await repo.crear(tenantId, { ...datos, slug });

    // Las imágenes se guardan después de tener el id, para poder
    // dejarlas asociadas al producto en el registro de archivos.
    const subidas = await guardarImagenes(req, "productos", {
        entidad: "producto", entidadId: producto.id
    });

    if (subidas.length > 0) {
        await repo.agregarImagenes(
            tenantId, producto.id, subidas.map(s => s.clave)
        );
    }

    const completo = await repo.porId(tenantId, producto.id);

    return creado(res, {
        producto: presentar.producto(completo, { admin: true }),
        mensaje: `El producto "${completo.nombre}" se creó correctamente`
    });
}


// -----------------------------------------------------
// PUT /api/admin/productos/:id
// -----------------------------------------------------

async function actualizar(req, res) {

    const tenantId = tenantDe(req);
    const id = validar.uuid(req.params.id, { campo: "el producto" });

    const actual = await repo.porId(tenantId, id);

    if (!actual) throw errores.noEncontrado("Ese producto no existe");

    const datos = await leerDatos(req, tenantId);

    // El slug se fija al crear y NO se toca al editar el nombre.
    //
    // Es la dirección del producto en la tienda. Si se regenerara
    // sola, corregir una errata en el nombre rompería el enlace que
    // el cliente ya mandó por WhatsApp o que Google tiene indexado,
    // sin que nadie se entere.
    //
    // Solo cambia si lo piden explícitamente.
    let slug = actual.slug;

    if (datos.slugPedido && datos.slugPedido !== actual.slug) {
        slug = await repo.generarSlug(tenantId, datos.slugPedido, id);
    }

    await repo.actualizar(tenantId, id, { ...datos, slug });

    // Si el formulario trajo imágenes nuevas, se suman a las que ya
    // tenía; para quitar una hay que borrarla explícitamente.
    const subidas = await guardarImagenes(req, "productos", {
        entidad: "producto", entidadId: id
    });

    if (subidas.length > 0) {

        const cantidad = await repo.contarImagenes(tenantId, id);

        if (cantidad + subidas.length > repo.MAX_IMAGENES) {
            // Las que ya se escribieron no sirven: se borran.
            for (const subida of subidas) {
                await eliminarImagen(tenantId, subida.clave);
            }

            throw errores.solicitudInvalida(
                `Un producto puede tener hasta ${repo.MAX_IMAGENES} imágenes. ` +
                `Este ya tiene ${cantidad}.`
            );
        }

        await repo.agregarImagenes(tenantId, id, subidas.map(s => s.clave));
    }

    const completo = await repo.porId(tenantId, id);

    return exito(res, {
        producto: presentar.producto(completo, { admin: true }),
        mensaje: "Los cambios se guardaron correctamente"
    });
}


// -----------------------------------------------------
// PATCH /api/admin/productos/:id/disponible
// Para el interruptor del listado, sin abrir el formulario.
// -----------------------------------------------------

async function cambiarDisponible(req, res) {

    const tenantId = tenantDe(req);
    const id = validar.uuid(req.params.id, { campo: "el producto" });

    if (validar.vacio(req.body.disponible)) {
        throw errores.solicitudInvalida("Indicá si el producto está a la venta");
    }

    const disponible = validar.booleano(req.body.disponible);

    const producto = await repo.cambiarDisponible(tenantId, id, disponible);

    if (!producto) throw errores.noEncontrado("Ese producto no existe");

    return exito(res, {
        producto: presentar.producto(producto, { admin: true }),
        mensaje: disponible
            ? `"${producto.nombre}" ya está a la venta`
            : `"${producto.nombre}" dejó de mostrarse en la tienda`
    });
}


// -----------------------------------------------------
// DELETE /api/admin/productos/:id
// -----------------------------------------------------

async function eliminar(req, res) {

    const tenantId = tenantDe(req);
    const id = validar.uuid(req.params.id, { campo: "el producto" });

    // Se leen las imágenes antes: al borrar el producto, la base
    // borra sus filas en cascada y después no habría forma de
    // saber qué archivos quedaron sueltos.
    const imagenes = await repo.imagenesDe(tenantId, id);

    const producto = await repo.eliminar(tenantId, id);

    if (!producto) throw errores.noEncontrado("Ese producto no existe");

    for (const imagen of imagenes) {
        await eliminarImagen(tenantId, imagen.imagen);
    }

    return exito(res, {
        mensaje: `Se eliminó el producto "${producto.nombre}"`
    });
}


// -----------------------------------------------------
// PATCH /api/admin/productos/orden
// -----------------------------------------------------

async function reordenar(req, res) {

    const tenantId = tenantDe(req);
    const ids = req.body?.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
        throw errores.solicitudInvalida(
            "Enviá el orden de los productos en el campo ids"
        );
    }

    const limpios = ids.map(
        (id, i) => validar.uuid(id, { campo: `el producto número ${i + 1}` })
    );

    const actualizados = await repo.reordenar(tenantId, limpios);

    return exito(res, {
        mensaje: "El orden se guardó correctamente",
        actualizados
    });
}


// =====================================================
// IMAGENES
// =====================================================

// POST /api/admin/productos/:id/imagenes
async function agregarImagenes(req, res) {

    const tenantId = tenantDe(req);
    const id = validar.uuid(req.params.id, { campo: "el producto" });

    const producto = await repo.porId(tenantId, id);

    if (!producto) throw errores.noEncontrado("Ese producto no existe");

    const cantidad = await repo.contarImagenes(tenantId, id);

    // Se cuenta antes de escribir nada en el disco.
    const entrantes = req.files?.length || 0;

    if (entrantes === 0) {
        throw errores.solicitudInvalida("No se recibió ninguna imagen");
    }

    if (cantidad + entrantes > repo.MAX_IMAGENES) {
        throw errores.solicitudInvalida(
            `Un producto puede tener hasta ${repo.MAX_IMAGENES} imágenes. ` +
            `Este ya tiene ${cantidad}.`
        );
    }

    const subidas = await guardarImagenes(req, "productos", {
        entidad: "producto", entidadId: id
    });

    const imagenes = await repo.agregarImagenes(
        tenantId, id, subidas.map(s => s.clave)
    );

    return creado(res, {
        imagenes: presentar.imagenes(imagenes),
        mensaje: entrantes === 1
            ? "La imagen se agregó correctamente"
            : `Se agregaron ${entrantes} imágenes`
    });
}


// DELETE /api/admin/productos/:id/imagenes/:imagenId
async function borrarImagen(req, res) {

    const tenantId = tenantDe(req);
    const id = validar.uuid(req.params.id, { campo: "el producto" });
    const imagenId = validar.uuid(req.params.imagenId, { campo: "la imagen" });

    const borrada = await repo.eliminarImagen(tenantId, id, imagenId);

    if (!borrada) throw errores.noEncontrado("Esa imagen no existe");

    await eliminarImagen(tenantId, borrada.imagen);

    const imagenes = await repo.imagenesDe(tenantId, id);

    return exito(res, {
        imagenes: presentar.imagenes(imagenes),
        mensaje: "La imagen se eliminó correctamente"
    });
}


// PATCH /api/admin/productos/:id/imagenes/:imagenId/principal
async function principal(req, res) {

    const tenantId = tenantDe(req);
    const id = validar.uuid(req.params.id, { campo: "el producto" });
    const imagenId = validar.uuid(req.params.imagenId, { campo: "la imagen" });

    const elegida = await repo.marcarPrincipal(tenantId, id, imagenId);

    if (!elegida) throw errores.noEncontrado("Esa imagen no existe");

    const imagenes = await repo.imagenesDe(tenantId, id);

    return exito(res, {
        imagenes: presentar.imagenes(imagenes),
        mensaje: "Esa pasó a ser la imagen principal"
    });
}


module.exports = {
    listar,
    detalle,
    crear,
    actualizar,
    cambiarDisponible,
    eliminar,
    reordenar,
    agregarImagenes,
    borrarImagen,
    principal
};

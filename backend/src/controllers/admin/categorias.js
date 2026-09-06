// =====================================================
// CONTROLADOR DE ADMINISTRACION · CATEGORIAS
//
// El tenant sale del token, siempre, via tenantDe(req).
//
// El cliente escribe el nombre y nada mas: el slug de la URL
// se arma solo y se le agrega un numero si ya existe otro
// igual en esa tienda.
// =====================================================

const { transaccion } = require("../../database/connection");
const { exito, creado } = require("../../utils/respuesta");
const { errores } = require("../../utils/errores");
const validar = require("../../utils/validar");
const slugs = require("../../utils/slug");
const { tenantDe } = require("../../middleware/tenantResolver");
const { guardarImagenes, eliminarImagen } = require("../../middleware/upload");
const presentar = require("../presentar");

const repo = require("../../repositories/categorias");


// -----------------------------------------------------
// DATOS DEL FORMULARIO
// -----------------------------------------------------

function leerDatos(req) {
    return {
        nombre: validar.texto(req.body.nombre, {
            campo: "el nombre de la categoría", requerido: true, max: 120
        }),
        descripcion: validar.texto(req.body.descripcion, {
            campo: "la descripción", max: 2000
        }),
        slugPedido: validar.texto(req.body.slug, {
            campo: "la dirección web", max: 80
        }),
        activo: validar.booleano(req.body.activo, true)
    };
}


// -----------------------------------------------------
// GET /api/admin/categorias
// -----------------------------------------------------

async function listar(req, res) {
    const lista = await repo.listar(tenantDe(req));
    return exito(res, presentar.categorias(lista, { admin: true }));
}


// -----------------------------------------------------
// POST /api/admin/categorias
// -----------------------------------------------------

async function crear(req, res) {

    const tenantId = tenantDe(req);
    const datos = leerDatos(req);

    const slug = await repo.generarSlug(
        tenantId, datos.slugPedido || datos.nombre
    );

    const [subida] = await guardarImagenes(req, "categorias", {
        entidad: "categoria"
    });

    const categoria = await repo.crear(tenantId, {
        nombre: datos.nombre,
        slug,
        descripcion: datos.descripcion,
        imagen: subida ? subida.clave : null,
        activo: datos.activo
    });

    return creado(res, {
        categoria: presentar.categoria(categoria, { admin: true }),
        mensaje: `La categoría "${categoria.nombre}" se creó correctamente`
    });
}


// -----------------------------------------------------
// PUT /api/admin/categorias/:id
// -----------------------------------------------------

async function actualizar(req, res) {

    const tenantId = tenantDe(req);
    const id = validar.uuid(req.params.id, { campo: "la categoría" });

    const actual = await repo.porId(tenantId, id);

    if (!actual) throw errores.noEncontrado("Esa categoría no existe");

    const datos = leerDatos(req);

    // El slug solo cambia si lo pidieron o si cambió el nombre y
    // el slug seguía derivándose de él. Cambiarlo rompe los
    // enlaces que la gente ya tenga guardados.
    let slug = actual.slug;

    if (datos.slugPedido && datos.slugPedido !== actual.slug) {
        slug = await repo.generarSlug(tenantId, datos.slugPedido, id);

    } else if (!datos.slugPedido && slugs.generar(actual.nombre) === actual.slug &&
               slugs.generar(datos.nombre) !== actual.slug) {
        slug = await repo.generarSlug(tenantId, datos.nombre, id);
    }

    const [subida] = await guardarImagenes(req, "categorias", {
        entidad: "categoria", entidadId: id
    });

    const categoria = await repo.actualizar(tenantId, id, {
        nombre: datos.nombre,
        slug,
        descripcion: datos.descripcion,
        imagen: subida ? subida.clave : null,
        activo: datos.activo
    });

    // La imagen vieja ya no la usa nadie.
    if (subida && actual.imagen) {
        await eliminarImagen(tenantId, actual.imagen);
    }

    return exito(res, {
        categoria: presentar.categoria(categoria, { admin: true }),
        mensaje: "Los cambios se guardaron correctamente"
    });
}


// -----------------------------------------------------
// DELETE /api/admin/categorias/:id
//
// La base no deja borrar una categoria con productos
// (ON DELETE RESTRICT). En vez de mostrar ese error, se
// informa cuantos productos hay y se ofrece continuar:
// con ?desasignar=true los productos quedan sin categoria
// y la categoria se elimina, todo en una transaccion.
// -----------------------------------------------------

async function eliminar(req, res) {

    const tenantId = tenantDe(req);
    const id = validar.uuid(req.params.id, { campo: "la categoría" });

    const categoria = await repo.porId(tenantId, id);

    if (!categoria) throw errores.noEncontrado("Esa categoría no existe");

    const cantidad = await repo.contarProductos(tenantId, id);

    if (cantidad > 0 && !validar.booleano(req.query.desasignar)) {
        throw errores.conflicto(
            cantidad === 1
                ? `"${categoria.nombre}" tiene 1 producto. Si la eliminás, ` +
                  "ese producto queda sin categoría."
                : `"${categoria.nombre}" tiene ${cantidad} productos. Si la ` +
                  "eliminás, esos productos quedan sin categoría.",
            { productos: cantidad, requiere_confirmacion: true }
        );
    }

    await transaccion(async (cliente) => {
        if (cantidad > 0) {
            await repo.desasignarProductos(cliente, tenantId, id);
        }
        await repo.eliminarEn(cliente, tenantId, id);
    });

    if (categoria.imagen) {
        await eliminarImagen(tenantId, categoria.imagen);
    }

    return exito(res, {
        mensaje: cantidad > 0
            ? `Se eliminó "${categoria.nombre}". ${cantidad} ` +
              (cantidad === 1 ? "producto quedó" : "productos quedaron") +
              " sin categoría."
            : `Se eliminó la categoría "${categoria.nombre}"`,
        productos_desasignados: cantidad
    });
}


// -----------------------------------------------------
// PATCH /api/admin/categorias/orden
// -----------------------------------------------------

async function reordenar(req, res) {

    const tenantId = tenantDe(req);
    const ids = req.body?.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
        throw errores.solicitudInvalida(
            "Enviá el orden de las categorías en el campo ids"
        );
    }

    const limpios = ids.map(
        (id, i) => validar.uuid(id, { campo: `la categoría número ${i + 1}` })
    );

    const actualizadas = await repo.reordenar(tenantId, limpios);

    return exito(res, {
        mensaje: "El orden se guardó correctamente",
        actualizadas
    });
}


module.exports = { listar, crear, actualizar, eliminar, reordenar };

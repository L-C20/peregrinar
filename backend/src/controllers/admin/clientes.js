// =====================================================
// CONTROLADOR DE ADMINISTRACION · CLIENTES
//
// Los clientes no se crean desde el panel: aparecen solos
// cuando alguien hace un pedido. Acá se los consulta y se
// les puede dejar una nota interna.
// =====================================================

const { exito } = require("../../utils/respuesta");
const { errores } = require("../../utils/errores");
const validar = require("../../utils/validar");
const { tenantDe } = require("../../middleware/tenantResolver");

const repo = require("../../repositories/clientes");
const pedidos = require("../../repositories/pedidos");
const { NOMBRES } = require("./pedidos");


function presentar(fila) {
    return {
        id: fila.id,
        nombre: fila.nombre,
        apellido: fila.apellido,
        nombre_completo: [fila.nombre, fila.apellido].filter(Boolean).join(" "),
        email: fila.email,
        telefono: fila.telefono,
        direccion: fila.direccion,
        ciudad: fila.ciudad,
        provincia: fila.provincia,
        notas: fila.notas,
        pedidos: fila.pedidos,
        total_comprado: fila.total_comprado !== undefined
            ? Number(fila.total_comprado) : undefined,
        ultimo_pedido: fila.ultimo_pedido,
        created_at: fila.created_at
    };
}


// -----------------------------------------------------
// GET /api/admin/clientes
// -----------------------------------------------------

async function listar(req, res) {

    const lista = await repo.listar(tenantDe(req), {
        buscar: validar.texto(req.query.buscar, { campo: "la búsqueda", max: 120 })
    });

    return exito(res, lista.map(presentar));
}


// -----------------------------------------------------
// GET /api/admin/clientes/:id
// -----------------------------------------------------

async function detalle(req, res) {

    const tenantId = tenantDe(req);
    const id = validar.uuid(req.params.id, { campo: "el cliente" });

    const cliente = await repo.porId(tenantId, id);

    if (!cliente) throw errores.noEncontrado("Ese cliente no existe");

    // Su historial de compras, que es lo que se quiere ver al
    // abrir la ficha.
    const { items } = await pedidos.buscar(
        tenantId, { clienteId: id }, { desde: 0, porPagina: 50 }
    );

    return exito(res, {
        ...presentar(cliente),
        pedidos: items.map(p => ({
            id: p.id,
            numero: p.numero,
            estado: p.estado,
            estado_nombre: NOMBRES[p.estado] || p.estado,
            total: Number(p.total),
            cantidad_items: p.cantidad_items,
            created_at: p.created_at
        }))
    });
}


// -----------------------------------------------------
// PUT /api/admin/clientes/:id/notas
// -----------------------------------------------------

async function guardarNotas(req, res) {

    const tenantId = tenantDe(req);
    const id = validar.uuid(req.params.id, { campo: "el cliente" });

    const notas = validar.texto(req.body.notas, { campo: "la nota", max: 2000 });

    const cliente = await repo.actualizarNotas(tenantId, id, notas);

    if (!cliente) throw errores.noEncontrado("Ese cliente no existe");

    return exito(res, {
        cliente: presentar(cliente),
        mensaje: "La nota se guardó correctamente"
    });
}


module.exports = { listar, detalle, guardarNotas };

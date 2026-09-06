// =====================================================
// CONTROLADOR DE ADMINISTRACION · PEDIDOS
//
// El tenant sale del token. Los pedidos no se crean ni se
// borran desde el panel: entran desde la tienda y acá se
// siguen. Lo único que cambia es el estado, y cada cambio
// queda registrado con quién lo hizo.
// =====================================================

const { transaccion } = require("../../database/connection");
const { exito, listado } = require("../../utils/respuesta");
const { errores } = require("../../utils/errores");
const validar = require("../../utils/validar");
const storage = require("../../storage");
const { tenantDe } = require("../../middleware/tenantResolver");

const repo = require("../../repositories/pedidos");


// Cómo se llama cada estado para quien lee el panel.
const NOMBRES = {
    pendiente: "Pendiente",
    confirmado: "Confirmado",
    preparando: "Preparando",
    enviado: "Enviado",
    entregado: "Entregado",
    cancelado: "Cancelado"
};


function presentarPedido(fila) {
    return {
        id: fila.id,
        numero: fila.numero,
        estado: fila.estado,
        estado_nombre: NOMBRES[fila.estado] || fila.estado,
        // El nombre se lo puso el cliente; el tipo es interno.
        metodo_pago: fila.metodo_pago_nombre || fila.metodo_pago,
        subtotal: Number(fila.subtotal),
        descuento: Number(fila.descuento),
        envio: Number(fila.envio),
        total: Number(fila.total),
        observaciones: fila.observaciones,
        cantidad_items: fila.cantidad_items,
        created_at: fila.created_at,
        cliente: {
            id: fila.cliente_id,
            nombre: [fila.cliente_nombre, fila.cliente_apellido]
                .filter(Boolean).join(" "),
            email: fila.cliente_email,
            telefono: fila.cliente_telefono,
            direccion: fila.cliente_direccion,
            ciudad: fila.cliente_ciudad,
            provincia: fila.cliente_provincia
        }
    };
}


// -----------------------------------------------------
// GET /api/admin/pedidos
// -----------------------------------------------------

async function listar(req, res) {

    const tenantId = tenantDe(req);
    const paginado = validar.paginacion(req.query, { porPagina: 20, maximo: 100 });

    const filtros = {
        estado: validar.opcion(req.query.estado, repo.ESTADOS, { campo: "el estado" }),
        buscar: validar.texto(req.query.buscar, { campo: "la búsqueda", max: 120 }),
        clienteId: validar.uuid(req.query.cliente_id, {
            campo: "el cliente", requerido: false
        })
    };

    const [{ items, total }, conteo] = await Promise.all([
        repo.buscar(tenantId, filtros, paginado),
        repo.conteoPorEstado(tenantId)
    ]);

    return listado(res, items.map(presentarPedido), {
        ...validar.metaPaginacion(paginado, total),
        conteo
    });
}


// -----------------------------------------------------
// GET /api/admin/pedidos/:id
// -----------------------------------------------------

async function detalle(req, res) {

    const tenantId = tenantDe(req);
    const id = validar.uuid(req.params.id, { campo: "el pedido" });

    const pedido = await repo.porId(tenantId, id);

    if (!pedido) throw errores.noEncontrado("Ese pedido no existe");

    const [items, historial] = await Promise.all([
        repo.itemsDe(tenantId, id),
        repo.historialDe(tenantId, id)
    ]);

    return exito(res, {
        ...presentarPedido(pedido),

        // Los datos tal como los dejó quien compró, aunque después
        // haya cambiado su ficha de cliente.
        datos_contacto: pedido.datos_contacto,

        items: items.map(item => ({
            id: item.id,
            producto_id: item.producto_id,
            producto_slug: item.producto_slug,
            nombre: item.nombre_producto,
            sku: item.sku_producto,
            precio_unitario: Number(item.precio_unitario),
            cantidad: item.cantidad,
            subtotal: Number(item.subtotal),
            imagen_url: storage.url(item.imagen_principal),
            // El producto pudo eliminarse del catálogo después.
            existe: Boolean(item.producto_id)
        })),

        historial: historial.map(h => ({
            estado: h.estado,
            estado_nombre: NOMBRES[h.estado] || h.estado,
            nota: h.nota,
            usuario: h.usuario_nombre,
            created_at: h.created_at
        }))
    });
}


// -----------------------------------------------------
// PATCH /api/admin/pedidos/:id/estado
// -----------------------------------------------------

async function cambiarEstado(req, res) {

    const tenantId = tenantDe(req);
    const id = validar.uuid(req.params.id, { campo: "el pedido" });

    const estado = validar.opcion(req.body.estado, repo.ESTADOS, {
        campo: "el estado"
    });

    if (!estado) {
        throw errores.solicitudInvalida("Elegí el nuevo estado del pedido");
    }

    const nota = validar.texto(req.body.nota, { campo: "la nota", max: 500 });

    const actual = await repo.porId(tenantId, id);

    if (!actual) throw errores.noEncontrado("Ese pedido no existe");

    if (actual.estado === estado) {
        throw errores.solicitudInvalida(
            `El pedido ya está en "${NOMBRES[estado]}"`
        );
    }

    const pedido = await transaccion(cliente =>
        repo.cambiarEstado(cliente, tenantId, id, estado,
                           req.usuario.usuario_id, nota)
    );

    return exito(res, {
        pedido: {
            id: pedido.id,
            numero: pedido.numero,
            estado: pedido.estado,
            estado_nombre: NOMBRES[pedido.estado]
        },
        mensaje: `El pedido #${pedido.numero} pasó a "${NOMBRES[estado]}"`
    });
}


module.exports = { listar, detalle, cambiarEstado, NOMBRES };

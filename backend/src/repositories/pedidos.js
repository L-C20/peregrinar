// =====================================================
// REPOSITORIO DE PEDIDOS
//
// Un pedido guarda una FOTO del momento de la compra: el
// nombre y el precio de cada producto quedan copiados en
// pedido_items. Si mañana el producto cambia de precio o se
// elimina del catálogo, el pedido viejo sigue diciendo qué
// se vendió y a cuánto.
// =====================================================

const { consulta, filas, fila, contar } = require("./base");


const ESTADOS = [
    "pendiente", "confirmado", "preparando",
    "enviado", "entregado", "cancelado"
];

// Estados que ya no cuentan como venta viva.
const CERRADOS = new Set(["entregado", "cancelado"]);


const CAMPOS = `
    p.id, p.numero, p.estado, p.metodo_pago,
    p.subtotal, p.descuento, p.envio, p.total,
    p.observaciones, p.datos_contacto,
    p.cliente_id, p.created_at, p.updated_at
`;


// -----------------------------------------------------
// LISTADO
// -----------------------------------------------------

async function buscar(tenantId, { estado = null, buscar = null, clienteId = null } = {},
                      { desde = 0, porPagina = 20 } = {}) {

    const condiciones = ["p.tenant_id = $1"];
    const parametros = [];

    const agregar = (plantilla, valor) => {
        parametros.push(valor);
        condiciones.push(plantilla.replace(/\?/g, `$${parametros.length + 1}`));
    };

    if (estado) agregar("p.estado = ?", estado);
    if (clienteId) agregar("p.cliente_id = ?", clienteId);

    if (buscar) {
        // Un número de pedido o el nombre de quien compró.
        const numero = Number(String(buscar).replace(/\D/g, ""));
        parametros.push(`%${buscar}%`);
        const texto = `$${parametros.length + 1}`;
        parametros.push(Number.isFinite(numero) && numero > 0 ? numero : -1);
        const num = `$${parametros.length + 1}`;

        condiciones.push(
            `(c.nombre ILIKE ${texto} OR c.apellido ILIKE ${texto}
              OR c.email ILIKE ${texto} OR p.numero = ${num})`
        );
    }

    const where = condiciones.join(" AND ");

    const desdeSql = `
        FROM pedidos p
        LEFT JOIN clientes c
          ON c.tenant_id = p.tenant_id AND c.id = p.cliente_id
        LEFT JOIN medios_pago mp
          ON mp.tenant_id = p.tenant_id AND mp.tipo = p.metodo_pago
    `;

    const total = await contar(tenantId,
        `SELECT count(*) AS total ${desdeSql} WHERE ${where}`, parametros);

    const items = await filas(tenantId,
        `SELECT ${CAMPOS},
                mp.nombre AS metodo_pago_nombre,
                c.nombre AS cliente_nombre,
                c.apellido AS cliente_apellido,
                c.email AS cliente_email,
                c.telefono AS cliente_telefono,
                (SELECT count(*) FROM pedido_items i
                  WHERE i.tenant_id = p.tenant_id AND i.pedido_id = p.id)::int
                AS cantidad_items
         ${desdeSql}
         WHERE ${where}
         ORDER BY p.numero DESC
         LIMIT $${parametros.length + 2} OFFSET $${parametros.length + 3}`,
        [...parametros, porPagina, desde]
    );

    return { items, total };
}


// -----------------------------------------------------
// DETALLE
// -----------------------------------------------------

function porId(tenantId, id) {
    return fila(tenantId,
        `SELECT ${CAMPOS},
                mp.nombre AS metodo_pago_nombre,
                c.nombre AS cliente_nombre,
                c.apellido AS cliente_apellido,
                c.email AS cliente_email,
                c.telefono AS cliente_telefono,
                c.direccion AS cliente_direccion,
                c.ciudad AS cliente_ciudad,
                c.provincia AS cliente_provincia
         FROM pedidos p
         LEFT JOIN clientes c
           ON c.tenant_id = p.tenant_id AND c.id = p.cliente_id
         LEFT JOIN medios_pago mp
           ON mp.tenant_id = p.tenant_id AND mp.tipo = p.metodo_pago
         WHERE p.tenant_id = $1 AND p.id = $2`,
        [id]
    );
}


function itemsDe(tenantId, pedidoId) {
    return filas(tenantId,
        `SELECT i.id, i.producto_id, i.nombre_producto, i.sku_producto,
                i.precio_unitario, i.cantidad, i.subtotal,
                pr.slug AS producto_slug,
                pr.imagen_principal
         FROM pedido_items i
         LEFT JOIN productos pr
           ON pr.tenant_id = i.tenant_id AND pr.id = i.producto_id
         WHERE i.tenant_id = $1 AND i.pedido_id = $2
         ORDER BY i.created_at`,
        [pedidoId]
    );
}


function historialDe(tenantId, pedidoId) {
    return filas(tenantId,
        `SELECT h.estado, h.nota, h.created_at,
                u.nombre AS usuario_nombre
         FROM pedido_historial h
         LEFT JOIN usuarios u ON u.id = h.usuario_id
         WHERE h.tenant_id = $1 AND h.pedido_id = $2
         ORDER BY h.created_at`,
        [pedidoId]
    );
}


// -----------------------------------------------------
// CAMBIO DE ESTADO
// -----------------------------------------------------

async function cambiarEstado(cliente, tenantId, id, estado, usuarioId, nota) {

    const { rows } = await cliente.query(
        `UPDATE pedidos SET estado = $3
         WHERE tenant_id = $1 AND id = $2
         RETURNING id, numero, estado`,
        [tenantId, id, estado]
    );

    if (rows.length === 0) return null;

    await cliente.query(
        `INSERT INTO pedido_historial
             (tenant_id, pedido_id, estado, usuario_id, nota)
         VALUES ($1, $2, $3, $4, $5)`,
        [tenantId, id, estado, usuarioId || null, nota || null]
    );

    return rows[0];
}


// -----------------------------------------------------
// RESUMEN POR ESTADO
// Para las pestañas del panel, con el número al lado.
// -----------------------------------------------------

async function conteoPorEstado(tenantId) {

    const resultado = await filas(tenantId,
        `SELECT estado, count(*)::int AS cantidad
         FROM pedidos WHERE tenant_id = $1
         GROUP BY estado`
    );

    const conteo = Object.fromEntries(ESTADOS.map(e => [e, 0]));

    for (const fila of resultado) conteo[fila.estado] = fila.cantidad;

    conteo.total = resultado.reduce((suma, f) => suma + f.cantidad, 0);

    return conteo;
}


module.exports = {
    ESTADOS,
    CERRADOS,
    buscar,
    porId,
    itemsDe,
    historialDe,
    cambiarEstado,
    conteoPorEstado
};

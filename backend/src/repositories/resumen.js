// =====================================================
// REPOSITORIO · RESUMEN DEL PANEL
//
// Los numeros de la pantalla de inicio. Una sola consulta
// con subconsultas en vez de seis viajes a la base.
//
// Las tablas de pedidos y clientes ya existen y se cuentan
// desde ahora, aunque todavia esten vacias: cuando la
// Etapa 10 las empiece a llenar, el panel ya las muestra.
// =====================================================

const { fila, filas } = require("./base");


async function contadores(tenantId) {

    const datos = await fila(tenantId,
        `SELECT
             (SELECT count(*) FROM productos  WHERE tenant_id = $1)::int AS productos,
             (SELECT count(*) FROM productos  WHERE tenant_id = $1
                                                AND disponible)::int      AS productos_publicados,
             (SELECT count(*) FROM productos  WHERE tenant_id = $1
                                                AND disponible
                                                AND stock = 0)::int       AS sin_stock,
             (SELECT count(*) FROM categorias WHERE tenant_id = $1)::int  AS categorias,
             (SELECT count(*) FROM clientes   WHERE tenant_id = $1)::int  AS clientes,
             (SELECT count(*) FROM pedidos    WHERE tenant_id = $1)::int  AS pedidos,
             (SELECT count(*) FROM pedidos    WHERE tenant_id = $1
                                                AND estado = 'pendiente')::int AS pedidos_pendientes,

             -- Ventas de los ultimos 30 dias, sin contar lo cancelado.
             (SELECT COALESCE(sum(total), 0) FROM pedidos
               WHERE tenant_id = $1
                 AND estado <> 'cancelado'
                 AND created_at >= NOW() - INTERVAL '30 days') AS ventas_mes`
    );

    return {
        ...datos,
        ventas_mes: Number(datos.ventas_mes)
    };
}


// Ultimo que se cargó, para poder seguir editando desde ahí.
function productosRecientes(tenantId, limite = 5) {
    return filas(tenantId,
        `SELECT p.id, p.nombre, p.slug, p.precio, p.stock,
                p.disponible, p.imagen_principal, p.created_at,
                c.nombre AS categoria_nombre, c.slug AS categoria_slug
         FROM productos p
         LEFT JOIN categorias c
           ON c.tenant_id = p.tenant_id AND c.id = p.categoria_id
         WHERE p.tenant_id = $1
         ORDER BY p.created_at DESC
         LIMIT $2`,
        [limite]
    );
}


// Publicados pero sin unidades: es lo que conviene mirar primero.
function sinStock(tenantId, limite = 5) {
    return filas(tenantId,
        `SELECT p.id, p.nombre, p.slug, p.precio, p.stock,
                p.disponible, p.imagen_principal
         FROM productos p
         WHERE p.tenant_id = $1 AND p.disponible AND p.stock = 0
         ORDER BY p.nombre
         LIMIT $2`,
        [limite]
    );
}


module.exports = { contadores, productosRecientes, sinStock };

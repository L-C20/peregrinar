// =====================================================
// REPOSITORIO DE CLIENTES
//
// Son los compradores de la tienda, no los usuarios del
// panel: no tienen contraseña ni acceso al administrador.
// Se crean solos cuando alguien hace un pedido.
// =====================================================

const { consulta, filas, fila, contar } = require("./base");


const CAMPOS = `
    id, nombre, apellido, email, telefono,
    direccion, ciudad, provincia, notas,
    created_at, updated_at
`;


// -----------------------------------------------------
// BUSQUEDA
// -----------------------------------------------------

async function listar(tenantId, { buscar = null } = {}) {

    const parametros = [];
    let filtro = "";

    if (buscar) {
        parametros.push(`%${buscar}%`);
        filtro = `AND (c.nombre ILIKE $2 OR c.apellido ILIKE $2
                       OR c.email ILIKE $2 OR c.telefono ILIKE $2)`;
    }

    return filas(tenantId,
        `SELECT ${CAMPOS.split(",").map(c => "c." + c.trim()).join(", ")},
                (SELECT count(*) FROM pedidos p
                  WHERE p.tenant_id = c.tenant_id AND p.cliente_id = c.id)::int
                AS pedidos,
                (SELECT COALESCE(sum(total), 0) FROM pedidos p
                  WHERE p.tenant_id = c.tenant_id AND p.cliente_id = c.id
                    AND p.estado <> 'cancelado')
                AS total_comprado,
                (SELECT max(created_at) FROM pedidos p
                  WHERE p.tenant_id = c.tenant_id AND p.cliente_id = c.id)
                AS ultimo_pedido
         FROM clientes c
         WHERE c.tenant_id = $1 ${filtro}
         ORDER BY c.nombre, c.apellido`,
        parametros
    );
}


function porId(tenantId, id) {
    return fila(tenantId,
        `SELECT ${CAMPOS} FROM clientes WHERE tenant_id = $1 AND id = $2`,
        [id]
    );
}


function total(tenantId) {
    return contar(tenantId,
        "SELECT count(*) AS total FROM clientes WHERE tenant_id = $1"
    );
}


// -----------------------------------------------------
// ALTA DESDE UN PEDIDO
//
// Se busca primero por email y despues por telefono, para
// no crear un cliente nuevo cada vez que la misma persona
// vuelve a comprar. Corre dentro de la transaccion del
// pedido, por eso recibe el cliente de la conexion.
// -----------------------------------------------------

async function buscarOCrear(cliente, tenantId, datos) {

    const email = datos.email ? datos.email.trim().toLowerCase() : null;
    const telefono = datos.telefono ? datos.telefono.trim() : null;

    let existente = null;

    if (email) {
        const { rows } = await cliente.query(
            `SELECT ${CAMPOS} FROM clientes
             WHERE tenant_id = $1 AND lower(email) = $2 LIMIT 1`,
            [tenantId, email]
        );
        existente = rows[0] || null;
    }

    if (!existente && telefono) {
        const { rows } = await cliente.query(
            `SELECT ${CAMPOS} FROM clientes
             WHERE tenant_id = $1 AND telefono = $2 LIMIT 1`,
            [tenantId, telefono]
        );
        existente = rows[0] || null;
    }


    // Si ya compró antes, se completan los datos que faltaban sin
    // pisar los que ya tenía cargados.
    if (existente) {

        const { rows } = await cliente.query(
            `UPDATE clientes SET
                 nombre    = $3,
                 apellido  = COALESCE($4, apellido),
                 email     = COALESCE(email, $5),
                 telefono  = COALESCE(telefono, $6),
                 direccion = COALESCE($7, direccion),
                 ciudad    = COALESCE($8, ciudad),
                 provincia = COALESCE($9, provincia)
             WHERE tenant_id = $1 AND id = $2
             RETURNING ${CAMPOS}`,
            [tenantId, existente.id, datos.nombre, datos.apellido,
             email, telefono, datos.direccion, datos.ciudad, datos.provincia]
        );

        return rows[0];
    }


    const { rows } = await cliente.query(
        `INSERT INTO clientes
             (tenant_id, nombre, apellido, email, telefono,
              direccion, ciudad, provincia)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING ${CAMPOS}`,
        [tenantId, datos.nombre, datos.apellido, email, telefono,
         datos.direccion, datos.ciudad, datos.provincia]
    );

    return rows[0];
}


async function actualizarNotas(tenantId, id, notas) {
    return fila(tenantId,
        `UPDATE clientes SET notas = $3
         WHERE tenant_id = $1 AND id = $2
         RETURNING ${CAMPOS}`,
        [id, notas]
    );
}


module.exports = { listar, porId, total, buscarOCrear, actualizarNotas };

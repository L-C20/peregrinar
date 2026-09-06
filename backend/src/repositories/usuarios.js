// =====================================================
// REPOSITORIO DE USUARIOS
//
// Los usuarios de una tienda se buscan siempre con su
// tenant_id. La excepcion es el superadmin de plataforma,
// que tiene tenant_id NULL y por eso se busca con una
// consulta aparte y explicita.
//
// El email se compara en minusculas, igual que los indices
// unicos de la migracion 003.
// =====================================================

const { query } = require("../database/connection");
const { consulta, fila, filas } = require("./base");


// password_hash NUNCA sale de este archivo salvo donde se
// necesita para comparar. El resto de las consultas usan
// esta lista.
const CAMPOS = `
    id, tenant_id, nombre, email, rol, permisos,
    activo, ultimo_login, created_at, updated_at
`;


// -----------------------------------------------------
// LOGIN
// -----------------------------------------------------

// Usuario de una tienda concreta.
async function porEmailEnTenant(tenantId, email) {
    return fila(tenantId,
        `SELECT ${CAMPOS}, password_hash
         FROM usuarios
         WHERE tenant_id = $1 AND lower(email) = lower($2)
         LIMIT 1`,
        [email]
    );
}


// Superadmin de plataforma. No pertenece a ninguna tienda,
// asi que no puede pasar por los helpers con tenant.
async function superadminPorEmail(email) {
    const resultado = await query(
        `SELECT ${CAMPOS}, password_hash
         FROM usuarios
         WHERE tenant_id IS NULL AND lower(email) = lower($1)
         LIMIT 1`,
        [email]
    );
    return resultado.rows[0] || null;
}


// -----------------------------------------------------
// LECTURA
// -----------------------------------------------------

// Por id, sin importar de que tienda sea. Lo usa el
// middleware de autenticacion, que ya validó el token y
// necesita comprobar que el usuario sigue habilitado.
async function porId(id) {
    const resultado = await query(
        `SELECT ${CAMPOS} FROM usuarios WHERE id = $1 LIMIT 1`,
        [id]
    );
    return resultado.rows[0] || null;
}


async function listarDeTenant(tenantId) {
    return filas(tenantId,
        `SELECT ${CAMPOS}
         FROM usuarios
         WHERE tenant_id = $1
         ORDER BY nombre`
    );
}


// -----------------------------------------------------
// ESCRITURA
// -----------------------------------------------------

// tenantId puede ser null: es un superadmin de plataforma.
// Por eso no usa los helpers de base.js.
//
// "cliente" permite crear el usuario dentro de una transaccion
// ya abierta, para que crear una tienda con su administrador
// sea todo o nada.
async function crear({
    tenantId = null,
    nombre,
    email,
    passwordHash,
    rol,
    permisos = {},
    cliente = null
}) {

    const ejecutar = cliente
        ? (sql, parametros) => cliente.query(sql, parametros)
        : query;

    const resultado = await ejecutar(
        `INSERT INTO usuarios
             (tenant_id, nombre, email, password_hash, rol, permisos)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING ${CAMPOS}`,
        [tenantId, nombre, email.trim(), passwordHash, rol, permisos]
    );

    return resultado.rows[0];
}


async function registrarLogin(id) {
    await query(
        "UPDATE usuarios SET ultimo_login = NOW() WHERE id = $1",
        [id]
    );
}


async function cambiarPassword(id, passwordHash) {
    const resultado = await query(
        `UPDATE usuarios
         SET password_hash = $2
         WHERE id = $1
         RETURNING id`,
        [id, passwordHash]
    );
    return resultado.rowCount > 0;
}


async function hashDe(id) {
    const resultado = await query(
        "SELECT password_hash FROM usuarios WHERE id = $1",
        [id]
    );
    return resultado.rows[0]?.password_hash || null;
}


async function cambiarEstado(tenantId, id, activo) {
    return fila(tenantId,
        `UPDATE usuarios
         SET activo = $3
         WHERE tenant_id = $1 AND id = $2
         RETURNING ${CAMPOS}`,
        [id, activo]
    );
}


module.exports = {
    porEmailEnTenant,
    superadminPorEmail,
    porId,
    listarDeTenant,
    crear,
    registrarLogin,
    cambiarPassword,
    hashDe,
    cambiarEstado
};

// =====================================================
// CONEXION A POSTGRESQL
//
// El pool se crea al arrancar pero no conecta hasta la
// primera consulta: el servidor puede levantar aunque la
// base todavia no exista (util antes de correr migrate).
// =====================================================

const { Pool } = require("pg");

const config = require("../config/env");
const logger = require("../utils/logger");


const pool = new Pool({

    connectionString: config.baseDatos.url,

    ssl: config.baseDatos.ssl
        ? { rejectUnauthorized: false }
        : false,

    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000

});


pool.on("error", (error) => {
    logger.error("Error inesperado en el pool de PostgreSQL", {
        mensaje: error.message
    });
});


// -----------------------------------------------------
// CONSULTA
// Todo el SQL de la aplicacion pasa por aca.
// -----------------------------------------------------

async function query(texto, parametros = []) {

    const inicio = Date.now();

    const resultado = await pool.query(texto, parametros);

    logger.debug("SQL", {
        ms: Date.now() - inicio,
        filas: resultado.rowCount
    });

    return resultado;
}


// -----------------------------------------------------
// UNA SOLA FILA (o null)
// -----------------------------------------------------

async function unaFila(texto, parametros = []) {
    const resultado = await query(texto, parametros);
    return resultado.rows[0] || null;
}


// -----------------------------------------------------
// TRANSACCION
// Uso: await transaccion(async (cliente) => { ... })
// -----------------------------------------------------

async function transaccion(callback) {

    const cliente = await pool.connect();

    try {
        await cliente.query("BEGIN");
        const resultado = await callback(cliente);
        await cliente.query("COMMIT");
        return resultado;

    } catch (error) {
        await cliente.query("ROLLBACK");
        throw error;

    } finally {
        cliente.release();
    }
}


// -----------------------------------------------------
// DIAGNOSTICO
// -----------------------------------------------------

async function probarConexion() {

    try {
        const resultado = await pool.query("SELECT NOW() AS ahora");
        return { conectada: true, ahora: resultado.rows[0].ahora };

    } catch (error) {

        // pg devuelve ECONNREFUSED con mensaje vacio: se traduce
        // para que el motivo real sea visible en el arranque.
        const motivos = {
            ECONNREFUSED: `No hay ningún PostgreSQL escuchando en la dirección de DATABASE_URL`,
            ENOTFOUND: "El host de DATABASE_URL no existe o no es alcanzable",
            ETIMEDOUT: "Tiempo de espera agotado al conectar con la base de datos",
            "28P01": "Usuario o contraseña incorrectos en DATABASE_URL",
            "3D000": "La base de datos indicada en DATABASE_URL no existe"
        };

        return {
            conectada: false,
            motivo: motivos[error.code] || error.message || `Error ${error.code}`
        };
    }
}


module.exports = { pool, query, unaFila, transaccion, probarConexion };

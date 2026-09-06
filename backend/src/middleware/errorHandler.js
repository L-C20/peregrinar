// =====================================================
// MANEJO CENTRAL DE ERRORES
// Convierte cualquier excepcion en { ok:false, error }.
// =====================================================

const multer = require("multer");

const config = require("../config/env");
const logger = require("../utils/logger");
const { fallo } = require("../utils/respuesta");


// -----------------------------------------------------
// RUTA NO ENCONTRADA
// -----------------------------------------------------

function rutaNoEncontrada(req, res) {
    return fallo(res, `La ruta ${req.method} ${req.originalUrl} no existe`, 404);
}


// -----------------------------------------------------
// ERRORES DE POSTGRESQL -> MENSAJES ENTENDIBLES
// -----------------------------------------------------

function traducirErrorPostgres(error) {

    switch (error.code) {

        case "23505": // unique_violation
            return { estado: 409, mensaje: "Ya existe un registro con esos datos" };

        case "23503": // foreign_key_violation
            return { estado: 400, mensaje: "El registro está relacionado con otros datos" };

        case "23001": // restrict_violation
            return {
                estado: 409,
                mensaje: "No se puede eliminar: hay otros registros que dependen de este"
            };

        case "23514": // check_violation
            return { estado: 400, mensaje: "Alguno de los datos enviados no es válido" };

        case "23502": // not_null_violation
            return { estado: 400, mensaje: `El campo "${error.column}" es obligatorio` };

        case "22P02": // invalid_text_representation
            return { estado: 400, mensaje: "Uno de los identificadores enviados no es válido" };

        case "42P01": // undefined_table
            return { estado: 500, mensaje: "La base de datos no está inicializada. Ejecutá: npm run migrate" };

        case "ECONNREFUSED":
        case "ENOTFOUND":
            return { estado: 503, mensaje: "No se pudo conectar con la base de datos" };

        default:
            return null;
    }
}


// -----------------------------------------------------
// MANEJADOR
// -----------------------------------------------------

function manejadorErrores(error, req, res, next) {

    if (res.headersSent) return next(error);


    // Errores lanzados a proposito por la aplicacion
    if (error.esErrorApp) {
        return fallo(res, error.message, error.estado, error.detalles);
    }


    // Errores de subida de archivos
    if (error instanceof multer.MulterError) {

        const mensajes = {
            LIMIT_FILE_SIZE: `El archivo supera el máximo de ${config.almacenamiento.maxMB} MB`,
            LIMIT_FILE_COUNT: "Se enviaron más archivos de los permitidos",
            LIMIT_UNEXPECTED_FILE: "Se envió un archivo en un campo no esperado"
        };

        return fallo(res, mensajes[error.code] || "Error al subir el archivo", 400);
    }


    // JSON mal formado en el body
    if (error.type === "entity.parse.failed") {
        return fallo(res, "El cuerpo de la petición no es un JSON válido", 400);
    }


    // Errores de PostgreSQL
    const traducido = traducirErrorPostgres(error);

    if (traducido) {
        logger.error("Error de base de datos", {
            codigo: error.code,
            detalle: error.detail,
            ruta: `${req.method} ${req.originalUrl}`
        });

        return fallo(res, traducido.mensaje, traducido.estado);
    }


    // Cualquier otra cosa: 500 sin filtrar detalles internos
    logger.error("Error no controlado", {
        mensaje: error.message,
        stack: config.esProduccion ? undefined : error.stack,
        ruta: `${req.method} ${req.originalUrl}`
    });

    return fallo(res, "Ocurrió un error interno. Intentá nuevamente.", 500);
}


module.exports = { rutaNoEncontrada, manejadorErrores };

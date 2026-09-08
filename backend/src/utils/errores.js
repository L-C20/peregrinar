// =====================================================
// ERRORES DE APLICACION
// Cualquier error lanzado con ErrorApp llega al cliente
// con su mensaje y su codigo HTTP. El resto se convierte
// en un 500 generico sin filtrar detalles internos.
// =====================================================

class ErrorApp extends Error {

    constructor(mensaje, estado = 400, detalles = null) {
        super(mensaje);
        this.name = "ErrorApp";
        this.estado = estado;
        this.detalles = detalles;
        this.esErrorApp = true;
    }

}


const errores = {

    solicitudInvalida: (mensaje = "Solicitud inválida", detalles = null) =>
        new ErrorApp(mensaje, 400, detalles),

    noAutenticado: (mensaje = "Necesitás iniciar sesión") =>
        new ErrorApp(mensaje, 401),

    pago: (mensaje = "Pago requerido") =>
        new ErrorApp(mensaje, 402),

    noAutorizado: (mensaje = "No autorizado") =>
        new ErrorApp(mensaje, 403),

    sinPermiso: (mensaje = "No tenés permiso para realizar esta acción") =>
        new ErrorApp(mensaje, 403),

    noEncontrado: (mensaje = "No se encontró el recurso solicitado") =>
        new ErrorApp(mensaje, 404),

    conflicto: (mensaje = "El recurso ya existe", detalles = null) =>
        new ErrorApp(mensaje, 409, detalles),

    archivoGrande: (mensaje = "El archivo supera el tamaño máximo permitido") =>
        new ErrorApp(mensaje, 413),

    error: (mensaje = "Error interno del servidor") =>
        new ErrorApp(mensaje, 500),

    responder: (res, err) => {
        if (err.esErrorApp) {
            return res.status(err.estado).json({
                ok: false,
                error: err.message,
                detalles: err.detalles
            });
        }
        return res.status(500).json({
            ok: false,
            error: "Error interno del servidor"
        });
    }

};


module.exports = { ErrorApp, errores };

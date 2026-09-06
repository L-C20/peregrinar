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

    sinPermiso: (mensaje = "No tenés permiso para realizar esta acción") =>
        new ErrorApp(mensaje, 403),

    noEncontrado: (mensaje = "No se encontró el recurso solicitado") =>
        new ErrorApp(mensaje, 404),

    conflicto: (mensaje = "El recurso ya existe", detalles = null) =>
        new ErrorApp(mensaje, 409, detalles),

    archivoGrande: (mensaje = "El archivo supera el tamaño máximo permitido") =>
        new ErrorApp(mensaje, 413)

};


module.exports = { ErrorApp, errores };

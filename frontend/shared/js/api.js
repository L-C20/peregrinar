// =====================================================
// CLIENTE HTTP
//
// Unico punto de contacto del frontend con la API.
// Ningun otro archivo debe usar fetch() directamente
// ni escribir una URL absoluta.
//
// La API responde siempre { ok, data } o { ok, error }.
// Este cliente devuelve directamente "data" y lanza
// EP.ErrorApi cuando ok es false.
// =====================================================

window.EP = window.EP || {};

(function () {

    // Vacio = mismo origen. En produccion no cambia.
    const BASE = "";


    class ErrorApi extends Error {
        constructor(mensaje, estado, detalles) {
            super(mensaje);
            this.name = "ErrorApi";
            this.estado = estado;
            this.detalles = detalles;
        }
    }


    async function peticion(metodo, ruta, cuerpo = null, opciones = {}) {

        const configuracion = {
            method: metodo,
            headers: {}
        };


        // Token de sesion, si existe
        const token = EP.sesion?.token();

        if (token) {
            configuracion.headers.Authorization = `Bearer ${token}`;
        }


        // FormData se envia tal cual: el navegador arma el boundary
        if (cuerpo instanceof FormData) {
            configuracion.body = cuerpo;

        } else if (cuerpo !== null) {
            configuracion.headers["Content-Type"] = "application/json";
            configuracion.body = JSON.stringify(cuerpo);
        }


        let respuesta;

        try {
            respuesta = await fetch(`${BASE}${ruta}`, configuracion);

        } catch {
            throw new ErrorApi(
                "No se pudo conectar con el servidor. Revisá tu conexión.",
                0
            );
        }


        // Sesion vencida: se limpia y se vuelve al login
        if (respuesta.status === 401 && opciones.redirigirEn401 !== false) {
            EP.sesion?.cerrar();
            throw new ErrorApi("Tu sesión expiró. Ingresá nuevamente.", 401);
        }


        let cuerpoRespuesta = null;

        try {
            cuerpoRespuesta = await respuesta.json();
        } catch {
            throw new ErrorApi(
                "El servidor devolvió una respuesta inesperada.",
                respuesta.status
            );
        }


        if (!respuesta.ok || cuerpoRespuesta.ok === false) {
            throw new ErrorApi(
                cuerpoRespuesta.error || "Ocurrió un error inesperado.",
                respuesta.status,
                cuerpoRespuesta.detalles
            );
        }


        return cuerpoRespuesta.data;
    }


    // Arma la URL completa de una imagen guardada por el backend
    function urlArchivo(ruta) {
        if (!ruta) return "";
        if (/^https?:\/\//i.test(ruta)) return ruta;
        return `${BASE}${ruta.startsWith("/") ? "" : "/"}${ruta}`;
    }


    EP.ErrorApi = ErrorApi;

    EP.api = {

        get: (ruta, opciones) => peticion("GET", ruta, null, opciones),

        post: (ruta, cuerpo, opciones) => peticion("POST", ruta, cuerpo, opciones),

        put: (ruta, cuerpo, opciones) => peticion("PUT", ruta, cuerpo, opciones),

        patch: (ruta, cuerpo, opciones) => peticion("PATCH", ruta, cuerpo, opciones),

        eliminar: (ruta, opciones) => peticion("DELETE", ruta, null, opciones),

        urlArchivo

    };

})();

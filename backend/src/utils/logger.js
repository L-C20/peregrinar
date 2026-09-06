// =====================================================
// LOGGER
// Nunca imprime contraseñas, tokens ni cadenas de conexión.
// =====================================================

const config = require("../config/env");

const CLAVES_SENSIBLES = [
    "password", "password_hash", "contrasena", "token",
    "authorization", "jwt", "secret", "database_url"
];


function limpiar(valor) {

    if (valor === null || typeof valor !== "object") return valor;

    if (Array.isArray(valor)) return valor.map(limpiar);

    const salida = {};

    for (const [clave, contenido] of Object.entries(valor)) {

        const esSensible = CLAVES_SENSIBLES.some(
            sensible => clave.toLowerCase().includes(sensible)
        );

        salida[clave] = esSensible ? "[oculto]" : limpiar(contenido);
    }

    return salida;
}


function escribir(nivel, mensaje, datos) {

    const hora = new Date().toISOString();
    const linea = `${hora} [${nivel}] ${mensaje}`;

    if (datos === undefined) {
        console.log(linea);
        return;
    }

    console.log(linea, limpiar(datos));
}


module.exports = {

    info: (mensaje, datos) => escribir("info", mensaje, datos),

    aviso: (mensaje, datos) => escribir("aviso", mensaje, datos),

    error: (mensaje, datos) => escribir("error", mensaje, datos),

    debug: (mensaje, datos) => {
        if (!config.esProduccion) escribir("debug", mensaje, datos);
    }

};

// =====================================================
// SERVICIO · CREAR UN USUARIO
//
// Centraliza la unica regla que nunca se puede relajar: la
// contraseña se hashea antes de tocar la base, y si no la
// dieron se genera una al azar y se muestra UNA sola vez.
//
// Nunca hay una contraseña escrita en el codigo.
// =====================================================

const { errores } = require("../utils/errores");
const password = require("../utils/password");
const usuarios = require("../repositories/usuarios");


const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


async function crearUsuario({
    tenantId = null,
    nombre,
    email,
    rol = "admin",
    permisos = {},
    password: claveDada = null,
    cliente = null
}) {

    if (!nombre || !String(nombre).trim()) {
        throw errores.solicitudInvalida("El usuario necesita un nombre");
    }

    if (!EMAIL.test(String(email || "").trim())) {
        throw errores.solicitudInvalida("El email no tiene un formato válido");
    }

    if (rol === "superadmin" && tenantId) {
        throw errores.solicitudInvalida(
            "Un superadmin no pertenece a ninguna tienda"
        );
    }

    if (rol !== "superadmin" && !tenantId) {
        throw errores.solicitudInvalida(
            `Un usuario con rol "${rol}" tiene que pertenecer a una tienda`
        );
    }


    // Si no dieron contraseña se genera una y se devuelve para
    // mostrarla una vez. No se guarda en ningun lado mas.
    const generada = !claveDada;
    const clave = claveDada || password.generar();

    if (claveDada) {
        const problema = password.validar(claveDada);
        if (problema) throw errores.solicitudInvalida(problema);
    }


    const usuario = await usuarios.crear({
        tenantId,
        nombre: String(nombre).trim(),
        email: String(email).trim(),
        passwordHash: await password.hashear(clave),
        rol,
        permisos,
        cliente
    });


    return { usuario, password: clave, generada };
}


module.exports = { crearUsuario };

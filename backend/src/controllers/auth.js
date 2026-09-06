// =====================================================
// CONTROLADOR · AUTENTICACION
//
// El login resuelve PRIMERO la tienda (por el dominio) y
// despues busca el usuario dentro de esa tienda. Por eso
// dos tiendas pueden tener un administrador con el mismo
// email sin pisarse.
//
// Si el email no corresponde a ningun usuario de la tienda,
// se prueba como superadmin de plataforma, que no pertenece
// a ninguna.
//
// Ante un login fallido la respuesta es siempre la misma, no
// importa si el email no existe o si la contraseña esta mal:
// decir cual de las dos cosas falló le regala al atacante la
// mitad del trabajo.
// =====================================================

const logger = require("../utils/logger");
const password = require("../utils/password");
const { errores } = require("../utils/errores");
const { exito } = require("../utils/respuesta");
const { firmarToken, olvidarUsuario } = require("../middleware/auth");
const usuarios = require("../repositories/usuarios");


const CREDENCIALES_INVALIDAS = "Email o contraseña incorrectos";


// -----------------------------------------------------
// LOGIN
// POST /api/auth/login
// -----------------------------------------------------

async function login(req, res) {

    const email = String(req.body?.email || "").trim();
    const clave = req.body?.password;

    if (!email || !clave) {
        req.registrarIntento?.(false);
        throw errores.solicitudInvalida("Completá el email y la contraseña");
    }


    // 1. Usuario de esta tienda.  2. Superadmin de plataforma.
    const usuario =
        await usuarios.porEmailEnTenant(req.tenant.id, email) ||
        await usuarios.superadminPorEmail(email);


    // Sin usuario igual se compara contra un hash señuelo, para
    // que la respuesta tarde lo mismo y no se pueda averiguar
    // que emails existen midiendo el tiempo.
    if (!usuario) {
        await password.verificarSeñuelo(clave);
        req.registrarIntento?.(false);
        logger.aviso("Login fallido: email inexistente", {
            tienda: req.tenant.slug
        });
        throw errores.noAutenticado(CREDENCIALES_INVALIDAS);
    }


    const correcta = await password.verificar(clave, usuario.password_hash);

    if (!correcta) {
        req.registrarIntento?.(false);
        logger.aviso("Login fallido: contraseña incorrecta", {
            usuario_id: usuario.id,
            tienda: req.tenant.slug
        });
        throw errores.noAutenticado(CREDENCIALES_INVALIDAS);
    }


    // Recien acá se distingue el usuario desactivado: quien
    // llegó hasta este punto ya demostró saber la contraseña.
    if (!usuario.activo) {
        req.registrarIntento?.(false);
        throw errores.sinPermiso(
            "Tu usuario está desactivado. Hablá con el administrador de la tienda."
        );
    }


    req.registrarIntento?.(true);

    await usuarios.registrarLogin(usuario.id);
    olvidarUsuario(usuario.id);

    logger.info("Usuario autenticado", {
        usuario_id: usuario.id,
        rol: usuario.rol,
        tienda: usuario.tenant_id ? req.tenant.slug : "plataforma"
    });


    return exito(res, {

        token: firmarToken(usuario),

        usuario: {
            id: usuario.id,
            nombre: usuario.nombre,
            email: usuario.email,
            rol: usuario.rol,
            permisos: usuario.permisos || {}
        },

        // El superadmin no pertenece a ninguna tienda.
        tienda: usuario.tenant_id
            ? { nombre: req.tenant.nombre, slug: req.tenant.slug }
            : null
    });
}


// -----------------------------------------------------
// QUIEN SOY
// GET /api/auth/yo
//
// El panel la llama al cargar para saber si la sesion sigue
// viva y con que permisos, sin tener que confiar en lo que
// guardó el navegador.
// -----------------------------------------------------

async function yo(req, res) {

    return exito(res, {

        usuario: {
            id: req.usuario.usuario_id,
            nombre: req.usuario.nombre,
            email: req.usuario.email,
            rol: req.usuario.rol,
            permisos: req.usuario.permisos
        },

        tienda: req.usuario.tenant_id
            ? { nombre: req.tenant.nombre, slug: req.tenant.slug }
            : null
    });
}


// -----------------------------------------------------
// CAMBIAR LA PROPIA CONTRASEÑA
// POST /api/auth/cambiar-password
// -----------------------------------------------------

async function cambiarPassword(req, res) {

    const actual = req.body?.password_actual;
    const nueva = req.body?.password_nueva;

    if (!actual || !nueva) {
        throw errores.solicitudInvalida(
            "Indicá tu contraseña actual y la nueva"
        );
    }

    const problema = password.validar(nueva);

    if (problema) throw errores.solicitudInvalida(problema);

    if (actual === nueva) {
        throw errores.solicitudInvalida(
            "La contraseña nueva tiene que ser distinta de la actual"
        );
    }


    const hash = await usuarios.hashDe(req.usuario.usuario_id);

    if (!hash || !(await password.verificar(actual, hash))) {
        throw errores.noAutenticado("Tu contraseña actual no es correcta");
    }


    await usuarios.cambiarPassword(
        req.usuario.usuario_id,
        await password.hashear(nueva)
    );

    olvidarUsuario(req.usuario.usuario_id);

    logger.info("Contraseña cambiada", {
        usuario_id: req.usuario.usuario_id
    });


    return exito(res, {
        mensaje: "Tu contraseña se cambió correctamente"
    });
}


module.exports = { login, yo, cambiarPassword };

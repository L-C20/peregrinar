// =====================================================
// AUTENTICACION
//
// El token JWT lleva { usuario_id, tenant_id, rol } y es la
// UNICA fuente del tenant en las rutas de administracion.
//
// Ademas de validar la firma, se comprueba contra la base
// que el usuario siga existiendo y habilitado. Sin eso, un
// empleado dado de baja seguiria entrando hasta que venciera
// su token, que dura 8 horas. La comprobacion se cachea un
// minuto para no consultar en cada peticion.
// =====================================================

const jwt = require("jsonwebtoken");

const config = require("../config/env");
const Cache = require("../utils/cache");
const { ErrorApp, errores } = require("../utils/errores");
const usuarios = require("../repositories/usuarios");


const cacheUsuarios = new Cache(60000, "usuarios");


// -----------------------------------------------------
// EMITIR TOKEN
// -----------------------------------------------------

function firmarToken(usuario) {

    return jwt.sign(
        {
            usuario_id: usuario.id,
            tenant_id: usuario.tenant_id,   // null en el superadmin
            rol: usuario.rol
        },
        config.seguridad.jwtSecret,
        { expiresIn: config.seguridad.jwtExpiracion }
    );
}


// -----------------------------------------------------
// LEER EL TOKEN DE LA PETICION
// -----------------------------------------------------

function tokenDe(req) {

    const encabezado = req.headers.authorization;

    if (!encabezado) return null;

    const [esquema, token] = encabezado.split(" ");

    if (esquema !== "Bearer" || !token) return null;

    return token.trim();
}


// -----------------------------------------------------
// MIDDLEWARE
// -----------------------------------------------------

async function autenticar(req, res, next) {

    try {

        const token = tokenDe(req);

        if (!token) {
            throw errores.noAutenticado("Necesitás iniciar sesión");
        }


        let datos;

        try {
            datos = jwt.verify(token, config.seguridad.jwtSecret);

        } catch (falla) {

            if (falla.name === "TokenExpiredError") {
                throw new ErrorApp("Tu sesión expiró. Ingresá nuevamente.", 401);
            }

            throw errores.noAutenticado("Sesión inválida. Ingresá nuevamente.");
        }


        // El usuario pudo haber sido desactivado o eliminado
        // despues de que se emitio el token.
        const usuario = await cacheUsuarios.recordar(
            datos.usuario_id,
            () => usuarios.porId(datos.usuario_id)
        );

        if (!usuario) {
            cacheUsuarios.olvidar(datos.usuario_id);
            throw errores.noAutenticado("Tu usuario ya no existe");
        }

        if (!usuario.activo) {
            throw errores.sinPermiso("Tu usuario está desactivado");
        }

        // El rol o la tienda pudieron cambiar despues del token:
        // vale lo que dice la base, no lo que dice el token.
        if (usuario.rol !== datos.rol || usuario.tenant_id !== datos.tenant_id) {
            throw new ErrorApp(
                "Tus permisos cambiaron. Ingresá nuevamente.",
                401
            );
        }


        req.usuario = {
            usuario_id: usuario.id,
            tenant_id: usuario.tenant_id,
            rol: usuario.rol,
            nombre: usuario.nombre,
            email: usuario.email,
            permisos: usuario.permisos || {}
        };

        next();

    } catch (falla) {
        next(falla);
    }
}


// -----------------------------------------------------
// INVALIDACION
//
// La llama el panel al desactivar un usuario, cambiarle el
// rol o cambiar su contraseña, para que el efecto sea
// inmediato y no dentro de un minuto.
// -----------------------------------------------------

function olvidarUsuario(usuarioId) {
    cacheUsuarios.olvidar(usuarioId);
}


module.exports = { autenticar, firmarToken, olvidarUsuario, tokenDe };

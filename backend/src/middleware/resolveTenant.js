// =====================================================
// RESOLVER TENANT EN RUTAS AUTENTICADAS
//
// Después de autenticar, el usuario tiene tenant_id en el JWT.
// Este middleware obtiene los datos completos del tenant
// de la base de datos y los añade a req.tenant.
// =====================================================

const { errores } = require("../utils/errores");
const tenants = require("../repositories/tenants");


async function resolveTenant(req, res, next) {
    try {
        // El usuario debe haber pasado por autenticar primero
        if (!req.usuario) {
            throw new Error(
                `La ruta usa resolveTenant sin haber pasado por autenticar`
            );
        }

        // El superadmin (tenant_id NULL) no accede a rutas del admin
        if (!req.usuario.tenant_id) {
            throw errores.sinPermiso(
                "El superadmin no puede acceder al panel de una tienda"
            );
        }

        // Obtener datos completos del tenant
        const tenant = await tenants.porId(req.usuario.tenant_id);

        if (!tenant) {
            throw errores.noEncontrado("La tienda no existe");
        }

        req.tenant = tenant;
        next();

    } catch (err) {
        next(err);
    }
}


module.exports = { resolveTenant };

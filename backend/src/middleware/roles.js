// =====================================================
// ROLES Y PERMISOS
//
//   superadmin  administra la plataforma: crea y da de baja
//               tiendas. No pertenece a ninguna.
//   admin       dueño de una tienda. Puede todo lo suyo.
//   empleado    acceso limitado por usuarios.permisos.
//
// Los permisos se guardan como JSONB:
//
//   { "productos": ["ver","crear","editar"],
//     "pedidos":   ["ver","editar"] }
//
// admin y superadmin no se consultan contra ese objeto:
// tienen todo dentro de su ambito. La estructura existe
// desde ahora para que sumar permisos finos mas adelante
// no requiera migrar la base.
//
// Uso:
//
//   router.post("/", autenticar, requireRol("admin"), ctrl.crear)
//   router.put("/:id", autenticar, requirePermiso("productos.editar"), ctrl.editar)
// =====================================================

const { errores } = require("../utils/errores");


const ROLES = ["superadmin", "admin", "empleado"];

// Roles que no se limitan por el objeto de permisos.
const SIN_LIMITES = new Set(["superadmin", "admin"]);


// -----------------------------------------------------
// EXIGIR UN ROL
// -----------------------------------------------------

function requireRol(...permitidos) {

    const lista = permitidos.flat();

    const desconocido = lista.find(rol => !ROLES.includes(rol));

    if (desconocido) {
        throw new Error(`Rol desconocido en una ruta: ${desconocido}`);
    }

    return function verificarRol(req, res, next) {

        if (!req.usuario) {
            return next(new Error(
                `La ruta ${req.method} ${req.originalUrl} usa requireRol ` +
                "sin haber pasado por autenticar."
            ));
        }

        if (!lista.includes(req.usuario.rol)) {
            return next(errores.sinPermiso(
                "No tenés permiso para acceder a esta sección"
            ));
        }

        next();
    };
}


// -----------------------------------------------------
// EXIGIR UN PERMISO CONCRETO
//
//   requirePermiso("productos.editar")
// -----------------------------------------------------

function requirePermiso(clave) {

    const [recurso, accion] = String(clave).split(".");

    if (!recurso || !accion) {
        throw new Error(
            `Permiso mal escrito en una ruta: "${clave}". ` +
            'Se espera "recurso.accion", por ejemplo "productos.editar".'
        );
    }

    return function verificarPermiso(req, res, next) {

        if (!req.usuario) {
            return next(new Error(
                `La ruta ${req.method} ${req.originalUrl} usa requirePermiso ` +
                "sin haber pasado por autenticar."
            ));
        }

        if (SIN_LIMITES.has(req.usuario.rol)) return next();

        const acciones = req.usuario.permisos?.[recurso];

        if (Array.isArray(acciones) && acciones.includes(accion)) {
            return next();
        }

        next(errores.sinPermiso(
            "Tu usuario no tiene permiso para realizar esta acción"
        ));
    };
}


// -----------------------------------------------------
// SOLO USUARIOS DE UNA TIENDA
//
// El superadmin administra la plataforma, no las tiendas.
// Para trabajar dentro de una tienda usa /api/platform.
// Este guard evita que un token de superadmin, que lleva
// tenant_id NULL, entre a rutas que asumen que hay tienda.
// -----------------------------------------------------

const soloTienda = requireRol("admin", "empleado");


module.exports = { requireRol, requirePermiso, soloTienda, ROLES };

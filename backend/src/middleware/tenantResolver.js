// =====================================================
// RESOLUCION DEL TENANT EN LA TIENDA PUBLICA
//
// La tienda publica no tiene token, asi que el tenant no
// puede salir del usuario. Sale del DOMINIO por el que
// entro la visita:
//
//   1. header Host  ->  tabla tenant_dominios
//   2. si el dominio no esta registrado, DEFAULT_TENANT_SLUG
//
// Nunca sale del body ni del query en produccion. Ese es
// justamente el agujero que tenia el proyecto anterior:
// el catalogo publico devolvia los productos de todas las
// tiendas porque no habia forma de saber cual era la suya.
//
// Cuando exista un segundo cliente con su propio dominio,
// se agrega una fila en tenant_dominios y funciona: no hay
// nada que programar.
// =====================================================

const config = require("../config/env");
const logger = require("../utils/logger");
const { ErrorApp, errores } = require("../utils/errores");
const tenants = require("../repositories/tenants");


// -----------------------------------------------------
// DOMINIO DE LA PETICION
// Sin puerto y en minusculas, que es como se guarda.
// -----------------------------------------------------

function dominioDe(req) {
    const host = req.headers.host || "";
    return host.split(":")[0].trim().toLowerCase();
}


// -----------------------------------------------------
// MIDDLEWARE
// -----------------------------------------------------

async function tenantResolver(req, res, next) {

    try {

        const dominio = dominioDe(req);

        let tenant = dominio ? await tenants.porDominio(dominio) : null;
        let origen = "dominio";


        // En desarrollo se puede pedir otra tienda con ?tienda=slug.
        // Sirve para probar el aislamiento con varios tenants sobre
        // localhost. En produccion se ignora: el dominio manda.
        if (!config.esProduccion && req.query.tienda) {
            const pedido = await tenants.porSlug(String(req.query.tienda));
            if (pedido) {
                tenant = pedido;
                origen = "query (solo desarrollo)";
            }
        }


        // Fallback: la tienda por defecto. Imprescindible mientras
        // haya un solo cliente y todavia no tenga dominio propio.
        if (!tenant) {
            tenant = await tenants.porSlug(config.multiTenant.slugPorDefecto);
            origen = "DEFAULT_TENANT_SLUG";
        }


        if (!tenant) {
            logger.aviso("Petición pública sin tienda asociada", {
                dominio,
                slugPorDefecto: config.multiTenant.slugPorDefecto
            });

            throw errores.noEncontrado(
                "No hay ninguna tienda configurada para este dominio"
            );
        }


        if (tenant.estado !== "activo") {
            throw new ErrorApp(
                "Esta tienda no está disponible en este momento",
                503
            );
        }


        req.tenant = tenant;
        req.tenantOrigen = origen;

        next();

    } catch (falla) {
        next(falla);
    }
}


// -----------------------------------------------------
// DE DONDE SALE EL TENANT
//
// Unico lugar de la aplicacion que contesta esa pregunta:
//
//   rutas de admin    -> del JWT              (req.usuario)
//   rutas publicas    -> del dominio          (req.tenant)
//
// Nunca del body, del query ni de un header enviado por el
// cliente. Si esto lanza, es que falto un middleware.
// -----------------------------------------------------

function tenantDe(req) {

    const tenantId = req.usuario?.tenant_id || req.tenant?.id;

    if (!tenantId) {
        throw new Error(
            `La ruta ${req.method} ${req.originalUrl} no resolvió el tenant. ` +
            "Falta authMiddleware (admin) o tenantResolver (público)."
        );
    }

    return tenantId;
}


module.exports = { tenantResolver, tenantDe, dominioDe };

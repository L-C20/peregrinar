// =====================================================
// RUTAS PUBLICAS · LA TIENDA
//
// Sin token. El tenant lo determina tenantResolver a partir
// del dominio y queda en req.tenant para todo lo que sigue.
//
// REGLA: ninguna consulta de este arbol lee sin filtrar por
// req.tenant.id. Los repositorios lo exigen: una consulta
// sin tenant ni siquiera se ejecuta.
//
// Es exactamente el lugar donde el proyecto anterior
// devolvia los productos de todas las tiendas mezclados.
// =====================================================

const express = require("express");

const { tenantResolver } = require("../../middleware/tenantResolver");
const { moduloActivo } = require("../../middleware/modulo");
const { limitarPorIp } = require("../../middleware/limitarIntentos");

const tienda = require("../../controllers/publico/tienda");
const catalogo = require("../../controllers/publico/catalogo");
const pedidos = require("../../controllers/publico/pedidos");


const router = express.Router();


// Todo lo que cuelga de acá tiene tenant resuelto.
router.use(tenantResolver);


// Identidad, apariencia, contacto, redes y módulos: todo lo
// que necesita cualquier página al cargar, en una sola vuelta.
router.get("/tienda", tienda.identidad);

// Contenido editable desde el panel.
router.get("/faq", tienda.faq);
router.get("/banners", tienda.banners);
router.get("/paginas/:clave", tienda.pagina);


// ---------- CATALOGO ----------
// Si la tienda no tiene el módulo, responde 403 con un
// mensaje entendible en vez de devolver datos.

const conCatalogo = moduloActivo("catalogo");

router.get("/categorias", conCatalogo, catalogo.categorias);
router.get("/productos", conCatalogo, catalogo.productos);
router.get("/productos/:slug", conCatalogo, catalogo.detalle);


// ---------- PEDIDOS ----------
// Unico punto de la tienda que escribe en la base sin nadie
// autenticado: va detras de un limite por IP para que no le
// llenen el panel de pedidos falsos.

router.post("/pedidos",
    moduloActivo("pedidos"),
    limitarPorIp("pedidos", 8, 10 * 60 * 1000,
        "Recibimos varios pedidos tuyos seguidos. Esperá unos minutos " +
        "o escribinos directamente."),
    pedidos.crear);


module.exports = router;

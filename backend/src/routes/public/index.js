// =====================================================
// RUTAS PUBLICAS · LA TIENDA
//
// Sin token. El tenant lo determina tenantResolver a partir
// del dominio, y queda en req.tenant para todo lo que sigue.
//
// REGLA: ninguna consulta de este arbol puede leer datos sin
// filtrar por req.tenant.id. Es el lugar donde el proyecto
// anterior filtraba productos de todas las tiendas juntas.
//
// El catálogo y el resto de las secciones se agregan en la
// Etapa 6.
// =====================================================

const express = require("express");

const { tenantResolver } = require("../../middleware/tenantResolver");
const tienda = require("../../controllers/tienda");


const router = express.Router();


// Todo lo que cuelga de acá tiene tenant resuelto.
router.use(tenantResolver);


// Identidad y módulos habilitados de la tienda.
router.get("/tienda", tienda.identidad);


module.exports = router;

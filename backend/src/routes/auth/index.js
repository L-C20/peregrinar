// =====================================================
// RUTAS DE AUTENTICACION
//
// Cuarta superficie, aparte de public / admin / platform,
// porque no encaja en ninguna: el login todavia no tiene
// token, pero tampoco es contenido de la tienda.
//
// Necesita el tenant resuelto por dominio ANTES de buscar
// al usuario: el mismo email puede existir en dos tiendas.
// =====================================================

const express = require("express");

const { tenantResolver } = require("../../middleware/tenantResolver");
const { autenticar } = require("../../middleware/auth");
const { limitarLogin } = require("../../middleware/limitarIntentos");
const auth = require("../../controllers/auth");


const router = express.Router();


// Qué tienda es, según el dominio por el que entró la visita.
router.use(tenantResolver);


router.post("/login", limitarLogin, auth.login);

router.get("/yo", autenticar, auth.yo);

router.post("/cambiar-password", autenticar, auth.cambiarPassword);


// No hay ruta de logout: el token es sin estado y el panel
// simplemente lo descarta. Una lista de tokens revocados
// solo tiene sentido con sesiones largas; estas duran 8 horas.


module.exports = router;

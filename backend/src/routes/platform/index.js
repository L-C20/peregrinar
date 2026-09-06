// =====================================================
// RUTAS DE PLATAFORMA · SOLO SUPERADMIN
//
// Crear tiendas, darlas de baja, ver el estado general.
// Es el unico lugar donde se trabaja por encima de un
// tenant, y por eso esta cerrado a un solo rol.
//
// Mientras tanto, las tiendas y los usuarios se crean con
// los scripts:
//
//   npm run crear-tenant  -- --nombre "..." --slug ...
//   npm run crear-usuario -- --tenant ... --email ...
// =====================================================

const express = require("express");

const { autenticar } = require("../../middleware/auth");
const { requireRol } = require("../../middleware/roles");


const router = express.Router();


router.use(autenticar);
router.use(requireRol("superadmin"));


module.exports = router;

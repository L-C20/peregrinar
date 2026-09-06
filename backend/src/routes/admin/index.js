// =====================================================
// RUTAS DE ADMINISTRACION · EL PANEL DE UNA TIENDA
//
// Token obligatorio. El tenant sale EXCLUSIVAMENTE del JWT:
// nunca del body, del query ni de un header.
//
// El superadmin no entra acá. Administra la plataforma
// (crear y dar de baja tiendas) desde /api/platform, no el
// catálogo de una tienda concreta. Un token con tenant_id
// NULL en rutas que asumen que hay tienda es justo el tipo
// de cosa que después provoca consultas sin filtrar.
//
// Los recursos (productos, categorías, pedidos, apariencia)
// se agregan en las Etapas 6 en adelante.
// =====================================================

const express = require("express");

const { autenticar } = require("../../middleware/auth");
const { soloTienda } = require("../../middleware/roles");


const router = express.Router();


router.use(autenticar);
router.use(soloTienda);


module.exports = router;

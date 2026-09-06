// =====================================================
// MONTAJE DE RUTAS
//
// Tres superficies con reglas de tenant distintas:
//
//   /api/public/*    tienda: sin token. El tenant lo determina
//                    tenantResolver (dominio -> tenant_dominios,
//                    con fallback a DEFAULT_TENANT_SLUG).
//
//   /api/admin/*     panel: token obligatorio. El tenant sale
//                    EXCLUSIVAMENTE del JWT. Nunca del body,
//                    del query ni de un header.
//
//   /api/platform/*  superadmin: crea y administra tenants.
//
// Esta separacion es la que impide que la tienda publica
// devuelva datos de otro tenant.
// =====================================================

const express = require("express");

const { exito } = require("../utils/respuesta");
const { probarConexion } = require("../database/connection");

const rutasPublicas = require("./public");
const rutasAdmin = require("./admin");
const rutasPlataforma = require("./platform");


const router = express.Router();


// -----------------------------------------------------
// ESTADO DEL SERVICIO
// -----------------------------------------------------

router.get("/health", async (req, res) => {

    const baseDatos = await probarConexion();

    return exito(res, {
        servicio: "peregrinar-platform",
        estado: "activo",
        baseDatos: baseDatos.conectada ? "conectada" : "sin conexión",
        detalle: baseDatos.conectada ? undefined : baseDatos.motivo
    });

});


router.use("/public", rutasPublicas);
router.use("/admin", rutasAdmin);
router.use("/platform", rutasPlataforma);


module.exports = router;

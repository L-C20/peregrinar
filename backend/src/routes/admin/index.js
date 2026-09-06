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
// =====================================================

const express = require("express");

const { autenticar } = require("../../middleware/auth");
const { soloTienda, requirePermiso } = require("../../middleware/roles");
const { moduloActivo } = require("../../middleware/modulo");
const { subirImagen, subirImagenes } = require("../../middleware/upload");

const resumen = require("../../controllers/admin/resumen");
const categorias = require("../../controllers/admin/categorias");
const productos = require("../../controllers/admin/productos");
const { MAX_IMAGENES } = require("../../repositories/productos");


const router = express.Router();


router.use(autenticar);
router.use(soloTienda);


// =====================================================
// INICIO
// Sin permiso extra: cualquiera que entre al panel ve los
// numeros de su tienda.
// =====================================================

router.get("/resumen", resumen.resumen);


// El catálogo entero depende de que la tienda tenga el módulo.
const conCatalogo = moduloActivo("catalogo");


// =====================================================
// CATEGORIAS
// =====================================================

router.get("/categorias",
    conCatalogo, requirePermiso("categorias.ver"),
    categorias.listar);

router.post("/categorias",
    conCatalogo, requirePermiso("categorias.crear"),
    subirImagen("imagen"),
    categorias.crear);

// Antes de "/categorias/:id" para que "orden" no se lea como un id.
router.patch("/categorias/orden",
    conCatalogo, requirePermiso("categorias.editar"),
    categorias.reordenar);

router.put("/categorias/:id",
    conCatalogo, requirePermiso("categorias.editar"),
    subirImagen("imagen"),
    categorias.actualizar);

router.delete("/categorias/:id",
    conCatalogo, requirePermiso("categorias.eliminar"),
    categorias.eliminar);


// =====================================================
// PRODUCTOS
// =====================================================

router.get("/productos",
    conCatalogo, requirePermiso("productos.ver"),
    productos.listar);

router.post("/productos",
    conCatalogo, requirePermiso("productos.crear"),
    subirImagenes("imagenes", MAX_IMAGENES),
    productos.crear);

router.patch("/productos/orden",
    conCatalogo, requirePermiso("productos.editar"),
    productos.reordenar);

router.get("/productos/:id",
    conCatalogo, requirePermiso("productos.ver"),
    productos.detalle);

router.put("/productos/:id",
    conCatalogo, requirePermiso("productos.editar"),
    subirImagenes("imagenes", MAX_IMAGENES),
    productos.actualizar);

router.patch("/productos/:id/disponible",
    conCatalogo, requirePermiso("productos.editar"),
    productos.cambiarDisponible);

router.delete("/productos/:id",
    conCatalogo, requirePermiso("productos.eliminar"),
    productos.eliminar);


// ---------- IMAGENES ----------

router.post("/productos/:id/imagenes",
    conCatalogo, requirePermiso("productos.editar"),
    subirImagenes("imagenes", MAX_IMAGENES),
    productos.agregarImagenes);

router.delete("/productos/:id/imagenes/:imagenId",
    conCatalogo, requirePermiso("productos.editar"),
    productos.borrarImagen);

router.patch("/productos/:id/imagenes/:imagenId/principal",
    conCatalogo, requirePermiso("productos.editar"),
    productos.principal);


module.exports = router;

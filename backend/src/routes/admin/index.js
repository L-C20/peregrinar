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
const { subirImagen, subirImagenes, subirCampos } = require("../../middleware/upload");

const resumen = require("../../controllers/admin/resumen");
const categorias = require("../../controllers/admin/categorias");
const productos = require("../../controllers/admin/productos");
const pedidos = require("../../controllers/admin/pedidos");
const clientes = require("../../controllers/admin/clientes");
const contenido = require("../../controllers/admin/contenido");
const configuracion = require("../../controllers/admin/configuracion");
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



// =====================================================
// PEDIDOS
//
// No se crean ni se eliminan desde el panel: entran desde
// la tienda y aca se siguen. Lo unico que cambia es el
// estado, y cada cambio queda en el historial.
// =====================================================

const conPedidos = moduloActivo("pedidos");

router.get("/pedidos",
    conPedidos, requirePermiso("pedidos.ver"),
    pedidos.listar);

router.get("/pedidos/:id",
    conPedidos, requirePermiso("pedidos.ver"),
    pedidos.detalle);

router.patch("/pedidos/:id/estado",
    conPedidos, requirePermiso("pedidos.editar"),
    pedidos.cambiarEstado);


// =====================================================
// CLIENTES
// =====================================================

router.get("/clientes",
    requirePermiso("clientes.ver"),
    clientes.listar);

router.get("/clientes/:id",
    requirePermiso("clientes.ver"),
    clientes.detalle);

router.put("/clientes/:id/notas",
    requirePermiso("clientes.editar"),
    clientes.guardarNotas);


// =====================================================
// CONTENIDO
//
// Los banners de la portada, las paginas de texto y las
// preguntas frecuentes. Un solo permiso para las tres: son
// una misma pantalla y una misma tarea.
//
// Las rutas de "orden" van ANTES de las de ":id" para que
// "orden" no se lea como un identificador.
// =====================================================

const verContenido = requirePermiso("contenido.ver");
const editarContenido = requirePermiso("contenido.editar");


// ---------- BANNERS ----------

router.get("/contenido/banners", verContenido, contenido.listarBanners);

router.post("/contenido/banners",
    editarContenido, subirImagen("imagen"), contenido.crearBanner);

router.patch("/contenido/banners/orden", editarContenido, contenido.reordenarBanners);

router.put("/contenido/banners/:id",
    editarContenido, subirImagen("imagen"), contenido.actualizarBanner);

router.delete("/contenido/banners/:id", editarContenido, contenido.eliminarBanner);


// ---------- PAGINAS ----------

router.get("/contenido/paginas", verContenido, contenido.listarPaginas);

router.post("/contenido/paginas",
    editarContenido, subirImagen("imagen"), contenido.crearPagina);

router.put("/contenido/paginas/:id",
    editarContenido, subirImagen("imagen"), contenido.actualizarPagina);

router.delete("/contenido/paginas/:id", editarContenido, contenido.eliminarPagina);


// ---------- PREGUNTAS FRECUENTES ----------

router.get("/contenido/faq", verContenido, contenido.listarFaq);

router.post("/contenido/faq", editarContenido, contenido.crearFaq);

router.patch("/contenido/faq/orden", editarContenido, contenido.reordenarFaq);

router.put("/contenido/faq/:id", editarContenido, contenido.actualizarFaq);

router.delete("/contenido/faq/:id", editarContenido, contenido.eliminarFaq);


// =====================================================
// CONFIGURACION DE LA TIENDA
//
// Identidad, contacto, redes, medios de pago y SEO.
//
// Los modulos habilitados NO se tocan desde acá: son lo que
// la tienda tiene contratado y se administran en /api/platform.
// =====================================================

const verConfiguracion = requirePermiso("configuracion.ver");
const editarConfiguracion = requirePermiso("configuracion.editar");


router.get("/configuracion", verConfiguracion, configuracion.leer);

router.put("/configuracion/identidad",
    editarConfiguracion,
    subirCampos([{ name: "logo", maxCount: 1 }, { name: "favicon", maxCount: 1 }]),
    configuracion.guardarIdentidad);

router.delete("/configuracion/identidad/:imagen",
    editarConfiguracion, configuracion.quitarImagen);

// Colores y tipografias. Escriben la misma tabla que la
// identidad, pero cada uno solo sus columnas.
router.put("/configuracion/apariencia",
    editarConfiguracion, configuracion.guardarApariencia);

router.post("/configuracion/apariencia/restablecer",
    editarConfiguracion, configuracion.restablecerApariencia);

router.put("/configuracion/contacto", editarConfiguracion, configuracion.guardarContacto);

router.put("/configuracion/redes", editarConfiguracion, configuracion.guardarRedes);

router.put("/configuracion/sitio",
    editarConfiguracion, subirImagen("og_imagen"), configuracion.guardarSitio);


// ---------- MEDIOS DE PAGO ----------

router.get("/configuracion/medios-pago",
    verConfiguracion, configuracion.listarMediosPago);

router.post("/configuracion/medios-pago",
    editarConfiguracion, configuracion.crearMedioPago);

router.put("/configuracion/medios-pago/:id",
    editarConfiguracion, configuracion.actualizarMedioPago);

router.delete("/configuracion/medios-pago/:id",
    editarConfiguracion, configuracion.eliminarMedioPago);


module.exports = router;

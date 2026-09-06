// =====================================================
// SUBIDA DE IMAGENES
//
// multer recibe el archivo EN MEMORIA y no lo escribe.
// Quien decide donde va es la capa storage/, que puede ser
// el disco local hoy y Cloudinary mañana. Si multer
// escribiera directo al disco, toda la aplicacion quedaria
// atada al filesystem.
//
// Uso en una ruta:
//
//   router.post("/",
//       auth,
//       subirImagenes("imagenes", 4),
//       controlador.crear);
//
// Y en el controlador:
//
//   const guardadas = await guardarImagenes(req, "productos");
//   // [{ clave, mime, tamano }, ...]
// =====================================================

const multer = require("multer");

const config = require("../config/env");
const storage = require("../storage");
const { errores } = require("../utils/errores");
const { tenantDe } = require("./tenantResolver");
const tenants = require("../repositories/tenants");
const archivos = require("../repositories/archivos");
const { EXTENSIONES } = require("../storage/localDriver");


const TIPOS_ADMITIDOS = new Set(Object.keys(EXTENSIONES));


// -----------------------------------------------------
// MULTER
// -----------------------------------------------------

const subida = multer({

    storage: multer.memoryStorage(),

    limits: {
        fileSize: config.almacenamiento.maxMB * 1024 * 1024,
        files: 10,
        // Evita cuerpos enormes de campos de texto en un multipart.
        fieldSize: 1024 * 1024
    },

    fileFilter(req, archivo, cb) {

        if (!TIPOS_ADMITIDOS.has(archivo.mimetype)) {
            return cb(errores.solicitudInvalida(
                "Formato no admitido. Subí una imagen JPG, PNG, WEBP, GIF o AVIF."
            ));
        }

        cb(null, true);
    }

});


const subirImagen = (campo) => subida.single(campo);

const subirImagenes = (campo, maximo = 4) => subida.array(campo, maximo);

const subirCampos = (campos) => subida.fields(campos);


// -----------------------------------------------------
// SLUG DE LA TIENDA ACTUAL
//
// Se usa para armar la carpeta del archivo. En rutas
// publicas ya viene resuelto; en rutas de admin el tenant
// sale del JWT y hay que buscarlo (viene cacheado).
// -----------------------------------------------------

async function slugDelTenant(req) {

    const tenantId = tenantDe(req);

    if (req.tenant?.id === tenantId) return req.tenant.slug;

    const tenant = await tenants.porId(tenantId);

    if (!tenant) {
        throw new Error(`El tenant ${tenantId} del token ya no existe`);
    }

    return tenant.slug;
}


// -----------------------------------------------------
// GUARDAR LO QUE LLEGO
//
// Devuelve [{ clave, mime, tamano, nombre_original }].
// La clave es lo que se guarda en la base; la URL la arma
// storage.url() cuando hay que mostrarla.
// -----------------------------------------------------

async function guardarImagenes(req, carpeta, opciones = {}) {

    const recibidos =
        req.files
            ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat())
            : (req.file ? [req.file] : []);

    if (recibidos.length === 0) return [];

    const tenantId = tenantDe(req);
    const tenantSlug = await slugDelTenant(req);

    const guardadas = [];

    for (const archivo of recibidos) {

        const { clave, tamano, mime } = await storage.guardar({
            carpeta,
            tenantSlug,
            buffer: archivo.buffer,
            mime: archivo.mimetype
        });

        // Registro para poder auditar y limpiar despues.
        await archivos.registrar(tenantId, {
            clave,
            driver: storage.nombre,
            nombreOriginal: archivo.originalname,
            mime,
            tamano,
            entidad: opciones.entidad || null,
            entidadId: opciones.entidadId || null,
            usuarioId: req.usuario?.usuario_id || null
        });

        guardadas.push({
            clave,
            mime,
            tamano,
            nombre_original: archivo.originalname,
            campo: archivo.fieldname
        });
    }

    return guardadas;
}


// -----------------------------------------------------
// BORRAR UNA IMAGEN
//
// Borra el archivo y su registro. No falla si alguno de los
// dos ya no esta: lo que importa es que despues no exista.
// -----------------------------------------------------

async function eliminarImagen(tenantId, clave) {

    if (!clave) return false;

    const borrado = await storage.eliminar(clave);

    await archivos.eliminarRegistro(tenantId, clave);

    return borrado;
}


module.exports = {
    subirImagen,
    subirImagenes,
    subirCampos,
    guardarImagenes,
    eliminarImagen,
    slugDelTenant
};

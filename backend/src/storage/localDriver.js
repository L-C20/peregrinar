// =====================================================
// DRIVER DE ALMACENAMIENTO · DISCO LOCAL
//
// Guarda los archivos en backend/uploads, en una carpeta
// por tipo y otra por tienda:
//
//   uploads/productos/editorial-peregrinar/1712-a3f9.jpg
//
// En la base se guarda solo la CLAVE
// ("productos/editorial-peregrinar/1712-a3f9.jpg").
// La URL la arma este driver. Por eso pasar a Cloudinary
// mas adelante no obliga a reescribir ninguna fila.
//
// Ojo para produccion: en Render el disco es efimero y lo
// que se sube se pierde en cada deploy. Esto sirve para
// desarrollo; antes de publicar hay que pasar a un driver
// externo (Etapa 12).
// =====================================================

const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const config = require("../config/env");
const { errores } = require("../utils/errores");


const RAIZ = path.resolve(
    __dirname,
    "../..",
    config.almacenamiento.carpeta
);


// Carpetas permitidas. Cerrado a proposito: la carpeta sale
// del codigo, nunca de algo que mande el cliente.
const CARPETAS = new Set([
    "productos",
    "categorias",
    "banners",
    "galerias",
    "apariencia",
    "paginas"
]);


// La extension se deduce del tipo de contenido, no del nombre
// del archivo que subieron. Un ".jpg" puede ser cualquier cosa.
const EXTENSIONES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/avif": ".avif",
    "image/x-icon": ".ico",
    "image/vnd.microsoft.icon": ".ico"
};


// Formato de una clave valida: carpeta/tienda/archivo.ext
const CLAVE_VALIDA =
    /^[a-z]+\/[a-z0-9]+(?:-[a-z0-9]+)*\/[A-Za-z0-9._-]+$/;


// -----------------------------------------------------
// RUTA ABSOLUTA DE UNA CLAVE
//
// Comprueba que la ruta resultante quede DENTRO de uploads.
// Sin esto, una clave con ".." podria escribir o borrar
// cualquier archivo del servidor.
// -----------------------------------------------------

function rutaDe(clave) {

    if (typeof clave !== "string" || !CLAVE_VALIDA.test(clave)) {
        throw errores.solicitudInvalida(`Clave de archivo inválida: ${clave}`);
    }

    const ruta = path.resolve(RAIZ, clave);

    if (ruta !== RAIZ && !ruta.startsWith(RAIZ + path.sep)) {
        throw errores.solicitudInvalida("Clave de archivo fuera de uploads");
    }

    return ruta;
}


// -----------------------------------------------------
// GUARDAR
// -----------------------------------------------------

async function guardar({ carpeta, tenantSlug, buffer, mime }) {

    if (!CARPETAS.has(carpeta)) {
        throw new Error(`Carpeta de almacenamiento desconocida: ${carpeta}`);
    }

    const extension = EXTENSIONES[mime];

    if (!extension) {
        throw errores.solicitudInvalida(
            "Formato de imagen no admitido. Usá JPG, PNG, WEBP, GIF o AVIF."
        );
    }

    const nombre =
        `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${extension}`;

    const clave = `${carpeta}/${tenantSlug}/${nombre}`;
    const ruta = rutaDe(clave);

    await fs.mkdir(path.dirname(ruta), { recursive: true });
    await fs.writeFile(ruta, buffer);

    return { clave, tamano: buffer.length, mime };
}


// -----------------------------------------------------
// ELIMINAR
// Que el archivo ya no este no es un error: el objetivo
// (que no exista) esta cumplido.
// -----------------------------------------------------

async function eliminar(clave) {

    try {
        await fs.unlink(rutaDe(clave));
        return true;

    } catch (falla) {
        if (falla.code === "ENOENT") return false;
        throw falla;
    }
}


async function existe(clave) {
    try {
        await fs.access(rutaDe(clave));
        return true;
    } catch {
        return false;
    }
}


// -----------------------------------------------------
// URL PUBLICA
//
// PUBLIC_URL vacio devuelve una ruta relativa, que sirve
// tanto en localhost como en produccion mientras Express
// sirva el frontend.
// -----------------------------------------------------

function url(clave) {

    if (!clave) return null;

    // Ya es una URL completa (archivos migrados de otro driver).
    if (/^https?:\/\//i.test(clave)) return clave;

    const base = config.urlPublica.replace(/\/+$/, "");

    return `${base}/uploads/${clave}`;
}


module.exports = {
    nombre: "local",
    guardar,
    eliminar,
    existe,
    url,
    RAIZ,
    CARPETAS,
    EXTENSIONES
};

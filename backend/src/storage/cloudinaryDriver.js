// =====================================================
// DRIVER DE ALMACENAMIENTO · CLOUDINARY
//
// Por qué hace falta en producción: en Render (y en casi
// cualquier hosting de este tipo) el disco es EFIMERO. Cada
// vez que se publica una versión nueva, el servidor arranca
// con el disco vacío. Con el driver local, todas las fotos
// que el cliente subió desaparecen en el siguiente deploy.
//
// La clave que se guarda en la base es el public_id de
// Cloudinary, con la misma forma que usa el driver local
// (carpeta/tienda/archivo). Por eso cambiar de uno al otro
// no obliga a reescribir ninguna fila: solo cambia quién
// arma la URL.
//
// No usa el SDK: son dos llamadas HTTP y el SDK traería
// decenas de dependencias para eso.
// =====================================================

const crypto = require("crypto");
const path = require("path");

const config = require("../config/env");
const logger = require("../utils/logger");
const { errores } = require("../utils/errores");
const { CARPETAS, EXTENSIONES } = require("./localDriver");


const API = "https://api.cloudinary.com/v1_1";
const ENTREGA = "https://res.cloudinary.com";


function ajustes() {
    return {
        nube: process.env.CLOUDINARY_CLOUD_NAME,
        clave: process.env.CLOUDINARY_API_KEY,
        secreto: process.env.CLOUDINARY_API_SECRET
    };
}


// -----------------------------------------------------
// FIRMA
//
// Cloudinary pide los parámetros ordenados alfabéticamente,
// unidos por &, con el api_secret pegado al final, y el
// SHA-1 de todo eso.
// -----------------------------------------------------

function firmar(parametros, secreto) {

    const texto = Object.keys(parametros)
        .sort()
        .map(clave => `${clave}=${parametros[clave]}`)
        .join("&");

    return crypto.createHash("sha1").update(texto + secreto).digest("hex");
}


async function llamar(nube, recurso, campos) {

    const cuerpo = new FormData();

    for (const [clave, valor] of Object.entries(campos)) {
        if (valor !== undefined && valor !== null) cuerpo.append(clave, valor);
    }

    const respuesta = await fetch(`${API}/${nube}/image/${recurso}`, {
        method: "POST",
        body: cuerpo
    });

    const datos = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
        const detalle = datos?.error?.message || `HTTP ${respuesta.status}`;
        logger.error("Cloudinary rechazó la operación", { recurso, detalle });
        throw new Error(`Cloudinary: ${detalle}`);
    }

    return datos;
}


// -----------------------------------------------------
// GUARDAR
// -----------------------------------------------------

async function guardar({ carpeta, tenantSlug, buffer, mime }) {

    const { nube, clave, secreto } = ajustes();

    if (!CARPETAS.has(carpeta)) {
        throw new Error(`Carpeta de almacenamiento desconocida: ${carpeta}`);
    }

    if (!EXTENSIONES[mime]) {
        throw errores.solicitudInvalida(
            "Formato de imagen no admitido. Usá JPG, PNG, WEBP, GIF o AVIF."
        );
    }

    // El public_id NO lleva extensión: Cloudinary la maneja aparte.
    const nombre = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    const publicId = `${carpeta}/${tenantSlug}/${nombre}`;

    const timestamp = Math.floor(Date.now() / 1000);

    const aFirmar = { public_id: publicId, timestamp };

    const respuesta = await llamar(nube, "upload", {
        file: `data:${mime};base64,${buffer.toString("base64")}`,
        public_id: publicId,
        timestamp: String(timestamp),
        api_key: clave,
        signature: firmar(aFirmar, secreto)
    });

    return {
        clave: respuesta.public_id || publicId,
        tamano: respuesta.bytes ?? buffer.length,
        mime
    };
}


// -----------------------------------------------------
// ELIMINAR
// -----------------------------------------------------

async function eliminar(claveArchivo) {

    if (!claveArchivo) return false;

    const { nube, clave, secreto } = ajustes();

    const timestamp = Math.floor(Date.now() / 1000);

    const respuesta = await llamar(nube, "destroy", {
        public_id: claveArchivo,
        timestamp: String(timestamp),
        api_key: clave,
        signature: firmar({ public_id: claveArchivo, timestamp }, secreto)
    });

    // "not found" no es un error: el objetivo era que no exista.
    return respuesta.result === "ok";
}


async function existe(claveArchivo) {

    if (!claveArchivo) return false;

    const respuesta = await fetch(url(claveArchivo), { method: "HEAD" });

    return respuesta.ok;
}


// -----------------------------------------------------
// URL DE ENTREGA
//
// f_auto: Cloudinary elige el mejor formato para cada
// navegador (WebP, AVIF). q_auto: comprime sin que se note.
// Es gratis y hace que la tienda cargue bastante más rápido
// que sirviendo el JPG original.
// -----------------------------------------------------

function url(claveArchivo) {

    if (!claveArchivo) return null;

    if (/^https?:\/\//i.test(claveArchivo)) return claveArchivo;

    // Imágenes que quedaron del driver local: se siguen sirviendo
    // desde el disco. Así se puede cambiar de driver sin migrar
    // todo de golpe.
    if (claveArchivo.startsWith("/uploads/")) return claveArchivo;

    const { nube } = ajustes();

    return `${ENTREGA}/${nube}/image/upload/f_auto,q_auto/${claveArchivo}`;
}


// -----------------------------------------------------
// VALIDACION AL ARRANCAR
// Mejor fallar acá que en la primera subida del cliente.
// -----------------------------------------------------

function comprobar() {

    const { nube, clave, secreto } = ajustes();

    const faltantes = [];
    if (!nube) faltantes.push("CLOUDINARY_CLOUD_NAME");
    if (!clave) faltantes.push("CLOUDINARY_API_KEY");
    if (!secreto) faltantes.push("CLOUDINARY_API_SECRET");

    if (faltantes.length > 0) {
        console.error(
            `\n[storage] STORAGE_DRIVER=cloudinary pero faltan variables:` +
            `\n          ${faltantes.join(", ")}\n`
        );
        process.exit(1);
    }
}


comprobar();


module.exports = {
    nombre: "cloudinary",
    guardar,
    eliminar,
    existe,
    url,
    CARPETAS,
    EXTENSIONES
};

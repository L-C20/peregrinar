// =====================================================
// ALMACENAMIENTO DE ARCHIVOS
//
// Punto unico por el que pasan todas las imagenes de la
// plataforma. El resto del codigo no sabe si estan en el
// disco, en Cloudinary o en S3: solo pide guardar, eliminar
// o la URL de una clave.
//
// Cambiar de almacenamiento = escribir un driver nuevo y
// cambiar STORAGE_DRIVER en el .env. Ningun controlador,
// ninguna ruta y ninguna fila de la base cambia.
//
// Uso:
//
//   const storage = require("../storage");
//
//   const { clave } = await storage.guardar({
//       carpeta: "productos",
//       tenantSlug: tenant.slug,
//       buffer: archivo.buffer,
//       mime: archivo.mimetype
//   });
//
//   storage.url(clave)   ->  /uploads/productos/.../abc.jpg
// =====================================================

const config = require("../config/env");
const logger = require("../utils/logger");

const localDriver = require("./localDriver");


const DRIVERS = {
    local: localDriver
    // cloudinary: require("./cloudinaryDriver")   ← Etapa 12
};


const driver = DRIVERS[config.almacenamiento.driver];

if (!driver) {
    console.error(
        `\n[storage] STORAGE_DRIVER="${config.almacenamiento.driver}" no existe.` +
        `\n          Disponibles: ${Object.keys(DRIVERS).join(", ")}\n`
    );
    process.exit(1);
}


// Aviso util: el disco local no sobrevive a un deploy de Render.
if (config.esProduccion && driver.nombre === "local") {
    logger.aviso(
        "STORAGE_DRIVER=local en producción: las imágenes subidas se " +
        "perderán en cada despliegue. Configurá un almacenamiento externo."
    );
}


module.exports = {

    nombre: driver.nombre,

    guardar: (opciones) => driver.guardar(opciones),

    eliminar: (clave) => driver.eliminar(clave),

    existe: (clave) => driver.existe(clave),

    url: (clave) => driver.url(clave),


    // Atajo para listados: agrega el campo <campo>_url a partir
    // de la clave guardada, sin pisar la clave original.
    //
    //   conUrl(producto, "imagen_principal")
    //   -> { ...producto, imagen_principal_url: "/uploads/..." }
    conUrl(registro, ...campos) {

        if (!registro) return registro;

        const salida = { ...registro };

        for (const campo of campos) {
            salida[`${campo}_url`] = driver.url(registro[campo]);
        }

        return salida;
    },


    conUrls(registros, ...campos) {
        return (registros || []).map(registro => this.conUrl(registro, ...campos));
    }

};

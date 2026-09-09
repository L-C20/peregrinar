// =====================================================
// ARRANQUE DEL SERVIDOR
// =====================================================

const fs = require("fs");
const path = require("path");
const config = require("./config/env");
const logger = require("./utils/logger");
const app = require("./app");
const { probarConexion, pool } = require("./database/connection");

// Se carga en el arranque a proposito: valida STORAGE_DRIVER y
// avisa si en produccion se quedo el disco local. Si esperara a
// la primera subida, el problema aparecería recién en producción.
const storage = require("./storage");

// En Railway, copiar frontend si no existe
const frontendSrc = path.resolve(__dirname, "../../frontend");
const frontendDst = path.resolve(__dirname, "../frontend");
if (fs.existsSync(frontendSrc) && !fs.existsSync(frontendDst)) {
    try {
        fs.cpSync(frontendSrc, frontendDst, { recursive: true });
        logger.info("Frontend copiado desde raíz del proyecto");
    } catch (e) {
        logger.aviso("No se pudo copiar frontend:", e.message);
    }
}


async function iniciar() {

    logger.info(`Iniciando peregrinar-platform (${config.entorno})`);
    logger.info(`Almacenamiento de archivos: ${storage.nombre}`);


    // La base puede no existir todavia: se avisa, no se aborta.
    const baseDatos = await probarConexion();

    if (baseDatos.conectada) {
        logger.info("Base de datos conectada");
    } else {
        logger.aviso(
            "Sin conexión a la base de datos. Ejecutá 'npm run migrate' cuando esté disponible.",
            { motivo: baseDatos.motivo }
        );
    }


    const servidor = app.listen(config.puerto, () => {
        logger.info(`Servidor escuchando en el puerto ${config.puerto}`);
    });


    // -------------------------------------------------
    // APAGADO ORDENADO
    // -------------------------------------------------

    const apagar = async (senal) => {
        logger.info(`Recibida señal ${senal}, cerrando servidor`);
        servidor.close(async () => {
            await pool.end();
            process.exit(0);
        });
    };

    process.on("SIGTERM", () => apagar("SIGTERM"));
    process.on("SIGINT", () => apagar("SIGINT"));

}


iniciar().catch((error) => {
    logger.error("No se pudo iniciar el servidor", { mensaje: error.message });
    process.exit(1);
});

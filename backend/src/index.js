// =====================================================
// ARRANQUE DEL SERVIDOR
// =====================================================

const config = require("./config/env");
const logger = require("./utils/logger");
const app = require("./app");
const { probarConexion, pool } = require("./database/connection");


async function iniciar() {

    logger.info(`Iniciando peregrinar-platform (${config.entorno})`);


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

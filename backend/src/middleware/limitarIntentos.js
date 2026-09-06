// =====================================================
// LIMITE DE INTENTOS DE LOGIN
//
// Sin esto, cualquiera puede probar contraseñas contra
// /api/auth/login todo el dia. bcrypt hace lenta cada
// prueba, pero no la impide.
//
// Cuenta por IP + email: asi un atacante que prueba mil
// contraseñas contra una cuenta queda frenado, y de paso
// no puede bloquear al dueño de una cuenta ajena fallando
// a proposito desde otra IP.
//
// Es en memoria, por proceso. Suficiente para el tamaño de
// esta plataforma; si algun dia corren varias instancias
// habra que moverlo a la base o a Redis.
// =====================================================

const { ErrorApp } = require("../utils/errores");
const logger = require("../utils/logger");


const VENTANA_MS = 15 * 60 * 1000;   // 15 minutos
const MAXIMO = 8;                    // intentos fallidos por ventana
const LIMPIEZA_MS = 5 * 60 * 1000;


const intentos = new Map();


function ahora() {
    return Date.now();
}


function clave(req) {
    const ip = req.ip || req.socket?.remoteAddress || "desconocida";
    const email = String(req.body?.email || "").trim().toLowerCase();
    return `${ip}|${email}`;
}


// -----------------------------------------------------
// LIMPIEZA PERIODICA
// unref() para que este intervalo no impida que el proceso
// termine cuando corresponde.
// -----------------------------------------------------

const limpieza = setInterval(() => {

    const limite = ahora() - VENTANA_MS;

    for (const [k, dato] of intentos) {
        if (dato.ultimo < limite) intentos.delete(k);
    }

}, LIMPIEZA_MS);

if (typeof limpieza.unref === "function") limpieza.unref();


// -----------------------------------------------------
// MIDDLEWARE
// -----------------------------------------------------

function limitarLogin(req, res, next) {

    const k = clave(req);
    const dato = intentos.get(k);

    if (dato && dato.fallos >= MAXIMO) {

        const restante = dato.ultimo + VENTANA_MS - ahora();

        if (restante > 0) {

            const minutos = Math.ceil(restante / 60000);

            res.set("Retry-After", String(Math.ceil(restante / 1000)));

            logger.aviso("Login bloqueado por demasiados intentos", {
                ip: req.ip,
                fallos: dato.fallos
            });

            return next(new ErrorApp(
                `Demasiados intentos fallidos. Probá de nuevo en ${minutos} ` +
                (minutos === 1 ? "minuto." : "minutos."),
                429
            ));
        }

        intentos.delete(k);
    }

    // El controlador avisa como salio el intento.
    req.registrarIntento = (exitoso) => {

        if (exitoso) {
            intentos.delete(k);
            return;
        }

        const actual = intentos.get(k) || { fallos: 0, ultimo: 0 };

        intentos.set(k, {
            fallos: actual.fallos + 1,
            ultimo: ahora()
        });
    };

    next();
}


// Para las pruebas y para el arranque.
function reiniciar() {
    intentos.clear();
}


module.exports = { limitarLogin, reiniciar, MAXIMO, VENTANA_MS };

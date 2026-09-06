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


// -----------------------------------------------------
// LIMITE POR IP PARA RUTAS PUBLICAS QUE ESCRIBEN
//
// Sin esto, /api/public/pedidos acepta mil pedidos falsos
// por minuto y le llena el panel de basura al cliente.
//
// Se cuentan DOS cosas distintas, y esa distinción importa:
//
//   - lo que se logró (un pedido creado): límite bajo, es
//     el abuso que de verdad molesta;
//   - lo que se intentó: límite alto, solo para que nadie
//     martille el servidor.
//
// Si se contaran juntos, alguien que se equivoca al escribir
// su email unas cuantas veces quedaría bloqueado sin haber
// hecho nada malo. El controlador avisa cuándo hubo éxito
// llamando a req.registrarUso().
//
//   router.post("/pedidos", limitarPorIp("pedidos", 8, 10 * 60000), ctrl.crear)
// -----------------------------------------------------

const porIp = new Map();


function limitarPorIp(nombre, maximo, ventanaMs, mensaje) {

    // Ocho veces el límite de éxitos: solo frena el martilleo.
    const maximoIntentos = maximo * 8;

    return function limitar(req, res, next) {

        const clave = `${nombre}|${req.ip || req.socket?.remoteAddress || "?"}`;
        const ahoraMs = ahora();

        let dato = porIp.get(clave);

        if (!dato || ahoraMs - dato.inicio > ventanaMs) {
            dato = { exitos: 0, intentos: 0, inicio: ahoraMs };
            porIp.set(clave, dato);
        }

        const bloqueado =
            dato.exitos >= maximo || dato.intentos >= maximoIntentos;

        if (bloqueado) {

            const restante = dato.inicio + ventanaMs - ahoraMs;
            res.set("Retry-After", String(Math.ceil(restante / 1000)));

            logger.aviso("Límite por IP alcanzado", {
                ruta: nombre, ip: req.ip,
                exitos: dato.exitos, intentos: dato.intentos
            });

            return next(new ErrorApp(
                mensaje || "Estás enviando demasiadas solicitudes seguidas. " +
                           "Esperá unos minutos.",
                429
            ));
        }

        dato.intentos++;

        // Lo llama el controlador solo si la operación salió bien.
        req.registrarUso = () => { dato.exitos++; };

        next();
    };
}


// Limpieza: la misma tarea que ya corre para los logins.
setInterval(() => {
    const limite = ahora() - 60 * 60 * 1000;
    for (const [k, dato] of porIp) {
        if (dato.inicio < limite) porIp.delete(k);
    }
}, LIMPIEZA_MS).unref?.();


// Para las pruebas y para el arranque.
function reiniciar() {
    intentos.clear();
    porIp.clear();
}


module.exports = { limitarLogin, limitarPorIp, reiniciar, MAXIMO, VENTANA_MS };

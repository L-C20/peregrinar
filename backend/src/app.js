// =====================================================
// APLICACION EXPRESS
// Configura middlewares, archivos estaticos y rutas.
// El arranque del servidor esta en index.js.
// =====================================================

const path = require("path");
const express = require("express");
const cors = require("cors");

const config = require("./config/env");
const logger = require("./utils/logger");
const rutasApi = require("./routes");

const {
    rutaNoEncontrada,
    manejadorErrores
} = require("./middleware/errorHandler");


const app = express();

const fs = require("fs");

// Buscar frontend en múltiples ubicaciones
const posiblesFrontend = [
    path.resolve(__dirname, "../../frontend"),     // Local: proyecto/frontend
    path.join(__dirname, "../frontend"),            // Railway con rootDir=backend
    path.resolve(__dirname, "../../../frontend"),   // Railway rootDir=.
];

let FRONTEND = posiblesFrontend[0];
for (const ubicacion of posiblesFrontend) {
    if (fs.existsSync(ubicacion)) {
        FRONTEND = ubicacion;
        break;
    }
}

console.log("[DEBUG] FRONTEND resuelto a:", FRONTEND);

const UPLOADS = path.join(__dirname, "..", config.almacenamiento.carpeta);


// -----------------------------------------------------
// DETRAS DE UN PROXY
//
// En Render y Railway la petición llega por un proxy. Sin
// esto, req.ip es siempre la IP del proxy: el límite de
// intentos de login y el de pedidos contarían a todos los
// visitantes como si fueran una sola persona, y el primero
// que fallara ocho veces dejaría afuera a todo el mundo.
//
// Un solo proxy de confianza, el del hosting.
// -----------------------------------------------------

if (config.esProduccion) app.set("trust proxy", 1);


// -----------------------------------------------------
// CABECERAS DE SEGURIDAD
//
// Se escriben a mano en vez de sumar una dependencia: son
// seis cabeceras y así se ve exactamente qué se manda.
// -----------------------------------------------------

app.use((req, res, next) => {

    // No adivinar el tipo de un archivo por su contenido: evita que
    // algo subido como imagen se termine ejecutando como script.
    res.set("X-Content-Type-Options", "nosniff");

    // No se puede meter la tienda ni el panel dentro de un iframe.
    res.set("X-Frame-Options", "DENY");

    res.set("Referrer-Policy", "strict-origin-when-cross-origin");

    // Nada de cámara, micrófono ni ubicación.
    res.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

    if (config.esProduccion) {
        // Solo por HTTPS, durante un año.
        res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }

    // Qué puede cargar la página y desde dónde.
    //
    // 'unsafe-inline' en estilos es necesario: la apariencia de cada
    // tienda se aplica escribiendo variables CSS en el documento.
    // En scripts también en desarrollo: los formularios usan event handlers.
    if (config.esProduccion) {
        res.set("Content-Security-Policy", [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: blob: https:",
            "connect-src 'self'",
            "frame-src https:",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "object-src 'none'"
        ].join("; "));
    } else {
        // En desarrollo, permitir scripts inline para formularios dinámicos
        res.set("Content-Security-Policy", [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: blob: https:",
            "connect-src 'self'",
            "frame-src https:",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "object-src 'none'"
        ].join("; "));
    }

    next();
});


// -----------------------------------------------------
// CORS
// Sin CORS_ORIGINS solo se acepta el mismo origen, que es
// lo correcto cuando Express sirve tambien el frontend.
// -----------------------------------------------------

const origenes = config.seguridad.corsOrigenes;

app.use(cors({
    origin: origenes.length > 0 ? origenes : false,
    credentials: true
}));


// -----------------------------------------------------
// CUERPO DE LAS PETICIONES
// -----------------------------------------------------

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));


// -----------------------------------------------------
// REGISTRO DE PETICIONES
// -----------------------------------------------------

app.use((req, res, next) => {

    if (!req.path.startsWith("/api")) return next();

    const inicio = Date.now();

    res.on("finish", () => {
        logger.info(
            `${req.method} ${req.originalUrl} ${res.statusCode} (${Date.now() - inicio}ms)`
        );
    });

    next();
});


// -----------------------------------------------------
// API
// -----------------------------------------------------

app.use("/api", rutasApi);


// -----------------------------------------------------
// ARCHIVOS ESTATICOS
//
// /uploads  imagenes subidas desde el panel
// /shared   codigo compartido entre tienda y panel
// /assets   imagenes fijas del proyecto
// /admin    panel administrativo
// /login    autenticacion
// /         tienda publica
// -----------------------------------------------------

const PUBLICO = path.join(FRONTEND, "publico");

app.use("/uploads", express.static(UPLOADS, { maxAge: "7d" }));
app.use("/shared", express.static(path.join(FRONTEND, "shared")));
app.use("/assets", express.static(path.join(FRONTEND, "assets"), { maxAge: "7d" }));
app.use("/admin", express.static(path.join(FRONTEND, "admin")));
app.use("/auth", express.static(path.join(FRONTEND, "auth")));
app.use("/landing", express.static(path.join(FRONTEND, "landing")));
app.use(express.static(PUBLICO));


// -----------------------------------------------------
// DIRECCIONES DE LA TIENDA
//
// Sin esto las páginas serían /producto.html?slug=biblia.
// Se sirve el mismo archivo y el JavaScript lee el dato de
// la dirección, así el comprador comparte un enlace legible
// y los buscadores lo indexan mejor.
//
// Van DESPUES de express.static para que un archivo real
// siempre gane.
// -----------------------------------------------------

const pagina = (archivo) =>
    (req, res) => res.sendFile(path.join(PUBLICO, archivo));

app.get("/catalogo", pagina("catalogo.html"));
app.get("/producto/:slug", pagina("producto.html"));
app.get("/p/:clave", pagina("pagina.html"));
app.get("/preguntas-frecuentes", pagina("faq.html"));
app.get("/contacto", pagina("contacto.html"));
app.get("/carrito", pagina("carrito.html"));

// Autenticación
app.get("/login", (req, res) =>
    res.sendFile(path.join(FRONTEND, "auth", "index.html"))
);
app.get("/auth/pago-confirmado", (req, res) =>
    res.sendFile(path.join(FRONTEND, "auth", "pago-confirmado.html"))
);
app.get("/auth/pago-fallido", (req, res) =>
    res.sendFile(path.join(FRONTEND, "auth", "pago-fallido.html"))
);


// -----------------------------------------------------
// ERRORES
// -----------------------------------------------------

app.use("/api", rutaNoEncontrada);
app.use(rutaNoEncontrada);
app.use(manejadorErrores);


module.exports = app;

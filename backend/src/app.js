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

const RAIZ = path.join(__dirname, "../..");
const FRONTEND = path.join(RAIZ, "frontend");
const UPLOADS = path.join(__dirname, "..", config.almacenamiento.carpeta);


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

app.use("/uploads", express.static(UPLOADS, { maxAge: "7d" }));
app.use("/shared", express.static(path.join(FRONTEND, "shared")));
app.use("/assets", express.static(path.join(FRONTEND, "assets"), { maxAge: "7d" }));
app.use("/admin", express.static(path.join(FRONTEND, "admin")));
app.use("/login", express.static(path.join(FRONTEND, "auth")));
app.use(express.static(path.join(FRONTEND, "publico")));


// -----------------------------------------------------
// ERRORES
// -----------------------------------------------------

app.use("/api", rutaNoEncontrada);
app.use(rutaNoEncontrada);
app.use(manejadorErrores);


module.exports = app;

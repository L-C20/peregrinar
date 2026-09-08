// =====================================================
// CONFIGURACION POR ENTORNO
// Unico lugar del backend que lee process.env.
// Si falta una variable critica el servidor no arranca.
// =====================================================

const path = require("path");

require("dotenv").config({
    path: path.join(__dirname, "../../.env")
});


// -----------------------------------------------------
// HELPERS
// -----------------------------------------------------

function texto(nombre, porDefecto = "") {
    const valor = process.env[nombre];
    return valor === undefined || valor === "" ? porDefecto : valor.trim();
}

function numero(nombre, porDefecto) {
    const valor = Number(process.env[nombre]);
    return Number.isFinite(valor) ? valor : porDefecto;
}

function booleano(nombre, porDefecto = false) {
    const valor = texto(nombre);
    if (valor === "") return porDefecto;
    return ["true", "1", "si", "yes"].includes(valor.toLowerCase());
}

function lista(nombre) {
    return texto(nombre)
        .split(",")
        .map(item => item.trim())
        .filter(Boolean);
}


// -----------------------------------------------------
// CONFIGURACION
// -----------------------------------------------------

const config = {

    entorno: texto("NODE_ENV", "development"),
    puerto: numero("PORT", 3000),
    urlPublica: texto("PUBLIC_URL"),

    baseDatos: {
        url: texto("DATABASE_URL"),
        ssl: booleano("DATABASE_SSL", false)
    },

    seguridad: {
        jwtSecret: texto("JWT_SECRET"),
        jwtExpiracion: texto("JWT_EXPIRES_IN", "8h"),
        bcryptRounds: numero("BCRYPT_ROUNDS", 12),
        corsOrigenes: lista("CORS_ORIGINS")
    },

    multiTenant: {
        // Tenant de la tienda publica cuando el dominio no esta registrado.
        slugPorDefecto: texto("DEFAULT_TENANT_SLUG", "editorial-peregrinar")
    },

    almacenamiento: {
        driver: texto("STORAGE_DRIVER", "local"),
        carpeta: texto("UPLOADS_DIR", "uploads"),
        maxMB: numero("MAX_UPLOAD_MB", 5)
    },

    mercadopago: {
        accessToken: texto("MERCADOPAGO_ACCESS_TOKEN"),
        publicKey: texto("MERCADOPAGO_PUBLIC_KEY")
    }

};


// -----------------------------------------------------
// VALIDACION
// -----------------------------------------------------

const faltantes = [];

if (!config.baseDatos.url) faltantes.push("DATABASE_URL");
if (!config.seguridad.jwtSecret) faltantes.push("JWT_SECRET");

if (faltantes.length > 0) {
    console.error("\n[config] Faltan variables de entorno obligatorias:");
    faltantes.forEach(nombre => console.error("  - " + nombre));
    console.error("\nCopiá backend/.env.example a backend/.env y completá los valores.\n");
    process.exit(1);
}

if (
    config.entorno === "production" &&
    config.seguridad.jwtSecret.length < 32
) {
    console.error("\n[config] JWT_SECRET es demasiado corto para producción (mínimo 32 caracteres).\n");
    process.exit(1);
}


config.esProduccion = config.entorno === "production";


module.exports = config;

// =====================================================
// RUNNER DE MIGRACIONES
//
//   npm run migrate              aplica las migraciones pendientes
//   npm run migrate -- --estado  muestra el estado sin aplicar nada
//
// Reglas:
//   - Cada archivo de migrations/ se ejecuta UNA sola vez.
//   - Cada uno corre dentro de una transaccion: si falla, no
//     queda aplicado a medias.
//   - Se guarda el checksum del archivo. Si una migracion ya
//     aplicada se modifica, el runner se detiene: los cambios
//     de esquema van en una migracion nueva, nunca editando
//     una vieja.
// =====================================================

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Client } = require("pg");

const config = require("../config/env");

const CARPETA = path.join(__dirname, "migrations");


// -----------------------------------------------------
// SALIDA
// -----------------------------------------------------

const linea = (texto = "") => console.log(texto);
const ok = (texto) => console.log(`  ✓ ${texto}`);
const info = (texto) => console.log(`  • ${texto}`);
const error = (texto) => console.error(`  ✗ ${texto}`);


// -----------------------------------------------------
// CONEXION
// -----------------------------------------------------

function opcionesConexion(baseDatos = null) {

    const url = new URL(config.baseDatos.url);

    if (baseDatos) url.pathname = `/${baseDatos}`;

    return {
        connectionString: url.toString(),
        ssl: config.baseDatos.ssl ? { rejectUnauthorized: false } : false
    };
}


function nombreBaseDatos() {
    return decodeURIComponent(
        new URL(config.baseDatos.url).pathname.replace(/^\//, "")
    );
}


// -----------------------------------------------------
// CREAR LA BASE SI NO EXISTE
// Se conecta a la base "postgres" para poder crearla.
// -----------------------------------------------------

async function asegurarBaseDatos() {

    const nombre = nombreBaseDatos();

    const cliente = new Client(opcionesConexion(nombre));

    try {
        await cliente.connect();
        await cliente.end();
        return false;

    } catch (falla) {

        // 3D000 = la base no existe. Cualquier otro error se propaga.
        if (falla.code !== "3D000") throw falla;
    }

    const administrador = new Client(opcionesConexion("postgres"));

    await administrador.connect();

    // CREATE DATABASE no admite parametros: el nombre se escapa
    // como identificador duplicando las comillas dobles.
    const identificador = nombre.split('"').join('""');

    await administrador.query(`CREATE DATABASE "${identificador}"`);

    await administrador.end();

    return true;
}


// -----------------------------------------------------
// TABLA DE CONTROL
// -----------------------------------------------------

async function asegurarTablaControl(cliente) {

    await cliente.query(`
        CREATE TABLE IF NOT EXISTS migraciones (
            id           SERIAL PRIMARY KEY,
            nombre       TEXT NOT NULL UNIQUE,
            checksum     TEXT NOT NULL,
            ejecutada_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
}


// -----------------------------------------------------
// ARCHIVOS DE MIGRACION
// -----------------------------------------------------

function leerMigraciones() {

    if (!fs.existsSync(CARPETA)) return [];

    return fs.readdirSync(CARPETA)
        .filter(nombre => nombre.endsWith(".sql"))
        .sort()
        .map(nombre => {

            const contenido = fs.readFileSync(
                path.join(CARPETA, nombre),
                "utf8"
            );

            // Se normalizan los saltos de linea para que el checksum
            // no cambie entre Windows y Linux.
            const normalizado = contenido.split("\r\n").join("\n");

            return {
                nombre,
                contenido,
                checksum: crypto
                    .createHash("sha256")
                    .update(normalizado)
                    .digest("hex")
            };
        });
}


// -----------------------------------------------------
// PROCESO
// -----------------------------------------------------

async function migrar({ soloEstado = false } = {}) {

    const migraciones = leerMigraciones();

    if (migraciones.length === 0) {
        info("No hay archivos de migración en src/database/migrations");
        return;
    }


    if (!soloEstado) {
        const creada = await asegurarBaseDatos();
        if (creada) ok(`Base de datos "${nombreBaseDatos()}" creada`);
    }


    const cliente = new Client(opcionesConexion());

    await cliente.connect();


    try {

        await asegurarTablaControl(cliente);

        const aplicadas = new Map(
            (await cliente.query("SELECT nombre, checksum FROM migraciones"))
                .rows.map(fila => [fila.nombre, fila.checksum])
        );


        // -------------------------------------------------
        // VERIFICAR QUE NADIE EDITO UNA MIGRACION APLICADA
        // -------------------------------------------------

        const modificadas = migraciones.filter(
            migracion =>
                aplicadas.has(migracion.nombre) &&
                aplicadas.get(migracion.nombre) !== migracion.checksum
        );

        if (modificadas.length > 0) {
            linea();
            error("Hay migraciones ya aplicadas que fueron modificadas:");
            modificadas.forEach(m => error(`    ${m.nombre}`));
            linea();
            linea("  Una migración aplicada no se edita. Creá una migración nueva");
            linea("  con el cambio, o borrá la base de desarrollo y volvé a migrar.");
            linea();
            process.exitCode = 1;
            return;
        }


        const pendientes = migraciones.filter(
            migracion => !aplicadas.has(migracion.nombre)
        );


        // -------------------------------------------------
        // SOLO INFORMAR
        // -------------------------------------------------

        if (soloEstado) {
            linea();

            migraciones.forEach(migracion => {
                const estado = aplicadas.has(migracion.nombre)
                    ? "✓ aplicada "
                    : "○ pendiente";
                linea(`  ${estado}  ${migracion.nombre}`);
            });

            linea();
            info(`${aplicadas.size} aplicadas · ${pendientes.length} pendientes`);
            return;
        }


        if (pendientes.length === 0) {
            ok("La base de datos ya está actualizada");
            return;
        }


        // -------------------------------------------------
        // APLICAR
        // -------------------------------------------------

        for (const migracion of pendientes) {

            const inicio = Date.now();

            try {
                await cliente.query("BEGIN");
                await cliente.query(migracion.contenido);

                await cliente.query(
                    "INSERT INTO migraciones (nombre, checksum) VALUES ($1, $2)",
                    [migracion.nombre, migracion.checksum]
                );

                await cliente.query("COMMIT");

                ok(`${migracion.nombre}  (${Date.now() - inicio}ms)`);

            } catch (falla) {
                await cliente.query("ROLLBACK");
                linea();
                error(`Falló ${migracion.nombre}`);
                error(falla.message);
                if (falla.detail) error(falla.detail);
                if (falla.hint) linea(`    Sugerencia: ${falla.hint}`);
                linea();
                throw falla;
            }
        }

        linea();
        ok(`${pendientes.length} migración(es) aplicada(s)`);

    } finally {
        await cliente.end();
    }
}


// -----------------------------------------------------
// ENTRADA
// -----------------------------------------------------

if (require.main === module) {

    const soloEstado = process.argv.includes("--estado");

    linea();
    linea(soloEstado
        ? "Estado de las migraciones"
        : `Migrando ${nombreBaseDatos()}`);
    linea();

    migrar({ soloEstado })
        .then(() => linea())
        .catch((falla) => {

            const conocidos = {
                "28P01": "Usuario o contraseña incorrectos en DATABASE_URL",
                ECONNREFUSED: "No hay ningún PostgreSQL escuchando en la dirección de DATABASE_URL",
                ENOTFOUND: "El host de DATABASE_URL no existe o no es alcanzable",
                "42501": "El usuario de DATABASE_URL no tiene permisos suficientes"
            };

            error(conocidos[falla.code] || falla.message || `Error ${falla.code}`);
            linea();
            process.exit(1);
        });
}


module.exports = migrar;

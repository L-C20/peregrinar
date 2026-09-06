// =====================================================
// BASE DE DATOS DE DESARROLLO
//
//   npm run bd:iniciar    levanta el PostgreSQL del proyecto
//   npm run bd:detener    lo apaga
//   npm run bd:estado     dice si está corriendo
//   npm run bd:borrar     lo elimina entero
//
// Crea un servidor PostgreSQL propio, dentro de la carpeta
// del proyecto, en el puerto 5433 y SIN contraseña.
//
// Por qué uno propio en vez de usar el que ya está
// instalado: así no hace falta acordarse de la contraseña
// del usuario postgres, no se toca la configuración de la
// instalación de la máquina, y borrar la base de desarrollo
// es borrar una carpeta.
//
// SIN CONTRASEÑA ESTÁ BIEN ACÁ y estaría muy mal en
// producción: solo acepta conexiones desde esta misma
// computadora y solo tiene datos de prueba. En producción
// la base es la de Render o Railway, con su contraseña.
// =====================================================

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");


const PUERTO = 5433;

// Fuera de src/ y de todo lo que se versiona.
const DATOS = path.join(__dirname, "..", "..", ".datos-postgres");
const REGISTRO = path.join(DATOS, "postgres.log");


const linea = (t = "") => console.log(t);
const ok = (t) => console.log(`  ✓ ${t}`);
const info = (t) => console.log(`  • ${t}`);
const error = (t) => console.error(`  ✗ ${t}`);


// -----------------------------------------------------
// ENCONTRAR POSTGRESQL
// -----------------------------------------------------

function carpetaBinarios() {

    if (process.env.PG_BIN) return process.env.PG_BIN;

    // Windows: la instalación estándar, versión más nueva primero.
    const raiz = "C:\\Program Files\\PostgreSQL";

    if (fs.existsSync(raiz)) {
        const versiones = fs.readdirSync(raiz)
            .filter(v => /^\d+$/.test(v))
            .sort((a, b) => Number(b) - Number(a));

        for (const version of versiones) {
            const bin = path.join(raiz, version, "bin");
            if (fs.existsSync(path.join(bin, "pg_ctl.exe"))) return bin;
        }
    }

    // Linux y Mac: suele estar en el PATH.
    const cual = spawnSync(process.platform === "win32" ? "where" : "which",
                           ["pg_ctl"], { encoding: "utf8" });

    if (cual.status === 0) return path.dirname(cual.stdout.split("\n")[0].trim());

    return null;
}


const BIN = carpetaBinarios();


function ejecutar(programa, args, opciones = {}) {
    return spawnSync(path.join(BIN, programa), args, {
        encoding: "utf8", ...opciones
    });
}


function existeCluster() {
    return fs.existsSync(path.join(DATOS, "PG_VERSION"));
}


function corriendo() {
    const r = ejecutar("pg_ctl", ["-D", DATOS, "status"]);
    return r.status === 0;
}


// -----------------------------------------------------
// ACCIONES
// -----------------------------------------------------

function iniciar() {

    if (!existeCluster()) {

        info("Creando la base de datos de desarrollo (esto tarda un momento)…");

        fs.mkdirSync(DATOS, { recursive: true });

        // --auth=trust: sin contraseña. Solo local, solo datos de prueba.
        const r = ejecutar("initdb", [
            "-D", DATOS, "-U", "postgres",
            "--auth-local=trust", "--auth-host=trust",
            "-E", "UTF8"
        ], { stdio: "ignore" });

        if (r.status !== 0) {
            error("No se pudo crear la base de datos");
            process.exit(1);
        }

        ok("Base de datos creada");
    }

    if (corriendo()) {
        info(`Ya estaba corriendo en el puerto ${PUERTO}`);
        return;
    }

    const r = ejecutar("pg_ctl", [
        "-D", DATOS, "-l", REGISTRO, "-o", `-p ${PUERTO}`, "-w", "start"
    ], { stdio: "ignore" });

    if (r.status !== 0) {
        error("No se pudo iniciar. Mirá el registro:");
        linea(`    ${REGISTRO}`);
        process.exit(1);
    }

    ok(`PostgreSQL corriendo en el puerto ${PUERTO}`);
    linea();
    linea("  Si es la primera vez, ahora:");
    linea("    npm run migrate");
    linea("    npm run seed");
}


function detener() {

    if (!existeCluster() || !corriendo()) {
        info("No estaba corriendo");
        return;
    }

    ejecutar("pg_ctl", ["-D", DATOS, "-m", "fast", "stop"], { stdio: "ignore" });
    ok("PostgreSQL detenido");
}


function estado() {

    if (!existeCluster()) {
        info("Todavía no existe. Creala con: npm run bd:iniciar");
        return;
    }

    if (corriendo()) ok(`Corriendo en el puerto ${PUERTO}`);
    else info("Existe pero está apagada. Encendela con: npm run bd:iniciar");
}


function borrar() {

    if (!process.argv.includes("--si")) {
        error("Esto borra la base de desarrollo entera, con todos sus datos.");
        linea();
        linea("  Si estás seguro:  npm run bd:borrar -- --si");
        linea();
        process.exit(1);
    }

    detener();
    fs.rmSync(DATOS, { recursive: true, force: true });
    ok("Base de desarrollo eliminada");
}


// -----------------------------------------------------
// ENTRADA
// -----------------------------------------------------

const ACCIONES = { iniciar, detener, estado, borrar };

const accion = process.argv[2];

linea();

if (!BIN) {
    error("No encontré PostgreSQL en esta computadora.");
    linea();
    linea("  Instalalo desde postgresql.org, o indicá dónde está:");
    linea("    PG_BIN=\"C:/ruta/a/postgresql/bin\" npm run bd:iniciar");
    linea();
    process.exit(1);
}

if (!ACCIONES[accion]) {
    linea("  Uso: npm run bd:iniciar | bd:detener | bd:estado | bd:borrar");
    linea();
    process.exit(1);
}

ACCIONES[accion]();
linea();

// =====================================================
// LECTURA DE ARGUMENTOS DE LINEA DE COMANDOS
//
// Admite  --clave valor  y  --clave=valor.
// Una --bandera sin valor queda como true.
// =====================================================

function leerArgumentos(argv = process.argv.slice(2)) {

    const opciones = {};

    for (let i = 0; i < argv.length; i++) {

        const actual = argv[i];

        if (!actual.startsWith("--")) continue;

        const sinGuiones = actual.slice(2);

        // --clave=valor
        if (sinGuiones.includes("=")) {
            const separador = sinGuiones.indexOf("=");
            opciones[sinGuiones.slice(0, separador)] =
                sinGuiones.slice(separador + 1);
            continue;
        }

        const siguiente = argv[i + 1];

        // --bandera  (sin valor)
        if (siguiente === undefined || siguiente.startsWith("--")) {
            opciones[sinGuiones] = true;
            continue;
        }

        // --clave valor
        opciones[sinGuiones] = siguiente;
        i++;
    }

    return opciones;
}


// Salida compartida por los scripts.
const linea = (texto = "") => console.log(texto);
const ok = (texto) => console.log(`  ✓ ${texto}`);
const info = (texto) => console.log(`  • ${texto}`);
const error = (texto) => console.error(`  ✗ ${texto}`);


// Recuadro para mostrar credenciales una sola vez.
function mostrarCredenciales({ titulo, email, password, generada, extra = [] }) {

    linea();
    linea("  ─────────────────────────────────────────────");
    linea(`   ${titulo}`);
    linea("  ─────────────────────────────────────────────");
    extra.forEach(item => linea(`   ${item}`));
    linea(`   Email:      ${email}`);
    linea(`   Contraseña: ${password}`);
    linea("  ─────────────────────────────────────────────");

    if (generada) {
        linea();
        linea("   Esta contraseña se generó al azar y no queda guardada en");
        linea("   ningún lado. Copiala ahora; después solo se puede cambiar.");
    }

    linea();
}


// Traduce los errores mas comunes de PostgreSQL.
function explicarFalla(falla) {

    const conocidos = {
        "28P01": "Usuario o contraseña incorrectos en DATABASE_URL",
        "3D000": "La base de datos no existe. Ejecutá primero: npm run migrate",
        "42P01": "Faltan tablas. Ejecutá primero: npm run migrate",
        ECONNREFUSED: "No hay ningún PostgreSQL escuchando en la dirección de DATABASE_URL"
    };

    if (falla.code === "23505") {
        return "Ya existe un registro con esos datos (identificador, dominio o email repetido)";
    }

    return conocidos[falla.code] || falla.message;
}


module.exports = {
    leerArgumentos,
    linea,
    ok,
    info,
    error,
    mostrarCredenciales,
    explicarFalla
};

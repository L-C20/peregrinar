// =====================================================
// CREAR UN USUARIO
//
// Administrador o empleado de una tienda:
//
//   npm run crear-usuario -- \
//       --tenant editorial-peregrinar \
//       --nombre "Juan Gómez" \
//       --email juan@editorialperegrinar.com \
//       --rol empleado
//
// Superadmin de la plataforma (no pertenece a ninguna tienda):
//
//   npm run crear-usuario -- --superadmin \
//       --nombre "Lucas" --email lucas@ejemplo.com
//
// La contraseña se genera al azar y se muestra una sola vez.
// Nunca hay una contraseña escrita en el codigo.
// =====================================================

const { pool } = require("../src/database/connection");
const { crearUsuario } = require("../src/services/usuarios");
const tenants = require("../src/repositories/tenants");

const {
    leerArgumentos, linea, ok, error,
    mostrarCredenciales, explicarFalla
} = require("./_argumentos");


const ROLES_DE_TIENDA = ["admin", "empleado"];


function ayuda() {
    linea();
    linea("  Crear un usuario");
    linea();
    linea("    npm run crear-usuario -- --tenant editorial-peregrinar \\");
    linea("                             --nombre \"Juan Gómez\" \\");
    linea("                             --email juan@ejemplo.com \\");
    linea("                             --rol empleado");
    linea();
    linea("    npm run crear-usuario -- --superadmin \\");
    linea("                             --nombre \"Lucas\" --email lucas@ejemplo.com");
    linea();
    linea("  Obligatorios:");
    linea("    --nombre       Nombre de la persona");
    linea("    --email        Email con el que va a entrar");
    linea("    --tenant       Identificador de la tienda (o usar --superadmin)");
    linea();
    linea("  Opcionales:");
    linea("    --rol          admin (por defecto) o empleado");
    linea("    --superadmin   Usuario de plataforma, sin tienda");
    linea("    --password     Si no se indica, se genera una al azar");
    linea();
}


async function principal() {

    const args = leerArgumentos();

    if (args.ayuda || args.help || args.h) {
        ayuda();
        return;
    }

    const esSuperadmin = args.superadmin === true;

    const faltantes = ["nombre", "email"]
        .filter(clave => !args[clave] || args[clave] === true);

    if (!esSuperadmin && (!args.tenant || args.tenant === true)) {
        faltantes.push("tenant");
    }

    if (faltantes.length > 0) {
        error(`Faltan datos: ${faltantes.map(f => "--" + f).join(", ")}`);
        linea("  (para un usuario de plataforma usá --superadmin en vez de --tenant)");
        ayuda();
        process.exit(1);
    }


    const rol = esSuperadmin
        ? "superadmin"
        : (args.rol && args.rol !== true ? args.rol : "admin");

    if (!esSuperadmin && !ROLES_DE_TIENDA.includes(rol)) {
        error(`Rol desconocido: "${rol}". Usá admin o empleado.`);
        process.exit(1);
    }


    // ---------- TIENDA ----------

    let tenant = null;

    if (!esSuperadmin) {

        tenant = await tenants.porSlug(args.tenant);

        if (!tenant) {
            error(`No existe ninguna tienda con el identificador "${args.tenant}"`);
            linea();
            linea("  Para ver las tiendas cargadas:");
            linea("    psql \"$DATABASE_URL\" -c \"SELECT nombre, slug FROM tenants\"");
            linea();
            process.exit(1);
        }
    }


    linea();
    linea(esSuperadmin
        ? "Creando un superadmin de plataforma"
        : `Creando un usuario en "${tenant.nombre}"`);
    linea();


    const credenciales = await crearUsuario({
        tenantId: tenant ? tenant.id : null,
        nombre: args.nombre,
        email: args.email,
        rol,
        password: args.password && args.password !== true ? args.password : null
    });


    ok(`Usuario ${credenciales.usuario.email} creado con rol ${rol}`);

    if (rol === "empleado") {
        linea();
        linea("  El empleado todavía no tiene permisos asignados: hasta que se");
        linea("  le den desde el panel, va a entrar y no va a poder hacer nada.");
    }


    mostrarCredenciales({
        titulo: esSuperadmin ? "ACCESO DE PLATAFORMA" : "ACCESO AL PANEL",
        extra: tenant ? [`Tienda:     ${tenant.nombre}`] : ["Alcance:    toda la plataforma"],
        email: credenciales.usuario.email,
        password: credenciales.password,
        generada: credenciales.generada
    });
}


principal()
    .catch((falla) => {
        linea();
        error(explicarFalla(falla));
        linea();
        process.exitCode = 1;
    })
    .finally(() => pool.end());

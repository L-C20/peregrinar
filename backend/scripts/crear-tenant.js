// =====================================================
// CREAR UNA TIENDA NUEVA
//
//   npm run crear-tenant -- \
//       --nombre "Librería Central" \
//       --slug libreria-central \
//       --dominio libreriacentral.com \
//       --admin-nombre "Ana Pérez" \
//       --admin-email ana@libreriacentral.com
//
// Crea la tienda con toda su configuracion inicial y su
// primer administrador, todo dentro de una transaccion: si
// algo falla no queda una tienda a medio crear.
//
// La contraseña del administrador se genera al azar y se
// muestra una sola vez. Se puede fijar con --admin-password,
// pero queda en el historial de la terminal.
// =====================================================

const { pool, transaccion } = require("../src/database/connection");
const { crearTenant } = require("../src/services/tenants");
const { crearUsuario } = require("../src/services/usuarios");

const {
    leerArgumentos, linea, ok, error,
    mostrarCredenciales, explicarFalla
} = require("./_argumentos");


function ayuda() {
    linea();
    linea("  Crear una tienda nueva");
    linea();
    linea("    npm run crear-tenant -- --nombre \"Librería Central\" \\");
    linea("                            --slug libreria-central \\");
    linea("                            --admin-email ana@libreriacentral.com");
    linea();
    linea("  Obligatorios:");
    linea("    --nombre        Nombre visible de la tienda");
    linea("    --slug          Identificador en minúsculas con guiones");
    linea("    --admin-email   Email del primer administrador");
    linea();
    linea("  Opcionales:");
    linea("    --dominio        Dominio propio (se puede repetir la opción)");
    linea("    --plan           basico por defecto");
    linea("    --admin-nombre   \"Administrador\" por defecto");
    linea("    --admin-password Si no se indica, se genera una al azar");
    linea();
}


async function principal() {

    const args = leerArgumentos();

    if (args.ayuda || args.help || args.h) {
        ayuda();
        return;
    }

    const faltantes = ["nombre", "slug", "admin-email"]
        .filter(clave => !args[clave] || args[clave] === true);

    if (faltantes.length > 0) {
        error(`Faltan datos: ${faltantes.map(f => "--" + f).join(", ")}`);
        ayuda();
        process.exit(1);
    }


    // --dominio se puede pasar varias veces o separado por comas.
    const dominios = String(args.dominio || "")
        .split(",")
        .map(d => d.trim())
        .filter(Boolean);


    linea();
    linea(`Creando la tienda "${args.nombre}"`);
    linea();


    const resultado = await transaccion(async (cliente) => {

        const tenant = await crearTenant(cliente, {
            nombre: args.nombre,
            slug: args.slug,
            plan: args.plan && args.plan !== true ? args.plan : "basico",
            dominios
        });

        const credenciales = await crearUsuario({
            cliente,
            tenantId: tenant.id,
            nombre:
                args["admin-nombre"] && args["admin-nombre"] !== true
                    ? args["admin-nombre"]
                    : "Administrador",
            email: args["admin-email"],
            rol: "admin",
            password:
                args["admin-password"] && args["admin-password"] !== true
                    ? args["admin-password"]
                    : null
        });

        return { tenant, credenciales };
    });


    ok(`Tienda creada con su configuración, módulos y medios de pago`);
    ok(`Administrador ${resultado.credenciales.usuario.email} creado`);

    if (dominios.length > 0) {
        ok(`Dominios: ${dominios.join(", ")}`);
    } else {
        linea();
        linea("  Sin dominio propio todavía. Hasta que tenga uno, esta tienda");
        linea("  solo se puede ver con ?tienda=" + args.slug + " en desarrollo,");
        linea("  o poniendo su identificador en DEFAULT_TENANT_SLUG.");
    }


    mostrarCredenciales({
        titulo: "ACCESO AL PANEL",
        extra: [`Tienda:     ${resultado.tenant.nombre}`],
        email: resultado.credenciales.usuario.email,
        password: resultado.credenciales.password,
        generada: resultado.credenciales.generada
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

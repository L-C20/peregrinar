// =====================================================
// SERVICIO · CREAR UNA TIENDA
//
// Crear un tenant no es insertar una fila: una tienda recien
// creada necesita ademas sus modulos, sus tres tablas de
// configuracion y sus medios de pago, o el panel abre con
// pantallas vacias y errores.
//
// Esta funcion es la unica que sabe todo eso, y la usan por
// igual el seed inicial y el script crear-tenant. Asi la
// tienda numero 12 nace igual que la primera.
//
// Recibe el cliente de una transaccion: si algo falla, no
// queda una tienda a medio crear.
// =====================================================

const { errores } = require("../utils/errores");


// Lo que trae una tienda nueva. Los que estan en false son
// funcionalidades que todavia no se implementaron o que se
// habilitan segun el plan.
const MODULOS = [
    ["catalogo", true],
    ["carrito", true],
    ["pedidos", true],
    ["galeria", true],
    ["promociones", false],
    ["insumos", false],
    ["blog", false]
];


const MEDIOS_PAGO = [
    {
        tipo: "efectivo",
        nombre: "Efectivo",
        instrucciones: "Se abona al retirar el pedido.",
        orden: 0
    },
    {
        tipo: "transferencia",
        nombre: "Transferencia bancaria",
        instrucciones: "Te enviamos los datos de la cuenta al confirmar el pedido.",
        orden: 1
    }
];


const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DOMINIO = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/;


// -----------------------------------------------------
// INSERT A PARTIR DE UN OBJETO
// Evita repetir la lista de columnas en cada tabla de
// configuracion, que tienen entre 12 y 25 campos.
// -----------------------------------------------------

async function insertarConfiguracion(cliente, tabla, tenantId, valores) {

    const campos = Object.keys(valores).filter(
        campo => valores[campo] !== undefined
    );

    if (campos.length === 0) {
        await cliente.query(
            `INSERT INTO ${tabla} (tenant_id) VALUES ($1)`,
            [tenantId]
        );
        return;
    }

    const marcadores = campos.map((_, i) => `$${i + 2}`).join(", ");

    await cliente.query(
        `INSERT INTO ${tabla} (tenant_id, ${campos.join(", ")})
         VALUES ($1, ${marcadores})`,
        [tenantId, ...campos.map(campo => valores[campo])]
    );
}


// -----------------------------------------------------
// CREAR
// -----------------------------------------------------

async function crearTenant(cliente, {
    nombre,
    slug,
    plan = "basico",
    dominios = [],
    modulos = null,
    apariencia = {},
    sitio = {},
    contacto = {},
    mediosPago = MEDIOS_PAGO
}) {

    // ---------- VALIDACION ----------

    if (!nombre || !String(nombre).trim()) {
        throw errores.solicitudInvalida("La tienda necesita un nombre");
    }

    if (!SLUG.test(String(slug || ""))) {
        throw errores.solicitudInvalida(
            'El identificador debe ser en minúsculas y con guiones, por ejemplo "libreria-central"'
        );
    }

    for (const dominio of dominios) {
        if (!DOMINIO.test(String(dominio).toLowerCase())) {
            throw errores.solicitudInvalida(`Dominio inválido: ${dominio}`);
        }
    }


    // ---------- TENANT ----------

    const tenant = (await cliente.query(
        `INSERT INTO tenants (nombre, slug, plan)
         VALUES ($1, $2, $3)
         RETURNING id, nombre, slug, estado, plan, created_at`,
        [String(nombre).trim(), slug, plan]
    )).rows[0];


    // ---------- DOMINIOS ----------

    for (const [indice, dominio] of dominios.entries()) {
        await cliente.query(
            `INSERT INTO tenant_dominios (tenant_id, dominio, principal)
             VALUES ($1, $2, $3)`,
            [tenant.id, String(dominio).toLowerCase(), indice === 0]
        );
    }


    // ---------- MODULOS ----------

    const lista = modulos
        ? MODULOS.map(([nombreModulo, porDefecto]) => [
            nombreModulo,
            modulos[nombreModulo] ?? porDefecto
          ])
        : MODULOS;

    for (const [nombreModulo, activo] of lista) {
        await cliente.query(
            `INSERT INTO tenant_modulos (tenant_id, modulo, activo)
             VALUES ($1, $2, $3)`,
            [tenant.id, nombreModulo, activo]
        );
    }


    // ---------- CONFIGURACION ----------
    // Lo que no se indique queda con los valores por defecto
    // de la migracion 005, que son los mismos que tokens.css.

    await insertarConfiguracion(cliente, "configuracion_apariencia", tenant.id, {
        nombre_tienda: tenant.nombre,
        ...apariencia
    });

    await insertarConfiguracion(cliente, "configuracion_sitio", tenant.id, sitio);

    await insertarConfiguracion(cliente, "configuracion_contacto", tenant.id, contacto);


    // ---------- MEDIOS DE PAGO ----------

    for (const medio of mediosPago) {
        await cliente.query(
            `INSERT INTO medios_pago (tenant_id, tipo, nombre, instrucciones, orden)
             VALUES ($1, $2, $3, $4, $5)`,
            [tenant.id, medio.tipo, medio.nombre, medio.instrucciones, medio.orden]
        );
    }


    return tenant;
}


module.exports = { crearTenant, MODULOS, MEDIOS_PAGO };
